// Integration tests: React API contract -> PHP files -> MariaDB/MySQL test database.
// Run with: ./scripts/start-test-api.sh && npm run test:integration
// Expected values come from the SRS rules and the README "Fairness and security" list.
import { beforeAll, describe, expect, it } from "vitest"
import { Client, TINY_PNG, as, resetDatabase } from "./client"

beforeAll(resetDatabase)

const desc15 = "Expired milk!!!" // exactly 15 characters

describe("Authentication (auth.php)", () => {
  it("IT-01 admin logs in with the correct password", async () => {
    const r = await new Client().login("admin@awarenessalert.test", "Admin#1234", "admin")
    expect(r.status).toBe(200)
    expect(r.body.session.role).toBe("admin")
  })

  it("IT-02 wrong password is rejected with a generic message", async () => {
    const r = await new Client().login("admin@awarenessalert.test", "Admin#9999", "admin")
    expect(r.status).toBe(401)
    expect(r.body.error).toBe("Incorrect email/phone or password.")
  })

  it("IT-03 unknown account gets the SAME message (no account enumeration)", async () => {
    const r = await new Client().login("nobody@x.test", "Whatever1", "public")
    expect(r.status).toBe(401)
    expect(r.body.error).toBe("Incorrect email/phone or password.")
  })

  it("IT-04 SQL injection in the login field does not log in", async () => {
    const r = await new Client().login("' OR 1=1 -- ", "' OR '1'='1", "admin")
    expect(r.status).toBe(401)
  })

  it("IT-05 a public account cannot use the Admin login page", async () => {
    const r = await new Client().login("rafi@example.test", "User#1234", "admin")
    expect(r.status).toBe(403)
  })

  it("IT-06 a moderator CAN use the Admin login page", async () => {
    const r = await new Client().login("moderator@awarenessalert.test", "Mod#12345", "admin")
    expect(r.status).toBe(200)
    expect(r.body.session.role).toBe("moderator")
  })

  it("IT-07 login is case-insensitive for the email", async () => {
    const r = await new Client().login("ADMIN@AwarenessAlert.test", "Admin#1234", "admin")
    expect(r.status).toBe(200)
  })

  it("IT-08 logout ends the session", async () => {
    const c = await as("rafi")
    expect((await c.call("auth.php", { action: "logout" })).status).toBe(200)
    expect((await c.call("auth.php")).body.session).toBeNull()
  })
})

describe("Sign up (auth.php register) — password min 8 characters", () => {
  const reg = (name: string, login: string, password: string) =>
    new Client().call("auth.php", { action: "register", name, login, password })

  it("IT-10 7-character password is rejected (BVA min-1)", async () => {
    expect((await reg("Test", "t7@x.test", "Abc#123")).status).toBe(400)
  })

  it("IT-11 8-character password is accepted and the user is logged in (BVA min)", async () => {
    const r = await reg("Test", "t8@x.test", "Abcd#123")
    expect(r.status).toBe(200)
    expect(r.body.session.role).toBe("public")
  })

  it("IT-12 the same email cannot register twice, even with other capitals", async () => {
    expect((await reg("Test", "T8@X.test", "Abcd#123")).status).toBe(409)
  })

  it("IT-13 a 4-character Bangla password is rejected (multibyte EP) — defect D-02", async () => {
    // "পাসও" is 4 characters but 12 bytes; strlen() counted bytes.
    expect((await reg("Test", "bn@x.test", "পাসও")).status).toBe(400)
  })

  it("IT-14 a name longer than 100 characters gets a clear 400 error, not a 500 — defect D-03", async () => {
    const r = await reg("N".repeat(101), "long@x.test", "Abcd#123")
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/100 characters/)
  })
})

