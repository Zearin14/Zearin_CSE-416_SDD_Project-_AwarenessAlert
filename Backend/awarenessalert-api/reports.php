<?php
// Reports
//   GET  reports.php  -> list of reports (filtered by role)
//   POST reports.php  -> submit a new report (no login needed), optional photo
require_once __DIR__ . "/data.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        json_out(["success" => true, "reports" => load_reports($pdo, current_user())]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        fail("Could not load reports", 500);
    }
}

$body = read_json();
$user = current_user();

$vendorId = (int) ($body["vendorId"] ?? 0);
$category = (string) ($body["category"] ?? "");
$description = trim((string) ($body["description"] ?? ""));
$anonymous = !empty($body["anonymous"]);
$deviceId = substr(preg_replace('/[^a-zA-Z0-9-]/', "", (string) ($body["deviceId"] ?? "")), 0, 60);

if (!in_array($category, ["Food", "Fuel", "Other"], true)) fail("Choose a category.");
if (text_length($description) < 15) fail("Add at least 15 characters so moderators can understand the concern.");

try {
    $stmt = $pdo->prepare("SELECT id, area FROM vendors WHERE id = ?");
    $stmt->execute([$vendorId]);
    $vendor = $stmt->fetch();
    if (!$vendor) fail("Select a vendor or location.");

    // ---- Optional photo evidence (sent as a base64 data URL) ----
    $imagePath = null;
    $image = (string) ($body["evidenceImage"] ?? "");
    if ($image !== "") {
        if (!preg_match('#^data:image/(jpeg|png);base64,(.+)$#', $image, $m)) {
            fail("Unsupported file. Please upload a JPG or PNG image.");
        }
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || strlen($bytes) > 10 * 1024 * 1024) fail("Image must be smaller than 10 MB.");
        if (@getimagesizefromstring($bytes) === false) fail("This file is not a valid image.");
        $dir = __DIR__ . "/uploads";
        if (!is_dir($dir)) mkdir($dir, 0777, true);
        $file = "report-" . date("Ymd-His") . "-" . bin2hex(random_bytes(4)) . ($m[1] === "png" ? ".png" : ".jpg");
        file_put_contents("$dir/$file", $bytes);
        $imagePath = "uploads/$file";
    }

    $isPublicUser = $user && $user["role"] === "public";
    $tier = $isPublicUser ? ($anonymous ? "Anonymous" : "Identified") : "Guest";
    $now = now_sql();

    $stmt = $pdo->prepare("INSERT INTO reports
      (user_id, vendor_id, category, description, location, has_evidence, evidence_image_path,
       reporter_tier, anonymous, ip_address, device_id, moderation_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)");
    $stmt->execute([
        $isPublicUser ? $user["id"] : null, $vendorId, $category, $description, $vendor["area"],
        $imagePath ? 1 : 0, $imagePath, $tier, $anonymous ? 1 : 0,
        $_SERVER["REMOTE_ADDR"] ?? "", $deviceId ?: "dev-unknown", $now, $now,
    ]);
    $id = (int) $pdo->lastInsertId();
    $code = sprintf("AA-%05d", 1000 + $id);
    $pdo->prepare("UPDATE reports SET report_code = ? WHERE id = ?")->execute([$code, $id]);
    log_action($pdo, $id, "Report submitted", $isPublicUser ? $user["name"] : "Community reporter");

    json_out(["success" => true, "id" => $code]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not save the report", 500);
}
