// @vitest-environment jsdom
// Unit tests for src/api.ts. fetch is mocked, so no server is needed.
import { afterEach, describe, expect, it, vi } from "vitest"
import * as api from "../../src/api"

function mockFetch(status: number, body: unknown, invalidJson = false) {
  const fn = vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (invalidJson) throw new SyntaxError("Unexpected token <")
      return body
    },
  }))
  vi.stubGlobal("fetch", fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

describe("validateStaffInput — Team page staff form (password min 8)", () => {
  it("TC-U30 valid name, login and 8-character password is accepted (boundary)", () => {
    expect(api.validateStaffInput("Tanvir", "t@x.test", "Abcd#123")).toBeNull()
  })

  it("TC-U31 7-character password is rejected (boundary - 1)", () => {
    expect(api.validateStaffInput("Tanvir", "t@x.test", "Abc#123")).toBe(
      "The password must be at least 8 characters.",
    )
  })

  it("TC-U32 9-character password is accepted (boundary + 1)", () => {
    expect(api.validateStaffInput("Tanvir", "t@x.test", "Abcd#1234")).toBeNull()
  })

  it("TC-U33 empty password is rejected", () => {
    expect(api.validateStaffInput("Tanvir", "t@x.test", "")).toBe(
      "The password must be at least 8 characters.",
    )
  })

  it("TC-U34 empty or spaces-only name is rejected", () => {
    const msg = "Name and email/phone are required."
    expect(api.validateStaffInput("", "t@x.test", "Abcd#123")).toBe(msg)
    expect(api.validateStaffInput("   ", "t@x.test", "Abcd#123")).toBe(msg)
  })

  it("TC-U35 empty login is rejected", () => {
    expect(api.validateStaffInput("Tanvir", " ", "Abcd#123")).toBe(
      "Name and email/phone are required.",
    )
  })
})

describe("request() — talking to the PHP API", () => {
  it("TC-U36 GET calls use the API base URL and send the session cookie", async () => {
    const fetch = mockFetch(200, { success: true, users: [] })
    await api.listStaff()
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost/awarenessalert-api/users.php",
      expect.objectContaining({ method: "GET", credentials: "include", body: undefined }),
    )
  })

  it("TC-U37 POST calls send JSON with the right action", async () => {
    const fetch = mockFetch(200, { success: true, users: [] })
    await api.createStaff({ name: "N", login: "n@x.test", password: "Abcd#123", role: "moderator" })
    const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.method).toBe("POST")
    expect(init.headers).toEqual({ "Content-Type": "application/json" })
    expect(JSON.parse(String(init.body))).toMatchObject({ action: "create", role: "moderator" })
  })

  it("TC-U38 a server error message is passed to the user", async () => {
    mockFetch(403, { success: false, error: "You are not allowed to do this." })
    await expect(api.listStaff()).rejects.toThrow("You are not allowed to do this.")
  })

  it("TC-U39 success:false with HTTP 200 is still treated as an error", async () => {
    mockFetch(200, { success: false, error: "Choose a category." })
    await expect(api.createReport({
      vendorId: "1", category: "Food", description: "x", anonymous: false, deviceId: "d",
    })).rejects.toThrow("Choose a category.")
  })

  it("TC-U40 a non-JSON reply (e.g. XAMPP stopped) gives a helpful message", async () => {
    mockFetch(500, null, true)
    await expect(api.loadAll()).rejects.toThrow("The server sent an invalid response")
  })

  it("TC-U41 an error without a message falls back to 'Request failed'", async () => {
    mockFetch(500, {})
    await expect(api.logout()).rejects.toThrow("Request failed")
  })

  it("TC-U42 the login-history filter is URL-encoded (no query injection)", async () => {
    const fetch = mockFetch(200, { success: true, events: [], summary: {} })
    await api.loginHistory("failed&x=1")
    expect(fetch.mock.calls[0][0]).toBe(
      "http://localhost/awarenessalert-api/login_history.php?filter=failed%26x%3D1",
    )
  })

  it("TC-U43 every exported API helper sends its request to the correct PHP file", async () => {
    const fetch = mockFetch(200, { success: true })
    const calls: Array<[Promise<unknown>, string, Record<string, unknown> | undefined]> = [
      [api.getReports(), "reports.php", undefined],
      [api.getVendors(), "vendors.php", undefined],
      [api.login("a", "b", "admin"), "auth.php", { action: "login", kind: "admin" }],
      [api.register("n", "l", "p"), "auth.php", { action: "register" }],
      [api.setReportStatus("AA-1", "Verified", "ok"), "report_action.php", { action: "status" }],
      [api.setReportOutcome("AA-1", "Cleared", "c", "n"), "report_action.php", { action: "outcome" }],
      [api.createReview("1", 5, "t"), "reviews.php", { action: "create", rating: 5 }],
      [api.toggleReview("RV-1"), "reviews.php", { action: "toggle" }],
      [api.flagReview("RV-1"), "reviews.php", { action: "flag", id: "RV-1" }],
      [api.updateVendor("1", { badges: ["BSTI"] }), "vendors.php", { id: "1" }],
      [api.toggleStaff("2"), "users.php", { action: "toggle" }],
      [api.resetStaffPassword("2", "Abcd#123"), "users.php", { action: "reset_password" }],
      [api.changeMyPassword("old", "Abcd#123"), "users.php", { action: "change_password" }],
    ]
    await Promise.all(calls.map(([p]) => p))
    calls.forEach(([, file, body], i) => {
      const [url, init] = fetch.mock.calls[i] as unknown as [string, RequestInit]
      expect(url).toBe(`http://localhost/awarenessalert-api/${file}`)
      if (body) expect(JSON.parse(String(init.body))).toMatchObject(body)
    })
  })
})
