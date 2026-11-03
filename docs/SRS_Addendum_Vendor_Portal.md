# SRS Addendum — Vendor Portal (AwarenessAlert v1.1)

This addendum extends the Software Requirements Specification v2.0. In v2.0 the Vendor role was
listed as a future phase. It is now implemented. Paste the sections below into the Final Project
Report ("Changes after the SRS") and attach the updated diagrams.

---

## 1. Changes after the SRS (summary for the Final Report)

During development the scope grew beyond SRS v2.0:

1. **MySQL database for all data.** Reports, photos, accounts, reviews, audit history and
   settings are stored in MySQL through a PHP API (earlier versions used browser storage).
2. **Moderator role and Team page.** The admin can add moderators and organization staff,
   turn accounts off/on and reset passwords; every staff member can change their own password.
3. **Login history.** Every login, failed attempt and logout is recorded with time, IP address and browser.
4. **Vendor portal (previously "future phase").** A fifth user class, **Vendor**, can claim a
   shop, reply publicly to reports, dispute unfair reports and update shop information. This gives
   reported vendors a **right of reply**, which completes the fairness design of the system.
5. **Automated testing.** Unit, integration, end-to-end, accessibility and performance tests
   (see the Software Test Report).

---

## 2. New user class: Vendor

| User class | Description | Access |
|---|---|---|
| Vendor | Owner, manager or authorised staff of a listed shop | Vendor portal only, after the admin approves the shop claim |

---

## 3. New functional requirements — Feature 12: Vendor Portal

| ID | Requirement |
|---|---|
| FR-12.1 | The system shall let a shop owner create a vendor account (name, email/phone, password of at least 8 characters) and log in on a separate Vendor login page. |
| FR-12.2 | A vendor shall claim exactly one shop by giving a role (Owner/Manager/Authorised staff), business phone and trade licence number. The claim shall stay **Pending** until the admin **approves** or **rejects** it; a rejection shall include a reason. A shop shall have at most one verified owner; when one claim is approved, other pending claims for the same shop shall be rejected automatically. |
| FR-12.3 | An approved vendor shall see a dashboard with the shop's trust status and score, all public reports about the shop, and its customer reviews. A vendor shall never see or act on another shop. |
| FR-12.4 | An approved vendor shall be able to post one public reply (10–1000 characters) to any non-removed report about its shop, and edit it later. The reply shall be shown under the report to all users. |
| FR-12.5 | An approved vendor shall be able to dispute a report that is **Pending** or **Verified**, with a reason of at least 15 characters, and only one open dispute per report. An admin or moderator shall **accept** (the report becomes **Disputed** and no longer counts towards the trust status) or **reject** the dispute. Escalated reports cannot be disputed; the authority decides them. |
| FR-12.6 | Dispute reasons and moderator notes shall be visible only to staff and the shop owner. The public shall only see that a dispute is open or decided. |
| FR-12.7 | An approved vendor shall be able to update the shop's phone, opening hours and description shown on the public vendor profile. The vendor shall not be able to change the trust status. |
| FR-12.8 | Every vendor reply, dispute and dispute decision shall be written to the report's audit history. |

---

## 4. New database tables (ER diagram additions)

| Table | Key columns | Relationships |
|---|---|---|
| `vendor_claims` | id, user_id, vendor_id, business_role, phone, trade_license, message, status (Pending/Approved/Rejected), admin_note, decided_by, created_at, decided_at | users 1 — N vendor_claims; vendors 1 — N vendor_claims |
| `vendor_responses` | id, report_id, vendor_id, user_id, kind (reply/dispute), body, status (Published/Open/Accepted/Rejected), moderator_note, decided_by, created_at, updated_at, decided_at | reports 1 — N vendor_responses; vendors 1 — N vendor_responses |
| `vendors` (new columns) | owner_user_id, phone, opening_hours, shop_description | users 1 — 0..1 vendors (verified owner) |
| `users` (changed) | role now also allows `vendor` | — |

---

## 5. Diagram updates

- **Use case diagram:** add actor **Vendor** with use cases *Register & claim shop*, *View
  dashboard*, *Reply to report*, *Dispute report*, *Update shop information*. Add to **Admin**:
  *Approve/reject shop claim*. Add to **Moderator/Admin**: *Decide vendor dispute*.
- **ER diagram:** add the two tables and the `vendors.owner_user_id → users.id` relationship above.
- **DFD Level 1:** add process **"Vendor response handling"** between the Vendor entity and the
  reports / vendor_responses data stores, and **"Claim verification"** between Admin and vendor_claims.
- **Class diagram:** add classes `VendorClaim` and `VendorResponse` (see `src/logic.ts`).
- **Sequence diagram (dispute):** Vendor → Vendor portal → `vendor_portal.php` (dispute) →
  vendor_responses (Open) → Moderator → `vendor_portal.php` (decide_dispute) → reports (Disputed)
  → report_actions (audit).

---

## 6. Test coverage

14 unit test cases (TC-U63 – TC-U76) and 20 integration test cases (IT-140 – IT-159) cover
FR-12.1 – FR-12.8. See `docs/testing/TEST_CASES.md` (Addendum).
