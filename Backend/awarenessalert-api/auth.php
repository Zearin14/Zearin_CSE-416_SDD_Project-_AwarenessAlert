<?php
// Login / logout / sign up (real accounts from the `users` table).
//   GET  auth.php                                   -> who is logged in
//   POST auth.php {action:"login", login, password, kind}
//   POST auth.php {action:"register", name, login, password}
//   POST auth.php {action:"logout"}
require_once __DIR__ . "/db.php";

function session_user_out()
{
    $user = current_user();
    return $user ? [
        "userId" => (string) $user["id"],
        "role" => $user["role"],
        "organization" => $user["organization"],
    ] : null;
}

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    json_out(["success" => true, "session" => session_user_out()]);
}

$body = read_json();
$action = $body["action"] ?? "";

try {
    if ($action === "login") {
        $login = trim((string) ($body["login"] ?? ""));
        $pass = (string) ($body["password"] ?? "");
        $kind = (string) ($body["kind"] ?? "public");

        $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(login) = LOWER(?) LIMIT 1");
        $stmt->execute([$login]);
        $row = $stmt->fetch();

        if (!$row) {
            log_login($pdo, null, $login, "failed", "No account with this email/phone");
            fail("Incorrect email/phone or password.", 401);
        }
        if (!password_verify($pass, $row["password_hash"])) {
            log_login($pdo, $row, $login, "failed", "Wrong password");
            fail("Incorrect email/phone or password.", 401);
        }
        if (isset($row["active"]) && !(int) $row["active"]) {
            log_login($pdo, $row, $login, "failed", "Account turned off");
            fail("This account has been turned off by the admin.", 403);
        }
        // Admin login page accepts admins AND moderators
        $allowed = $kind === "admin" ? STAFF_ROLES : [$kind];
        if (!in_array($row["role"], $allowed, true)) {
            $page = in_array($row["role"], STAFF_ROLES, true) ? "Admin" : ($row["role"] === "org" ? "Organization" : "public");
            log_login($pdo, $row, $login, "failed", "Used the wrong login page");
            fail("This account cannot log in here. Use the $page login page.", 403);
        }
        session_regenerate_id(true);
        $_SESSION["user"] = public_user($row);
        log_login($pdo, $row, $login, "login", "Logged in");
        json_out(["success" => true, "session" => session_user_out(), "user" => public_user($row)]);
    }

    if ($action === "register") {
        $name = trim((string) ($body["name"] ?? ""));
        $login = trim((string) ($body["login"] ?? ""));
        $pass = (string) ($body["password"] ?? "");
        // text_length() counts characters, not bytes (fix D-02: Bangla passwords)
        if ($name === "" || $login === "" || text_length($pass) < 8) {
            fail("Name, email/phone and a password of at least 8 characters are required.");
        }
        // fix D-03: match the database column sizes instead of failing with a 500 error
        if (text_length($name) > 100) fail("Name must be 100 characters or fewer.");
        if (text_length($login) > 150) fail("Email/phone must be 150 characters or fewer.");
        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(login) = LOWER(?)");
        $stmt->execute([$login]);
        if ($stmt->fetch()) fail("An account with this email or phone already exists.", 409);

        $stmt = $pdo->prepare("INSERT INTO users (name, login, password_hash, role, created_at) VALUES (?, ?, ?, 'public', ?)");
        $stmt->execute([$name, $login, password_hash($pass, PASSWORD_DEFAULT), now_sql()]);
        $row = ["id" => $pdo->lastInsertId(), "name" => $name, "role" => "public", "organization" => null, "title" => null];
        session_regenerate_id(true);
        $_SESSION["user"] = public_user($row);
        log_login($pdo, $row, $login, "login", "New account created");
        json_out(["success" => true, "session" => session_user_out(), "user" => public_user($row)]);
    }

    if ($action === "logout") {
        $user = current_user();
        if ($user) log_login($pdo, $user, "", "logout", "Logged out");
        $_SESSION = [];
        session_destroy();
        json_out(["success" => true, "session" => null]);
    }

    fail("Unknown action");
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Database error during login", 500);
}
