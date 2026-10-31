<?php
// ONE-TIME SETUP: open http://localhost/awarenessalert-api/setup.php in your browser.
// It creates the awarenessalert_db database, all tables, and the demo data.
// To wipe everything and start fresh again, open setup.php?reset=1

define("SKIP_DB_CONNECT", true);
require_once __DIR__ . "/db.php";
header("Content-Type: text/html; charset=UTF-8");

function page($title, $body, $ok = true)
{
    $color = $ok ? "#168677" : "#c94b45";
    echo "<!doctype html><html><head><meta charset='utf-8'><title>AwarenessAlert setup</title></head>
    <body style='font-family:system-ui,sans-serif;max-width:720px;margin:60px auto;padding:0 20px;color:#172b2a'>
    <h1 style='color:$color'>$title</h1>$body</body></html>";
    exit;
}

try {
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
} catch (PDOException $e) {
    page("MySQL is not running", "<p>Open the XAMPP Control Panel and click <b>Start</b> next to MySQL, then refresh this page.</p>", false);
}

try {
    $pdo->exec("CREATE DATABASE IF NOT EXISTS `$dbname` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
} catch (PDOException $e) {
    // On shared hosting the database is created in the control panel and we may not create databases.
}
$pdo->exec("USE `$dbname`");

// Already set up? (new schema has vendors.area) -> don't wipe data unless ?reset=1
$alreadySetUp = false;
try {
    $pdo->query("SELECT area FROM vendors LIMIT 1");
    $alreadySetUp = true;
} catch (PDOException $e) {
    $alreadySetUp = false;
}
if ($alreadySetUp && !isset($_GET["reset"])) {
    page("Already set up ✓", "<p>The database is ready. Your saved reports are safe.</p>
      <p>If you really want to delete everything and reload the demo data, open
      <a href='setup.php?reset=1'>setup.php?reset=1</a>.</p>");
}

// ---------------- Tables ----------------
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0");
foreach (["login_history", "report_actions", "reviews", "reports", "vendors", "users"] as $table) {
    $pdo->exec("DROP TABLE IF EXISTS `$table`");
}
$pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

$pdo->exec("CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  login VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('public','admin','moderator','org') NOT NULL DEFAULT 'public',
  organization ENUM('BSTI','DNCRP','Accredited Laboratory') NULL,
  title VARCHAR(100) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE vendors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(150),
  category VARCHAR(50),
  area VARCHAR(100),
  address VARCHAR(255),
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  trust_status ENUM('green','amber','red','grey') NOT NULL DEFAULT 'grey',
  badges VARCHAR(255) NOT NULL DEFAULT '',
  approval_json TEXT,
  verified_date VARCHAR(30) NOT NULL DEFAULT '',
  created_at DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_code VARCHAR(30) UNIQUE,
  user_id INT NULL,
  vendor_id INT NULL,
  category ENUM('Food','Fuel','Other') NOT NULL DEFAULT 'Other',
  description TEXT NOT NULL,
  location VARCHAR(255),
  has_evidence TINYINT(1) NOT NULL DEFAULT 0,
  evidence_image_path VARCHAR(255) NULL,
  reporter_tier ENUM('Guest','Anonymous','Identified') NOT NULL DEFAULT 'Guest',
  anonymous TINYINT(1) NOT NULL DEFAULT 1,
  ip_address VARCHAR(45),
  device_id VARCHAR(64),
  moderation_status ENUM('Pending','Verified','Escalated','Disputed','Removed') NOT NULL DEFAULT 'Pending',
  authority_outcome ENUM('Awaiting','Confirmed','Cleared') NULL,
  routed_to ENUM('BSTI','DNCRP','Accredited Laboratory') NULL,
  outcome_public_comment TEXT,
  outcome_internal_note TEXT,
  outcome_set_by VARCHAR(100) NOT NULL DEFAULT '',
  outcome_set_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NULL,
  INDEX idx_reports_created (created_at),          -- fix D-15 (SRS 5.1): newest-first lists
  INDEX idx_reports_status (moderation_status),    -- fix D-15 (SRS 5.1): status tabs
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  vendor_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT,
  hidden TINYINT(1) NOT NULL DEFAULT 0,
  flags INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

$pdo->exec("CREATE TABLE report_actions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  action VARCHAR(150) NOT NULL,
  actor VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (report_id) REFERENCES reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

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

// ---------------- Demo data ----------------
$now = time();
$day = 86400;
$at = function ($secondsAgo) use ($now) {
    return date("Y-m-d H:i:s", $now - (int) $secondsAgo);
};

// Users (passwords are hashed with password_hash, never stored as plain text)
$users = [
    ["Amina Rahman", "admin@awarenessalert.test", "Admin#1234", "admin", null, "Lead moderator"],
    ["Tanvir Ahmed", "moderator@awarenessalert.test", "Mod#12345", "moderator", null, "Moderator"],
    ["BSTI Desk", "bsti@awarenessalert.test", "Org#1234", "org", "BSTI", null],
    ["DNCRP Desk", "dncrp@awarenessalert.test", "Org#1234", "org", "DNCRP", null],
    ["Laboratory Desk", "lab@awarenessalert.test", "Org#1234", "org", "Accredited Laboratory", null],
    ["Rafi Hasan", "rafi@example.test", "User#1234", "public", null, null],
    ["Nusrat Jahan", "01700000000", "User#1234", "public", null, null],
];
$stmt = $pdo->prepare("INSERT INTO users (name, login, password_hash, role, organization, title, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
$userIds = [];
foreach ($users as $u) {
    $stmt->execute([$u[0], $u[1], password_hash($u[2], PASSWORD_DEFAULT), $u[3], $u[4], $u[5], $at(30 * $day)]);
    $userIds[$u[1]] = (int) $pdo->lastInsertId();
}
$publicIds = [$userIds["rafi@example.test"], $userIds["01700000000"]];

// Vendors: Gulshan & Banani, Dhaka (demo trust statuses - not real assessments)
$vendors = [
    ["Shwapno - Gulshan", "Shwapno", "Grocery", "Gulshan-2", "Gulshan-2, Dhaka", 23.7925, 90.4150, "green", "BSTI"],
    ["Unimart Gulshan", "Unimart", "Grocery", "Gulshan-2", "Gulshan-2, Dhaka", 23.7930, 90.4140, "amber", ""],
    ["Agora Gulshan", "Agora", "Grocery", "Gulshan-1", "Gulshan Avenue, Dhaka", 23.7808, 90.4170, "green", "BSTI"],
    ["Lavender Gulshan", "Lavender", "Grocery", "Gulshan-2", "Gulshan-2, Dhaka", 23.7940, 90.4160, "amber", ""],
    ["Dhali Super Shop", "Dhali Super Shop", "Grocery", "Gulshan-2", "Gulshan-2, Dhaka", 23.7910, 90.4130, "green", ""],
    ["Zia General Store", "Zia General Store", "Grocery", "Gulshan-1", "Gulshan-1, Dhaka", 23.7800, 90.4140, "red", ""],
    ["Penguin Super Shop", "Penguin Super Shop", "Grocery", "Banani", "Banani, Dhaka", 23.7935, 90.4050, "green", ""],
    ["Suskey Food", "Suskey Food", "Grocery", "Banani", "Banani, Dhaka", 23.7930, 90.4030, "amber", ""],
    ["Maa General Store", "Maa General Store", "Grocery", "Banani", "Banani, Dhaka", 23.7915, 90.4040, "grey", ""],
    ["Janani General Store", "Janani General Store", "Grocery", "Banani", "Banani Bazar, Dhaka", 23.7905, 90.4060, "amber", ""],
    ["Secret Recipe Gulshan", "Secret Recipe", "Restaurant", "Gulshan-1", "Gulshan-1, Dhaka", 23.7805, 90.4180, "green", "DNCRP"],
    ["Istanbul Restaurant", "Istanbul Restaurant", "Restaurant", "Gulshan-2", "Gulshan-2, Dhaka", 23.7945, 90.4145, "amber", ""],
    ["New Gulshan Plaza Restaurant", "New Gulshan Plaza", "Restaurant", "Gulshan-2", "Gulshan-2, Dhaka", 23.7950, 90.4165, "red", ""],
    ["Salams Kitchen Banani", "Salams Kitchen", "Restaurant", "Banani", "Banani, Dhaka", 23.7910, 90.4035, "amber", ""],
    ["Sajna Restaurant", "Sajna Restaurant", "Restaurant", "Banani", "Banani, Dhaka", 23.7930, 90.4025, "green", ""],
    ["Chillox Banani", "Chillox", "Restaurant", "Banani", "Banani, Dhaka", 23.7918, 90.4045, "amber", ""],
    ["Prego Westin", "Prego", "Restaurant", "Gulshan-2", "The Westin Dhaka, Gulshan-2", 23.7938, 90.4148, "green", "DNCRP"],
    ["Gloria Jeans Gulshan", "Gloria Jeans Coffees", "Restaurant", "Gulshan-2", "Gulshan-2, Dhaka", 23.7915, 90.4160, "grey", ""],
    ["Coopers Bakery Gulshan", "Coopers Bakery", "Bakery", "Gulshan-2", "Gulshan-2, Dhaka", 23.7942, 90.4155, "green", "Accredited Laboratory"],
    ["Woodhouse Grill", "Woodhouse Grill", "Restaurant", "Gulshan-2", "Gulshan Avenue, Dhaka", 23.7900, 90.4165, "amber", ""],
    ["Gulshan Service Station", "Gulshan Service Station", "Fuel station", "Gulshan-1", "Gulshan-1, Dhaka", 23.7805, 90.4145, "red", ""],
    ["SOI 71 Gulshan", "SOI 71", "Restaurant", "Gulshan-2", "Gulshan-2, Dhaka", 23.7910, 90.4180, "amber", ""],
    ["Bella Italia Gulshan", "Bella Italia", "Restaurant", "Gulshan-2", "Gulshan-2, Dhaka", 23.7890, 90.4170, "green", ""],
    ["Sweets of Bengal", "Sweets of Bengal", "Bakery", "Gulshan-1", "Gulshan-1, Dhaka", 23.7808, 90.4155, "amber", ""],
    ["Durum Banani", "Durum", "Restaurant", "Banani", "Banani, Dhaka", 23.7920, 90.4055, "green", ""],
];
$stmt = $pdo->prepare("INSERT INTO vendors (name, brand, category, area, address, latitude, longitude, trust_status, badges, approval_json, verified_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$vendorRows = [];
foreach ($vendors as $v) {
    $approval = json_encode([
        "Product Origin" => "Bangladesh",
        "Manufacturer" => $v[1] . " Ltd.",
        "Factory Location" => "Dhaka",
        "Owner" => $v[1] . " Holdings",
    ]);
    $stmt->execute([$v[0], $v[1], $v[2], $v[3], $v[4], $v[5], $v[6], $v[7], $v[8], $approval, $v[8] ? "12 Sep 2026" : "", $at(60 * $day)]);
    $vendorRows[] = ["id" => (int) $pdo->lastInsertId(), "category" => $v[2], "area" => $v[3]];
}

// Reports
$descriptions = [
    "Product packaging appeared damaged and the expiry label was difficult to read.",
    "Fuel quantity appeared lower than the amount shown on the meter.",
    "Food was stored without visible temperature control near the service counter.",
    "A strong unusual odor was noticed after opening the sealed package.",
    "The displayed price and the checkout price did not match.",
    "The premises appeared clean, but a batch label was missing from one item.",
];
$reportStmt = $pdo->prepare("INSERT INTO reports
  (report_code, user_id, vendor_id, category, description, location, has_evidence, reporter_tier, anonymous,
   ip_address, device_id, moderation_status, authority_outcome, routed_to, outcome_public_comment,
   outcome_internal_note, outcome_set_by, outcome_set_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
$routing = ["Food" => "DNCRP", "Fuel" => "BSTI", "Other" => "Accredited Laboratory"];

for ($i = 0; $i < 24; $i++) {
    // first 3 reports hit the same vendor recently -> shows a "report spike"
    $vendor = $i < 3 ? $vendorRows[5] : $vendorRows[($i * 7) % count($vendorRows)];
    $category = $vendor["category"] === "Fuel station" ? "Fuel" : ($i % 7 === 0 ? "Other" : "Food");
    if ($i < 3) $status = "Pending";
    elseif ($i === 3 || $i === 4 || $i === 10) $status = "Escalated";
    elseif ($i % 9 === 0) $status = "Disputed";
    elseif ($i % 8 === 0) $status = "Removed";
    else $status = "Verified";
    $outcome = $i === 3 ? "Confirmed" : ($i === 4 ? "Cleared" : ($i === 10 ? "Awaiting" : null));
    $routed = $status === "Escalated" ? $routing[$category] : null;
    $secondsAgo = $i < 3 ? $i * 5 * 3600 : ($i + 1) * $day;
    $tier = $i % 3 === 0 ? "Guest" : ($i % 3 === 1 ? "Anonymous" : "Identified");
    $userId = $tier === "Guest" ? null : $publicIds[$i % 2];
    $public = $outcome === "Confirmed"
        ? "Sample tested; expiry dates were found to be past the permitted limit."
        : ($outcome === "Cleared" ? "Sample tested and no safety issue was found in the submitted batch." : "");
    $internal = ($outcome === "Confirmed" || $outcome === "Cleared") ? "Laboratory worksheet reviewed by the assigned case officer." : "";
    $setAt = ($outcome === "Confirmed" || $outcome === "Cleared") ? $at($secondsAgo - $day / 2) : null;
    $reportStmt->execute([
        sprintf("AA-%05d", 1001 + $i), $userId, $vendor["id"], $category, $descriptions[$i % count($descriptions)],
        $vendor["area"], $i % 3 !== 1 ? 1 : 0, $tier, $i % 3 !== 2 ? 1 : 0,
        "103.84.12." . (20 + $i), "dev-" . dechex($i * 713 + 4096), $status, $outcome, $routed, $public,
        $internal, $setAt ? $routed : "", $setAt, $at($secondsAgo), $at($secondsAgo),
    ]);
    $reportId = (int) $pdo->lastInsertId();
    $actions = [["Report submitted", "Community reporter", $secondsAgo]];
    if ($status !== "Pending") $actions[] = ["Report " . strtolower($status), "Amina Rahman", $secondsAgo - 3600];
    if ($setAt) $actions[] = ["Authority outcome set to $outcome", $routed, $secondsAgo - $day / 2];
    foreach ($actions as $a) {
        $pdo->prepare("INSERT INTO report_actions (report_id, action, actor, created_at) VALUES (?, ?, ?, ?)")
            ->execute([$reportId, $a[0], $a[1], $at($a[2])]);
    }
}

// Reviews
$reviewTexts = [
    "Staff were helpful and the products were well organized.",
    "The experience was fine overall, though service was a little slow.",
    "Clean shop with clear prices and helpful product information.",
    "My recent visit was mixed; I would like clearer labeling.",
];
$ratings = [5, 4, 4, 3, 5, 2];
$stmt = $pdo->prepare("INSERT INTO reviews (user_id, vendor_id, rating, comment, hidden, flags, created_at) VALUES (?, ?, ?, ?, 0, ?, ?)");
for ($i = 0; $i < 40; $i++) {
    $stmt->execute([
        $publicIds[$i % 2], $vendorRows[$i % count($vendorRows)]["id"], $ratings[$i % 6],
        $reviewTexts[$i % 4], $i % 8 === 0 ? 2 : 0, $at($i * 2 * $day + 3600),
    ]);
}

// Folder for uploaded photo evidence
if (!is_dir(__DIR__ . "/uploads")) {
    mkdir(__DIR__ . "/uploads", 0777, true);
}

page("Setup complete ✓", "<p>Database <b>$dbname</b> is ready with:</p>
  <ul><li>7 user accounts (admin, moderator, 3 organizations, 2 public users)</li>
  <li>25 vendors in Gulshan &amp; Banani</li><li>24 sample reports with history</li><li>40 reviews</li></ul>
  <p>Now go back to your website and refresh the page.</p>
  <p><a href='api.php'>Check the API →</a></p>");
