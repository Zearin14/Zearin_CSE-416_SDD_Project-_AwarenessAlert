// Pure business logic of AwarenessAlert (no React, no browser APIs).
// Kept separate from App.tsx so it can be unit-tested (see tests/unit).
import type { LoginEvent } from "./api"

export type ModerationStatus = "Pending" | "Verified" | "Escalated" | "Disputed" | "Removed"
export type AuthorityOutcome = "Awaiting" | "Confirmed" | "Cleared" | null
export type Category = "Food" | "Fuel" | "Other"
export type OrgId = "BSTI" | "DNCRP" | "Accredited Laboratory"
export type Role = "public" | "admin" | "moderator" | "org"

export type Report = {
  id: string
  vendorId: string
  category: Category
  description: string
  location: string
  evidence: boolean
  evidenceImage?: string
  submittedAt: string
  reporterTier: "Guest" | "Anonymous" | "Identified"
  reporterId?: string
  anonymous: boolean
  ip: string
  deviceId: string
  moderationStatus: ModerationStatus
  authorityOutcome: AuthorityOutcome
  routedTo: OrgId | null
  outcomePublicComment: string
  outcomeInternalNote: string
  outcomeSetBy: string
  outcomeSetAt: string
}

export type Vendor = {
  id: string
  name: string
  area: string
  kind: string
  previousBand: "Trusted" | "Caution" | "High risk" | "Observation"
  badges: OrgId[]
  approval: Record<string, string>
  verifiedDate: string
  x: number
  y: number
  lat?: number
  lng?: number
  address?: string
}

export type Review = {
  id: string
  vendorId: string
  userId: string
  rating: number
  text: string
  date: string
  hidden: boolean
  flags: number
}

export type User = {
  id: string
  name: string
  login: string
  password: string
  role: Role
  organization?: OrgId
  title?: string
  active?: boolean
}

export type Audit = {
  id: string
  reportId: string
  action: string
  actor: string
  at: string
}

export type Session = {
  userId: string;
  role: Role;
  organization?: OrgId;
} | null;

export type Store = {
  reports: Report[]
  vendors: Vendor[]
  reviews: Review[]
  users: User[]
  organizations: OrgId[]
  savedAreas: string[]
  notifications: {
    id: string
    title: string
    body: string
    href: string
    at: string
  }[]
  auditLog: Audit[]
  loginHistory?: LoginEvent[]
  routingConfig: Record<Category, OrgId>
  showOrgNamePublicly: boolean
  weeklyDigest: boolean
  session: Session
}

// Admin + moderators can open the moderator portal
export const STAFF_ROLES: Role[] = ["admin", "moderator"]
export const isStaff = (role?: Role) => !!role && STAFF_ROLES.includes(role)

export function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

// Turns real latitude/longitude into positions (in %) on the drawn map,
// then nudges pins apart so they never sit on top of each other.
export function layoutVendors(vendors: Vendor[]): Vendor[] {
  const geo = vendors.filter((vendor) => vendor.lat && vendor.lng)
  if (!geo.length) return vendors
  const lats = geo.map((vendor) => vendor.lat!)
  const lngs = geo.map((vendor) => vendor.lng!)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const points = vendors.map((vendor) =>
    vendor.lat && vendor.lng
      ? {
          x: 8 + ((vendor.lng - minLng) / (maxLng - minLng || 1)) * 80,
          y: 10 + ((maxLat - vendor.lat) / (maxLat - minLat || 1)) * 72,
        }
      : { x: vendor.x, y: vendor.y },
  )
  // ~9px per 1% horizontally and ~6px per 1% vertically on a desktop map
  const minDistance = 50
  for (let round = 0; round < 80; round++) {
    let moved = false
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = (points[j].x - points[i].x) * 9
        const dy = (points[j].y - points[i].y) * 6
        const distance = Math.hypot(dx, dy)
        if (distance < minDistance) {
          const angle = distance ? Math.atan2(dy, dx) : (i + j) * 1.7
          const push = (minDistance - distance) / 2
          points[i].x -= (Math.cos(angle) * push) / 9
          points[i].y -= (Math.sin(angle) * push) / 6
          points[j].x += (Math.cos(angle) * push) / 9
          points[j].y += (Math.sin(angle) * push) / 6
          moved = true
        }
      }
    }
    for (const point of points) {
      point.x = Math.min(92, Math.max(4, point.x))
      point.y = Math.min(84, Math.max(6, point.y))
    }
    if (!moved) break
  }
  return vendors.map((vendor, index) => ({
    ...vendor,
    x: Math.round(points[index].x * 10) / 10,
    y: Math.round(points[index].y * 10) / 10,
  }))
}

