// System / acceptance tests for the SRS requirements that live in the user interface.
// Each test name starts with its test ID and the SRS requirement it checks.
// The app runs in demo mode (no PHP backend), so data comes from the built-in demo store.
import { expect, test, type Page } from "@playwright/test"

async function login(page: Page, path: string, user: string, password: string) {
  await page.goto(path)
  await page.getByPlaceholder(/email or phone/i).fill(user)
  await page.getByPlaceholder(/password/i).first().fill(password)
  await page.getByRole("button", { name: /^Log in$/ }).click()
}
const asAdmin = (page: Page) => login(page, "/admin/login", "admin@awarenessalert.test", "Admin#1234")
const asRafi = (page: Page) => login(page, "/login", "rafi@example.test", "User#1234")
const asDncrp = (page: Page) => login(page, "/org/login", "dncrp@awarenessalert.test", "Org#1234")

async function submitReport(page: Page, category: "Food" | "Fuel" | "Other", description: string) {
  await page.goto("/report")
  await page.getByLabel(new RegExp(`^${category}`)).check()
  await page.locator("select").first().selectOption({ index: 1 })
  await page.getByPlaceholder(/Include what happened/).fill(description)
  await page.getByRole("button", { name: "Submit report" }).click()
  await expect(page).toHaveURL(/\/report\/done/)
  return page.locator("strong").filter({ hasText: /^AA-/ }).first().innerText()
}

