<?php
// Login history (admin only)
//   GET login_history.php              -> last 300 events
//   GET login_history.php?filter=failed   (or login / logout)
require_once __DIR__ . "/db.php";

require_role("admin");
$filter = $_GET["filter"] ?? "all";

try {
    $where = in_array($filter, ["login", "failed", "logout"], true) ? "WHERE event = " . $pdo->quote($filter) : "";
    $rows = $pdo->query("SELECT * FROM login_history $where ORDER BY created_at DESC, id DESC LIMIT 300")->fetchAll();

    $since = date("Y-m-d H:i:s", time() - 86400);
    $count = function ($sql) use ($pdo, $since) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$since]);
        return (int) $stmt->fetchColumn();
    };

    json_out([
        "success" => true,
        "summary" => [
            "logins24h" => $count("SELECT COUNT(*) FROM login_history WHERE event = 'login' AND created_at >= ?"),
            "failed24h" => $count("SELECT COUNT(*) FROM login_history WHERE event = 'failed' AND created_at >= ?"),
            "people24h" => $count("SELECT COUNT(DISTINCT user_id) FROM login_history WHERE event = 'login' AND created_at >= ?"),
        ],
        "events" => array_map(function ($row) {
            return [
                "id" => (string) $row["id"],
                "userId" => $row["user_id"] === null ? null : (string) $row["user_id"],
                "login" => (string) $row["login_attempted"],
                "name" => $row["name"],
                "role" => $row["role"],
                "event" => $row["event"],
                "reason" => $row["reason"],
                "ip" => $row["ip_address"],
                "device" => $row["user_agent"],
                "at" => iso($row["created_at"]),
            ];
        }, $rows),
    ]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Login history is not ready. Open upgrade.php once.", 500);
}
