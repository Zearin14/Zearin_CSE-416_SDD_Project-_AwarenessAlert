<?php
// Vendor portal database objects. Used by setup.php (fresh install) and upgrade.php
// (existing database). Every step checks first, so it is safe to run more than once.

function column_exists($pdo, $table, $column)
{
    return (bool) $pdo->query("SHOW COLUMNS FROM `$table` LIKE " . $pdo->quote($column))->fetch();
}

function vendor_schema($pdo, &$done)
{
    // 1. the "vendor" role
    $pdo->exec("ALTER TABLE users MODIFY role ENUM('public','admin','moderator','org','vendor') NOT NULL DEFAULT 'public'");
    $done[] = "Vendor role is ready";

    // 2. shop details a verified owner can edit
    $columns = [
        "owner_user_id" => "INT NULL",
        "phone" => "VARCHAR(30) NOT NULL DEFAULT ''",
        "opening_hours" => "VARCHAR(100) NOT NULL DEFAULT ''",
        "shop_description" => "VARCHAR(500) NOT NULL DEFAULT ''",
    ];
    foreach ($columns as $column => $type) {
        if (!column_exists($pdo, "vendors", $column)) {
            $pdo->exec("ALTER TABLE vendors ADD COLUMN $column $type");
            $done[] = "Added vendors.$column";
        }
    }
    $hasFk = (int) $pdo->query("SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'vendors' AND CONSTRAINT_NAME = 'fk_vendor_owner'")->fetchColumn();
    if (!$hasFk) {
        $pdo->exec("ALTER TABLE vendors ADD CONSTRAINT fk_vendor_owner FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL");
    }

    // 3. shop claims: a vendor asks to manage a shop, the admin approves or rejects
    $pdo->exec("CREATE TABLE IF NOT EXISTS vendor_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vendor_id INT NOT NULL,
  business_role VARCHAR(50) NOT NULL DEFAULT 'Owner',
  phone VARCHAR(30) NOT NULL DEFAULT '',
  trade_license VARCHAR(60) NOT NULL DEFAULT '',
  message VARCHAR(500) NOT NULL DEFAULT '',
  status ENUM('Pending','Approved','Rejected') NOT NULL DEFAULT 'Pending',
  admin_note VARCHAR(255) NOT NULL DEFAULT '',
  decided_by VARCHAR(100) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  decided_at DATETIME NULL,
  INDEX (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $done[] = "Shop claims table (vendor_claims) is ready";

    // 4. vendor replies and disputes on reports (right of reply)
    $pdo->exec("CREATE TABLE IF NOT EXISTS vendor_responses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  vendor_id INT NOT NULL,
  user_id INT NULL,
  kind ENUM('reply','dispute') NOT NULL,
  body VARCHAR(1000) NOT NULL,
  status ENUM('Published','Open','Accepted','Rejected') NOT NULL,
  moderator_note VARCHAR(255) NOT NULL DEFAULT '',
  decided_by VARCHAR(100) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  decided_at DATETIME NULL,
  INDEX (kind, status),
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    $done[] = "Vendor replies and disputes table (vendor_responses) is ready";
}

// Demo data: one approved shop owner (Chillox Banani) and one claim waiting for the admin
function vendor_demo_data($pdo, &$done)
{
    $now = date("Y-m-d H:i:s");
    $findUser = $pdo->prepare("SELECT id FROM users WHERE login = ?");
    $findVendor = $pdo->prepare("SELECT id FROM vendors WHERE name = ?");

    $accounts = [
        // name, login, password, shop, claim status
        ["Arif Hossain", "vendor@awarenessalert.test", "Vendor#1234", "Chillox Banani", "Approved"],
        ["Nadia Karim", "newvendor@awarenessalert.test", "Vendor#1234", "Sajna Restaurant", "Pending"],
    ];
    foreach ($accounts as [$name, $login, $password, $shop, $status]) {
        $findUser->execute([$login]);
        if ($findUser->fetch()) {
            $done[] = "Demo vendor $login already exists";
            continue;
        }
        $findVendor->execute([$shop]);
        $vendorId = $findVendor->fetchColumn();
        if (!$vendorId) continue;

        $pdo->prepare("INSERT INTO users (name, login, password_hash, role, title, active, created_at) VALUES (?, ?, ?, 'vendor', ?, 1, ?)")
            ->execute([$name, $login, password_hash($password, PASSWORD_DEFAULT), "Manager, $shop", $now]);
        $userId = (int) $pdo->lastInsertId();

        $pdo->prepare("INSERT INTO vendor_claims (user_id, vendor_id, business_role, phone, trade_license, message, status, decided_by, created_at, decided_at)
                       VALUES (?, ?, 'Manager', '01711000000', ?, ?, ?, ?, ?, ?)")
            ->execute([
                $userId, $vendorId, "TRAD/DNCC/0" . $vendorId . "2026",
                "I manage this branch and would like to respond to customer reports.",
                $status, $status === "Approved" ? "Amina Rahman" : "", $now, $status === "Approved" ? $now : null,
            ]);
        if ($status === "Approved") {
            $pdo->prepare("UPDATE vendors SET owner_user_id = ?, phone = '01711000000', opening_hours = '12:00 PM – 11:00 PM',
                           shop_description = 'Burger and fast-food restaurant in Banani.' WHERE id = ?")
                ->execute([$userId, $vendorId]);
        }
        $done[] = "Created demo vendor: $login / $password ($shop, claim $status)";
    }
}
