<?php
// Vendor portal API (right of reply for reported vendors)
//
// Vendor (shop owner / manager):
//   POST {action:"register", name, login, password, vendorId, businessRole, phone, tradeLicense, message}
//          -> creates a vendor account + a shop claim that waits for the admin (no login needed before)
//   POST {action:"claim", vendorId, businessRole, phone, tradeLicense, message}   -> claim again after a rejection
//   POST {action:"reply", reportId, text}         -> public reply on a report about their shop (edit = send again)
//   POST {action:"dispute", reportId, reason}     -> ask a moderator to mark a report as Disputed
//   POST {action:"update_info", phone, openingHours, description}
// Admin:
//   POST {action:"decide_claim", claimId, decision:"Approved"|"Rejected", note}
// Admin or moderator:
//   POST {action:"decide_dispute", responseId, decision:"Accepted"|"Rejected", note}
require_once __DIR__ . "/db.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") fail("Method not allowed", 405);

$body = read_json();
$action = (string) ($body["action"] ?? "");
$str = function ($key, $max) use ($body) {
    $value = trim((string) ($body[$key] ?? ""));
    if (text_length($value) > $max) fail("'$key' must be $max characters or fewer.");
    return $value;
};

// The shop this vendor account is the approved owner of (or fail)
function owned_vendor($pdo, $user)
{
    $stmt = $pdo->prepare("SELECT * FROM vendors WHERE owner_user_id = ?");
    $stmt->execute([$user["id"]]);
    $vendor = $stmt->fetch();
    if (!$vendor) fail("Your shop claim has not been approved by the admin yet.", 403);
    return $vendor;
}

// A report that belongs to the vendor's own shop (or fail)
function own_report($pdo, $vendor, $code)
{
    $stmt = $pdo->prepare("SELECT * FROM reports WHERE report_code = ? AND vendor_id = ?");
    $stmt->execute([$code, $vendor["id"]]);
    $report = $stmt->fetch();
    if (!$report || $report["moderation_status"] === "Removed") fail("This report is not about your shop.", 404);
    return $report;
}

function validate_claim($pdo, $str, $body)
{
    $vendorId = (int) ($body["vendorId"] ?? 0);
    $stmt = $pdo->prepare("SELECT id, name, owner_user_id FROM vendors WHERE id = ?");
    $stmt->execute([$vendorId]);
    $vendor = $stmt->fetch();
    if (!$vendor) fail("Choose your shop from the list.");
    if ($vendor["owner_user_id"] !== null) fail("This shop already has a verified owner. Contact the admin if this is a mistake.", 409);
    $role = $str("businessRole", 50) ?: "Owner";
    if (!in_array($role, ["Owner", "Manager", "Authorised staff"], true)) fail("Choose Owner, Manager or Authorised staff.");
    $phone = $str("phone", 30);
    if (!preg_match('/^[0-9+\- ]{6,30}$/', $phone)) fail("Enter a valid phone number.");
    $license = $str("tradeLicense", 60);
    if ($license === "") fail("Enter your trade licence number so the admin can verify you.");
    return [$vendor, $role, $phone, $license, $str("message", 500)];
}

function insert_claim($pdo, $userId, $claim)
{
    [$vendor, $role, $phone, $license, $message] = $claim;
    $pdo->prepare("INSERT INTO vendor_claims (user_id, vendor_id, business_role, phone, trade_license, message, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?)")
        ->execute([$userId, $vendor["id"], $role, $phone, $license, $message, now_sql()]);
}

