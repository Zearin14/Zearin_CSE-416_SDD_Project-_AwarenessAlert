# Test Case Summary (full)

AwarenessAlert v0.9-test — all 168 automated test cases. Type: + positive, − negative, ± both. Summary version: Test Report §5.1.

| TC ID | Req ID | Title | Level | Technique | Pri | +/− | Auto | Source | Result |
|---|---|---|---|---|---|---|---|---|---|
| TC-U01 | FR-2.8, FR-4.2 | one verified report does not change the vendor status | Unit | BVA | P1 | ± | Y | Own | Pass |
| TC-U02 | FR-4.2 | two independent sources (boundary 3-1) are not enough | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U03 | FR-4.2 | three independent sources (boundary) change the status | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U04 | FR-5.2 | three reports from the same device count as ONE source | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U05 | FR-5.2 | a logged-in reporter is one source even from different devices | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U06 | FR-4.2 | a report exactly 30 days old still counts (boundary) | Unit | BVA | P1 | ± | Y | Own | Pass |
| TC-U07 | FR-4.2 | a report 30 days + 1 minute old does not count (boundary + 1) | Unit | BVA | P1 | ± | Y | Own | Pass |
| TC-U08 | FR-4.2, FR-4.4 | one authority confirmation alone changes the status | Unit | Decision table | P1 | + | Y | Own | Pass |
| TC-U09 | FR-4.1 | removed reports are ignored completely | Unit | Decision table | P1 | − | Y | Own | Pass |
| TC-U10 | FR-4.4, BR-5 | pending, disputed and cleared reports add no weight | Unit | Decision table | P1 | − | Y | Own | Pass |
| TC-U11 | FR-4.6 | score 70 is Trusted (lower edge of Trusted) | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U12 | FR-4.6 | score 40 is Caution (lower edge of Caution) | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U13 | FR-4.6 | score 38 is High risk (below 40) | Unit | BVA | P1 | − | Y | Own | Pass |
| TC-U14 | FR-4.5 | score never drops below the floor of 18 | Unit | BVA | P2 | ± | Y | Own | Pass |
| TC-U15 | FR-4.3 | a vendor under Observation keeps score 0 until the threshold is met | Unit | EP | P2 | ± | Y | Own | Pass |
| TC-U16 | FR-4.6 | previous bands give their default scores | Unit | EP | P2 | + | Y | Own | Pass |
| TC-U17 | FR-4.7 | three reports within 48 hours is a spike | Unit | BVA | P2 | ± | Y | Own | Pass |
| TC-U18 | FR-4.7 | two reports within 48 hours is not a spike | Unit | BVA | P2 | ± | Y | Own | Pass |
| TC-U19 | FR-4.7 | six reports in total is a spike even if old | Unit | BVA | P2 | ± | Y | Own | Pass |
| TC-U20 | FR-8.5, SA-3 | public label and colour for every status/outcome (7 cases) | Unit | Decision table | P2 | + | Y | Own | Pass |
| TC-U21 | FR-9.4 | hidden reviews are excluded from count and average | Unit | EP | P2 | − | Y | Own | Pass |
| TC-U22 | FR-6.4 | a vendor with no reviews has average 0 (no division by zero) | Unit | BVA | P3 | − | Y | Own | Pass |
| TC-U23 | SE-3 | only admin and moderator are staff | Unit | EP | P1 | ± | Y | Own | Pass |
| TC-U24 | FR-6.4 | an unknown vendor id returns a safe placeholder | Unit | Error guessing | P3 | − | Y | Own | Pass |
| TC-U25 | SI-1 | error messages are shown, unknown errors get a generic text | Unit | EP | P3 | − | Y | Own | Pass |
| TC-U26 | FR-6.5 | an empty date is shown as a dash | Unit | EP | P3 | ± | Y | Own | Pass |
| TC-U27 | FR-4.2 | reports about OTHER vendors are never counted | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U28 | FR-4.7 | a report exactly 48 hours old still counts towards a spike (boundary) | Unit | BVA | P2 | ± | Y | Own | Pass |
| TC-U29 | FR-9.5, BR-7 | one-star reviews do not change the trust score | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U30 | EX-1 | valid name, login and 8-character password is accepted (boundary) | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U31 | EX-1 | 7-character password is rejected (boundary - 1) | Unit | BVA | P1 | − | Y | Own | Pass |
| TC-U32 | EX-1 | 9-character password is accepted (boundary + 1) | Unit | BVA | P1 | + | Y | Own | Pass |
| TC-U33 | EX-1 | empty password is rejected | Unit | BVA | P1 | − | Y | Own | Pass |
| TC-U34 | EX-1 | empty or spaces-only name is rejected | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U35 | EX-1 | empty login is rejected | Unit | EP | P1 | − | Y | Own | Pass |
| TC-U36 | SE-3 | GET calls use the API base URL and send the session cookie | Unit | Use case | P2 | + | Y | Own | Pass |
| TC-U37 | EX-1 | POST calls send JSON with the right action | Unit | Use case | P2 | + | Y | Own | Pass |
| TC-U38 | SI-1 | a server error message is passed to the user | Unit | Error guessing | P2 | − | Y | Own | Pass |
| TC-U39 | FR-2.3 | success:false with HTTP 200 is still treated as an error | Unit | Error guessing | P2 | − | Y | Own | Pass |
| TC-U40 | EX-4 | a non-JSON reply (e.g. XAMPP stopped) gives a helpful message | Unit | Error guessing | P2 | − | Y | Own | Pass |
| TC-U41 | EX-4 | an error without a message falls back to 'Request failed' | Unit | Error guessing | P3 | − | Y | Own | Pass |
| TC-U42 | SE-2 | the login-history filter is URL-encoded (no query injection) | Unit | Error guessing | P2 | − | Y | Own | Pass |
| TC-U43 | FR-1.2 | every exported API helper sends its request to the correct PHP file | Unit | Use case | P2 | + | Y | Own | Pass |
| TC-U50 | FR-6.1 | vendors without coordinates are returned unchanged | Unit | EP | P3 | + | Y | Own | Pass |
| TC-U51 | FR-6.1 | west/east and north/south order is kept and pins stay inside the map | Unit | EP | P3 | + | Y | Own | Pass |
| TC-U52 | FR-6.1 | two vendors at the same spot are pushed apart so both pins are clickable | Unit | Error guessing | P3 | − | Y | Own | Pass |
| TC-U53 | FR-6.1 | a vendor with no coordinates keeps its own position among geo vendors | Unit | EP | P3 | + | Y | Own | Pass |
| TC-U54 | FR-6.1 | one label per area, centred under its vendors | Unit | EP | P3 | + | Y | Own | Pass |
| TC-U55 | FR-6.1 | one geo vendor (no spread) does not divide by zero | Unit | Error guessing | P3 | − | Y | Own | Pass |
| TC-U60 | FR-5.3 | counts reports from the same account in the last 30 days and in total | Unit | EP | P2 | + | Y | Own | Pass |
| TC-U61 | FR-5.3 | a guest is matched by device ID, and a logged-in report on that device is not mixed in | Unit | EP | P2 | − | Y | Own | Pass |
| TC-U62 | FR-5.3 | a first-time reporter shows 1 report | Unit | BVA | P3 | + | Y | Own | Pass |
| IT-01 | FR-1.2 | admin logs in with the correct password | Integ | EP | P1 | + | Y | Own | Pass |
| IT-02 | FR-1.2 | wrong password is rejected with a generic message | Integ | EP | P1 | − | Y | Own | Pass |
| IT-03 | FR-1.2 | unknown account gets the SAME message (no account enumeration) | Integ | EP | P1 | − | Y | Own | Pass |
| IT-04 | SE-2 | SQL injection in the login field does not log in | Integ | Error guessing | P1 | − | Y | Own | Pass |
| IT-05 | FR-1.3 | a public account cannot use the Admin login page | Integ | EP | P1 | − | Y | Own | Pass |
| IT-06 | FR-1.3 | a moderator CAN use the Admin login page | Integ | EP | P1 | + | Y | Own | Pass |
| IT-07 | FR-1.2 | login is case-insensitive for the email | Integ | EP | P1 | + | Y | Own | Pass |
| IT-08 | FR-1.5 | logout ends the session | Integ | State trans. | P2 | + | Y | Own | Pass |
| IT-10 | FR-1.1 | 7-character password is rejected (BVA min-1) | Integ | BVA | P1 | − | Y | Own | Pass |
| IT-11 | FR-1.1 | 8-character password is accepted and the user is logged in (BVA min) | Integ | BVA | P1 | + | Y | Own | Pass |
| IT-12 | FR-1.1 | the same email cannot register twice, even with other capitals | Integ | EP | P1 | − | Y | Own | Pass |
| IT-13 | FR-1.1, SI-4 | a 4-character Bangla password is rejected (multibyte EP) (defect D-02) | Integ | EP | P1 | − | Y | Own | Fail→Pass |
| IT-14 | FR-1.1, SI-1 | a name longer than 100 characters gets a clear 400 error, not a 500 (defect D-03) | Integ | BVA | P2 | − | Y | Own | Fail→Pass |
| IT-20 | FR-2.3 | 14-character description is rejected (BVA min-1) | Integ | BVA | P1 | − | Y | Own | Pass |
| IT-21 | FR-2.3, FR-2.7 | 15-character description is accepted; report starts as Pending (BVA min) | Integ | BVA | P1 | + | Y | Own | Pass |
| IT-22 | FR-2.1 | an invalid category is rejected | Integ | EP | P1 | − | Y | Own | Pass |
| IT-23 | FR-2.2 | an unknown vendor is rejected | Integ | EP | P1 | − | Y | Own | Pass |
| IT-24 | FR-2.4, SE-7 | a fake image (text renamed as PNG) is rejected | Integ | EP | P1 | − | Y | Own | Pass |
| IT-25 | FR-2.4, SE-7 | a GIF or PDF upload is rejected (only JPG/PNG allowed) | Integ | EP | P1 | − | Y | Own | Pass |
| IT-26 | FR-2.4 | a real PNG photo is saved as evidence | Integ | EP | P2 | + | Y | Own | Pass |
| IT-27 | FR-2.5, FR-2.6 | a logged-in user reporting anonymously is stored as Anonymous | Integ | EP | P2 | + | Y | Own | Pass |
| IT-30 | FR-5.1 | guests never see IP addresses, device IDs or internal notes | Integ | EP | P1 | − | Y | Own | Pass |
| IT-31 | FR-5.1 | guests never see Removed reports; admin does | Integ | EP | P1 | − | Y | Own | Pass |
| IT-32 | FR-11.3 | guests get no audit history; staff do | Integ | EP | P1 | − | Y | Own | Pass |
| IT-33 | FR-8.6 | an organization sees internal notes only for reports routed to it | Integ | EP | P1 | − | Y | Own | Pass |
| IT-40 | SE-3 | a guest cannot change a report status | Integ | EP | P1 | − | Y | Own | Pass |
| IT-41 | SE-3 | a public user and an organization cannot change a report status | Integ | EP | P1 | − | Y | Own | Pass |
| IT-42 | FR-3.5, BR-3 | a Pending report cannot be sent to an authority (must be Verified first) | Integ | State trans. | P1 | − | Y | Own | Pass |
| IT-43 | FR-3.5, FR-3.8 | Pending -> Verified -> Escalated(BSTI) sets the outcome to Awaiting and is audited | Integ | State trans. | P1 | + | Y | Own | Pass |
| IT-44 | FR-3.5 | escalating to an organization that does not exist is rejected | Integ | EP | P2 | − | Y | Own | Pass |
| IT-45 | FR-3.2 | an invalid status value is rejected | Integ | EP | P2 | − | Y | Own | Pass |
| IT-46 | FR-3.6 | recalling an escalation (Escalated -> Verified) clears the authority | Integ | State trans. | P2 | + | Y | Own | Pass |
| IT-47 | SI-1 | an unknown report id returns 404 | Integ | Error guessing | P3 | − | Y | Own | Pass |
| IT-50 | FR-8.2, SE-4 | BSTI cannot set the outcome of a report assigned to DNCRP (access control) | Integ | EP | P1 | − | Y | Own | Pass |
| IT-51 | SE-3 | a moderator cannot set an authority outcome | Integ | EP | P1 | − | Y | Own | Pass |
| IT-52 | FR-8.4, BR-4 | Confirmed without a public comment is rejected | Integ | Decision table | P1 | − | Y | Own | Pass |
| IT-53 | FR-8.3 | a public comment of 281 characters is rejected (BVA max+1) | Integ | BVA | P1 | − | Y | Own | Pass |
| IT-54 | FR-8.3, FR-8.5 | a public comment of 280 characters is accepted (BVA max) | Integ | BVA | P1 | + | Y | Own | Pass |
| IT-60 | EX-1, SE-3 | a moderator cannot open the staff list | Integ | EP | P1 | − | Y | Own | Pass |
| IT-61 | SE-1 | staff list never contains password hashes | Integ | Error guessing | P1 | − | Y | Own | Pass |
| IT-62 | EX-1 | a 7-character staff password is rejected (BVA) | Integ | BVA | P1 | − | Y | Own | Pass |
| IT-63 | EX-1 | organization staff must have a valid organization | Integ | EP | P1 | − | Y | Own | Pass |
| IT-64 | EX-1 | an admin role cannot be created from the Team page | Integ | EP | P1 | − | Y | Own | Pass |
| IT-65 | EX-1 | a valid moderator is created and can log in | Integ | Use case | P1 | + | Y | Own | Pass |
| IT-66 | EX-5 | a turned-off account is blocked immediately, even if already logged in | Integ | State trans. | P1 | − | Y | Own | Pass |
| IT-67 | EX-1 | the admin cannot turn off their own account | Integ | Error guessing | P2 | − | Y | Own | Pass |
| IT-68 | EX-3 | changing your own password needs the correct current password | Integ | EP | P2 | ± | Y | Own | Pass |
| IT-70 | FR-9.2 | a guest cannot write a review | Integ | EP | P1 | − | Y | Own | Pass |
| IT-71 | FR-9.2 | rating 0 and 6 are rejected (BVA outside 1–5) | Integ | BVA | P2 | − | Y | Own | Pass |
| IT-72 | FR-9.2 | rating 1 and 5 are accepted (BVA edges) | Integ | BVA | P2 | + | Y | Own | Pass |
| IT-73 | FR-9.2, SI-1 | a review for a vendor that does not exist gets a 400, not a 500 (defect D-04) | Integ | Error guessing | P2 | − | Y | Own | Fail→Pass |
| IT-74 | FR-9.4 | only staff can hide a review | Integ | EP | P2 | ± | Y | Own | Pass |
| IT-75 | FR-9.4 | a review hidden by a moderator is not sent to guests at all (defect D-05) | Integ | Error guessing | P2 | − | Y | Own | Fail→Pass |
| IT-80 | EX-2 | failed logins are recorded with a reason | Integ | Use case | P2 | + | Y | Own | Pass |
| IT-81 | EX-2 | only the admin can read login history | Integ | EP | P2 | − | Y | Own | Pass |
| IT-90 | FR-7.1 | the admin grants verification badges; the public sees them | Integ | Use case | P2 | + | Y | Own | Pass |
| IT-91 | FR-7.1, BR-6 | a moderator cannot change badges | Integ | EP | P2 | − | Y | Own | Pass |
| IT-92 | FR-7.1 | an unknown badge name is ignored (only BSTI, DNCRP, Accredited Laboratory) | Integ | EP | P3 | − | Y | Own | Pass |
| IT-93 | FR-7.2 | the admin edits Approval List fields and adds a new field; the public sees them (FR-7.2) | Integ | Use case | P2 | + | Y | Own | Pass |
| IT-100 | FR-3.2 | a Disputed report can be marked Verified (FR-3.2) | Integ | State trans. | P1 | + | Y | Own | Pass |
| IT-101 | FR-3.3 | a Verified report can be Disputed and a Disputed report re-opened to Pending (FR-3.3) | Integ | State trans. | P1 | + | Y | Own | Pass |
| IT-102 | FR-3.3 | a Verified report cannot jump back to Pending (only Disputed can be re-opened) | Integ | State trans. | P1 | − | Y | Own | Fail→Pass |
| IT-103 | FR-3.2 | a Removed report cannot be marked Verified (FR-3.2 allows only Pending/Disputed) | Integ | State trans. | P1 | − | Y | Own | Fail→Pass |
| IT-104 | FR-3.4, FR-3.7 | an Escalated report cannot be Removed or Disputed — it is locked (FR-3.4, FR-3.7) (defect  | Integ | State trans. | P1 | − | Y | Own | Fail→Pass |
| IT-105 | FR-3.6 | an escalation with outcome Confirmed cannot be recalled; the official outcome stays (FR-3. | Integ | State trans. | P1 | − | Y | Own | Fail→Pass |
| IT-106 | FR-3.4 | a Pending report can be Removed and is then hidden from the public (FR-3.4) | Integ | State trans. | P1 | + | Y | Own | Pass |
| IT-110 | FR-9.4 | a logged-in user can flag a review and staff see the flag count go up (defect D-10) | Integ | Use case | P2 | + | Y | Own | Fail→Pass |
| IT-111 | FR-9.4 | a guest cannot flag a review | Integ | EP | P2 | − | Y | Own | Fail→Pass |
| IT-120 | SI-2 | unsupported HTTP methods are rejected with 405 (defect D-11) | Integ | EP | P3 | − | Y | Own | Fail→Pass |
| IT-121 | SI-2, SE-6 | CORS pre-flight (OPTIONS) is answered with 204 | Integ | EP | P3 | + | Y | Own | Pass |
| IT-122 | SE-6 | CORS does not allow an untrusted website | Integ | Error guessing | P2 | − | Y | Own | Pass |
| IT-123 | PR-3 | report lists come newest first (SRS 5.1) | Integ | EP | P3 | + | Y | Own | Pass |
| IT-124 | FR-2.5, QA-6 | an anonymous reporter's identity is never sent to the public (FR-2.5, privacy) | Integ | EP | P1 | − | Y | Own | Pass |
| IT-125 | FR-5.5 | organization users never receive IP addresses or device IDs (FR-5.5) | Integ | EP | P1 | − | Y | Own | Pass |
| IT-126 | FR-2.6, FR-2.7 | the reporter tier is Identified when a logged-in user reports openly (FR-2.6) | Integ | Use case | P1 | + | Y | Own | Pass |
| IT-127 | FR-2.4, SA-2 | a 10 MB photo is accepted and a photo over 10 MB is rejected (FR-2.4, BVA) | Integ | BVA | P1 | ± | Y | Own | Pass |
| IT-129 | SI-3, SE-7 | uploaded evidence is saved under a generated image file name, never the user's name | Integ | Error guessing | P2 | − | Y | Own | Pass |
| IT-130 | SI-4 | a report written in Bangla is stored and returned unchanged (SRS 3.4 UTF-8) | Integ | EP | P2 | + | Y | Own | Pass |
| IT-131 | PR-3, SA-1 | reports are indexed on created_at and moderation_status, and have foreign keys (SRS 5.1, 5 | Integ | Inspection | P3 | + | Y | Own | Fail→Pass |
| IT-132 | SE-1 | passwords are stored only as bcrypt hashes (SRS 5.3) | Integ | Inspection | P1 | − | Y | Own | Pass |
| IT-133 | SE-5, SI-1 | the upgrade page never shows the raw database error (SRS 5.3) (defect D-16) | Integ | Error guessing | P3 | − | Y | Own | Fail→Pass |
| E2E-01 | FR-1.7, FR-2.7 | a guest reports a concern without an account and sees it under review | E2E | Use case | P1 | + | Y | Own | Pass |
| E2E-02 | FR-2.3 | a too-short description is rejected and the user stays on the form | E2E | Use case | P1 | − | Y | Own | Pass |
| E2E-03 | FR-3.2 | a moderator verifies a newly submitted report | E2E | Use case | P1 | + | Y | Own | Pass |
| E2E-04 | FR-1.4, SE-3 | a guest who opens the admin portal is sent to the admin login (access control) | E2E | Use case | P1 | − | Y | Own | Pass |
| E2E-05 | FR-1.2 | a wrong password shows an error and does not log in | E2E | Use case | P1 | − | Y | Own | Pass |
| E2E-06 | FR-1.4 | a public user cannot use the organization portal | E2E | Use case | P2 | − | Y | Own | Pass |
| E2E-07 | SE-2 | script code typed into a report is shown as text, never run (XSS) | E2E | Error guessing | P1 | − | Y | Own | Pass |
| E2E-08 | FR-10.1 | a visitor saves an area and it is still saved after reloading | E2E | Use case | P3 | + | Y | Own | Pass |
| E2E-09 | FR-8.1 | the admin changes a routing rule and it is kept | E2E | Use case | P3 | + | Y | Own | Pass |
| E2E-10 | FR-8.1, BR-6 | a moderator cannot open the admin-only routing rules page | E2E | Use case | P3 | − | Y | Own | Pass |
| E2E-11 | FR-1.1, FR-1.5 | FR-1.1 sign-up needs an 8-character password; FR-1.5 logout returns to the homepage | E2E | BVA | P1 | ± | Y | Own | Pass |
| E2E-12 | FR-1.3 | FR-1.3 a public account is refused on the Organization login page | E2E | Use case | P1 | − | Y | Own | Pass |
| E2E-13 | FR-1.4 | FR-1.4 opening an admin page without login shows 'Please log in to continue' | E2E | Use case | P1 | − | Y | Own | Pass |
| E2E-14 | FR-1.6 | FR-1.6 password recovery: reset link and 'choose a new password' page | E2E | BVA | P2 | ± | Y | Own | Fail→Pass |
| E2E-15 | FR-2.5 | FR-2.5 the anonymous option is ON by default | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-16 | FR-2.4 | FR-2.4 a non-JPG/PNG photo shows an error | E2E | EP | P2 | − | Y | Own | Pass |
| E2E-17 | FR-2.7, FR-2.8 | FR-2.7 + FR-2.8 a new report gets an AA- number, a 'Report submitted' audit entry, and doe | E2E | Use case | P1 | ± | Y | Own | Pass |
| E2E-18 | FR-3.1, FR-5.1 | FR-3.1 the report table has the six status tabs and shows IP and device ID | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-19 | FR-3.2–3.8, FR-8.1–8.5 | full lifecycle — FR-3.2, 3.5, 3.6, 3.7, 3.8, 8.1, 8.3, 8.4, 8.5: verify, assign by routing | E2E | State trans. | P1 | ± | Y | Own | Pass |
| E2E-20 | FR-3.9, FR-5.3 | FR-3.9 + FR-5.3 report detail shows related reports and the real report frequency | E2E | Use case | P2 | + | Y | Own | Fail→Pass |
| E2E-21 | FR-4.3, FR-4.8 | FR-4.3 + FR-4.8 the profile explains the threshold and that status is not a legal finding | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-22 | FR-6.1 | FR-6.1 the map has pins and a legend for all four bands | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-23 | FR-6.2 | FR-6.2 typing in search suggests matching vendors | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-24 | FR-6.3 | FR-6.3 selecting a pin opens a pop-up with a View Profile button | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-25 | FR-6.4, FR-7.3 | FR-6.4 + FR-7.3 the profile shows trust summary, reports, reviews, at-a-glance; Approval L | E2E | EP | P2 | ± | Y | Own | Pass |
| E2E-26 | FR-6.5 | FR-6.5 Recent Reports can be filtered by category | E2E | EP | P2 | + | Y | Own | Pass |
| E2E-27 | FR-7.4 | FR-7.4 the Vendor Management table lists area, trust status, badges and verified state | E2E | Use case | P3 | + | Y | Own | Pass |
| E2E-28 | FR-8.1 | FR-8.1 default routing is Food → DNCRP, Fuel → BSTI, Other → Accredited Laboratory | E2E | Use case | P2 | + | Y | Own | Pass |
| E2E-29 | FR-8.2, FR-5.5 | FR-8.2 + FR-5.5 the organization portal shows only its own escalated reports, counts and a | E2E | EP | P1 | − | Y | Own | Pass |
| E2E-30 | FR-8.7 | FR-8.7 the organization name is hidden publicly by default (comment shown as 'Authority') | E2E | Use case | P3 | + | Y | Own | Pass |
| E2E-31 | FR-9.3 | FR-9.3 a guest who writes a review is asked to log in and comes back to the same vendor | E2E | Use case | P2 | + | Y | Own | Fail→Pass |
| E2E-32 | FR-9.4 | FR-9.4 a logged-in user can flag a review; a guest is asked to log in | E2E | EP | P2 | ± | Y | Own | Fail→Pass |
| E2E-33 | FR-10.2, FR-10.3 | FR-10.2 all notification settings are off by default | E2E | Use case | P3 | + | Y | Own | Pass |
| E2E-34 | FR-10.4, FR-10.5 | FR-10.4 + FR-10.5 Notifications link to the report/vendor; My Reports is private to the us | E2E | Use case | P3 | ± | Y | Own | Pass |
| E2E-35 | FR-11.1, FR-11.2 | FR-11.1 + FR-11.2 the dashboard shows status counts, spikes, a chart and the most reported | E2E | Use case | P2 | + | Y | Own | Pass |
