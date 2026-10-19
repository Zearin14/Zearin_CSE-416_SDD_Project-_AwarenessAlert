<?php
// Vendors
//   GET  vendors.php                               -> all vendors
//   POST vendors.php {id, badges:[...], approval:{...}}   (admin: verification badges + approval list)
require_once __DIR__ . "/data.php";

if ($_SERVER["REQUEST_METHOD"] === "GET") {
    try {
        json_out(["success" => true, "vendors" => load_vendors($pdo)]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        fail("Could not load vendors", 500);
    }
}

require_role("admin");
$body = read_json();
$id = (int) ($body["id"] ?? 0);
$allowed = ["BSTI", "DNCRP", "Accredited Laboratory"];

try {
    if (isset($body["badges"]) && is_array($body["badges"])) {
        $badges = array_values(array_intersect($allowed, $body["badges"]));
        $pdo->prepare("UPDATE vendors SET badges = ?, verified_date = ? WHERE id = ?")
            ->execute([implode(",", $badges), $badges ? date("j M Y") : "", $id]);
    }
    if (isset($body["approval"]) && is_array($body["approval"])) {
        $pdo->prepare("UPDATE vendors SET approval_json = ? WHERE id = ?")
            ->execute([json_encode($body["approval"]), $id]);
    }
    json_out(["success" => true]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not update the vendor", 500);
}
