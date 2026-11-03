// Integration tests for the Vendor portal: React API contract -> vendor_portal.php -> test database.
// Run with: ./scripts/start-test-api.sh && npm run test:integration
// Demo data from setup.php: vendor@awarenessalert.test is the verified owner of "Chillox Banani";
// newvendor@awarenessalert.test has a PENDING claim for "Sajna Restaurant".
import { beforeAll, describe, expect, it } from "vitest"
import { Client, as, resetDatabase } from "./client"

beforeAll(resetDatabase)

const call = (c: Client, body: Record<string, unknown>) => c.call("vendor_portal.php", body)
const data = (c: Client) => c.call("data.php").then((r) => r.body)
const vendorId = async (name: string) =>
  (await data(new Client())).vendors.find((v: any) => v.name === name).id as string
// each test submits its own fresh (Pending) report about the shop, like a guest would
async function newReport(shop: string): Promise<{ id: string }> {
  const r = await new Client().call("reports.php", {
    vendorId: await vendorId(shop),
    category: "Food",
    description: "Integration test report about this shop.",
    anonymous: true,
    deviceId: `dev-it-${Math.random().toString(16).slice(2, 8)}`,
  })
  if (r.status !== 200) throw new Error(`could not create a report: ${JSON.stringify(r.body)}`)
  return { id: r.body.id }
}
const claim = (vendor: string, over: Record<string, unknown> = {}) => ({
  vendorId: vendor,
  businessRole: "Owner",
  phone: "01811222333",
  tradeLicense: "TRAD/DNCC/777/2026",
  message: "Integration test",
  ...over,
})

describe("Vendor accounts and shop claims (vendor_portal.php)", () => {
  it("IT-140 a vendor logs in on the Vendor login page only", async () => {
    expect((await new Client().login("vendor@awarenessalert.test", "Vendor#1234", "vendor")).status).toBe(200)
    expect((await new Client().login("vendor@awarenessalert.test", "Vendor#1234", "admin")).status).toBe(403)
    expect((await new Client().login("admin@awarenessalert.test", "Admin#1234", "vendor")).status).toBe(403)
  })

  it("IT-141 registering creates a vendor account with a PENDING claim and logs in", async () => {
    const c = new Client()
    const r = await call(c, {
      action: "register", name: "Rahim Uddin", login: "rahim@shop.test", password: "Rahim#2026",
      ...claim(await vendorId("Durum Banani")),
    })
    expect(r.status).toBe(200)
    const d = await data(c)
    expect(d.session.role).toBe("vendor")
    expect(d.vendorClaims).toHaveLength(1)
    expect(d.vendorClaims[0].status).toBe("Pending")
  })

  it("IT-142 registration validates password length, phone and trade licence", async () => {
    const id = await vendorId("Bella Italia Gulshan")
    const reg = (over: Record<string, unknown>) =>
      call(new Client(), { action: "register", name: "X", login: `x${Math.random()}@t.test`, password: "Abcd#123", ...claim(id), ...over })
    expect((await reg({ password: "Abc#123" })).status).toBe(400) // 7 characters (BVA)
    expect((await reg({ phone: "abc" })).body.error).toBe("Enter a valid phone number.")
    expect((await reg({ tradeLicense: "" })).status).toBe(400)
  })

  it("IT-143 a shop that already has a verified owner cannot be claimed", async () => {
    const r = await call(new Client(), {
      action: "register", name: "Fake Owner", login: "fake@shop.test", password: "Fake#2026",
      ...claim(await vendorId("Chillox Banani")),
    })
    expect(r.status).toBe(409)
  })

  it("IT-144 a vendor with a pending claim cannot reply to reports yet", async () => {
    const c = await as("newvendor")
    const r = await call(c, { action: "reply", reportId: "AA-01001", text: "This should not be allowed." })
    expect(r.status).toBe(403)
  })

  it("IT-145 only the admin can decide a claim; rejecting needs a reason", async () => {
    const pending = (await data(await as("admin"))).vendorClaims.find((x: any) => x.vendorName === "Sajna Restaurant")
    const mod = await as("moderator")
    expect((await call(mod, { action: "decide_claim", claimId: pending.id, decision: "Approved" })).status).toBe(403)
    const admin = await as("admin")
    expect((await call(admin, { action: "decide_claim", claimId: pending.id, decision: "Rejected", note: "" })).status).toBe(400)
  })

  it("IT-146 approving a claim makes the vendor the verified owner", async () => {
    const admin = await as("admin")
    const pending = (await data(admin)).vendorClaims.find((x: any) => x.vendorName === "Sajna Restaurant")
    expect((await call(admin, { action: "decide_claim", claimId: pending.id, decision: "Approved", note: "" })).status).toBe(200)
    const d = await data(await as("newvendor"))
    const shop = d.vendors.find((v: any) => v.name === "Sajna Restaurant")
    expect(shop.ownerVerified).toBe(true)
    expect(shop.ownerUserId).toBe(d.session.userId)
    // a decided claim cannot be decided again
    expect((await call(admin, { action: "decide_claim", claimId: pending.id, decision: "Rejected", note: "x" })).status).toBe(400)
  })

  it("IT-147 the public never receives shop claims or owner ids", async () => {
    const d = await data(new Client())
    expect(d.vendorClaims).toEqual([])
    expect(d.vendors.every((v: any) => v.ownerUserId === null)).toBe(true)
  })
})

