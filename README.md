# AwarenessAlert

**A crowdsourced food & fuel safety platform for Bangladesh (prototype)**
Course project by Zearin Akhter, UITS

People report food or fuel safety problems at shops and fuel stations. Moderators check
each report, verified reports are assigned to the right authority (BSTI, DNCRP or an
Accredited Laboratory), and the authority's result is shown to the public.

> **Prototype notice:** the 25 vendors use real business names in Gulshan and Banani, Dhaka,
> but every trust status, report and review is **sample data** for demonstration only.

---

🌐 **Live site:** https://awarenessalert.infinityfreeapp.com · 📄 [Final report](docs/final/Final_Report.pdf) · 🎤 [Presentation](docs/final/Final_Presentation.pdf) · 🧪 [Test report](docs/testing/Test_Report.pdf)

## 1. Features

**Public users**
- Live safety map of 25 vendors (Gulshan-1, Gulshan-2, Banani), placed by real latitude/longitude
- Trust status per vendor: Trusted, Caution, High risk, Observation
- Report a concern **without an account** (category, vendor, description, photo, anonymous option)
- Recent reports list with filters, report details with a review timeline
- Optional account: sign up, log in, write reviews, see "My Reports", saved areas

**Moderators**
- Review reports: Mark Verified, Dispute, Remove, Re-open
- Assign a verified report to the right authority (Assign to BSTI / DNCRP / Lab)
- Hide or restore customer reviews
- Change their own password (My account)

**Admin**: everything moderators can do, plus:
- **Team page:** add moderators and organization staff, turn accounts off/on, reset passwords
- **Login history:** every login, failed attempt and logout, with time, IP and browser
- Vendor verification badges and approval list
- Routing rules (which category goes to which authority)

**Organizations (BSTI, DNCRP, Accredited Laboratory)**
- See only the reports assigned to them
- Set the outcome: Confirmed, Cleared or Awaiting, with a public comment and an internal note

**Fairness and security**
- One report cannot change a vendor's status: it needs **3 independent sources in 30 days**
  or **1 authority confirmation**
- Passwords stored as hashes (`password_hash` / `password_verify`), never as plain text
- Role checks on the **server** in every PHP file (`require_role`), not only hidden buttons
- The public never sees IP addresses, device IDs or internal notes
- Audit history of every report action (`report_actions` table)
- Login history of every login attempt (`login_history` table)
- Turned-off accounts lose access immediately
- If the database is offline, the site switches to **demo mode** instead of crashing

---

## 2. Technology

| Part | Technology |
|---|---|
| Frontend | React 19 + TypeScript, built with Vite |
| Styling | CSS + Tailwind CSS v4 |
| Backend | PHP (REST-style JSON API) |
| Database | MySQL / MariaDB (XAMPP) |
| Login | PHP sessions + hashed passwords |

How it connects: the browser (React, `localhost:8443`) sends `fetch` requests to the
PHP files (`localhost/awarenessalert-api`), PHP reads and writes MySQL, and sends back JSON.

---

## 3. Folder structure

```
AwarenessAlert UI_UX Update\          <- React website (open this in VS Code)
├── src\
│   ├── App.tsx        all pages and logic
│   ├── api.ts         talks to the PHP API
│   ├── index.css      design / styles
│   ├── main.tsx       starts the app
│   └── vite-env.d.ts
├── package.json
├── vite.config.ts
└── README.md          this file

C:\xampp\htdocs\awarenessalert-api\   <- PHP backend
├── db.php             database connection, login checks, helpers
├── setup.php          FIRST-TIME setup: creates all tables + demo data
├── upgrade.php        adds new features WITHOUT deleting data
├── data.php           loads everything the website needs
├── auth.php           login / logout / sign up
├── reports.php        list + submit reports (with photo upload)
├── report_action.php  verify / dispute / remove / assign / authority outcome
├── vendors.php        vendor list + badges (admin)
├── reviews.php        reviews + hide/restore
├── users.php          Team page + change password
├── login_history.php  login history (admin)
├── api.php            health check (shows tables + row counts)
└── uploads\           uploaded evidence photos (created automatically)
```

---

## 4. Database tables (`awarenessalert_db`)

| Table | What it stores |
|---|---|
| `users` | accounts: name, login, password hash, role, organization, active |
| `vendors` | 25 vendors: name, category, area, latitude, longitude, trust status, badges |
| `reports` | every report: vendor, category, description, photo path, status, outcome |
| `reviews` | customer ratings and comments |
| `report_actions` | audit history: who did what to which report, and when |
| `login_history` | every login, failed attempt and logout, with IP and browser |

Links (foreign keys): `reports.vendor_id → vendors.id`, `reports.user_id → users.id`,
`reviews.vendor_id → vendors.id`, `report_actions.report_id → reports.id`,
`login_history.user_id → users.id`.

Report status flow:
**Pending → Verified → Escalated (assigned) → Confirmed / Cleared**
(Disputed and Removed are also possible.)

---

## 5. How to run

**First time on a computer**
1. Copy the PHP files into `C:\xampp\htdocs\awarenessalert-api`
2. XAMPP Control Panel → **Start Apache** and **Start MySQL**
3. Open `http://localhost/awarenessalert-api/setup.php` → "Setup complete ✓"
4. In VS Code (project folder) → Terminal → `npm install` (only the first time)
5. `npm run dev` → open **http://localhost:8443**

