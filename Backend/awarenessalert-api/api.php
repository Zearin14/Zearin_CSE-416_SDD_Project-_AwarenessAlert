<?php
// Health check: open http://localhost/awarenessalert-api/api.php in the browser.
require_once __DIR__ . "/db.php";

try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    $counts = [];
    foreach ($tables as $table) {
        $counts[$table] = (int) $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
    }
    json_out([
        "success" => true,
        "message" => "AwarenessAlert API is connected!",
        "database" => $dbname,
        "tables" => $counts,
    ]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not read database tables", 500);
}
