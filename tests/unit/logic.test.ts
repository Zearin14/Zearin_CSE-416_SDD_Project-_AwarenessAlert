// Unit tests for the business rules in src/logic.ts.
// Expected values come from the SRS / README rules, not from running the code:
//  - a vendor's trust status changes only with >= 3 independent sources in 30 days
//    OR >= 1 authority confirmation (fairness rule)
//  - removed reports never count
//  - score bands: >= 70 Trusted, >= 40 Caution, otherwise High risk
import { describe, expect, it } from "vitest"
import {
  errorText,
  findVendor,
  formatDate,
  isStaff,
  labelTone,
  publicLabel,
  ratingFor,
  vendorMetrics,
} from "../../src/logic"
import { DAY, NOW, ago, report, review, store, vendor } from "./factories"

const metrics = (reports: ReturnType<typeof report>[], v = vendor()) =>
  vendorMetrics(v, store(reports, [v]), NOW)

describe("vendorMetrics — fairness threshold (3 sources in 30 days or 1 confirmation)", () => {
  it("TC-U01 one verified report does not change the vendor status", () => {
    const m = metrics([report()])
    expect(m.threshold).toBe(false)
    expect(m.band).toBe("Trusted")
    expect(m.score).toBe(84)
  })

  it("TC-U02 two independent sources (boundary 3-1) are not enough", () => {
    const m = metrics([report(), report()])
    expect(m.sources).toBe(2)
    expect(m.threshold).toBe(false)
    expect(m.band).toBe("Trusted")
  })

  it("TC-U03 three independent sources (boundary) change the status", () => {
    const m = metrics([report(), report(), report()])
    expect(m.sources).toBe(3)
    expect(m.threshold).toBe(true)
    // 3 verified reports without photo = 3 x 8 = 24 -> 92 - 24 = 68 -> Caution
    expect(m.score).toBe(68)
    expect(m.band).toBe("Caution")
  })

  it("TC-U04 three reports from the same device count as ONE source", () => {
    const m = metrics([
      report({ deviceId: "same" }),
      report({ deviceId: "same" }),
      report({ deviceId: "same" }),
    ])
    expect(m.sources).toBe(1)
    expect(m.threshold).toBe(false)
  })

  it("TC-U05 a logged-in reporter is one source even from different devices", () => {
    const m = metrics([
      report({ reporterId: "u7" }),
      report({ reporterId: "u7" }),
      report({ reporterId: "u7" }),
    ])
    expect(m.sources).toBe(1)
  })

  it("TC-U06 a report exactly 30 days old still counts (boundary)", () => {
    const m = metrics([report(), report(), report({ submittedAt: ago(30 * DAY) })])
    expect(m.sources).toBe(3)
    expect(m.threshold).toBe(true)
  })

  it("TC-U07 a report 30 days + 1 minute old does not count (boundary + 1)", () => {
    const m = metrics([report(), report(), report({ submittedAt: ago(30 * DAY + 60_000) })])
    expect(m.sources).toBe(2)
    expect(m.threshold).toBe(false)
  })

  it("TC-U08 one authority confirmation alone changes the status", () => {
    const m = metrics([report({ moderationStatus: "Escalated", authorityOutcome: "Confirmed" })])
    expect(m.confirmed).toBe(1)
    expect(m.threshold).toBe(true)
    expect(m.score).toBe(68) // 92 - 24
    expect(m.band).toBe("Caution")
  })

  it("TC-U09 removed reports are ignored completely", () => {
    const m = metrics([
      report(),
      report(),
      report({ moderationStatus: "Removed" }),
      report({ moderationStatus: "Removed", authorityOutcome: "Confirmed" }),
    ])
    expect(m.reports).toHaveLength(2)
    expect(m.threshold).toBe(false)
  })

  it("TC-U10 pending, disputed and cleared reports add no weight", () => {
    const m = metrics([
      report({ moderationStatus: "Pending" }),
      report({ moderationStatus: "Disputed" }),
      report({ moderationStatus: "Escalated", authorityOutcome: "Cleared" }),
    ])
    expect(m.threshold).toBe(true)
    expect(m.score).toBe(92)
    expect(m.band).toBe("Trusted")
  })
})

describe("vendorMetrics — added after mutation testing (Stryker survivors)", () => {
  it("TC-U27 reports about OTHER vendors are never counted", () => {
    const m = metrics([report(), report({ vendorId: "v2" }), report({ vendorId: "v2" })])
    expect(m.reports).toHaveLength(1)
    expect(m.sources).toBe(1)
    expect(m.threshold).toBe(false)
  })

  it("TC-U28 a report exactly 48 hours old still counts towards a spike (boundary)", () => {
    expect(metrics([report(), report(), report({ submittedAt: ago(2 * DAY) })]).spike).toBe(true)
    expect(metrics([report(), report(), report({ submittedAt: ago(2 * DAY + 60_000) })]).spike).toBe(false)
  })
})