// Label each area at the middle of its vendors
export function areaLabels(vendors: Vendor[]) {
  const groups = new Map<string, Vendor[]>()
  for (const vendor of vendors) {
    groups.set(vendor.area, [...(groups.get(vendor.area) ?? []), vendor])
  }
  return [...groups.entries()].map(([area, list]) => ({
    area,
    x: list.reduce((sum, vendor) => sum + vendor.x, 0) / list.length,
    y: Math.min(
      92,
      Math.max(...list.map((vendor) => vendor.y)) + 9,
    ),
  }))
}

export const MISSING_VENDOR: Vendor = {
  id: "",
  name: "Unknown vendor",
  area: "—",
  kind: "Vendor",
  previousBand: "Observation",
  badges: [],
  approval: {},
  verifiedDate: "",
  x: 50,
  y: 50,
}

export function findVendor(store: Store, id: string): Vendor {
  return store.vendors.find((vendor) => vendor.id === id) ?? {
    ...MISSING_VENDOR,
    id,
  }
}
export const DAY = 86_400_000
export const now = Date.now()

export function formatDate(date: string, withTime = false) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(date))
}

export function publicLabel(report: Report) {
  if (report.moderationStatus === "Pending") return "Under moderator review"
  if (report.moderationStatus === "Verified") return "Verified by moderators"
  if (report.moderationStatus === "Disputed") return "Disputed"
  if (report.moderationStatus === "Removed") return "Hidden from public view"
  if (report.authorityOutcome === "Confirmed") return "Confirmed by authority"
  if (report.authorityOutcome === "Cleared") return "Reviewed — no issue found"
  return "Under authority review"
}

export function labelTone(report: Report) {
  if (report.moderationStatus === "Verified") return "teal"
  if (report.authorityOutcome === "Confirmed") return "strong-blue"
  if (report.authorityOutcome === "Cleared") return "slate"
  if (report.moderationStatus === "Escalated") return "blue"
  if (report.moderationStatus === "Disputed") return "outline"
  return "neutral"
}

export function vendorMetrics(vendor: Vendor, store: Store, at: number = now) {
  const reports = store.reports.filter(
    (report) =>
      report.vendorId === vendor.id && report.moderationStatus !== "Removed",
  )
  const confirmed = reports.filter(
    (report) => report.authorityOutcome === "Confirmed",
  ).length
  const weighted = reports.reduce((sum, report) => {
    if (report.authorityOutcome === "Confirmed") return sum + 24
    if (
      report.authorityOutcome === "Cleared" ||
      report.moderationStatus === "Disputed" ||
      report.moderationStatus === "Pending"
    )
      return sum
    return sum + (report.evidence ? 11 : 8)
  }, 0)
  const sources = new Set(
    reports
      .filter(
        (report) => at - new Date(report.submittedAt).getTime() <= 30 * DAY,
      )
      .map((report) => report.reporterId ?? report.deviceId),
  ).size
  const recent48 = reports.filter(
    (report) => at - new Date(report.submittedAt).getTime() <= 2 * DAY,
  ).length
  const spike = recent48 >= 3 || reports.length >= 6
  const threshold = sources >= 3 || confirmed > 0
  let band = vendor.previousBand
  let score =
    vendor.previousBand === "Trusted"
      ? 84
      : vendor.previousBand === "Caution"
        ? 58
        : vendor.previousBand === "High risk"
          ? 34
          : 0
  if (threshold) {
    score = Math.max(18, 92 - weighted)
    band = score >= 70 ? "Trusted" : score >= 40 ? "Caution" : "High risk"
  }
  if (!threshold && vendor.previousBand === "Observation") score = 0
  return { reports, confirmed, sources, spike, threshold, band, score }
}

export function ratingFor(vendorId: string, reviews: Review[]) {
  const visible = reviews.filter(
    (review) => review.vendorId === vendorId && !review.hidden,
  )
  return {
    count: visible.length,
    average: visible.length
      ? visible.reduce((sum, review) => sum + review.rating, 0) / visible.length
      : 0,
    reviews: visible,
  }
}
