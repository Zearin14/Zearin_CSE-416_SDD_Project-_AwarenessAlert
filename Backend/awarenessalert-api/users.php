<?php
// Staff accounts (Team page)
//   GET  users.php                                              -> admin: list of staff accounts
//   POST users.php {action:"create", name, login, password, role:"moderator"|"org", organization?}   (admin)
//   POST users.php {action:"toggle", id}                        -> admin: turn an account off / on
//   POST users.php {action:"reset_password", id, password}      -> admin: set a new password for someone
//   POST users.php {action:"change_password", current, password} -> anyone logged in: change own password
require_once __DIR__ . "/db.php";

$orgs = ["BSTI", "DNCRP", "Accredited Laboratory"];

function staff_list($pdo)
{
    $order = " WHERE u.role <> 'public' ORDER BY FIELD(u.role, 'admin', 'moderator', 'org'), u.name";
    try {
        $rows = $pdo->query(
            "SELECT u.id, u.name, u.login, u.role, u.organization, u.title, u.active, u.created_at,
                    (SELECT MAX(h.created_at) FROM login_history h WHERE h.user_id = u.id AND h.event = 'login') AS last_login
             FROM users u" . $order
        )->fetchAll();
    } catch (PDOException $e) {
        // login_history table not created yet
        $rows = $pdo->query(
            "SELECT u.id, u.name, u.login, u.role, u.organization, u.title, u.active, u.created_at, NULL AS last_login FROM users u" . $order
        )->fetchAll();
    }
    return array_map(function ($row) {
        return public_user($row) + [
            "login" => $row["login"],
            "active" => (bool) $row["active"],
            "createdAt" => iso($row["created_at"]),
            "lastLogin" => iso($row["last_login"]),
        ];
    }, $rows);
}

try {
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        require_role("admin");
        json_out(["success" => true, "users" => staff_list($pdo)]);
    }

    $body = read_json();
    $action = (string) ($body["action"] ?? "");

    if ($action === "change_password") {
        $user = current_user();
        if (!$user) fail("Please log in first.", 401);
        $current = (string) ($body["current"] ?? "");
        $new = (string) ($body["password"] ?? "");
        $stmt = $pdo->prepare("SELECT password_hash FROM users WHERE id = ?");
        $stmt->execute([$user["id"]]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($current, $hash)) fail("Your current password is not correct.");
        if (text_length($new) < 8) fail("The new password must be at least 8 characters.");
        $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
            ->execute([password_hash($new, PASSWORD_DEFAULT), $user["id"]]);
        json_out(["success" => true]);
    }

    $admin = require_role("admin");

    if ($action === "create") {
        $name = trim((string) ($body["name"] ?? ""));
        $login = trim((string) ($body["login"] ?? ""));
        $password = (string) ($body["password"] ?? "");
        $role = (string) ($body["role"] ?? "moderator");
        $organization = $role === "org" ? (string) ($body["organization"] ?? "") : null;
        $title = trim((string) ($body["title"] ?? "")) ?: ($role === "moderator" ? "Moderator" : null);

        if ($name === "" || $login === "") fail("Name and email/phone are required.");
        if (text_length($name) > 100) fail("Name must be 100 characters or fewer.");
        if (text_length($login) > 150) fail("Email/phone must be 150 characters or fewer.");
        if (text_length($password) < 8) fail("The password must be at least 8 characters.");
        if (!in_array($role, ["moderator", "org"], true)) fail("Choose Moderator or Organization staff.");
        if ($role === "org" && !in_array($organization, $orgs, true)) fail("Choose the organization.");

        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(login) = LOWER(?)");
        $stmt->execute([$login]);
        if ($stmt->fetch()) fail("An account with this email or phone already exists.", 409);

        $pdo->prepare("INSERT INTO users (name, login, password_hash, role, organization, title, active, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
            ->execute([$name, $login, password_hash($password, PASSWORD_DEFAULT), $role, $organization, $title, now_sql()]);
        json_out(["success" => true, "users" => staff_list($pdo)]);
    }

    $id = (int) ($body["id"] ?? 0);
    $stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) fail("Account not found.", 404);

    if ($action === "toggle") {
        if ((string) $target["id"] === (string) $admin["id"]) fail("You cannot turn off your own account.");
        if ($target["role"] === "admin") fail("Admin accounts cannot be turned off here.");
        $pdo->prepare("UPDATE users SET active = 1 - active WHERE id = ?")->execute([$id]);
        json_out(["success" => true, "users" => staff_list($pdo)]);
    }

    if ($action === "reset_password") {
        $password = (string) ($body["password"] ?? "");
        if (text_length($password) < 8) fail("The password must be at least 8 characters.");
        $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?")
            ->execute([password_hash($password, PASSWORD_DEFAULT), $id]);
        json_out(["success" => true, "users" => staff_list($pdo)]);
    }

    fail("Unknown action");
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not update the account", 500);
}
