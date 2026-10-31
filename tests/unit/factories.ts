import type { Report, Review, Store, Vendor } from "../../src/logic"

// Fixed "now" so tests never depend on the real clock.
export const NOW = Date.parse("2026-10-20T12:00:00Z")
export const DAY = 86_400_000
export const ago = (ms: number) => new Date(NOW - ms).toISOString()

export function vendor(over: Partial<Vendor> = {}): Vendor {
  return {
    id: "v1",
    name: "Test Vendor",
    area: "Gulshan-1",
    kind: "Grocery",
    previousBand: "Trusted",
    badges: [],
    approval: {},
    verifiedDate: "",
    x: 50,
    y: 50,
    ...over,
  }
}

let seq = 0
export function report(over: Partial<Report> = {}): Report {
  seq += 1
  return {
    id: `AA-${seq}`,
    vendorId: "v1",
    category: "Food",
    description: "Expired milk on the shelf near the entrance",
    location: "Gulshan-1",
    evidence: false,
    submittedAt: ago(DAY),
    reporterTier: "Guest",
    anonymous: false,
    ip: "127.0.0.1",
    deviceId: `dev-${seq}`,
    moderationStatus: "Verified",
    authorityOutcome: null,
    routedTo: null,
    outcomePublicComment: "",
    outcomeInternalNote: "",
    outcomeSetBy: "",
    outcomeSetAt: "",
    ...over,
  }
}

export function review(over: Partial<Review> = {}): Review {
  seq += 1
  return {
    id: `RV-${seq}`,
    vendorId: "v1",
    userId: "u1",
    rating: 4,
    text: "Clean shop",
    date: ago(DAY),
    hidden: false,
    flags: 0,
    ...over,
  }
}

export function store(reports: Report[] = [], vendors: Vendor[] = [vendor()]): Store {
  return {
    reports,
    vendors,
    reviews: [],
    users: [],
    organizations: ["BSTI", "DNCRP", "Accredited Laboratory"],
    savedAreas: [],
    notifications: [],
    auditLog: [],
    routingConfig: { Food: "BSTI", Fuel: "DNCRP", Other: "Accredited Laboratory" },
    showOrgNamePublicly: true,
    weeklyDigest: false,
    session: null,
  }
}