test.describe("4.1 Authentication", () => {
  test("E2E-11 FR-1.1 sign-up needs an 8-character password; FR-1.5 logout returns to the homepage", async ({ page }) => {
    await page.goto("/signup")
    await page.getByLabel("Full name").fill("Test User")
    await page.getByLabel("Email or phone").fill("newuser@example.test")
    await page.getByLabel("Password").fill("Abc#123")
    await page.getByRole("button", { name: "Create account" }).click()
    // the browser blocks the form: the password field is too short (minLength 8)
    await expect(page).toHaveURL(/\/signup/)
    expect(await page.getByLabel("Password").evaluate((el: HTMLInputElement) => el.validity.tooShort)).toBe(true)
    await page.getByLabel("Password").fill("Abcd#123")
    await page.getByRole("button", { name: "Create account" }).click()
    // logged in: the private Profile page opens (works on desktop and mobile)
    await page.goto("/profile")
    await expect(page.getByRole("heading", { name: "Please log in to continue" })).toHaveCount(0)
    await page.locator("main").getByRole("button", { name: /Logout/ }).click()
    await expect(page).toHaveURL(/127\.0\.0\.1:4173\/$/)
  })

  test("E2E-12 FR-1.3 a public account is refused on the Organization login page", async ({ page }) => {
    await login(page, "/org/login", "rafi@example.test", "User#1234")
    await expect(page).toHaveURL(/\/org\/login/)
    await expect(page.getByText(/cannot log in here|not allowed|wrong login page|Organization/i).first()).toBeVisible()
  })

  test("E2E-13 FR-1.4 opening an admin page without login shows 'Please log in to continue'", async ({ page }) => {
    await page.goto("/admin/vendors")
    await expect(page).toHaveURL(/\/admin\/login/)
    await expect(page.getByText("Please log in to continue")).toBeVisible()
  })

  test("E2E-14 FR-1.6 password recovery: reset link and 'choose a new password' page", async ({ page }) => {
    await page.goto("/login")
    await page.getByRole("link", { name: "Forgot password?" }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await page.getByLabel("Email or phone").fill("rafi@example.test")
    await page.getByRole("button", { name: "Send reset link" }).click()
    await page.goto("/reset-password")
    await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible()
    await page.getByLabel("New password").fill("Abc#123")
    await page.getByLabel("Confirm password").fill("Abc#123")
    await page.getByRole("button", { name: "Reset password" }).click()
    await expect(page.getByText("The new password must be at least 8 characters.")).toBeVisible() // defect D-13
    await page.getByLabel("New password").fill("NewPass#123")
    await page.getByLabel("Confirm password").fill("NewPass#123")
    await page.getByRole("button", { name: "Reset password" }).click()
    await expect(page.getByText("You can now log in with your new password.")).toBeVisible()
  })
})

test.describe("4.2 Report submission", () => {
  test("E2E-15 FR-2.5 the anonymous option is ON by default", async ({ page }) => {
    await page.goto("/report")
    await expect(page.getByLabel(/Submit anonymously/)).toBeChecked()
  })

  test("E2E-16 FR-2.4 a non-JPG/PNG photo shows an error", async ({ page }) => {
    await page.goto("/report")
    await page.locator('input[type="file"]').setInputFiles({
      name: "evidence.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("R0lGODlhAQABAAAAACw=", "base64"),
    })
    await expect(page.getByText(/JPG or PNG/i).nth(1)).toBeVisible()
  })

  test("E2E-17 FR-2.7 + FR-2.8 a new report gets an AA- number, a 'Report submitted' audit entry, and does not change the vendor band", async ({ page }) => {
    await page.goto("/vendor/v1")
    const bandText = async () => (await page.locator(".vendor-hero .trust-badge, .trust-badge").first().innerText()).replace(/\s+/g, " ").trim()
    const bandBefore = await bandText()
    const id = await submitReport(page, "Food", "Expired yoghurt was on sale near the cashier today.")
    expect(id).toMatch(/^AA-\d+$/)
    await page.goto("/vendor/v1")
    expect(await bandText()).toBe(bandBefore)
    await asAdmin(page)
    await page.goto(`/admin/reports/${id}`)
    await expect(page.getByText("Report submitted").first()).toBeVisible()
  })
})

test.describe("4.3 Moderation workflow", () => {
  test("E2E-18 FR-3.1 the report table has the six status tabs and shows IP and device ID", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin/reports")
    for (const tab of ["All", "Pending", "Verified", "Escalated", "Disputed", "Removed"]) {
      await expect(page.getByRole("button", { name: new RegExp(`^${tab}`) }).first()).toBeVisible()
    }
    await expect(page.getByText("REPORTER / METADATA", { exact: false }).or(page.getByText("Reporter / metadata")).first()).toBeVisible()
    await expect(page.getByText(/103\.84\.12\.\d+ · dev-/).first()).toBeVisible()
  })

  test("E2E-19 full lifecycle — FR-3.2, 3.5, 3.6, 3.7, 3.8, 8.1, 8.3, 8.4, 8.5: verify, assign by routing rule, lock, recall, assign, authority confirms, public label updates", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept())
    const id = await submitReport(page, "Food", "Chicken was stored warm on the counter for hours.")
    await asAdmin(page)
    await page.goto(`/admin/reports/${id}`)
    const status = page.locator(".admin-control-bar .admin-status")
    await page.getByRole("button", { name: "Mark Verified" }).click()
    await expect(status).toHaveText("Verified")
    // FR-8.1 default routing: Food -> DNCRP
    await page.getByRole("button", { name: "Assign to DNCRP" }).click()
    await expect(status).toHaveText("Escalated")
    await expect(page.getByText("Authority: Awaiting")).toBeVisible()
    // FR-3.7 locked: no other moderation buttons
    for (const name of ["Mark Verified", "Dispute", "Remove"]) {
      await expect(page.getByRole("button", { name, exact: true })).toHaveCount(0)
    }
    // FR-3.6 recall while Awaiting
    await page.getByRole("button", { name: "Recall escalation" }).click()
    await expect(status).toHaveText("Verified")
    await page.getByRole("button", { name: "Assign to DNCRP" }).click()
    await expect(status).toHaveText("Escalated")
    // FR-3.8 audit history
    await expect(page.getByText("Escalation recalled").first()).toBeVisible()
    // Organization records the outcome (FR-8.3, FR-8.4)
    await page.getByRole("button", { name: "Logout" }).first().click()
    await asDncrp(page)
    await page.goto(`/org/reports/${id}`)
    await page.getByRole("button", { name: /Confirmed/ }).click()
    await page.getByPlaceholder(/Explain the outcome/).fill("")
    await page.getByRole("button", { name: "Save outcome and comment" }).click()
    await expect(page.getByText(/public comment is required/i)).toBeVisible()
    await page.getByPlaceholder(/Explain the outcome/).fill("Sample tested; storage temperature was unsafe.")
    await page.getByRole("button", { name: "Save outcome and comment" }).click()
    await expect(page.getByText("Outcome and comment are now visible publicly.")).toBeVisible()
    // FR-8.5 public label updates immediately
    await page.goto(`/reports/${id}`)
    await expect(page.locator(":not(option):text-is('Confirmed by authority')").first()).toBeVisible()
    await expect(page.getByText("Sample tested; storage temperature was unsafe.")).toBeVisible()
  })

  test("E2E-20 FR-3.9 + FR-5.3 report detail shows related reports and the real report frequency", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin/reports/AA-01045")
    await expect(page.getByRole("heading", { name: "Related reports" })).toBeVisible()
    await expect(page.getByText(/^\d+ reports? in the last 30 days from this (account|device)$/)).toBeVisible()
    await expect(page.getByText(/^\d+ reports? in total from this (account|device)$/)).toBeVisible()
  })
})