describe("vendorMetrics — score bands (BVA on 70 and 40)", () => {
  it("TC-U11 score 70 is Trusted (lower edge of Trusted)", () => {
    // 11 + 11 + 0 = 22 -> 92 - 22 = 70
    const m = metrics([
      report({ evidence: true }),
      report({ evidence: true }),
      report({ moderationStatus: "Pending" }),
    ])
    expect(m.score).toBe(70)
    expect(m.band).toBe("Trusted")
  })

  it("TC-U12 score 40 is Caution (lower edge of Caution)", () => {
    // 4 x 11 + 8 = 52 -> 40
    const m = metrics([
      report({ evidence: true }),
      report({ evidence: true }),
      report({ evidence: true }),
      report({ evidence: true }),
      report(),
    ])
    expect(m.score).toBe(40)
    expect(m.band).toBe("Caution")
  })

  it("TC-U13 score 38 is High risk (below 40)", () => {
    // 2 x 11 + 4 x 8 = 54 -> 38
    const m = metrics([
      report({ evidence: true }),
      report({ evidence: true }),
      report(),
      report(),
      report(),
      report(),
    ])
    expect(m.score).toBe(38)
    expect(m.band).toBe("High risk")
  })

  it("TC-U14 score never drops below the floor of 18", () => {
    const confirmed = { moderationStatus: "Escalated" as const, authorityOutcome: "Confirmed" as const }
    const m = metrics([report(confirmed), report(confirmed), report(confirmed), report(confirmed)])
    expect(m.score).toBe(18)
    expect(m.band).toBe("High risk")
  })

  it("TC-U15 a vendor under Observation keeps score 0 until the threshold is met", () => {
    const m = metrics([report()], vendor({ previousBand: "Observation" }))
    expect(m.band).toBe("Observation")
    expect(m.score).toBe(0)
  })

  it("TC-U16 previous bands give their default scores", () => {
    expect(metrics([], vendor({ previousBand: "Caution" })).score).toBe(58)
    expect(metrics([], vendor({ previousBand: "High risk" })).score).toBe(34)
  })
})

describe("vendorMetrics — unusual activity (spike)", () => {
  it("TC-U17 three reports within 48 hours is a spike", () => {
    expect(metrics([report(), report(), report()]).spike).toBe(true)
  })

  it("TC-U18 two reports within 48 hours is not a spike", () => {
    expect(metrics([report(), report()]).spike).toBe(false)
  })

  it("TC-U19 six reports in total is a spike even if old", () => {
    const old = () => report({ submittedAt: ago(20 * DAY) })
    expect(metrics([old(), old(), old(), old(), old(), old()]).spike).toBe(true)
    expect(metrics([old(), old(), old(), old(), old()]).spike).toBe(false)
  })
})

describe("publicLabel / labelTone — what the public sees", () => {
  it.each([
    ["Pending", null, "Under moderator review", "neutral"],
    ["Verified", null, "Verified by moderators", "teal"],
    ["Disputed", null, "Disputed", "outline"],
    ["Removed", null, "Hidden from public view", "neutral"],
    ["Escalated", "Awaiting", "Under authority review", "blue"],
    ["Escalated", "Confirmed", "Confirmed by authority", "strong-blue"],
    ["Escalated", "Cleared", "Reviewed — no issue found", "slate"],
  ] as const)("TC-U20 %s / %s -> %s", (status, outcome, label, tone) => {
    const r = report({ moderationStatus: status, authorityOutcome: outcome })
    expect(publicLabel(r)).toBe(label)
    expect(labelTone(r)).toBe(tone)
  })
})

describe("ratingFor — customer reviews", () => {
  it("TC-U21 hidden reviews are excluded from count and average", () => {
    const r = ratingFor("v1", [
      review({ rating: 5 }),
      review({ rating: 3 }),
      review({ rating: 1, hidden: true }),
      review({ rating: 1, vendorId: "other" }),
    ])
    expect(r.count).toBe(2)
    expect(r.average).toBe(4)
  })

  it("TC-U22 a vendor with no reviews has average 0 (no division by zero)", () => {
    expect(ratingFor("v1", [])).toEqual({ count: 0, average: 0, reviews: [] })
  })
})

describe("roles and helpers", () => {
  it("TC-U23 only admin and moderator are staff", () => {
    expect(isStaff("admin")).toBe(true)
    expect(isStaff("moderator")).toBe(true)
    expect(isStaff("org")).toBe(false)
    expect(isStaff("public")).toBe(false)
    expect(isStaff(undefined)).toBe(false)
  })

  it("TC-U24 an unknown vendor id returns a safe placeholder", () => {
    const v = findVendor(store([], [vendor()]), "missing-9")
    expect(v.name).toBe("Unknown vendor")
    expect(v.id).toBe("missing-9")
    expect(findVendor(store([], [vendor()]), "v1").name).toBe("Test Vendor")
  })

  it("TC-U25 error messages are shown, unknown errors get a generic text", () => {
    expect(errorText(new Error("Server down"))).toBe("Server down")
    expect(errorText("boom")).toBe("Something went wrong.")
  })

  it("TC-U26 an empty date is shown as a dash", () => {
    expect(formatDate("")).toBe("—")
    expect(formatDate("2026-10-20T12:00:00Z")).toMatch(/2026/)
    // with time: the hour and minutes are added
    expect(formatDate("2026-10-20T12:05:00Z", true)).toMatch(/:05/)
  })
})
