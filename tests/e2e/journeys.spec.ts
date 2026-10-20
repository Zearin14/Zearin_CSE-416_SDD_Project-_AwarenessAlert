// System / E2E tests: three critical user journeys from the use-case diagram,
// run in the real browser against the React app (demo mode, no backend).
import { expect, test, type Page } from "@playwright/test"

async function fillReport(page: Page, description: string) {
  await page.goto("/report")
  await page.getByLabel(/^Food/).check()
  const vendorSelect = page.locator("select").first()
  await vendorSelect.selectOption({ index: 1 })
  await page.getByPlaceholder(/Include what happened/).fill(description)
}

async function adminLogin(page: Page) {
  await page.goto("/admin/login")
  await page.getByPlaceholder("Enter email or phone").fill("admin@awarenessalert.test")
  await page.getByPlaceholder("Enter password").fill("Admin#1234")
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page).toHaveURL(/\/admin(\/|$)/)
}

test("E2E-01 a guest reports a concern without an account and sees it under review", async ({ page }) => {
  await fillReport(page, "The milk on the second shelf was past its expiry date.")
  await page.getByRole("button", { name: "Submit report" }).click()
  await expect(page).toHaveURL(/\/report\/done/)
  await expect(page.getByText("is now under moderator review")).toBeVisible()
  const id = await page.locator("strong").filter({ hasText: /^AA-/ }).first().innerText()
  expect(id).toMatch(/^AA-\d+/)
  await page.getByRole("link", { name: "View Recent Reports" }).click()
  await expect(page).toHaveURL(/\/reports$/)
  // the public report page shows the moderation label (not a filter <option>)
  await page.goto(`/reports/${id}`)
  await expect(page.locator(":not(option):text-is('Under moderator review')").first()).toBeVisible()
})

test("E2E-02 a too-short description is rejected and the user stays on the form", async ({ page }) => {
  await fillReport(page, "Bad milk")
  await page.getByRole("button", { name: "Submit report" }).click()
  await expect(page.getByText("Add at least 15 characters")).toBeVisible()
  await expect(page).toHaveURL(/\/report$/)
})

test("E2E-03 a moderator verifies a newly submitted report", async ({ page }) => {
  await fillReport(page, "Fuel meter showed 5 litres but the can held about 4.")
  await page.getByRole("button", { name: "Submit report" }).click()
  await expect(page).toHaveURL(/\/report\/done/)
  const id = await page.locator("strong").filter({ hasText: /^AA-/ }).first().innerText()

  await adminLogin(page)
  await page.goto(`/admin/reports/${id}`)
  await expect(page.locator(".admin-control-bar .admin-status")).toHaveText("Pending")
  await page.getByRole("button", { name: "Mark Verified" }).click()
  await expect(page.locator(".admin-control-bar .admin-status")).toHaveText("Verified")
})

test("E2E-04 a guest who opens the admin portal is sent to the admin login (access control)", async ({ page }) => {
  await page.goto("/admin/reports")
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByRole("heading", { name: "Admin Login" })).toBeVisible()
})

test("E2E-05 a wrong password shows an error and does not log in", async ({ page }) => {
  await page.goto("/admin/login")
  await page.getByPlaceholder("Enter email or phone").fill("admin@awarenessalert.test")
  await page.getByPlaceholder("Enter password").fill("wrong-password")
  await page.getByRole("button", { name: "Log in" }).click()
  await expect(page.getByText("Incorrect email/phone or password.")).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/login/)
})

test("E2E-06 a public user cannot use the organization portal", async ({ page }) => {
  await page.goto("/org/dashboard")
  await expect(page).toHaveURL(/\/org\/login/)
})

test("E2E-07 script code typed into a report is shown as text, never run (XSS)", async ({ page }) => {
  const payload = `<img src=x onerror="window.__xss=1"> expired food on display`
  await fillReport(page, payload)
  await page.getByRole("button", { name: "Submit report" }).click()
  await expect(page).toHaveURL(/\/report\/done/)
  const id = await page.locator("strong").filter({ hasText: /^AA-/ }).first().innerText()
  await page.goto(`/reports/${id}`)
  await expect(page.getByText(payload)).toBeVisible()
  await page.waitForLoadState("networkidle")
  expect(await page.evaluate(() => (window as any).__xss)).toBeUndefined()
})

test("E2E-08 a visitor saves an area and it is still saved after reloading", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: "Saved Areas" }).first().click()
  const first = page.locator(".area-card").first()
  await expect(first).toContainText("Add area")
  await first.click()
  await expect(first).toContainText("Saved")
  await page.reload()
  await expect(page.locator(".area-card").first()).toContainText("Saved")
})

test("E2E-09 the admin changes a routing rule and it is kept", async ({ page }) => {
  await adminLogin(page)
  await page.goto("/admin/routing")
  const food = page.locator(".routing-card select").first()
  await food.selectOption("Accredited Laboratory")
  await page.reload()
  await expect(page.locator(".routing-card select").first()).toHaveValue("Accredited Laboratory")
})