describe("Submitting a report (reports.php) — no account needed", () => {
  const submit = (c: Client, body: Record<string, unknown>) =>
    c.call("reports.php", { vendorId: 1, category: "Food", anonymous: false, deviceId: "dev-it", ...body })

  it("IT-20 14-character description is rejected (BVA min-1)", async () => {
    const r = await submit(new Client(), { description: "Expired milk!!" })
    expect(r.status).toBe(400)
  })

  it("IT-21 15-character description is accepted; report starts as Pending (BVA min)", async () => {
    const guest = new Client()
    const r = await submit(guest, { description: desc15 })
    expect(r.status).toBe(200)
    expect(r.body.id).toMatch(/^AA-\d{5}$/)
    const admin = await as("admin")
    const all = (await admin.call("data.php")).body.reports
    const mine = all.find((x: any) => x.id === r.body.id)
    expect(mine.moderationStatus).toBe("Pending")
    expect(mine.reporterTier).toBe("Guest")
  })

  it("IT-22 an invalid category is rejected", async () => {
    expect((await submit(new Client(), { category: "Drugs", description: desc15 })).status).toBe(400)
  })

  it("IT-23 an unknown vendor is rejected", async () => {
    expect((await submit(new Client(), { vendorId: 99999, description: desc15 })).status).toBe(400)
  })

  it("IT-24 a fake image (text renamed as PNG) is rejected", async () => {
    const fake = "data:image/png;base64," + Buffer.from("hello").toString("base64")
    expect((await submit(new Client(), { description: desc15, evidenceImage: fake })).status).toBe(400)
  })

  it("IT-25 a GIF or PDF upload is rejected (only JPG/PNG allowed)", async () => {
    const gif = "data:image/gif;base64,R0lGODlhAQABAAAAACw="
    expect((await submit(new Client(), { description: desc15, evidenceImage: gif })).status).toBe(400)
  })

  it("IT-26 a real PNG photo is saved as evidence", async () => {
    const r = await submit(new Client(), { description: desc15, evidenceImage: TINY_PNG })
    expect(r.status).toBe(200)
    const all = (await new Client().call("data.php")).body.reports
    const saved = all.find((x: any) => x.id === r.body.id)
    expect(saved.evidence).toBe(true)
    expect(saved.evidenceImage).toMatch(/uploads\/report-.*\.png$/)
  })

  it("IT-27 a logged-in user reporting anonymously is stored as Anonymous", async () => {
    const rafi = await as("rafi")
    const r = await submit(rafi, { description: desc15, anonymous: true })
    const admin = await as("admin")
    const saved = (await admin.call("data.php")).body.reports.find((x: any) => x.id === r.body.id)
    expect(saved.reporterTier).toBe("Anonymous")
  })
})

describe("Privacy — what the public can see (data.php)", () => {
  it("IT-30 guests never see IP addresses, device IDs or internal notes", async () => {
    const reports = (await new Client().call("data.php")).body.reports
    expect(reports.length).toBeGreaterThan(0)
    for (const r of reports) {
      expect(r.ip).toBe("")
      expect(r.deviceId).toBe("")
      expect(r.outcomeInternalNote).toBe("")
    }
  })

  it("IT-31 guests never see Removed reports; admin does", async () => {
    const guest = (await new Client().call("data.php")).body.reports
    expect(guest.some((r: any) => r.moderationStatus === "Removed")).toBe(false)
    const admin = (await (await as("admin")).call("data.php")).body
    expect(admin.reports.some((r: any) => r.moderationStatus === "Removed")).toBe(true)
    expect(admin.reports.some((r: any) => r.ip !== "")).toBe(true)
  })

  it("IT-32 guests get no audit history; staff do", async () => {
    expect((await new Client().call("data.php")).body.auditLog).toEqual([])
    expect((await (await as("moderator")).call("data.php")).body.auditLog.length).toBeGreaterThan(0)
  })

  it("IT-33 an organization sees internal notes only for reports routed to it", async () => {
    const reports = (await (await as("dncrp")).call("data.php")).body.reports
    for (const r of reports) {
      if (r.routedTo !== "DNCRP") expect(r.outcomeInternalNote).toBe("")
    }
    expect(reports.some((r: any) => r.routedTo === "DNCRP" && r.outcomeInternalNote !== "")).toBe(true)
  })
})