test.describe("4.4 Trust score — what the public sees", () => {
  test("E2E-21 FR-4.3 + FR-4.8 the profile explains the threshold and that status is not a legal finding", async ({ page }) => {
    await page.goto("/vendor/v1")
    await expect(page.getByText(/multiple independent sources|Not enough independent data/i).first()).toBeVisible()
    await expect(page.getByText(/legal finding/i).first()).toBeVisible()
  })
})

test.describe("4.6 Map, search and vendor profiles", () => {
  test("E2E-22 FR-6.1 the map has pins and a legend for all four bands", async ({ page }) => {
    await page.goto("/")
    const legend = page.locator(".map-legend")
    for (const band of ["Trusted", "Caution", "High risk", "Observation"]) await expect(legend).toContainText(band)
    expect(await page.locator(".map-legend .legend-dot").count()).toBe(4)
  })

  test("E2E-23 FR-6.2 typing in search suggests matching vendors", async ({ page }) => {
    await page.goto("/")
    await page.getByLabel("Search vendors").fill("Megh")
    await expect(page.locator(".suggestions")).toContainText("Meghna Fresh Mart")
  })

  test("E2E-24 FR-6.3 selecting a pin opens a pop-up with a View Profile button", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: /Shapla/ }).first().click()
    await expect(page.getByRole("heading", { name: "Shapla Super Shop" })).toBeVisible()
    await page.getByRole("link", { name: /View Profile/ }).click()
    await expect(page).toHaveURL(/\/vendor\/v1$/)
  })

  test("E2E-25 FR-6.4 + FR-7.3 the profile shows trust summary, reports, reviews, at-a-glance; Approval List only with a badge", async ({ page }) => {
    await page.goto("/vendor/v1") // has a BSTI badge
    for (const h of ["Trust summary", "Approval List", "Reports", "Customer Reviews", "At a glance"]) {
      await expect(page.getByRole("heading", { name: h, exact: true })).toBeVisible()
    }
    await page.goto("/vendor/v2") // no badge
    await expect(page.getByRole("heading", { name: "Trust summary" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Approval List", exact: true })).toHaveCount(0)
  })

  test("E2E-26 FR-6.5 Recent Reports can be filtered by category", async ({ page }) => {
    await page.goto("/reports")
    const count = page.getByText(/^\d+ reports?$/)
    const all = Number((await count.innerText()).split(" ")[0])
    await page.locator("select").first().selectOption("Fuel")
    const fuel = Number((await count.innerText()).split(" ")[0])
    expect(fuel).toBeGreaterThan(0)
    expect(fuel).toBeLessThan(all)
    const cards = page.locator(".report-card, article")
    const n = await cards.count()
    for (let i = 0; i < n; i++) await expect(cards.nth(i)).toContainText(/fuel/i)
  })
})

test.describe("4.7 Badges and 4.8 routing", () => {
  test("E2E-27 FR-7.4 the Vendor Management table lists area, trust status, badges and verified state", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin/vendors")
    const table = page.locator("table").first()
    await expect(table).toContainText("Shapla Super Shop")
    await expect(table).toContainText("Dhanmondi")
    await expect(table).toContainText(/BSTI/)
    await expect(table).toContainText(/Trusted|Caution|High risk|Observation/)
  })

  test("E2E-28 FR-8.1 default routing is Food → DNCRP, Fuel → BSTI, Other → Accredited Laboratory", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin/routing")
    const selects = page.locator(".routing-card select")
    await expect(selects.nth(0)).toHaveValue("DNCRP")
    await expect(selects.nth(1)).toHaveValue("BSTI")
    await expect(selects.nth(2)).toHaveValue("Accredited Laboratory")
  })

  test("E2E-29 FR-8.2 + FR-5.5 the organization portal shows only its own escalated reports, counts and a filter, and no IP/device data", async ({ page }) => {
    await asDncrp(page)
    await expect(page).toHaveURL(/\/org/)
    await expect(page.getByText("AWAITING", { exact: false }).first()).toBeVisible()
    const rows = page.locator("table tbody tr")
    expect(await rows.count()).toBeGreaterThan(0)
    await expect(page.locator("table")).not.toContainText(/103\.84\.12\.|dev-/)
    await page.locator("select").first().selectOption("Confirmed")
    const n = await rows.count()
    for (let i = 0; i < n; i++) await expect(rows.nth(i)).toContainText("Confirmed")
  })

  test("E2E-30 FR-8.7 the organization name is hidden publicly by default (comment shown as 'Authority')", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin/routing")
    await expect(page.locator(".config-toggle input[type=checkbox]")).not.toBeChecked()
    await page.goto("/reports/AA-01045")
    await expect(page.getByText(/Authority/).first()).toBeVisible()
    await expect(page.locator("main")).not.toContainText("DNCRP")
  })
})

