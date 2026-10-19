<?php
// UPGRADE for the moderator + login history features (safe to run more than once). Your reports are NOT deleted.
// Open http://localhost/awarenessalert-api/upgrade.php in the browser.
require_once __DIR__ . "/db.php";
header("Content-Type: text/html; charset=UTF-8");

$done = [];
try {
    // 1. allow the "moderator" role
    $pdo->exec("ALTER TABLE users MODIFY role ENUM('public','admin','moderator','org') NOT NULL DEFAULT 'public'");
    $done[] = "Added the Moderator role";

    // 2. add the "active" column (turn accounts off / on)
    $hasActive = $pdo->query("SHOW COLUMNS FROM users LIKE 'active'")->fetch();
    if (!$hasActive) {
        $pdo->exec("ALTER TABLE users ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1 AFTER title");
        $done[] = "Added the active (on/off) setting for accounts";
    } else {
        $done[] = "Active setting already exists";
    }

    // 3. login history table
    $pdo->exec("CREATE TABLE IF NOT EXISTS login_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  login_attempted VARCHAR(150) NOT NULL DEFAULT '',
  name VARCHAR(100) NULL,
  role VARCHAR(20) NULL,
  event ENUM('login','failed','logout') NOT NULL,
  reason VARCHAR(100) NOT NULL DEFAULT '',
  ip_address VARCHAR(45) NOT NULL DEFAULT '',
  user_agent VARCHAR(255) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  INDEX (created_at),
  INDEX (user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $done[] = "Login history table is ready";

    // 4. demo moderator account
    $stmt = $pdo->prepare("SELECT id FROM users WHERE login = ?");
    $stmt->execute(["moderator@awarenessalert.test"]);
    if (!$stmt->fetch()) {
        $pdo->prepare("INSERT INTO users (name, login, password_hash, role, title, active, created_at) VALUES (?, ?, ?, 'moderator', 'Moderator', 1, ?)")
            ->execute(["Tanvir Ahmed", "moderator@awarenessalert.test", password_hash("Mod#12345", PASSWORD_DEFAULT), now_sql()]);
        $done[] = "Created demo moderator: moderator@awarenessalert.test / Mod#12345";
    } else {
        $done[] = "Demo moderator already exists";
    }
} catch (PDOException $e) {
    error_log($e->getMessage());
    echo "<body style='font-family:system-ui;max-width:700px;margin:60px auto'><h1 style='color:#c94b45'>Upgrade failed</h1>
          <p>Did you open setup.php before? Is MySQL running? Error: " . htmlspecialchars($e->getMessage()) . "</p></body>";
    exit;
}

echo "<body style='font-family:system-ui;max-width:700px;margin:60px auto;color:#172b2a'>
  <h1 style='color:#168677'>Upgrade complete ✓</h1><ul><li>" . implode("</li><li>", $done) . "</li></ul>
  <p>Your reports, vendors and reviews were not changed. Go back to the website and refresh.</p></body>";