try {
    // ---------- New vendor account + shop claim ----------
    if ($action === "register") {
        $name = $str("name", 100);
        $login = $str("login", 150);
        $password = (string) ($body["password"] ?? "");
        if ($name === "" || $login === "") fail("Name and email/phone are required.");
        if (text_length($password) < 8) fail("The password must be at least 8 characters.");
        $claim = validate_claim($pdo, $str, $body);

        $stmt = $pdo->prepare("SELECT id FROM users WHERE LOWER(login) = LOWER(?)");
        $stmt->execute([$login]);
        if ($stmt->fetch()) fail("An account with this email or phone already exists.", 409);

        $pdo->beginTransaction();
        $pdo->prepare("INSERT INTO users (name, login, password_hash, role, title, active, created_at) VALUES (?, ?, ?, 'vendor', ?, 1, ?)")
            ->execute([$name, $login, password_hash($password, PASSWORD_DEFAULT), $claim[1] . ", " . $claim[0]["name"], now_sql()]);
        $userId = (int) $pdo->lastInsertId();
        insert_claim($pdo, $userId, $claim);
        $pdo->commit();

        $row = ["id" => $userId, "name" => $name, "login" => $login, "role" => "vendor", "organization" => null, "title" => $claim[1]];
        session_regenerate_id(true);
        $_SESSION["user"] = public_user($row);
        log_login($pdo, $row, $login, "login", "New vendor account created");
        json_out(["success" => true]);
    }

    // everything below needs a logged-in account
    if (in_array($action, ["claim", "reply", "dispute", "update_info"], true)) {
        $user = require_role("vendor");

        if ($action === "claim") {
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM vendor_claims WHERE user_id = ? AND status IN ('Pending','Approved')");
            $stmt->execute([$user["id"]]);
            if ((int) $stmt->fetchColumn() > 0) fail("You already have a shop claim that is pending or approved.");
            insert_claim($pdo, $user["id"], validate_claim($pdo, $str, $body));
            json_out(["success" => true]);
        }

        $vendor = owned_vendor($pdo, $user);

        if ($action === "update_info") {
            $phone = $str("phone", 30);
            if ($phone !== "" && !preg_match('/^[0-9+\- ]{6,30}$/', $phone)) fail("Enter a valid phone number.");
            $pdo->prepare("UPDATE vendors SET phone = ?, opening_hours = ?, shop_description = ? WHERE id = ?")
                ->execute([$phone, $str("openingHours", 100), $str("description", 500), $vendor["id"]]);
            json_out(["success" => true]);
        }

        $report = own_report($pdo, $vendor, (string) ($body["reportId"] ?? ""));

        if ($action === "reply") {
            $text = $str("text", 1000);
            if (text_length($text) < 10) fail("Write at least 10 characters.");
            $stmt = $pdo->prepare("SELECT id FROM vendor_responses WHERE report_id = ? AND kind = 'reply'");
            $stmt->execute([$report["id"]]);
            $existing = $stmt->fetchColumn();
            if ($existing) {
                $pdo->prepare("UPDATE vendor_responses SET body = ?, user_id = ?, updated_at = ? WHERE id = ?")
                    ->execute([$text, $user["id"], now_sql(), $existing]);
                log_action($pdo, $report["id"], "Vendor edited its public reply", $user["name"] . " (vendor)");
            } else {
                $pdo->prepare("INSERT INTO vendor_responses (report_id, vendor_id, user_id, kind, body, status, created_at)
                               VALUES (?, ?, ?, 'reply', ?, 'Published', ?)")
                    ->execute([$report["id"], $vendor["id"], $user["id"], $text, now_sql()]);
                log_action($pdo, $report["id"], "Vendor posted a public reply", $user["name"] . " (vendor)");
            }
            json_out(["success" => true]);
        }

        if ($action === "dispute") {
            $reason = $str("reason", 1000);
            if (text_length($reason) < 15) fail("Explain the reason in at least 15 characters.");
            if (!in_array($report["moderation_status"], ["Pending", "Verified"], true)) {
                fail($report["moderation_status"] === "Escalated"
                    ? "This report is with an authority. Post a public reply instead; the authority decides the outcome."
                    : "Only Pending or Verified reports can be disputed.");
            }
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM vendor_responses WHERE report_id = ? AND kind = 'dispute' AND status = 'Open'");
            $stmt->execute([$report["id"]]);
            if ((int) $stmt->fetchColumn() > 0) fail("You already have an open dispute for this report.");
            $pdo->prepare("INSERT INTO vendor_responses (report_id, vendor_id, user_id, kind, body, status, created_at)
                           VALUES (?, ?, ?, 'dispute', ?, 'Open', ?)")
                ->execute([$report["id"], $vendor["id"], $user["id"], $reason, now_sql()]);
            log_action($pdo, $report["id"], "Vendor disputed this report", $user["name"] . " (vendor)");
            json_out(["success" => true]);
        }
    }

    // ---------- Admin: approve / reject a shop claim ----------
    if ($action === "decide_claim") {
        $admin = require_role("admin");
        $decision = (string) ($body["decision"] ?? "");
        if (!in_array($decision, ["Approved", "Rejected"], true)) fail("Choose Approve or Reject.");
        $note = $str("note", 255);
        if ($decision === "Rejected" && $note === "") fail("Write a short reason so the vendor knows why.");

        $stmt = $pdo->prepare("SELECT c.*, v.owner_user_id FROM vendor_claims c JOIN vendors v ON v.id = c.vendor_id WHERE c.id = ?");
        $stmt->execute([(int) ($body["claimId"] ?? 0)]);
        $claim = $stmt->fetch();
        if (!$claim) fail("Claim not found.", 404);
        if ($claim["status"] !== "Pending") fail("This claim was already decided.");
        if ($decision === "Approved" && $claim["owner_user_id"] !== null) fail("This shop already has a verified owner.", 409);

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE vendor_claims SET status = ?, admin_note = ?, decided_by = ?, decided_at = ? WHERE id = ?")
            ->execute([$decision, $note, $admin["name"], now_sql(), $claim["id"]]);
        if ($decision === "Approved") {
            $pdo->prepare("UPDATE vendors SET owner_user_id = ?, phone = IF(phone = '', ?, phone) WHERE id = ?")
                ->execute([$claim["user_id"], $claim["phone"], $claim["vendor_id"]]);
            // other people's pending claims for the same shop are closed automatically
            $pdo->prepare("UPDATE vendor_claims SET status = 'Rejected', admin_note = 'Another owner was verified for this shop.',
                           decided_by = ?, decided_at = ? WHERE vendor_id = ? AND status = 'Pending'")
                ->execute([$admin["name"], now_sql(), $claim["vendor_id"]]);
        }
        $pdo->commit();
        json_out(["success" => true]);
    }

    // ---------- Admin / moderator: decide a vendor dispute ----------
    if ($action === "decide_dispute") {
        $staff = require_role(STAFF_ROLES);
        $decision = (string) ($body["decision"] ?? "");
        if (!in_array($decision, ["Accepted", "Rejected"], true)) fail("Choose Accept or Reject.");
        $note = $str("note", 255);

        $stmt = $pdo->prepare("SELECT d.*, r.moderation_status, r.report_code FROM vendor_responses d JOIN reports r ON r.id = d.report_id
                               WHERE d.id = ? AND d.kind = 'dispute'");
        $stmt->execute([(int) str_replace("VR-", "", (string) ($body["responseId"] ?? ""))]);
        $dispute = $stmt->fetch();
        if (!$dispute) fail("Dispute not found.", 404);
        if ($dispute["status"] !== "Open") fail("This dispute was already decided.");
        if ($decision === "Accepted" && !in_array($dispute["moderation_status"], ["Pending", "Verified"], true)) {
            fail("The report is now " . $dispute["moderation_status"] . ", so it can no longer be marked Disputed.");
        }

        $pdo->beginTransaction();
        $pdo->prepare("UPDATE vendor_responses SET status = ?, moderator_note = ?, decided_by = ?, decided_at = ? WHERE id = ?")
            ->execute([$decision, $note, $staff["name"], now_sql(), $dispute["id"]]);
        if ($decision === "Accepted") {
            // a disputed report no longer counts towards the vendor's trust status
            $pdo->prepare("UPDATE reports SET moderation_status = 'Disputed', updated_at = ? WHERE id = ?")
                ->execute([now_sql(), $dispute["report_id"]]);
            log_action($pdo, $dispute["report_id"], "Vendor dispute accepted - report marked Disputed", $staff["name"]);
        } else {
            log_action($pdo, $dispute["report_id"], "Vendor dispute rejected", $staff["name"]);
        }
        $pdo->commit();
        json_out(["success" => true]);
    }

    fail("Unknown action");
} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log($e->getMessage());
    fail("Could not save. If the Vendor portal is new on this computer, open upgrade.php once.", 500);
}
