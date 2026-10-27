# Requirements Traceability Matrix (full)

AwarenessAlert v0.9-test — every SRS requirement with its test cases. Summary version: Test Report §4.

| Req ID | Requirement | Priority | Test case IDs | Level(s) | Status |
|---|---|---|---|---|---|
| FR-1.1 | Register with full name, email/phone and a password of at least 8 characters | High | IT-10–IT-14, E2E-11 | I, E2E | Pass |
| FR-1.2 | Validate login; show "Incorrect email/phone or password" on failure | High | IT-01–IT-03, IT-07, E2E-05, TC-U43 | I, E2E | Pass |
| FR-1.3 | Separate login pages for public, admin, organization; matching role only | High | IT-05, IT-06, E2E-12 | I, E2E | Pass |
| FR-1.4 | Redirect to the matching login page with "Please log in to continue" | High | E2E-04, E2E-06, E2E-13 | E2E | Pass |
| FR-1.5 | Logout from every area returns to the public homepage | High | IT-08, E2E-11 | I, E2E | Pass |
| FR-1.6 | Password recovery: reset link and "choose a new password" page | High | E2E-14, IT-68 | I, E2E | Pass (D-13 fixed) |
| FR-1.7 | No login needed to browse, check vendors or submit a report | High | IT-21, E2E-01 | I, E2E | Pass |
| FR-2.1 | Choose a category: Food, Fuel or Other | High | IT-22, E2E-01 | I, E2E | Pass |
| FR-2.2 | Select a vendor; set location by GPS or by placing a pin | High | IT-23, E2E-01 | I, E2E | Pass (vendor); GPS = manual check |
| FR-2.3 | Description of at least 15 characters | High | IT-20, IT-21, E2E-02, TC-U39 | I, E2E | Pass |
| FR-2.4 | One JPG/PNG photo of at most 10 MB; error otherwise | High | IT-24–IT-26, IT-127, E2E-16 | I, E2E | Pass |
| FR-2.5 | Anonymous option on by default; identity hidden from the public | High | IT-27, IT-124, E2E-15 | I, E2E | Pass |
| FR-2.6 | Record reporter tier Guest / Anonymous / Identified | High | IT-21, IT-27, IT-126 | I | Pass |
| FR-2.7 | Unique AA-xxxxx ID, status Pending, audit entry, confirmation page | High | IT-21, IT-126, E2E-01, E2E-17 | I, E2E | Pass |
| FR-2.8 | A new report does not change the vendor's trust status on its own | High | TC-U01, E2E-17 | U, E2E | Pass |
| FR-3.1 | Report table with 6 status tabs, IP and device ID columns | High | E2E-18, IT-31 | I, E2E | Pass |
| FR-3.2 | Mark a Pending or Disputed report as Verified | High | IT-43, IT-100, IT-103, E2E-03, E2E-19, IT-45 | I, E2E | Pass (D-09 fixed) |
| FR-3.3 | Dispute a Pending/Verified report; re-open a Disputed one | High | IT-101, IT-102 | I | Pass (D-09 fixed) |
| FR-3.4 | Remove any report that is not escalated; hidden from public pages | High | IT-31, IT-104, IT-106 | I | Pass (D-09 fixed) |
| FR-3.5 | Send a Verified report to the authority from the routing rules (Escalated, Awaiting) | High | IT-42–IT-44, E2E-19 | I, E2E | Pass |
| FR-3.6 | Recall an escalation only while the outcome is Awaiting | High | IT-46, IT-105, E2E-19 | I, E2E | Pass (D-09 fixed) |
| FR-3.7 | Escalated reports are locked against other moderation actions | High | IT-104, E2E-19 | I, E2E | Pass (D-09 fixed) |
| FR-3.8 | Every moderation action in the audit log (action, actor, time) | High | IT-43, E2E-19 | I, E2E | Pass |
| FR-3.9 | Report detail shows related reports for the same vendor | High | E2E-20 | E2E | Pass |
| FR-4.1 | Count only reports that are not Removed | High | TC-U09 | U | Pass |
| FR-4.2 | Threshold: ≥ 3 independent sources in 30 days or 1 authority confirmation | High | TC-U01–U08, TC-U27 | U | Pass |
| FR-4.3 | Below threshold keep the previous band and explain why | High | TC-U01, TC-U15, E2E-21 | U, E2E | Pass |
| FR-4.4 | Weights: Confirmed 24, Verified/Escalated with photo 11, without 8, others 0 | High | TC-U03, TC-U08, TC-U10–U13 | U | Pass |
| FR-4.5 | Score = max(18, 92 − total weight) | High | TC-U11–U14 | U | Pass |
| FR-4.6 | Bands: ≥ 70 Trusted, 40–69 Caution, < 40 High risk; no data = Observation | High | TC-U11–U16 | U | Pass |
| FR-4.7 | Spike: ≥ 3 reports in 48 hours or ≥ 6 in total | High | TC-U17–U19, TC-U28 | U | Pass |
| FR-4.8 | Explain that trust status is not a legal finding | High | E2E-21 | E2E | Pass |
| FR-5.1 | Record IP and device ID of every report; show only to admins | High | IT-30, IT-31, E2E-18 | I, E2E | Pass |
| FR-5.2 | Independent sources counted by distinct user or device | High | TC-U04, TC-U05 | U | Pass |
| FR-5.3 | Show admins the reporter's report frequency and account activity | High | TC-U60–U62, E2E-20 | U, E2E | Pass (D-12 fixed) |
| FR-5.4 | Should rate-limit repeated submissions per account, device and IP | High | PT-03 | Perf | Fail — D-06 open (limits are TBD, SRS App. C) |
| FR-5.5 | Organization users never see IP addresses or device IDs | High | IT-125, E2E-29 | I, E2E | Pass |
| FR-6.1 | Map with coloured pins for the 4 bands and a legend | High | TC-U50–U55, E2E-22 | U, E2E | Pass |
| FR-6.2 | Search by name, area or type with suggestions while typing | High | E2E-23 | E2E | Pass |
| FR-6.3 | Pin pop-up with type, area, badges, band, score and View Profile | High | E2E-24 | E2E | Pass |
| FR-6.4 | Profile: trust summary, Approval List, reports, reviews, at-a-glance | High | TC-U21, E2E-25, TC-U22, TC-U24 | U, E2E | Pass |
| FR-6.5 | Recent Reports filter by category, status and area | High | E2E-26, TC-U26 | E2E | Pass |
| FR-7.1 | Admin grants/revokes BSTI, DNCRP, Lab badges; date updated | Medium | IT-90–IT-92 | I | Pass |
| FR-7.2 | Admin edits Approval List fields and adds new fields | Medium | IT-93 | I | Pass |
| FR-7.3 | Approval List shown publicly only with at least one badge | Medium | E2E-25 | E2E | Pass |
| FR-7.4 | Vendor table: area, trust status, badges, verified state | Medium | E2E-27 | E2E | Pass |
| FR-8.1 | One receiving organization per category (Food→DNCRP, Fuel→BSTI, Other→Lab) | High | E2E-09, E2E-10, E2E-19, E2E-28 | E2E | Pass |
| FR-8.2 | Org portal shows only its Escalated reports, with counts and a filter | High | IT-50, E2E-29 | I, E2E | Pass |
| FR-8.3 | Org sets Confirmed/Cleared/Awaiting, public comment ≤ 280, internal note | High | IT-53, IT-54, E2E-19 | I, E2E | Pass |
| FR-8.4 | Public comment required for Confirmed and Cleared | High | IT-52, E2E-19 | I, E2E | Pass |
| FR-8.5 | Save records outcome, organization, time, audit; label updates at once | High | IT-54, E2E-19, TC-U20 | I, E2E | Pass |
| FR-8.6 | Internal note visible only to admins and organizations | High | IT-33, IT-54 | I | Pass |
| FR-8.7 | Admin chooses whether the org name is public (default "Authority") | High | E2E-30 | E2E | Pass |
| FR-9.1 | Reviews kept separate from safety reports | Medium | TC-U29, IT-70 | U, I | Pass |
| FR-9.2 | Anyone reads visible reviews; only logged-in users write 1–5 stars | Medium | IT-70–IT-73 | I | Pass |
| FR-9.3 | Guest asked to log in; selected vendor remembered | Medium | E2E-31 | E2E | Pass (D-14 fixed) |
| FR-9.4 | Users flag reviews; admin hides/restores; hidden not in average | Medium | TC-U21, IT-74, IT-75, IT-110, IT-111, E2E-32 | U, I, E2E | Pass (D-05, D-10 fixed) |
| FR-9.5 | Reviews do not change the trust score | Medium | TC-U29 | U | Pass |
| FR-10.1 | Save or remove one or more areas | Low | E2E-08 | E2E | Pass |
| FR-10.2 | Notification switches, all off by default | Low | E2E-33 | E2E | Pass |
| FR-10.3 | Optional weekly digest | Low | E2E-33 | E2E | Pass (setting only; delivery TBD, SRS App. C) |
| FR-10.4 | Notifications page with title, message, date and link | Low | E2E-34 | E2E | Pass |
| FR-10.5 | My Reports lists the user's own reports, private to the user | Low | E2E-34 | E2E | Pass |
| FR-11.1 | Dashboard counts by status and number of spike vendors | High | E2E-35 | E2E | Pass |
| FR-11.2 | Bar chart by status and most reported areas | High | E2E-35 | E2E | Pass |
| FR-11.3 | Audit log of submission, moderation, escalation, recall, outcome | High | IT-32, IT-43, IT-126, E2E-19 | I, E2E | Pass |
| SI-1 | DB errors logged; users get a general message with HTTP 500 (3.3) | High | IT-14, IT-73, IT-133, TC-U25, TC-U38, IT-47 | I | Pass (D-03, D-04, D-16 fixed) |
| SI-2 | Unsupported methods → 405; CORS pre-flight → 204 (3.3) | Med | IT-120, IT-121 | I | Pass (D-11 fixed) |
| SI-3 | Only the image file path is stored in the database (3.3) | Med | IT-26, IT-129 | I | Pass |
| SI-4 | UTF-8 so Bangla text can be stored; server-side validation of all input (3.4) | High | IT-13, IT-20–IT-25, IT-130 | I | Pass |
| PR-1 | Common pages load within 3 seconds | Med | LH-01–LH-04, PT-01–PT-03 | Perf | Pass |
| PR-2 | Search suggestions without noticeable delay | Med | E2E-23 | E2E | Pass |
| PR-3 | Report lists newest first; index created_at, vendor_id, moderation_status | Med | IT-123, IT-131 | I | Pass (D-15 fixed) |
| PR-4 | Trust-score calculation fast enough for the map | Med | PT-01 | Perf | Pass |
| SA-1 | Integrity constraints (primary and foreign keys); backups | High | IT-131 | I | Pass (keys); backups = operations, out of scope |
| SA-2 | Uploads restricted to JPG/PNG of at most 10 MB | High | IT-24, IT-25, IT-127 | I | Pass |
| SA-3 | Pages say reports are allegations, labels are not legal findings | High | E2E-21, TC-U20 | E2E | Pass |
| SA-4 | Moderators can remove malicious or invalid content | High | IT-106, IT-74 | I | Pass |
| SE-1 | Passwords stored with one-way hashing (password_hash) | High | IT-61, IT-132 | I, Sec | Pass |
| SE-2 | Input validated and all queries parameterized (no SQL injection) | High | IT-04, TC-U42, E2E-07 | I, Sec | Pass |
| SE-3 | Authentication and role checks on the server for every protected request | High | IT-05, IT-40, IT-41, IT-51, IT-60, IT-70, IT-81, IT-91, E2E-04, TC-U23, TC-U36 | I, E2E, Sec | Pass |
| SE-4 | Organization users only access reports routed to them | High | IT-50, E2E-29 | I, E2E, Sec | Pass |
| SE-5 | Database errors logged on the server, never shown to users | High | IT-14, IT-73, IT-133 | I, Sec | Pass (D-16 fixed) |
| SE-6 | HTTPS in production; CORS only for the trusted frontend origin | High | IT-121, IT-122 | I, Sec | Pass (CORS); HTTPS = deployment |
| SE-7 | Uploaded evidence not executable, stored under controlled names | High | IT-24, IT-129, IT-25 | I, Sec | Pass |
| SE-8 | Minimal personal data; no national ID for reporting | High | E2E-01 (form inspection) | E2E | Pass |
| QA-1 | Usability: reporting in about 2 minutes, no login, works on mobile | Med | E2E-01 (Pixel 7), UT-01–UT-03 | E2E, Usability | E2E Pass; usability session not run yet |
| QA-2 | Reliability: reports, outcomes and trust data persistent | Med | IT-21, IT-54, E2E-08, E2E-09 | I, E2E | Pass |
| QA-3 | Maintainability: code organized for change | Low | Static analysis (tsc, php -l), §8.3 | Static | Partly (SonarCloud in Exp 10) |
| QA-4 | Scalability: new vendors, areas, categories, organizations without redesign | Low | Design review (ER diagram) | Review | N/A — design property, not testable at runtime |
| QA-5 | Transparency: status explainable by signals, timeline, comments | Med | E2E-19, E2E-25 | E2E | Pass |
| QA-6 | Privacy: anonymous reporters never shown publicly | High | IT-124, IT-30 | I | Pass |
| QA-7 | Localization: Bangla interface in a future version | Low | — | — | N/A — future version (SRS App. C) |
| BR-1 | A single report does not change trust status | High | TC-U01, E2E-17 | U, E2E | Pass |
| BR-2 | 3 independent sources in 30 days or 1 confirmation needed | High | TC-U02–U08 | U | Pass |
| BR-3 | Only Verified reports go to an authority; only the routed org records the outcome | High | IT-42, IT-50 | I | Pass |
| BR-4 | Confirmed/Cleared outcome requires a public comment | High | IT-52 | I | Pass |
| BR-5 | Disputed, Pending and Cleared reports do not lower the score | High | TC-U10 | U | Pass |
| BR-6 | Only admins grant badges, remove reports, change routing | High | IT-91, IT-41, E2E-10 | I, E2E | Pass |
| BR-7 | Customer reviews do not change the trust score | High | TC-U29 | U | Pass |
| BR-8 | Trust status presented as a risk indicator, not certification | High | E2E-21 | E2E | Pass |
| EX-1 | Admin Team page: add moderator / organization staff, turn accounts off/on, reset passwords (password ≥ 8) | High | TC-U30–U35, TC-U37, IT-60–IT-67 | U, I | Pass (D-01, D-02 fixed) |
| EX-2 | Admin login history of logins, failed attempts and logouts | Med | TC-U42, IT-80, IT-81 | U, I | Pass |
| EX-3 | Any logged-in user changes their own password | Med | IT-68 | I | Pass |
| EX-4 | Demo mode with browser storage when the database is offline | Med | TC-U38–U41, all E2E tests | U, E2E | Pass |
| EX-5 | Turned-off accounts lose access immediately | High | IT-66 | I | Pass |
