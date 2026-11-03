// Unit tests for the Vendor portal rules in src/logic.ts.
// Expected values come from the vendor portal rules (README "Vendor portal"):
//  - a vendor sees only the shop it is the verified owner of
//  - a report can be disputed only while it is Pending or Verified, and only once at a time
//  - escalated reports cannot be disputed (the authority decides), but can still be replied to
//  - the newest Approved claim wins, then a Pending one, then the latest decision
import { describe, expect, it } from "vitest"
import type { VendorClaim, VendorResponse } from "../../src/logic"
import { canDispute, ownedVendor, vendorClaimState, vendorResponseFor } from "../../src/logic"
import { report, store, vendor } from "./factories"

function response(over: Partial<VendorResponse> = {}): VendorResponse {
  return {
    id: "VR-1",
    reportId: "AA-1",
    vendorId: "v1",
    kind: "reply",
    body: "We fixed the fridge the same day.",
    status: "Published",
    moderatorNote: "",
    decidedBy: "",
    createdAt: "2026-10-20T10:00:00Z",
    updatedAt: "",
    decidedAt: "",
    ...over,
  }
}

function claim(over: Partial<VendorClaim> = {}): VendorClaim {
  return {
    id: "1",
    userId: "u9",
    userName: "Arif Hossain",
    userLogin: "vendor@awarenessalert.test",
    vendorId: "v1",
    vendorName: "Test Vendor",
    businessRole: "Manager",
    phone: "01711000000",
    tradeLicense: "TRAD/1",
    message: "",
    status: "Pending",
    adminNote: "",
    decidedBy: "",
    createdAt: "2026-10-20T10:00:00Z",
    decidedAt: "",
    ...over,
  }
}

describe("ownedVendor — a vendor only manages its own verified shop", () => {
  it("TC-U63 returns the shop whose verified owner is the logged-in vendor", () => {
    const s = store([], [vendor({ id: "v1" }), vendor({ id: "v2", ownerUserId: "u9" })])
    s.session = { userId: "u9", role: "vendor" }
    expect(ownedVendor(s)?.id).toBe("v2")
  })

  it("TC-U64 returns nothing while the claim is not approved (no owner set)", () => {
    const s = store([], [vendor({ id: "v1", ownerUserId: null })])
    s.session = { userId: "u9", role: "vendor" }
    expect(ownedVendor(s)).toBeUndefined()
  })

  it("TC-U65 a non-vendor session never owns a shop, even with a matching id", () => {
    const s = store([], [vendor({ id: "v1", ownerUserId: "u9" })])
    s.session = { userId: "u9", role: "admin" }
    expect(ownedVendor(s)).toBeUndefined()
  })
})

describe("vendorResponseFor — reply and dispute of one report", () => {
  it("TC-U66 finds the reply and the open dispute of the right report only", () => {
    const all = [
      response({ id: "VR-1", reportId: "AA-1", kind: "reply" }),
      response({ id: "VR-2", reportId: "AA-1", kind: "dispute", status: "Open" }),
      response({ id: "VR-3", reportId: "AA-2", kind: "reply" }),
    ]
    const r = vendorResponseFor("AA-1", all)
    expect(r.reply?.id).toBe("VR-1")
    expect(r.openDispute?.id).toBe("VR-2")
  })

  it("TC-U67 a decided dispute is not an open dispute", () => {
    const r = vendorResponseFor("AA-1", [response({ kind: "dispute", status: "Rejected" })])
    expect(r.dispute?.status).toBe("Rejected")
    expect(r.openDispute).toBeUndefined()
  })
})

describe("canDispute — only Pending or Verified reports, one open dispute at a time", () => {
  it("TC-U68 a Verified report without a dispute can be disputed", () => {
    expect(canDispute(report({ moderationStatus: "Verified" }), [])).toBe(true)
  })

  it("TC-U69 a Pending report can be disputed", () => {
    expect(canDispute(report({ moderationStatus: "Pending" }), [])).toBe(true)
  })

  it("TC-U70 an Escalated report cannot be disputed (the authority decides)", () => {
    expect(canDispute(report({ moderationStatus: "Escalated" }), [])).toBe(false)
  })

  it("TC-U71 an already Disputed or Removed report cannot be disputed again", () => {
    expect(canDispute(report({ moderationStatus: "Disputed" }), [])).toBe(false)
    expect(canDispute(report({ moderationStatus: "Removed" }), [])).toBe(false)
  })

  it("TC-U72 a second dispute is blocked while the first one is open", () => {
    const r = report({ moderationStatus: "Verified" })
    const open = response({ reportId: r.id, kind: "dispute", status: "Open" })
    expect(canDispute(r, [open])).toBe(false)
  })

  it("TC-U73 after a rejected dispute the vendor may dispute again", () => {
    const r = report({ moderationStatus: "Verified" })
    const rejected = response({ reportId: r.id, kind: "dispute", status: "Rejected" })
    expect(canDispute(r, [rejected])).toBe(true)
  })
})

describe("vendorClaimState — which claim the vendor portal shows", () => {
  it("TC-U74 an approved claim wins over an older rejected one", () => {
    const claims = [
      claim({ id: "1", status: "Rejected" }),
      claim({ id: "2", status: "Approved" }),
    ]
    expect(vendorClaimState(claims, "u9")?.id).toBe("2")
  })

  it("TC-U75 a pending claim is shown while waiting for the admin", () => {
    const claims = [claim({ id: "1", status: "Rejected" }), claim({ id: "2", status: "Pending" })]
    expect(vendorClaimState(claims, "u9")?.status).toBe("Pending")
  })

  it("TC-U76 claims of other accounts are never used", () => {
    expect(vendorClaimState([claim({ userId: "someone-else" })], "u9")).toBeUndefined()
  })
})