describe("Moderation workflow (report_action.php) — state transitions", () => {
  const status = (c: Client, id: string, s: string, routedTo?: string) =>
    c.call("report_action.php", { id, action: "status", status: s, label: `Set ${s}`, routedTo })

  it("IT-40 a guest cannot change a report status", async () => {
    expect((await status(new Client(), "AA-01001", "Verified")).status).toBe(403)
  })

  it("IT-41 a public user and an organization cannot change a report status", async () => {
    expect((await status(await as("rafi"), "AA-01001", "Verified")).status).toBe(403)
    expect((await status(await as("bsti"), "AA-01001", "Verified")).status).toBe(403)
  })

  it("IT-42 a Pending report cannot be sent to an authority (must be Verified first)", async () => {
    const r = await status(await as("admin"), "AA-01002", "Escalated", "BSTI")
    expect(r.status).toBe(400)
    expect(r.body.error).toMatch(/Only verified reports/)
  })

  it("IT-43 Pending -> Verified -> Escalated(BSTI) sets the outcome to Awaiting and is audited", async () => {
    const mod = await as("moderator")
    expect((await status(mod, "AA-01002", "Verified")).status).toBe(200)
    expect((await status(mod, "AA-01002", "Escalated", "BSTI")).status).toBe(200)
    const data = (await mod.call("data.php")).body
    const r = data.reports.find((x: any) => x.id === "AA-01002")
    expect(r.moderationStatus).toBe("Escalated")
    expect(r.routedTo).toBe("BSTI")
    expect(r.authorityOutcome).toBe("Awaiting")
    const trail = data.auditLog.filter((a: any) => a.reportId === "AA-01002").map((a: any) => a.action)
    expect(trail).toEqual(expect.arrayContaining(["Set Verified", "Set Escalated"]))
  })

  it("IT-44 escalating to an organization that does not exist is rejected", async () => {
    const r = await status(await as("admin"), "AA-01006", "Escalated", "Police")
    expect(r.status).toBe(400)
  })

  it("IT-45 an invalid status value is rejected", async () => {
    expect((await status(await as("admin"), "AA-01006", "Deleted")).status).toBe(400)
  })

  it("IT-46 recalling an escalation (Escalated -> Verified) clears the authority", async () => {
    const admin = await as("admin")
    await status(admin, "AA-01002", "Verified")
    const r = (await admin.call("data.php")).body.reports.find((x: any) => x.id === "AA-01002")
    expect(r.routedTo).toBeNull()
    expect(r.authorityOutcome).toBeNull()
  })

  it("IT-47 an unknown report id returns 404", async () => {
    expect((await status(await as("admin"), "AA-99999", "Verified")).status).toBe(404)
  })
})

describe("Authority outcome (report_action.php outcome)", () => {
  const outcome = (c: Client, id: string, o: string, publicComment: string) =>
    c.call("report_action.php", { id, action: "outcome", outcome: o, publicComment, internalNote: "note" })

  it("IT-50 BSTI cannot set the outcome of a report assigned to DNCRP (access control)", async () => {
    const r = await outcome(await as("bsti"), "AA-01004", "Cleared", "Looks fine")
    expect(r.status).toBe(403)
  })

  it("IT-51 a moderator cannot set an authority outcome", async () => {
    expect((await outcome(await as("moderator"), "AA-01011", "Cleared", "x")).status).toBe(403)
  })

  it("IT-52 Confirmed without a public comment is rejected", async () => {
    expect((await outcome(await as("bsti"), "AA-01011", "Confirmed", "")).status).toBe(400)
  })

  it("IT-53 a public comment of 281 characters is rejected (BVA max+1)", async () => {
    expect((await outcome(await as("bsti"), "AA-01011", "Confirmed", "a".repeat(281))).status).toBe(400)
  })

  it("IT-54 a public comment of 280 characters is accepted (BVA max)", async () => {
    const bsti = await as("bsti")
    expect((await outcome(bsti, "AA-01011", "Confirmed", "a".repeat(280))).status).toBe(200)
    const r = (await new Client().call("data.php")).body.reports.find((x: any) => x.id === "AA-01011")
    expect(r.authorityOutcome).toBe("Confirmed")
    expect(r.outcomeSetBy).toBe("BSTI")
    expect(r.outcomeInternalNote).toBe("") // public still cannot see the internal note
  })
})