test.describe("4.9 Customer reviews", () => {
  test("E2E-31 FR-9.3 a guest who writes a review is asked to log in and comes back to the same vendor", async ({ page }) => {
    await page.goto("/vendor/v1")
    await page.getByRole("link", { name: "Write a review" }).first().click()
    await expect(page.getByRole("heading", { name: "Log in to write a review" })).toBeVisible()
    await page.getByRole("link", { name: "Log in to continue" }).click()
    await page.getByPlaceholder(/email or phone/i).fill("rafi@example.test")
    await page.getByPlaceholder(/password/i).first().fill("User#1234")
    await page.getByRole("button", { name: /^Log in$/ }).click()
    await expect(page).toHaveURL(/\/vendor\/v1\/review/) // defect D-14
  })

  test("E2E-32 FR-9.4 a logged-in user can flag a review; a guest is asked to log in", async ({ page }) => {
    await page.goto("/vendor/v1")
    await page.getByRole("button", { name: "Flag review" }).first().click()
    await expect(page.getByText("Log in to flag a review.")).toBeVisible()
    await asRafi(page)
    await page.goto("/vendor/v1")
    await page.getByRole("button", { name: "Flag review" }).first().click()
    await expect(page.getByText("Thanks — flagged for moderators.")).toBeVisible()
  })
})

test.describe("4.10 Saved areas and notifications, 4.11 dashboard", () => {
  test("E2E-33 FR-10.2 all notification settings are off by default", async ({ page }) => {
    await page.goto("/saved-areas")
    const switches = page.locator("input[type=checkbox]")
    expect(await switches.count()).toBeGreaterThanOrEqual(5)
    for (let i = 0; i < (await switches.count()); i++) await expect(switches.nth(i)).not.toBeChecked()
  })

  test("E2E-34 FR-10.4 + FR-10.5 Notifications link to the report/vendor; My Reports is private to the user", async ({ page }) => {
    await page.goto("/my-reports")
    await expect(page.getByRole("heading", { name: "Please log in to continue" })).toBeVisible()
    await asRafi(page)
    await page.goto("/notifications")
    const first = page.locator("main a").filter({ hasText: /Report status updated|Unusual activity/ }).first()
    await expect(first).toBeVisible()
    await first.click()
    await expect(page).toHaveURL(/\/(reports|vendor)\//)
    await page.goto("/my-reports")
    await expect(page.getByRole("heading", { name: "My Reports" })).toBeVisible()
  })

  test("E2E-35 FR-11.1 + FR-11.2 the dashboard shows status counts, spikes, a chart and the most reported areas", async ({ page }) => {
    await asAdmin(page)
    await page.goto("/admin")
    for (const t of ["Total reports", "Pending review", "Verified", "Escalated", "Disputed", "Report spikes", "Reports by status", "Most reported areas"]) {
      await expect(page.getByText(t, { exact: true }).first()).toBeVisible()
    }
  })
})
