<?php
// AwarenessAlert API - shared database connection and helper functions.
// Every other PHP file starts with: require_once __DIR__ . "/db.php";

// Defaults are for XAMPP. Tests and CI override them with environment variables
// (DB_NAME=awarenessalert_test) so the real database is never touched by tests.
$host = getenv("DB_HOST") ?: "localhost";
$dbname = getenv("DB_NAME") ?: "awarenessalert_db";
$username = getenv("DB_USER") ?: "root";
$password = getenv("DB_PASS") !== false ? getenv("DB_PASS") : "";

date_default_timezone_set("Asia/Dhaka");

// ---------- CORS: allow the Vite frontend (any localhost port) ----------
$origin = $_SERVER["HTTP_ORIGIN"] ?? "";
if (preg_match('#^http://(localhost|127\.0\.0\.1)(:\d+)?$#', $origin)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
    header("Vary: Origin");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if (($_SERVER["REQUEST_METHOD"] ?? "GET") === "OPTIONS") {
    http_response_code(204);
    exit;
}

// ---------- PHP session (used for login + role-based access) ----------
session_set_cookie_params(["path" => "/", "httponly" => true, "samesite" => "Lax"]);
session_start();

// ---------- Helpers ----------
function json_out($data, $status = 200)
{
    http_response_code($status);
    echo json_encode($data);
    exit;
}

function fail($message, $status = 400)
{
    json_out(["success" => false, "error" => $message], $status);
}

function read_json()
{
    $raw = file_get_contents("php://input");
    $data = json_decode($raw ?: "{}", true);
    return is_array($data) ? $data : [];
}

// The logged-in user, re-checked against the database on every request,
// so a turned-off (deactivated) account loses access immediately.
function current_user()
{
    global $pdo;
    static $checked = false, $user = null;
    if ($checked) return $user;
    $checked = true;
    $user = $_SESSION["user"] ?? null;
    if (!$user || !isset($pdo)) return $user;
    try {
        $stmt = $pdo->prepare("SELECT id, name, role, organization, title, active FROM users WHERE id = ?");
        $stmt->execute([$user["id"]]);
        $row = $stmt->fetch();
        if (!$row || !(int) $row["active"]) {
            unset($_SESSION["user"]);
            $user = null;
        } else {
            $user = public_user($row);
            $_SESSION["user"] = $user;
        }
    } catch (PDOException $e) {
        // database not upgraded yet (no `active` column) - keep the session user
    }
    return $user;
}

// Staff = admin + moderators. They can open the moderator portal.
const STAFF_ROLES = ["admin", "moderator"];

function require_role($roles)
{
    $user = current_user();
    if (!$user || !in_array($user["role"], (array) $roles, true)) {
        fail("You are not allowed to do this. Please log in with the correct account.", 403);
    }
    return $user;
}

function public_user($row)
{
    return [
        "id" => (string) $row["id"],
        "name" => $row["name"],
        "role" => $row["role"],
        "organization" => $row["organization"],
        "title" => $row["title"],
    ];
}

function now_sql()
{
    return date("Y-m-d H:i:s");
}

function iso($sqlDate)
{
    return $sqlDate ? date("c", strtotime($sqlDate)) : "";
}

// Save every login attempt (success, failure, logout) in the login_history table.
// If the table does not exist yet (upgrade.php not run), login still works.
function log_login($pdo, $user, $attempted, $event, $reason)
{
    try {
        $pdo->prepare("INSERT INTO login_history (user_id, login_attempted, name, role, event, reason, ip_address, user_agent, created_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute([
                $user["id"] ?? null,
                substr($attempted !== "" ? $attempted : (string) ($user["login"] ?? ""), 0, 150),
                $user["name"] ?? null,
                $user["role"] ?? null,
                $event,
                $reason,
                $_SERVER["REMOTE_ADDR"] ?? "",
                substr((string) ($_SERVER["HTTP_USER_AGENT"] ?? ""), 0, 255),
                now_sql(),
            ]);
    } catch (PDOException $e) {
        error_log("login_history: " . $e->getMessage());
    }
}

function log_action($pdo, $reportId, $action, $actor)
{
    $stmt = $pdo->prepare(
        "INSERT INTO report_actions (report_id, action, actor, created_at) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$reportId, $action, $actor, now_sql()]);
}

// ---------- Connect ----------
if (!defined("SKIP_DB_CONNECT")) {
    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } catch (PDOException $e) {
        error_log($e->getMessage());
        fail("Database connection failed. Is MySQL running in XAMPP, and did you open setup.php once?", 500);
    }
}

function text_length($text)
{
    return function_exists("mb_strlen") ? mb_strlen($text) : strlen($text);
}
