<?php
// Moderation + authority actions on one report.
//   Admin:        POST {id:"AA-01005", action:"status", status:"Verified"|"Disputed"|"Pending"|"Removed"|"Escalated", label, routedTo?}
//   Organization: POST {id:"AA-01005", action:"outcome", outcome:"Awaiting"|"Confirmed"|"Cleared", publicComment, internalNote}
// Every change is written to the report_actions table (audit history).
require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Method not allowed", 405);

$body = read_json();
$code = (string) ($body["id"] ?? "");
$action = (string) ($body["action"] ?? "");
$orgs = ["BSTI", "DNCRP", "Accredited Laboratory"];

try {
    $stmt = $pdo->prepare("SELECT * FROM reports WHERE report_code = ?");
    $stmt->execute([$code]);
    $report = $stmt->fetch();
    if (!$report) fail("Report not found", 404);

    if ($action === "status") {
        $user = require_role(STAFF_ROLES); // admin or moderator
        $next = (string) ($body["status"] ?? "");
        $label = trim((string) ($body["label"] ?? "")) ?: "Status set to $next";
        if (!in_array($next, ["Pending", "Verified", "Escalated", "Disputed", "Removed"], true)) fail("Invalid status");

        $outcome = $report["authority_outcome"];
        $routed = $report["routed_to"];
        if ($next === "Escalated") {
            $routed = (string) ($body["routedTo"] ?? "");
            if (!in_array($routed, $orgs, true)) fail("Choose a valid organization");
            if ($report["moderation_status"] !== "Verified") fail("Only verified reports can be sent to an authority.");
            $outcome = "Awaiting";
        } elseif ($report["moderation_status"] === "Escalated" && $next === "Verified") {
            $outcome = null; // escalation recalled
            $routed = null;
        }

        $pdo->prepare("UPDATE reports SET moderation_status = ?, authority_outcome = ?, routed_to = ?, updated_at = ? WHERE id = ?")
            ->execute([$next, $outcome, $routed, now_sql(), $report["id"]]);
        log_action($pdo, $report["id"], $label, $user["name"]);
        json_out(["success" => true]);
    }

    if ($action === "outcome") {
        $user = require_role("org");
        if ($report["moderation_status"] !== "Escalated" || $report["routed_to"] !== $user["organization"]) {
            fail("This report is not assigned to your organization.", 403);
        }
        $outcome = (string) ($body["outcome"] ?? "");
        $public = trim((string) ($body["publicComment"] ?? ""));
        $internal = trim((string) ($body["internalNote"] ?? ""));
        if (!in_array($outcome, ["Awaiting", "Confirmed", "Cleared"], true)) fail("Invalid outcome");
        if ($outcome !== "Awaiting" && $public === "") fail("A public comment is required for Confirmed or Cleared outcomes.");
        if (text_length($public) > 280) fail("Public comment must be 280 characters or fewer.");

        $pdo->prepare("UPDATE reports SET authority_outcome = ?, outcome_public_comment = ?, outcome_internal_note = ?,
                       outcome_set_by = ?, outcome_set_at = ?, updated_at = ? WHERE id = ?")
            ->execute([$outcome, $public, $internal, $user["organization"], now_sql(), now_sql(), $report["id"]]);
        log_action($pdo, $report["id"], "Authority outcome set to $outcome", $user["organization"]);
        json_out(["success" => true]);
    }

    fail("Unknown action");
} catch (PDOException $e) {
    error_log($e->getMessage());
    fail("Could not update the report", 500);
}
