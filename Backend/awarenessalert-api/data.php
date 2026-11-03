<?php
// Loads everything the website needs in ONE request:
//   GET http://localhost/awarenessalert-api/data.php
// What you get back depends on who is logged in (role-based access):
//   - public/guests: no IP addresses, device IDs, internal notes or removed reports
//   - organizations: + internal notes for reports routed to them
//   - admin: everything, including the audit history
require_once __DIR__ . "/db.php";
require_once __DIR__ . "/vendor_schema.php";
try {
    ensure_vendor_schema($pdo); // adds the vendor portal tables online if they are missing
} catch (PDOException $e) {
    error_log($e->getMessage());
}

function load_vendors($pdo, $user = null)
{
    $staff = in_array($user["role"] ?? "", STAFF_ROLES, true);
    $bandFromStatus = ["green" => "Trusted", "amber" => "Caution", "red" => "High risk", "grey" => "Observation"];
    $rows = $pdo->query("SELECT * FROM vendors ORDER BY name ASC")->fetchAll();
    $out = [];
    foreach ($rows as $v) {
        $approval = json_decode($v["approval_json"] ?? "", true);
        $out[] = [
            "id" => (string) $v["id"],
            "name" => $v["name"],
            "brand" => $v["brand"],
            "area" => $v["area"] ?: "Dhaka",
            "address" => $v["address"],
            "kind" => $v["category"] ?: "Vendor",
            "previousBand" => $bandFromStatus[$v["trust_status"]] ?? "Observation",
            "badges" => $v["badges"] === "" ? [] : explode(",", $v["badges"]),
            "approval" => is_array($approval) && $approval ? $approval : new stdClass(),
            "verifiedDate" => $v["verified_date"],
            "lat" => (float) $v["latitude"],
            "lng" => (float) $v["longitude"],
            // vendor portal (columns exist after upgrade.php)
            "ownerVerified" => isset($v["owner_user_id"]) && $v["owner_user_id"] !== null,
            "ownerUserId" => ($staff || ($user && (string) ($v["owner_user_id"] ?? "") === (string) $user["id"]))
                && isset($v["owner_user_id"]) ? (string) $v["owner_user_id"] : null,
            "phone" => (string) ($v["phone"] ?? ""),
            "openingHours" => (string) ($v["opening_hours"] ?? ""),
            "shopDescription" => (string) ($v["shop_description"] ?? ""),
        ];
    }
    return $out;
}

function load_reports($pdo, $user)
{
    $role = $user["role"] ?? "guest";
    $staff = in_array($role, STAFF_ROLES, true);
    $sql = "SELECT r.*, u.id AS uid FROM reports r LEFT JOIN users u ON u.id = r.user_id";
    if (!$staff) $sql .= " WHERE r.moderation_status <> 'Removed'";
    $sql .= " ORDER BY r.created_at DESC, r.id DESC";
    $rows = $pdo->query($sql)->fetchAll();

    $base = "http://" . ($_SERVER["HTTP_HOST"] ?? "localhost") . rtrim(dirname($_SERVER["SCRIPT_NAME"] ?? "/awarenessalert-api/x"), "/\\");
    $out = [];
    foreach ($rows as $r) {
        $isOwner = $user && $r["uid"] !== null && (string) $r["uid"] === (string) $user["id"];
        $orgCanSee = $role === "org" && $r["routed_to"] === $user["organization"];
        $out[] = [
            "id" => $r["report_code"],
            "vendorId" => (string) $r["vendor_id"],
            "category" => $r["category"],
            "description" => $r["description"],
            "location" => $r["location"],
            "evidence" => (bool) $r["has_evidence"],
            "evidenceImage" => $r["evidence_image_path"] ? $base . "/" . $r["evidence_image_path"] : null,
            "submittedAt" => iso($r["created_at"]),
            "reporterTier" => $r["reporter_tier"],
            "reporterId" => ($staff || $isOwner) && $r["uid"] !== null ? (string) $r["uid"] : null,
            "anonymous" => (bool) $r["anonymous"],
            "ip" => $staff ? (string) $r["ip_address"] : "",
            "deviceId" => $staff ? (string) $r["device_id"] : "",
            "moderationStatus" => $r["moderation_status"],
            "authorityOutcome" => $r["authority_outcome"],
            "routedTo" => $r["routed_to"],
            "outcomePublicComment" => (string) $r["outcome_public_comment"],
            "outcomeInternalNote" => ($staff || $orgCanSee) ? (string) $r["outcome_internal_note"] : "",
            "outcomeSetBy" => (string) $r["outcome_set_by"],
            "outcomeSetAt" => iso($r["outcome_set_at"]),
        ];
    }
    return $out;
}

// fix D-05: reviews hidden by a moderator are only sent to staff (so they can restore them)
function load_reviews($pdo, $user = null)
{
    $staff = in_array($user["role"] ?? "", STAFF_ROLES, true);
    $rows = $pdo->query("SELECT * FROM reviews" . ($staff ? "" : " WHERE hidden = 0") . " ORDER BY created_at DESC, id DESC")->fetchAll();
    $out = [];
    foreach ($rows as $r) {
        $out[] = [
            "id" => "RV-" . $r["id"],
            "vendorId" => (string) $r["vendor_id"],
            "userId" => (string) $r["user_id"],
            "rating" => (int) $r["rating"],
            "text" => $r["comment"],
            "date" => iso($r["created_at"]),
            "hidden" => (bool) $r["hidden"],
            "flags" => (int) $r["flags"],
        ];
    }
    return $out;
}