describe("Team page (users.php) — admin only", () => {
  const create = (c: Client, body: Record<string, unknown>) =>
    c.call("users.php", { action: "create", name: "New Mod", login: "newmod@x.test", password: "Abcd#123", role: "moderator", ...body })

  it("IT-60 a moderator cannot open the staff list", async () => {
    expect((await (await as("moderator")).call("users.php")).status).toBe(403)
  })

  it("IT-61 staff list never contains password hashes", async () => {
    const r = await (await as("admin")).call("users.php")
    expect(r.status).toBe(200)
    expect(JSON.stringify(r.body)).not.toMatch(/password|\$2y\$/)
  })

  it("IT-62 a 7-character staff password is rejected (BVA)", async () => {
    expect((await create(await as("admin"), { password: "Abc#123" })).status).toBe(400)
  })

  it("IT-63 organization staff must have a valid organization", async () => {
    expect((await create(await as("admin"), { role: "org", organization: "" })).status).toBe(400)
  })

  it("IT-64 an admin role cannot be created from the Team page", async () => {
    expect((await create(await as("admin"), { role: "admin" })).status).toBe(400)
  })

  it("IT-65 a valid moderator is created and can log in", async () => {
    expect((await create(await as("admin"), {})).status).toBe(200)
    const r = await new Client().login("newmod@x.test", "Abcd#123", "admin")
    expect(r.status).toBe(200)
  })

  it("IT-66 a turned-off account is blocked immediately, even if already logged in", async () => {
    const admin = await as("admin")
    const mod = new Client()
    await mod.login("newmod@x.test", "Abcd#123", "admin")
    const id = (await admin.call("users.php")).body.users.find((u: any) => u.login === "newmod@x.test").id
    expect((await admin.call("users.php", { action: "toggle", id })).status).toBe(200)
    // existing session no longer works
    const r = await mod.call("report_action.php", { id: "AA-01003", action: "status", status: "Verified" })
    expect(r.status).toBe(403)
    // and a new login is refused
    expect((await new Client().login("newmod@x.test", "Abcd#123", "admin")).status).toBe(403)
  })

  it("IT-67 the admin cannot turn off their own account", async () => {
    const admin = await as("admin")
    const me = (await admin.call("users.php")).body.users.find((u: any) => u.role === "admin").id
    expect((await admin.call("users.php", { action: "toggle", id: me })).status).toBe(400)
  })

  it("IT-68 changing your own password needs the correct current password", async () => {
    const rafi = await as("rafi")
    expect((await rafi.call("users.php", { action: "change_password", current: "wrong", password: "NewPass#1" })).status).toBe(400)
    expect((await rafi.call("users.php", { action: "change_password", current: "User#1234", password: "NewPass#1" })).status).toBe(200)
    expect((await new Client().login("rafi@example.test", "NewPass#1", "public")).status).toBe(200)
    // restore for other tests
    await rafi.call("users.php", { action: "change_password", current: "NewPass#1", password: "User#1234" })
  })
})