describe("Vendor replies and disputes (right of reply)", () => {
  it("IT-148 the owner posts a public reply that everyone can read", async () => {
    const c = await as("vendor")
    const report = await newReport("Chillox Banani")
    const text = "Thank you for telling us. We repaired the fridge the same day."
    expect((await call(c, { action: "reply", reportId: report.id, text })).status).toBe(200)
    const pub = await data(new Client())
    const reply = pub.vendorResponses.find((x: any) => x.reportId === report.id && x.kind === "reply")
    expect(reply.body).toBe(text)
    expect(reply.status).toBe("Published")
  })

  it("IT-149 replying again edits the same reply (one reply per report)", async () => {
    const c = await as("vendor")
    const report = await newReport("Chillox Banani")
    await call(c, { action: "reply", reportId: report.id, text: "First reply from the shop manager." })
    await call(c, { action: "reply", reportId: report.id, text: "Updated reply: all stock was checked." })
    const replies = (await data(new Client())).vendorResponses.filter((x: any) => x.reportId === report.id && x.kind === "reply")
    expect(replies).toHaveLength(1)
    expect(replies[0].body).toBe("Updated reply: all stock was checked.")
  })

  it("IT-150 a reply shorter than 10 characters is rejected (BVA)", async () => {
    const c = await as("vendor")
    const report = await newReport("Chillox Banani")
    expect((await call(c, { action: "reply", reportId: report.id, text: "Too short" })).status).toBe(400) // 9 chars
  })

  it("IT-151 a vendor cannot reply to a report about another shop", async () => {
    const c = await as("vendor")
    const other = await newReport("Zia General Store")
    expect((await call(c, { action: "reply", reportId: other.id, text: "Not my shop at all, but trying." })).status).toBe(404)
  })

  it("IT-152 a public user cannot use vendor actions", async () => {
    const c = await as("rafi")
    expect((await call(c, { action: "reply", reportId: "AA-01001", text: "I am not a vendor." })).status).toBe(403)
  })

  it("IT-153 a dispute reason is only visible to staff and the owner, not the public", async () => {
    const c = await as("vendor")
    const report = await newReport("Chillox Banani")
    const reason = "We were closed on that day for renovation work."
    expect((await call(c, { action: "dispute", reportId: report.id, reason })).status).toBe(200)
    const pub = (await data(new Client())).vendorResponses.find((x: any) => x.reportId === report.id && x.kind === "dispute")
    expect(pub.status).toBe("Open")
    expect(pub.body).toBe("")
    const staff = (await data(await as("moderator"))).vendorResponses.find((x: any) => x.reportId === report.id && x.kind === "dispute")
    expect(staff.body).toBe(reason)
  })

  it("IT-154 only one open dispute per report", async () => {
    const c = await as("vendor")
    const d = await data(c)
    const open = d.vendorResponses.find((x: any) => x.kind === "dispute" && x.status === "Open")
    const r = await call(c, { action: "dispute", reportId: open.reportId, reason: "Second dispute for the same report." })
    expect(r.status).toBe(400)
  })

  it("IT-155 a moderator accepts the dispute and the report becomes Disputed", async () => {
    const mod = await as("moderator")
    const open = (await data(mod)).vendorResponses.find((x: any) => x.kind === "dispute" && x.status === "Open")
    expect((await call(mod, { action: "decide_dispute", responseId: open.id, decision: "Accepted", note: "Confirmed closed." })).status).toBe(200)
    const d = await data(mod)
    expect(d.reports.find((r: any) => r.id === open.reportId).moderationStatus).toBe("Disputed")
    expect(d.auditLog.some((a: any) => a.reportId === open.reportId && a.action.startsWith("Vendor dispute accepted"))).toBe(true)
  })

  it("IT-156 a vendor cannot decide its own dispute", async () => {
    const c = await as("vendor")
    const report = await newReport("Chillox Banani")
    await call(c, { action: "dispute", reportId: report.id, reason: "Another reason that is long enough." })
    const open = (await data(c)).vendorResponses.find((x: any) => x.kind === "dispute" && x.status === "Open")
    expect((await call(c, { action: "decide_dispute", responseId: open.id, decision: "Accepted", note: "" })).status).toBe(403)
  })

  it("IT-157 an escalated report cannot be disputed (the authority decides)", async () => {
    const vendor = await as("vendor")
    const admin = await as("admin")
    const report = await newReport("Chillox Banani")
    expect((await admin.call("report_action.php", { id: report.id, action: "status", status: "Verified", label: "Marked Verified" })).status).toBe(200)
    expect((await admin.call("report_action.php", { id: report.id, action: "status", status: "Escalated", label: "Assigned", routedTo: "DNCRP" })).status).toBe(200)
    const r = await call(vendor, { action: "dispute", reportId: report.id, reason: "Trying to dispute an escalated report." })
    expect(r.status).toBe(400)
    expect(r.body.error).toContain("authority")
  })

  it("IT-158 the owner updates the shop information shown on the public profile", async () => {
    const c = await as("vendor")
    const info = { phone: "01711999888", openingHours: "11 AM – 11 PM", description: "Halal burgers." }
    expect((await call(c, { action: "update_info", ...info })).status).toBe(200)
    const shop = (await data(new Client())).vendors.find((v: any) => v.name === "Chillox Banani")
    expect(shop.phone).toBe(info.phone)
    expect(shop.openingHours).toBe(info.openingHours)
    expect(shop.shopDescription).toBe(info.description)
  })

  it("IT-159 GET on vendor_portal.php is not allowed (405)", async () => {
    expect((await new Client().call("vendor_portal.php")).status).toBe(405)
  })
})