function load_users($pdo)
{
    $rows = $pdo->query("SELECT id, name, role, organization, title FROM users")->fetchAll();
    return array_map("public_user", $rows);
}

function load_audit($pdo, $user)
{
    if (!in_array($user["role"] ?? "", STAFF_ROLES, true)) return [];
    $rows = $pdo->query(
        "SELECT a.*, r.report_code FROM report_actions a JOIN reports r ON r.id = a.report_id ORDER BY a.created_at DESC, a.id DESC"
    )->fetchAll();
    $out = [];
    foreach ($rows as $a) {
        $out[] = [
            "id" => "audit-" . $a["id"],
            "reportId" => $a["report_code"],
            "action" => $a["action"],
            "actor" => $a["actor"],
            "at" => iso($a["created_at"]),
        ];
    }
    return $out;
}

// Shop claims: the admin sees all of them, a vendor sees only their own
function load_vendor_claims($pdo, $user)
{
    $role = $user["role"] ?? "";
    if ($role !== "admin" && $role !== "vendor") return [];
    try {
        $sql = "SELECT c.*, u.name AS user_name, u.login AS user_login, v.name AS vendor_name
                FROM vendor_claims c JOIN users u ON u.id = c.user_id JOIN vendors v ON v.id = c.vendor_id";
        if ($role === "vendor") $sql .= " WHERE c.user_id = " . (int) $user["id"];
        $rows = $pdo->query($sql . " ORDER BY FIELD(c.status, 'Pending', 'Approved', 'Rejected'), c.created_at DESC")->fetchAll();
    } catch (PDOException $e) {
        return []; // vendor portal not installed yet (upgrade.php)
    }
    return array_map(function ($c) {
        return [
            "id" => (string) $c["id"],
            "userId" => (string) $c["user_id"],
            "userName" => $c["user_name"],
            "userLogin" => $c["user_login"],
            "vendorId" => (string) $c["vendor_id"],
            "vendorName" => $c["vendor_name"],
            "businessRole" => $c["business_role"],
            "phone" => $c["phone"],
            "tradeLicense" => $c["trade_license"],
            "message" => $c["message"],
            "status" => $c["status"],
            "adminNote" => $c["admin_note"],
            "decidedBy" => $c["decided_by"],
            "createdAt" => iso($c["created_at"]),
            "decidedAt" => iso($c["decided_at"]),
        ];
    }, $rows);
}

// Vendor replies are public. Dispute reasons are only shown to staff and the shop owner.
function load_vendor_responses($pdo, $user)
{
    $role = $user["role"] ?? "guest";
    $staff = in_array($role, STAFF_ROLES, true);
    try {
        $sql = "SELECT d.*, r.report_code, r.moderation_status, v.owner_user_id
                FROM vendor_responses d JOIN reports r ON r.id = d.report_id JOIN vendors v ON v.id = d.vendor_id";
        if (!$staff) $sql .= " WHERE r.moderation_status <> 'Removed'";
        $rows = $pdo->query($sql . " ORDER BY d.created_at DESC, d.id DESC")->fetchAll();
    } catch (PDOException $e) {
        return [];
    }
    $out = [];
    foreach ($rows as $d) {
        $isOwner = $user && (string) $d["owner_user_id"] === (string) $user["id"];
        $private = $d["kind"] === "dispute" && !$staff && !$isOwner;
        $out[] = [
            "id" => "VR-" . $d["id"],
            "reportId" => $d["report_code"],
            "vendorId" => (string) $d["vendor_id"],
            "kind" => $d["kind"],
            "body" => $private ? "" : $d["body"],
            "status" => $d["status"],
            "moderatorNote" => ($staff || $isOwner) ? $d["moderator_note"] : "",
            "decidedBy" => ($staff || $isOwner) ? $d["decided_by"] : "",
            "createdAt" => iso($d["created_at"]),
            "updatedAt" => iso($d["updated_at"]),
            "decidedAt" => iso($d["decided_at"]),
        ];
    }
    return $out;
}

function session_payload()
{
    $user = current_user();
    return $user ? ["userId" => (string) $user["id"], "role" => $user["role"], "organization" => $user["organization"]] : null;
}

// Only run when this file is opened directly (not when included)
if (basename($_SERVER["SCRIPT_FILENAME"] ?? "") === "data.php") {
    try {
        $user = current_user();
        json_out([
            "success" => true,
            "vendors" => load_vendors($pdo, $user),
            "reports" => load_reports($pdo, $user),
            "reviews" => load_reviews($pdo, $user),
            "users" => load_users($pdo),
            "auditLog" => load_audit($pdo, $user),
            "session" => session_payload(),
            "vendorClaims" => load_vendor_claims($pdo, $user),
            "vendorResponses" => load_vendor_responses($pdo, $user),
        ]);
    } catch (PDOException $e) {
        error_log($e->getMessage());
        fail("Could not load data. Did you open setup.php once?", 500);
    }
}
