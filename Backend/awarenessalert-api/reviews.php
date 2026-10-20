<?php
// Customer reviews
//   GET  reviews.php                                      -> all reviews
//   POST reviews.php {action:"create", vendorId, rating, text}   (logged-in public user)
//   POST reviews.php {action:"toggle", id:"RV-12"}               (admin: hide / restore)
require_once __DIR__ . "/data.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    json_out(["success" => true, "reviews" => load_reviews($pdo, current_user())]);
}

$body = read_json();
$action = (string) ($body["action"] ?? "");

try {
    if ($action === "create") {
        $user = require_role("public");
        $vendorId = (int) ($body["vendorId"] ?? 0);
        $rating = (int) ($body["rating"] ?? 0);
        $text = trim((string) ($body["text"] ?? ""));
        if ($rating < 1 || $rating > 5 || $text === "") fail("Choose a rating and write your review.");
        // fix D-04: unknown vendor -> clear 400 error instead of a database 500 error
        $stmt = $pdo->prepare("SELECT id FROM vendors WHERE id = ?");
        $stmt->execute([$vendorId]);
        if (!$stmt->fetch()) fail("Select a vendor.");
        $pdo->prepare("INSERT INTO reviews (user_id, vendor_id, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)")
            ->execute([$user["id"], $vendorId, $rating, $text, now_sql()]);
        json_out(["success" => true]);
    }

    if ($action === "toggle") {
        require_role(STAFF_ROLES);
        $id = (int) str_replace("RV-", "", (string) ($body["id"] ?? ""));
        $pdo->prepare("UPDATE reviews SET hidden = 1 - hidden WHERE id = ?")->execute([$id]);
        json_out(["success" => true]);
    }

    fail("Unknown action");
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not save the review", 500);
}