**Every other time**
1. XAMPP → Start Apache + MySQL
2. VS Code terminal → `npm run dev`
3. Open http://localhost:8443

Check the database connection: the green label at the bottom of the website says
**"Prototype · live MySQL data"**. A yellow "Demo mode" bar means XAMPP is not running.

> ⚠️ `setup.php` deletes all reports and reloads the demo data.
> Use it only for a fresh start (or `setup.php?reset=1` to clean up before a presentation).
> `upgrade.php` is always safe.

---

## 6. Demo accounts

On each login page click **"Show demo accounts"**, then click an account to fill it in.

| Role | Login | Password | Login page |
|---|---|---|---|
| Admin | admin@awarenessalert.test | Admin#1234 | Footer → Admin Login |
| Moderator | moderator@awarenessalert.test | Mod#12345 | Footer → Admin Login |
| BSTI | bsti@awarenessalert.test | Org#1234 | Footer → Organization Login |
| DNCRP | dncrp@awarenessalert.test | Org#1234 | Footer → Organization Login |
| Laboratory | lab@awarenessalert.test | Org#1234 | Footer → Organization Login |
| Public user | rafi@example.test | User#1234 | Header → Log in |
| Public user | 01700000000 | User#1234 | Header → Log in |

---

## 7. Presentation demo (about 5 minutes)

1. **Home:** "25 vendors in 3 areas". Click a pin to show the trust status, close with ×.
2. **Report:** click Report → Food → choose a vendor → describe the problem → upload a photo
   → Submit. You get a number like **AA-01025**.
3. **Proof it's a real database:** phpMyAdmin → `awarenessalert_db` → `reports` shows the
   new row, and the photo is in `C:\xampp\htdocs\awarenessalert-api\uploads`.
4. **Moderator:** Admin Login (moderator account) → Reports → open the report →
   **Mark Verified** → **Assign to DNCRP**. Show the **Audit history** box.
5. **Authority:** Logout → Organization Login (DNCRP) → open the report → **Confirmed**
   → write a public comment → Save.
6. **Public result:** Logout → Recent Reports → the report shows
   **"Confirmed by authority"** with the comment.
7. **Role-based access:** logged out, open `http://localhost:8443/admin` → it goes to the
   login page. As a moderator, the Team page says "Only the admin can open this page".
8. **Admin tools:** log in as admin → **Team** (add a moderator, turn an account off) →
   **Login history** (type a wrong password first, so the failed attempt appears).

---

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Yellow "Demo mode" bar | Start Apache + MySQL in XAMPP, then click "try again" |
| `setup.php` says MySQL is not running | Start MySQL in XAMPP |
| Login says "Incorrect email/phone or password" | Use the demo accounts above (created by setup.php) |
| "This account has been turned off" | Admin → Team → Turn on |
| `npm` / `pnpm` not recognized | Install Node.js LTS, then reopen VS Code |
| PowerShell blocks `npm` | Use the Command Prompt terminal in VS Code instead |
| Old data still showing | Press **Ctrl + Shift + R** in Chrome |
| Check the API | Open `http://localhost/awarenessalert-api/api.php` |

---

## 9. Future improvements

- Real interactive map (OpenStreetMap / Leaflet)
- Bangla language (the EN/বাংলা switch is a placeholder)
- SMS / email alerts for saved areas and report updates
- Vendor portal (right of reply)
- Online hosting instead of a local XAMPP server
- Split `App.tsx` into smaller component files

---

## 10. Running the tests

📄 **Software Test Report:** [docs/testing/Test_Report.pdf](docs/testing/Test_Report.pdf) · full tables: [RTM](docs/testing/RTM.md), [all test cases](docs/testing/TEST_CASES.md) · long version: [Test_Report_full.pdf](docs/testing/Test_Report_full.pdf)

Full results are in **docs/testing/** (Software Test Report + evidence). Every command below
runs on a fresh clone. The tests use a **separate database** (`awarenessalert_test`), so your
real XAMPP data is never touched.

```bash
git clone https://github.com/Zearin14/Zearin_CSE-416_SDD_Project-_AwarenessAlert.git
cd Zearin_CSE-416_SDD_Project-_AwarenessAlert
npm ci

# 1. Unit tests + code coverage (no server needed)
npm test

# 2. API integration tests (needs PHP 8 + MySQL/MariaDB running, root user with empty password,
#    like XAMPP). On Windows, run the commands inside Git Bash.
npm run test:api:start        # starts PHP on http://127.0.0.1:8090 with the TEST database
npm run test:integration

# 3. Performance: p95 response time, 20 users, 30 s per endpoint (test API must be running)
npm run test:perf

# 4. End-to-end + accessibility tests in a real browser (Playwright)
npx playwright install chromium   # first time only
npm run test:e2e

# 5. Mutation testing of the business rules (Stryker)
npm run test:mutation
```

| Folder | What is inside |
|---|---|
| `tests/unit/` | business rules (`src/logic.ts`) and API client (`src/api.ts`) |
| `tests/integration/` | real HTTP calls to the PHP files + database |
| `tests/e2e/` | user journeys and accessibility checks (desktop + mobile) |
| `tests/performance/` | load test script |
| `.github/workflows/test.yml` | runs everything on every push and pull request |