describe("Reviews (reviews.php)", () => {
  const create = (c: Client, rating: number, vendorId = 1) =>
    c.call("reviews.php", { action: "create", vendorId, rating, text: "Nice shop" })

  it("IT-70 a guest cannot write a review", async () => {
    expect((await create(new Client(), 5)).status).toBe(403)
  })

  it.each([0, 6])("IT-71 rating %i is rejected (BVA outside 1-5)", async (rating) => {
    expect((await create(await as("rafi"), rating)).status).toBe(400)
  })

  it.each([1, 5])("IT-72 rating %i is accepted (BVA edges)", async (rating) => {
    expect((await create(await as("rafi"), rating)).status).toBe(200)
  })

  it("IT-73 a review for a vendor that does not exist gets a 400, not a 500 — defect D-04", async () => {
    expect((await create(await as("rafi"), 4, 99999)).status).toBe(400)
  })

  it("IT-74 only staff can hide a review", async () => {
    expect((await (await as("rafi")).call("reviews.php", { action: "toggle", id: "RV-1" })).status).toBe(403)
    expect((await (await as("moderator")).call("reviews.php", { action: "toggle", id: "RV-1" })).status).toBe(200)
  })
})

describe("Vendor badges and approval list (vendors.php) — admin only", () => {
  const update = (c: Client, body: Record<string, unknown>) => c.call("vendors.php", { id: 2, ...body })

  it("IT-90 the admin grants verification badges; the public sees them", async () => {
    expect((await update(await as("admin"), { badges: ["BSTI", "DNCRP"] })).status).toBe(200)
    const v = (await new Client().call("vendors.php")).body.vendors.find((x: any) => x.id === "2")
    expect(v.badges).toEqual(["BSTI", "DNCRP"])
    expect(v.verifiedDate).not.toBe("")
  })

  it("IT-91 a moderator cannot change badges", async () => {
    expect((await update(await as("moderator"), { badges: [] })).status).toBe(403)
  })

  it("IT-92 an unknown badge name is ignored (only BSTI, DNCRP, Accredited Laboratory)", async () => {
    await update(await as("admin"), { badges: ["BSTI", "FakeAuthority"] })
    const v = (await new Client().call("vendors.php")).body.vendors.find((x: any) => x.id === "2")
    expect(v.badges).toEqual(["BSTI"])
  })
})

describe("Hidden reviews stay hidden", () => {
  it("IT-75 a review hidden by a moderator is not sent to guests at all — defect D-05", async () => {
    const mod = await as("moderator")
    const before = (await mod.call("data.php")).body.reviews.find((r: any) => r.id === "RV-2")
    expect(before.hidden).toBe(false)
    await mod.call("reviews.php", { action: "toggle", id: "RV-2" })
    const guest = (await new Client().call("data.php")).body.reviews
    expect(guest.some((r: any) => r.id === "RV-2")).toBe(false)
    const guestDirect = (await new Client().call("reviews.php")).body.reviews
    expect(guestDirect.some((r: any) => r.id === "RV-2")).toBe(false)
    // staff still see it, so they can restore it
    const staff = (await mod.call("data.php")).body.reviews.find((r: any) => r.id === "RV-2")
    expect(staff.hidden).toBe(true)
  })
})

describe("Login history (login_history.php)", () => {
  it("IT-80 failed logins are recorded with a reason", async () => {
    await new Client().login("admin@awarenessalert.test", "bad-password", "admin")
    const r = await (await as("admin")).call("login_history.php?filter=failed")
    expect(r.status).toBe(200)
    expect(r.body.events.every((e: any) => e.event === "failed")).toBe(true)
    expect(r.body.events.some((e: any) => e.reason === "Wrong password")).toBe(true)
    expect(r.body.summary.failed24h).toBeGreaterThan(0)
  })

  it("IT-81 only the admin can read login history", async () => {
    expect((await (await as("moderator")).call("login_history.php")).status).toBe(403)
    expect((await new Client().call("login_history.php")).status).toBe(403)
  })
})
