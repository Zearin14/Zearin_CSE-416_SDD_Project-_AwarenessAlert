import {
  FormEvent,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import * as api from "./api"
type ModerationStatus = "Pending" | "Verified" | "Escalated" | "Disputed" | "Removed"
type AuthorityOutcome = "Awaiting" | "Confirmed" | "Cleared" | null
type Category = "Food" | "Fuel" | "Other"
type OrgId = "BSTI" | "DNCRP" | "Accredited Laboratory"
type Role = "public" | "admin" | "moderator" | "org"

type Report = {
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

type Vendor = {
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

type Review = {
  id: string
  vendorId: string
  userId: string
  rating: number
  text: string
  date: string
  hidden: boolean
  flags: number
}

type User = {
  id: string
  name: string
  login: string
  password: string
  role: Role
  organization?: OrgId
  title?: string
  active?: boolean
}

type Audit = {
  id: string
  reportId: string
  action: string
  actor: string
  at: string
}

type Session = {
  userId: string;
  role: Role;
  organization?: OrgId;
} | null;

type Store = {
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
  loginHistory?: api.LoginEvent[]
  routingConfig: Record<Category, OrgId>
  showOrgNamePublicly: boolean
  weeklyDigest: boolean
  session: Session
}

const STORE_KEY = "awareness-alert-v4"
const SETTINGS_KEY = "awareness-alert-settings-v4"

// Is the PHP/MySQL backend connected? Components read this to decide
// whether to save changes to the database or only in the browser (demo mode).
type Backend = { online: boolean; refresh: () => Promise<void> }
const BackendContext = createContext<Backend>({
  online: false,
  refresh: async () => {},
})
const useBackend = () => useContext(BackendContext)

// Admin + moderators can open the moderator portal
const STAFF_ROLES: Role[] = ["admin", "moderator"]
const isStaff = (role?: Role) => !!role && STAFF_ROLES.includes(role)

function currentUserName(store: Store) {
  return (
    store.users.find((user) => user.id === store.session?.userId)?.name ??
    "Moderator"
  )
}

// Demo mode only: remember login attempts in the browser
function localLoginEvent(
  user: User | undefined,
  login: string,
  event: api.LoginEvent["event"],
  reason: string,
): api.LoginEvent {
  return {
    id: `login-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    userId: user?.id ?? null,
    login,
    name: user?.name ?? null,
    role: user?.role ?? null,
    event,
    reason,
    ip: "this browser",
    device: navigator.userAgent,
    at: new Date().toISOString(),
  }
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong."
}

function deviceId() {
  try {
    let id = localStorage.getItem("aa-device-id")
    if (!id) {
      id = `dev-${Math.random().toString(16).slice(2, 10)}`
      localStorage.setItem("aa-device-id", id)
    }
    return id
  } catch {
    return "dev-unknown"
  }
}

// Demo accounts (same accounts are created in MySQL by setup.php)
const SEED_USERS: User[] = [
  {
    id: "admin1",
    name: "Amina Rahman",
    title: "Lead moderator",
    login: "admin@awarenessalert.test",
    password: "Admin#1234",
    role: "admin",
  },
  {
    id: "mod1",
    name: "Tanvir Ahmed",
    title: "Moderator",
    login: "moderator@awarenessalert.test",
    password: "Mod#12345",
    role: "moderator",
  },
  {
    id: "bsti1",
    name: "BSTI Desk",
    login: "bsti@awarenessalert.test",
    password: "Org#1234",
    role: "org",
    organization: "BSTI",
  },
  {
    id: "dncrp1",
    name: "DNCRP Desk",
    login: "dncrp@awarenessalert.test",
    password: "Org#1234",
    role: "org",
    organization: "DNCRP",
  },
  {
    id: "lab1",
    name: "Laboratory Desk",
    login: "lab@awarenessalert.test",
    password: "Org#1234",
    role: "org",
    organization: "Accredited Laboratory",
  },
  {
    id: "public1",
    name: "Rafi Hasan",
    login: "rafi@example.test",
    password: "User#1234",
    role: "public",
  },
  {
    id: "public2",
    name: "Nusrat Jahan",
    login: "01700000000",
    password: "User#1234",
    role: "public",
  },
]

// Turns real latitude/longitude into positions (in %) on the drawn map,
// then nudges pins apart so they never sit on top of each other.
function layoutVendors(vendors: Vendor[]): Vendor[] {
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
function areaLabels(vendors: Vendor[]) {
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

const MISSING_VENDOR: Vendor = {
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

function findVendor(store: Store, id: string): Vendor {
  return store.vendors.find((vendor) => vendor.id === id) ?? {
    ...MISSING_VENDOR,
    id,
  }
}
const DAY = 86_400_000
const now = Date.now()

const vendorSeeds: Array<[string, string, string, string, Vendor["previousBand"], OrgId[], number, number]> =
  [
    [
      "v1",
      "Shapla Super Shop",
      "Dhanmondi",
      "Grocer",
      "Trusted",
      ["BSTI"],
      18,
      30,
    ],
    ["v2", "Meghna Fresh Mart", "Mirpur", "Grocer", "Caution", [], 39, 19],
    [
      "v3",
      "Padma Fuel Point",
      "Uttara",
      "Fuel station",
      "Trusted",
      ["BSTI"],
      70,
      18,
    ],
    ["v4", "Bengal Bites", "Banani", "Restaurant", "High risk", [], 62, 39],
    [
      "v5",
      "Nawab Food Corner",
      "Old Dhaka",
      "Restaurant",
      "Observation",
      [],
      34,
      70,
    ],
    ["v6", "Green Basket", "Gulshan", "Grocer", "Trusted", ["DNCRP"], 77, 48],
    [
      "v7",
      "City Fuel Service",
      "Mohakhali",
      "Fuel station",
      "Caution",
      [],
      54,
      53,
    ],
    [
      "v8",
      "Ruposhi Sweets",
      "Wari",
      "Bakery",
      "Trusted",
      ["Accredited Laboratory"],
      48,
      77,
    ],
    [
      "v9",
      "North Star Mart",
      "Bashundhara",
      "Grocer",
      "Observation",
      [],
      84,
      27,
    ],
    [
      "v10",
      "Tejgaon Auto Fuel",
      "Tejgaon",
      "Fuel station",
      "High risk",
      [],
      43,
      43,
    ],
    [
      "v11",
      "Lakeview Kitchen",
      "Dhanmondi",
      "Restaurant",
      "Trusted",
      ["DNCRP"],
      24,
      45,
    ],
    ["v12", "Uttara Daily Needs", "Uttara", "Grocer", "Caution", [], 73, 8],
  ]

const descriptions = [
  "Product packaging appeared damaged and the expiry label was difficult to read.",
  "Fuel quantity appeared lower than the amount shown on the meter.",
  "Food was stored without visible temperature control near the service counter.",
  "A strong unusual odor was noticed after opening the sealed package.",
  "The displayed price and the checkout price did not match.",
  "The premises appeared clean, but a batch label was missing from one item.",
]

function seedStore(): Store {
  const vendors: Vendor[] = vendorSeeds.map(
    ([id, name, area, kind, previousBand, badges, x, y]) => ({
      id,
      name,
      area,
      kind,
      previousBand,
      badges,
      x,
      y,
      verifiedDate: "12 Sep 2026",
      approval: {
        "Product Origin": "Bangladesh",
        Manufacturer: `${name} Industries Ltd.`,
        "Factory Location": area === "Uttara" ? "Gazipur" : "Dhaka",
        Owner: `${name} Holdings`,
      },
    }),
  )

  const reports: Report[] = Array.from({ length: 28 }, (_, index) => {
    const vendor = vendors[index % vendors.length]
    const category: Category =
      vendor.kind === "Fuel station"
        ? "Fuel"
        : index % 7 === 0
          ? "Other"
          : "Food"
    const status: ModerationStatus =
      index === 0 || index === 1 || index === 2
        ? "Pending"
        : index === 3
          ? "Escalated"
          : index === 4
            ? "Escalated"
            : index % 9 === 0
              ? "Disputed"
              : index % 8 === 0
                ? "Removed"
                : "Verified"
    const outcome: AuthorityOutcome =
      index === 3 ? "Confirmed" : index === 4 ? "Cleared" : null
    const submittedAt =
      index < 3
        ? new Date(now - index * 5 * 60 * 60 * 1000).toISOString()
        : new Date(now - (index + 1) * DAY).toISOString()
    const routedTo =
      status === "Escalated"
        ? category === "Food"
          ? "DNCRP"
          : category === "Fuel"
            ? "BSTI"
            : "Accredited Laboratory"
        : null
    return {
      id: `AA-${String(1048 - index).padStart(5, "0")}`,
      vendorId: index < 3 ? "v2" : vendor.id,
      category,
      description: descriptions[index % descriptions.length],
      location: index < 3 ? "Mirpur" : vendor.area,
      evidence: index % 3 !== 1,
      submittedAt,
      reporterTier:
        index % 3 === 0
          ? "Guest"
          : index % 3 === 1
            ? "Anonymous"
            : "Identified",
      reporterId:
        index % 3 === 0 ? undefined : index % 2 ? "public1" : "public2",
      anonymous: index % 3 !== 2,
      ip: `103.84.12.${20 + index}`,
      deviceId: `dev-${(index * 713).toString(16)}`,
      moderationStatus: status,
      authorityOutcome: outcome,
      routedTo,
      outcomePublicComment:
        outcome === "Confirmed"
          ? "Sample tested; expiry dates were found to be past the permitted limit."
          : outcome === "Cleared"
            ? "Sample tested and no safety issue was found in the submitted batch."
            : "",
      outcomeInternalNote: outcome
        ? "Laboratory worksheet reviewed by the assigned case officer."
        : "",
      outcomeSetBy: outcome ? (routedTo ?? "") : "",
      outcomeSetAt: outcome
        ? new Date(now - (index + 0.5) * DAY).toISOString()
        : "",
    }
  })

  const users: User[] = SEED_USERS.map((user) => ({ ...user }))

  const reviews: Review[] = Array.from({ length: 24 }, (_, index) => ({
    id: `RV-${index + 1}`,
    vendorId: vendors[index % vendors.length].id,
    userId: index % 2 ? "public1" : "public2",
    rating: [5, 4, 4, 3, 5, 2][index % 6],
    text: [
      "Staff were helpful and the products were well organized.",
      "The experience was fine overall, though service was a little slow.",
      "Clean shop with clear prices and helpful product information.",
      "My recent visit was mixed; I would like clearer labeling.",
    ][index % 4],
    date: new Date(now - index * 2 * DAY).toISOString(),
    hidden: false,
    flags: index % 8 === 0 ? 2 : 0,
  }))

  return {
    reports,
    vendors,
    reviews,
    users,
    organizations: ["BSTI", "DNCRP", "Accredited Laboratory"],
    savedAreas: [],
    notifications: [
      {
        id: "n1",
        title: "Report status updated",
        body: "A report in Dhanmondi was verified by moderators.",
        href: "/reports/AA-01043",
        at: new Date(now - DAY).toISOString(),
      },
      {
        id: "n2",
        title: "Unusual activity in Mirpur",
        body: "Multiple recent reports were received for one vendor.",
        href: "/vendor/v2",
        at: new Date(now - 2 * DAY).toISOString(),
      },
    ],
    auditLog: reports.slice(0, 8).map((report, index) => ({
      id: `audit-${index}`,
      reportId: report.id,
      action: `Report ${report.moderationStatus.toLowerCase()}`,
      actor: index < 3 ? "System intake" : "Amina Rahman",
      at: report.submittedAt,
    })),
    routingConfig: {
      Fuel: "BSTI",
      Food: "DNCRP",
      Other: "Accredited Laboratory",
    },
    showOrgNamePublicly: false,
    weeklyDigest: false,
    session: null,
  }
}

// Demo mode (no database): everything lives in the browser
function loadStore(): Store {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    return saved ? JSON.parse(saved) : seedStore()
  } catch {
    return seedStore()
  }
}

type Settings = Pick<
  Store,
  "savedAreas" | "routingConfig" | "showOrgNamePublicly" | "weeklyDigest"
>

function loadSettings(): Partial<Settings> {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")
  } catch {
    return {}
  }
}

// Database mode: build the store from what the PHP API returned
function storeFromServer(data: any, base: Store): Store {
  const vendors = layoutVendors(
    (data.vendors as Vendor[]).map((vendor) => ({
      ...vendor,
      approval: vendor.approval ?? {},
      x: 50,
      y: 50,
    })),
  )
  const reports: Report[] = data.reports.map((report: Report) => ({
    ...report,
    evidenceImage: report.evidenceImage ?? undefined,
    reporterId: report.reporterId ?? undefined,
  }))
  const latest = reports.find((report) => report.moderationStatus === "Verified")
  const spikeVendor = vendors.find(
    (vendor) =>
      reports.filter((report) => report.vendorId === vendor.id).length >= 3,
  )
  return {
    ...base,
    ...loadSettings(),
    vendors,
    reports,
    reviews: data.reviews,
    users: (data.users as User[]).map((user) => ({
      ...user,
      organization: user.organization ?? undefined,
      title: user.title ?? undefined,
      login: "",
      password: "",
    })),
    auditLog: data.auditLog,
    session: data.session,
    notifications: [
      ...(latest
        ? [
            {
              id: "n1",
              title: "Report status updated",
              body: `A report in ${latest.location} was verified by moderators.`,
              href: `/reports/${latest.id}`,
              at: latest.submittedAt,
            },
          ]
        : []),
      ...(spikeVendor
        ? [
            {
              id: "n2",
              title: `Unusual activity in ${spikeVendor.area}`,
              body: "Multiple recent reports were received for one vendor.",
              href: `/vendor/${spikeVendor.id}`,
              at: new Date(now - DAY).toISOString(),
            },
          ]
        : []),
    ],
  }
}

function formatDate(date: string, withTime = false) {
  if (!date) return "—"
  return new Intl.DateTimeFormat("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  }).format(new Date(date))
}

function publicLabel(report: Report) {
  if (report.moderationStatus === "Pending") return "Under moderator review"
  if (report.moderationStatus === "Verified") return "Verified by moderators"
  if (report.moderationStatus === "Disputed") return "Disputed"
  if (report.moderationStatus === "Removed") return "Hidden from public view"
  if (report.authorityOutcome === "Confirmed") return "Confirmed by authority"
  if (report.authorityOutcome === "Cleared") return "Reviewed — no issue found"
  return "Under authority review"
}

function labelTone(report: Report) {
  if (report.moderationStatus === "Verified") return "teal"
  if (report.authorityOutcome === "Confirmed") return "strong-blue"
  if (report.authorityOutcome === "Cleared") return "slate"
  if (report.moderationStatus === "Escalated") return "blue"
  if (report.moderationStatus === "Disputed") return "outline"
  return "neutral"
}

function vendorMetrics(vendor: Vendor, store: Store) {
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
        (report) => now - new Date(report.submittedAt).getTime() <= 30 * DAY,
      )
      .map((report) => report.reporterId ?? report.deviceId),
  ).size
  const recent48 = reports.filter(
    (report) => now - new Date(report.submittedAt).getTime() <= 2 * DAY,
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

function ratingFor(vendorId: string, reviews: Review[]) {
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

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    pin: (
      <>
        <path d="M12 22s7-6.1 7-13a7 7 0 1 0-14 0c0 6.9 7 13 7 13Z" />
        <circle cx="12" cy="9" r="2.5" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10Z" />
        <path d="m8.5 12 2.2 2.2 4.8-5" />
      </>
    ),
    report: (
      <>
        <path d="M12 8v5" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.7 2.5 17.2A2 2 0 0 0 4.2 20h15.6a2 2 0 0 0 1.7-2.8L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 22c.8-5 3.5-7 8-7s7.2 2 8 7" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    arrow: (
      <>
        <path d="m9 18 6-6-6-6" />
      </>
    ),
    back: (
      <>
        <path d="m15 18-6-6 6-6" />
      </>
    ),
    check: (
      <>
        <path d="m5 12 4 4L19 6" />
      </>
    ),
    image: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="m21 15-4-4L5 20" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z" />
        <path d="M9 3v15M15 6v15" />
      </>
    ),
    star: (
      <>
        <path d="m12 2 3.1 6.3 6.9 1-5 4.8 1.2 6.9-6.2-3.3L5.8 21 7 14.1l-5-4.8 6.9-1Z" />
      </>
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    filter: (
      <>
        <path d="M4 5h16M7 12h10M10 19h4" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M14 4h6v16h-6" />
      </>
    ),
  }
  return (
    <svg
      aria-hidden="true"
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.report}
    </svg>
  )
}

function Link({
  to,
  children,
  className = "",
  onClick,
}: {
  to: string
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        event.preventDefault()
        onClick?.()
        go(to)
      }}
    >
      {children}
    </a>
  )
}

function StatusPill({ report }: { report: Report }) {
  return (
    <span className={`status-pill ${labelTone(report)}`}>
      <span className="status-dot" />
      {publicLabel(report)}
    </span>
  )
}

function TrustBadge({
  band,
  score,
  compact = false,
}: {
  band: string
  score: number
  compact?: boolean
}) {
  const tone =
    band === "Trusted"
      ? "trusted"
      : band === "Caution"
        ? "caution"
        : band === "High risk"
          ? "risk"
          : "observation"
  return (
    <span className={`trust-badge ${tone} ${compact ? "compact" : ""}`}>
      <span className="trust-symbol">
        {band === "Trusted"
          ? "✓"
          : band === "Caution"
            ? "△"
            : band === "High risk"
              ? "!"
              : "○"}
      </span>
      {band}
      {!compact && score > 0 ? ` · ${score}` : ""}
    </span>
  )
}

function AuthorityBadges({ vendor }: { vendor: Vendor }) {
  if (!vendor.badges.length) return null
  return (
    <div className="badge-row">
      {vendor.badges.map((badge) => (
        <span className="verification" key={badge}>
          <Icon name="shield" size={15} />
          {badge} Verified
        </span>
      ))}
    </div>
  )
}

function AuthorityComment({
  report,
  store,
  compact = false,
}: {
  report: Report
  store: Store
  compact?: boolean
}) {
  if (!report.outcomePublicComment) return null
  const who =
    store.showOrgNamePublicly && report.routedTo ? report.routedTo : "Authority"
  return (
    <div className={`authority-comment ${compact ? "compact" : ""}`}>
      <strong>
        {who} comment · {formatDate(report.outcomeSetAt)}
      </strong>
      <p>{report.outcomePublicComment}</p>
    </div>
  )
}

function AppHeader({ store, logout }: { store: Store; logout: () => void }) {
  const publicUser =
    store.session?.role === "public"
      ? store.users.find((user) => user.id === store.session?.userId)
      : null
  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Icon name="shield" size={21} />
          </span>
          <span>
            Awareness<span>Alert</span>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          <Link to="/">Home</Link>
          <Link to="/#map">Map</Link>
          <Link to="/reports">Recent Reports</Link>
          <Link to="/saved-areas">Saved Areas</Link>
        </nav>
        <div className="header-actions">
          <button
            className="language"
            type="button"
            title="Bangla is coming soon"
          >
            <strong>EN</strong>
            <span>বাংলা</span>
          </button>
          {publicUser ? (
            <>
              <Link
                to="/notifications"
                className="icon-button"
                aria-label="Notifications"
              >
                <Icon name="bell" />
              </Link>
              <Link to="/profile" className="user-chip">
                <Icon name="user" size={17} />
                <span>{publicUser.name.split(" ")[0]}</span>
              </Link>
              <button
                className="link-button desktop-only"
                type="button"
                onClick={logout}
              >
                Logout
              </button>
            </>
          ) : (
            <div className="auth-links">
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="button secondary small">
                Sign up
              </Link>
            </div>
          )}
          <Link to="/report" className="button primary header-report">
            <Icon name="report" size={17} />
            Report
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link to="/" className="brand footer-brand">
          <span className="brand-mark">
            <Icon name="shield" size={18} />
          </span>
          AwarenessAlert
        </Link>
        <p>Community reports, transparent review, safer everyday choices.</p>
      </div>
      <div className="footer-links">
        <Link to="/reports">Recent Reports</Link>
        <Link to="/saved-areas">Saved Areas</Link>
        <Link to="/report">Report a concern</Link>
      </div>
      <div className="footer-links">
        <Link to="/admin/login">Admin Login</Link>
        <Link to="/org/login">Organization Login</Link>
        <Link to="/vendor-portal">Vendor Portal</Link>
      </div>
      <DataSourceNote />
    </footer>
  )
}

function DataSourceNote({ className = "" }: { className?: string }) {
  const { online } = useBackend()
  return (
    <div
      className={`prototype-note ${online ? "online" : "offline"} ${className}`}
    >
      <i className="live-dot" />
      {online
        ? "Prototype · live MySQL data"
        : "Prototype · demo mode (database offline)"}
    </div>
  )
}

function OfflineBanner() {
  const { online } = useBackend()
  if (online) return null
  return (
    <div className="offline-banner">
      <strong>Demo mode:</strong> the MySQL database is not connected, so
      changes are only saved in this browser. Start Apache and MySQL in XAMPP,
      then{" "}
      <button type="button" onClick={() => window.location.reload()}>
        try again
      </button>
      .
    </div>
  )
}

function PublicShell({
  children,
  store,
  logout,
}: {
  children: ReactNode
  store: Store
  logout: () => void
}) {
  return (
    <>
      <OfflineBanner />
      <AppHeader store={store} logout={logout} />
      <main>{children}</main>
      <Footer />
      <MobileNav store={store} />
    </>
  )
}

function MobileNav({ store }: { store: Store }) {
  return (
    <nav className="mobile-nav">
      <Link to="/">
        <Icon name="home" />
        <span>Home</span>
      </Link>
      <Link to="/#map">
        <Icon name="map" />
        <span>Map</span>
      </Link>
      <Link to="/reports">
        <Icon name="report" />
        <span>Reports</span>
      </Link>
      <Link to="/saved-areas">
        <Icon name="pin" />
        <span>Saved</span>
      </Link>
      <Link to={store.session?.role === "public" ? "/profile" : "/login"}>
        <Icon name="user" />
        <span>Account</span>
      </Link>
    </nav>
  )
}

function ReportFab() {
  return (
    <Link to="/report" className="report-fab">
      <span>
        <Icon name="report" />
        Report a concern
      </span>
      <small>No login required · Takes about 2 minutes</small>
    </Link>
  )
}

function Home({ store }: { store: Store }) {
  const vendors = store.vendors
  const params = new URLSearchParams(window.location.search)
  const initialQuery = params.get("q") ?? ""
  const [query, setQuery] = useState(initialQuery)
  // No popup until the user clicks a pin (the × button closes it again)
  const [selected, setSelected] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(Boolean(initialQuery))
  const visibleVendors = vendors.filter((vendor) =>
    `${vendor.name} ${vendor.area} ${vendor.kind}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const selectedVendor = selected
    ? visibleVendors.find((vendor) => vendor.id === selected)
    : undefined
  const labels = areaLabels(visibleVendors)
  const areaCount = new Set(vendors.map((vendor) => vendor.area)).size
  const publicReports = store.reports
    .filter((report) => report.moderationStatus !== "Removed")
    .slice(0, 6)
  const areas = [...new Set(store.vendors.map((vendor) => vendor.area))]
    .filter((area) => area.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 4)
  function submitSearch(event: FormEvent) {
    event.preventDefault()
    const path = query ? `/?q=${encodeURIComponent(query)}` : "/"
    window.history.replaceState({}, "", path)
    setShowSuggestions(false)
  }
  return (
    <>
      <section className="home-intro">
        <div>
          <span className="eyebrow">
            <Icon name="shield" size={16} />
            Bangladesh’s community safety network
          </span>
          <h1>
            Know who to trust,
            <br />
            <em>before you buy.</em>
          </h1>
          <p>
            Explore community reports, moderator reviews, and authority outcomes
            for food and fuel vendors near you.
          </p>
        </div>
        <div className="network-stat">
          <strong>{vendors.length}</strong>
          <span>
            vendors in {areaCount} {areaCount === 1 ? "area" : "areas"}
          </span>
          <div>
            <i className="live-dot" />
            Live community updates
          </div>
        </div>
      </section>
      <section className="search-wrap">
        <form className="search-bar" onSubmit={submitSearch}>
          <Icon name="search" size={22} />
          <input
            aria-label="Search vendors"
            placeholder="Search vendor, brand, or area..."
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setShowSuggestions(true)
            }}
            onFocus={() => setShowSuggestions(true)}
          />
          {query && (
            <button
              type="button"
              className="clear-search"
              onClick={() => setQuery("")}
            >
              ×<span className="sr-only">Clear</span>
            </button>
          )}
          <button type="submit" className="button dark">
            Search map
          </button>
        </form>
        {showSuggestions && query && (
          <div className="suggestions">
            <div className="suggestion-label">Vendors and areas</div>
            {visibleVendors.slice(0, 4).map((vendor) => (
              <button
                type="button"
                key={vendor.id}
                onClick={() => {
                  setQuery(vendor.name)
                  setSelected(vendor.id)
                  setShowSuggestions(false)
                }}
              >
                <Icon name="pin" size={17} />
                <span>
                  <strong>{vendor.name}</strong>
                  <small>
                    {vendor.kind} · {vendor.area}
                  </small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
            {areas.map((area) => (
              <button
                type="button"
                key={area}
                onClick={() => {
                  setQuery(area)
                  setShowSuggestions(false)
                }}
              >
                <Icon name="map" size={17} />
                <span>
                  <strong>{area}</strong>
                  <small>Area</small>
                </span>
                <Icon name="arrow" size={16} />
              </button>
            ))}
          </div>
        )}
      </section>
      {initialQuery && (
        <div className="query-summary page-wide">
          <span>
            Search results for <strong>“{initialQuery}”</strong>
          </span>
          <span>{visibleVendors.length} vendors found</span>
        </div>
      )}
      <section className="map-feed-layout page-wide" id="map">
        <div className="map-panel">
          <div className="map-toolbar">
            <div>
              <span className="live-dot" />
              <strong>Live safety map</strong>
              <small> {visibleVendors.length} vendors · tap a pin for details</small>
            </div>
            <button type="button" className="map-control">
              <Icon name="filter" size={17} />
              Filters
            </button>
          </div>
          {visibleVendors.length ? (
            <div className="map-canvas">
              <div className="map-water" />
              <div className="road road-a" />
              <div className="road road-b" />
              <div className="road road-c" />
              {labels.map((label) => (
                <span
                  key={label.area}
                  className="map-area"
                  style={{ left: `${label.x}%`, top: `${label.y}%` }}
                >
                  {label.area.toUpperCase()}
                </span>
              ))}
              {visibleVendors.map((vendor) => {
                const metrics = vendorMetrics(vendor, store)
                const tone =
                  metrics.band === "Trusted"
                    ? "trusted"
                    : metrics.band === "Caution"
                      ? "caution"
                      : metrics.band === "High risk"
                        ? "risk"
                        : "observation"
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    aria-label={`${vendor.name}, ${metrics.band}`}
                    className={`map-pin ${tone} ${
                      metrics.spike ? "spike" : ""
                    } ${selectedVendor?.id === vendor.id ? "selected" : ""}`}
                    style={{ left: `${vendor.x}%`, top: `${vendor.y}%` }}
                    onClick={() =>
                      setSelected(selected === vendor.id ? "" : vendor.id)
                    }
                  >
                    <span>
                      {metrics.band === "Trusted"
                        ? "✓"
                        : metrics.band === "Caution"
                          ? "△"
                          : metrics.band === "High risk"
                            ? "!"
                            : "○"}
                    </span>
                    <small>{vendor.name.split(" ")[0]}</small>
                  </button>
                )
              })}
              {selectedVendor && (
                <MapPopup
                  vendor={selectedVendor}
                  store={store}
                  onClose={() => setSelected("")}
                />
              )}
              <div className="map-legend">
                <span>
                  <i className="legend-dot trusted" />
                  Trusted
                </span>
                <span>
                  <i className="legend-dot caution" />
                  Caution
                </span>
                <span>
                  <i className="legend-dot risk" />
                  High risk
                </span>
                <span>
                  <i className="legend-dot observation" />
                  Observation
                </span>
              </div>
            </div>
          ) : (
            <div className="empty-state map-empty">
              <Icon name="search" size={34} />
              <h3>No vendors found</h3>
              <p>Try another area or brand.</p>
              <Link to="/report" className="button primary">
                Report a concern
              </Link>
            </div>
          )}
        </div>
        <aside className="feed-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Community activity</span>
              <h2>Recent Reports</h2>
            </div>
            <Link to="/reports">
              See all <Icon name="arrow" size={15} />
            </Link>
          </div>
          <div className="feed-list">
            {publicReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                store={store}
                compact
              />
            ))}
          </div>
        </aside>
      </section>
      <section className="trust-explainer page-wide">
        <div>
          <span className="eyebrow">Designed for fairness</span>
          <h2>One report does not define a vendor.</h2>
          <p>
            Trust status changes only after reports from multiple independent
            sources, or an authority confirmation. This protects communities
            while treating reported vendors fairly.
          </p>
        </div>
        <div className="explainer-steps">
          <span>
            <strong>01</strong>Community reports a concern
          </span>
          <span>
            <strong>02</strong>Moderators review evidence
          </span>
          <span>
            <strong>03</strong>Authorities can confirm outcomes
          </span>
        </div>
      </section>
      <ReportFab />
    </>
  )
}

function MapPopup({
  vendor,
  store,
  onClose,
}: {
  vendor: Vendor
  store: Store
  onClose: () => void
}) {
  const metrics = vendorMetrics(vendor, store)
  const rating = ratingFor(vendor.id, store.reviews)
  const latest =
    metrics.reports.find((report) => report.outcomePublicComment) ??
    metrics.reports[0]
  return (
    <div className="map-popup">
      <button type="button" className="popup-close" onClick={onClose}>
        ×<span className="sr-only">Close</span>
      </button>
      <span className="popup-kind">
        {vendor.kind} · {vendor.area}
      </span>
      <h3>{vendor.name}</h3>
      <AuthorityBadges vendor={vendor} />
      <div className="popup-score-row">
        <TrustBadge band={metrics.band} score={metrics.score} />
        <span className="rating">
          <Icon name="star" size={16} />
          {rating.average.toFixed(1)} <small>({rating.count} reviews)</small>
        </span>
      </div>
      {metrics.spike && (
        <div className="spike-note">
          <Icon name="report" size={15} />
          Report spike detected
        </div>
      )}
      <div className="report-summary">
        <strong>
          {metrics.reports.length}{" "}
          {metrics.reports.length === 1 ? "report" : "reports"}
        </strong>
        {latest && (
          <>
            <span>·</span>
            <StatusPill report={latest} />
          </>
        )}
      </div>
      {latest && <AuthorityComment report={latest} store={store} compact />}
      <p className="risk-reason">
        {metrics.confirmed
          ? `Confirmed by authority · ${metrics.confirmed} confirmed report`
          : `${metrics.sources} independent sources in the last 30 days${
              metrics.reports.some((report) => report.evidence)
                ? ", with photo evidence."
                : "."
            }`}
      </p>
      {!metrics.threshold && (
        <p className="threshold-note">
          Status changes require reports from multiple independent sources.
        </p>
      )}
      <Link to={`/vendor/${vendor.id}`} className="button dark full">
        View Profile <Icon name="arrow" size={16} />
      </Link>
    </div>
  )
}

function ReportCard({
  report,
  store,
  compact = false,
}: {
  report: Report
  store: Store
  compact?: boolean
}) {
  const vendor = findVendor(store, report.vendorId)
  const metrics = vendorMetrics(vendor, store)
  return (
    <Link
      to={`/reports/${report.id}`}
      className={`report-card ${compact ? "compact" : ""}`}
    >
      <div className="report-card-top">
        <span className={`category ${report.category.toLowerCase()}`}>
          {report.category}
        </span>
        <span className="report-time">
          <Icon name="clock" size={14} />
          {formatDate(report.submittedAt)}
        </span>
      </div>
      <h3>{vendor.name}</h3>
      <p className="location-line">
        <Icon name="pin" size={15} />
        {report.location}
      </p>
      <StatusPill report={report} />
      <p className="line-clamp">{report.description}</p>
      <AuthorityComment report={report} store={store} compact />
      <div className="report-card-bottom">
        <span>
          {report.evidence && (
            <>
              <Icon name="image" size={15} /> Photo evidence
            </>
          )}
        </span>
        {metrics.spike && <span className="spike-tag">Unusual activity</span>}
        <Icon name="arrow" size={17} />
      </div>
    </Link>
  )
}

function ReportsPage({ store }: { store: Store }) {
  const [category, setCategory] = useState("All")
  const [status, setStatus] = useState("All")
  const [area, setArea] = useState("All")
  const reports = store.reports.filter(
    (report) =>
      report.moderationStatus !== "Removed" &&
      (category === "All" || report.category === category) &&
      (status === "All" || publicLabel(report) === status) &&
      (area === "All" || report.location === area),
  )
  return (
    <div className="page page-soft">
      <PageTitle
        eyebrow="Community reports"
        title="Recent safety reports"
        text="Reported concerns and their review status, updated from one transparent record."
      />
      <div className="filter-bar">
        <Select
          label="Category"
          value={category}
          onChange={setCategory}
          options={["All", "Food", "Fuel", "Other"]}
        />
        <Select
          label="Time"
          value="All"
          onChange={() => {}}
          options={["All", "Today", "This week", "This month"]}
        />
        <Select
          label="Area"
          value={area}
          onChange={setArea}
          options={[
            "All",
            ...new Set(store.vendors.map((vendor) => vendor.area)),
          ]}
        />
        <Select
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            "All",
            "Under moderator review",
            "Verified by moderators",
            "Under authority review",
            "Confirmed by authority",
            "Reviewed — no issue found",
            "Disputed",
          ]}
        />
      </div>
      <div className="results-count">{reports.length} reports</div>
      {reports.length ? (
        <div className="report-grid">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} store={store} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No reports match these filters"
          text="Try changing the category, area, or status."
        />
      )}
      <ReportFab />
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Iterable<string>
}) {
  return (
    <label className="select-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {[...options].map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

function PageTitle({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow?: string
  title: string
  text?: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  )
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="report" size={30} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {action}
    </div>
  )
}

function VendorProfile({ store, id }: { store: Store; id: string }) {
  const vendor = store.vendors.find((item) => item.id === id)
  if (!vendor) return <NotFound />
  const metrics = vendorMetrics(vendor, store)
  const rating = ratingFor(vendor.id, store.reviews)
  return (
    <div className="page vendor-page">
      <Link to="/" className="back-link">
        <Icon name="back" size={17} />
        Back to map
      </Link>
      <section className="vendor-hero">
        <div className="vendor-monogram">
          {vendor.name
            .split(" ")
            .map((part) => part[0])
            .slice(0, 2)
            .join("")}
        </div>
        <div className="vendor-title">
          <span className="eyebrow">
            {vendor.kind} · {vendor.area}
          </span>
          <h1>{vendor.name}</h1>
          <AuthorityBadges vendor={vendor} />
          <div className="vendor-quick">
            <TrustBadge band={metrics.band} score={metrics.score} />
            <span className="rating large">
              <Icon name="star" size={18} />
              {rating.average.toFixed(1)}{" "}
              <small>{rating.count} customer reviews</small>
            </span>
          </div>
        </div>
        <div className="vendor-actions">
          <Link to={`/vendor/${vendor.id}/review`} className="button secondary">
            <Icon name="star" size={17} />
            Write a review
          </Link>
          <Link to={`/report?vendor=${vendor.id}`} className="button primary">
            <Icon name="report" size={17} />
            Report this vendor
          </Link>
        </div>
      </section>
      <div className="profile-layout">
        <div className="profile-main">
          <section className="content-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Trust & Safety</span>
                <h2>Trust summary</h2>
              </div>
              {metrics.spike && (
                <span className="spike-tag">
                  <Icon name="report" size={14} />
                  Report spike detected
                </span>
              )}
            </div>
            <div className="score-summary">
              <div
                className={`score-ring ${metrics.band.toLowerCase().replace(" ", "-")}`}
              >
                <strong>{metrics.score || "—"}</strong>
                <span>/ 100</span>
              </div>
              <div>
                <TrustBadge band={metrics.band} score={metrics.score} compact />
                <h3>
                  {metrics.confirmed
                    ? "Authority confirmation reinforces this risk status."
                    : metrics.threshold
                      ? `${metrics.sources} independent sources contributed to this status.`
                      : "Not enough independent data to change this vendor’s status."}
                </h3>
                <p>
                  {metrics.reports.length} public reports ·{" "}
                  {metrics.reports.filter((report) => report.evidence).length}{" "}
                  with evidence · {metrics.confirmed} authority confirmed
                </p>
              </div>
            </div>
            {!metrics.threshold && (
              <div className="fairness-note">
                <Icon name="shield" />
                <div>
                  <strong>
                    Status changes require reports from multiple independent
                    sources.
                  </strong>
                  <p>
                    At least three independent sources in 30 days, or one
                    authority confirmation, is required.
                  </p>
                </div>
              </div>
            )}
            <p className="legal-note">
              Reports are allegations from the public and moderators. Status
              labels reflect review stage, not a legal finding.
            </p>
          </section>
          {vendor.badges.length > 0 && <ApprovalList vendor={vendor} />}
          <section className="content-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Safety history</span>
                <h2>Reports</h2>
              </div>
              <Link to={`/report?vendor=${vendor.id}`}>
                Report a concern <Icon name="arrow" size={15} />
              </Link>
            </div>
            {metrics.reports.length ? (
              <div className="profile-report-list">
                {metrics.reports.map((report) => (
                  <Link
                    key={report.id}
                    to={`/reports/${report.id}`}
                    className="profile-report-row"
                  >
                    <div>
                      <span
                        className={`category ${report.category.toLowerCase()}`}
                      >
                        {report.category}
                      </span>
                      <strong>{report.description}</strong>
                      <span>
                        {formatDate(report.submittedAt)} ·{" "}
                        {report.evidence ? "Photo evidence" : "No photo"}
                      </span>
                      <AuthorityComment report={report} store={store} compact />
                    </div>
                    <div>
                      <StatusPill report={report} />
                      <Icon name="arrow" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No public reports"
                text="There are no visible reports for this vendor."
              />
            )}
          </section>
          <section className="content-card">
            <div className="card-heading">
              <div>
                <span className="eyebrow">Customer opinions</span>
                <h2>Customer Reviews</h2>
              </div>
              <Link
                to={`/vendor/${vendor.id}/review`}
                className="button secondary small"
              >
                Write a review
              </Link>
            </div>
            <div className="review-summary">
              <strong>{rating.average.toFixed(1)}</strong>
              <div>
                <div className="stars">
                  {"★★★★★".slice(0, Math.round(rating.average))}
                  <span>{"★★★★★".slice(Math.round(rating.average))}</span>
                </div>
                <p>Based on {rating.count} reviews</p>
              </div>
            </div>
            <div className="review-list">
              {rating.reviews.map((review) => (
                <article key={review.id} className="review">
                  <div className="review-avatar">
                    {store.users.find((user) => user.id === review.userId)
                      ?.name[0] ?? "U"}
                  </div>
                  <div>
                    <div>
                      <strong>
                        {store.users.find((user) => user.id === review.userId)
                          ?.name ?? "Community member"}
                      </strong>
                      <span>{formatDate(review.date)}</span>
                    </div>
                    <div className="stars small">
                      {"★".repeat(review.rating)}
                      <span>{"★".repeat(5 - review.rating)}</span>
                    </div>
                    <p>{review.text}</p>
                    <button type="button" className="flag-link">
                      Flag review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
        <aside className="profile-aside">
          <div className="side-card">
            <h3>At a glance</h3>
            <div className="stat-row">
              <span>Public reports</span>
              <strong>{metrics.reports.length}</strong>
            </div>
            <div className="stat-row">
              <span>Independent sources</span>
              <strong>{metrics.sources}</strong>
            </div>
            <div className="stat-row">
              <span>Photo evidence</span>
              <strong>
                {metrics.reports.filter((report) => report.evidence).length}
              </strong>
            </div>
            <div className="stat-row">
              <span>Authority outcomes</span>
              <strong>
                {
                  metrics.reports.filter(
                    (report) =>
                      report.authorityOutcome === "Confirmed" ||
                      report.authorityOutcome === "Cleared",
                  ).length
                }
              </strong>
            </div>
          </div>
          <Link to="/saved-areas" className="side-card save-card">
            <Icon name="pin" />
            <div>
              <strong>Save {vendor.area}</strong>
              <span>Get optional safety updates for this area.</span>
            </div>
            <Icon name="arrow" />
          </Link>
        </aside>
      </div>
      <ReportFab />
    </div>
  )
}

function ApprovalList({ vendor }: { vendor: Vendor }) {
  return (
    <section className="content-card approval-card">
      <div className="card-heading">
        <div>
          <span className="eyebrow">Verified provenance</span>
          <h2>Approval List</h2>
        </div>
        <AuthorityBadges vendor={vendor} />
      </div>
      <div className="approval-table">
        {Object.entries(vendor.approval).map(([key, value]) => (
          <div key={key}>
            <span>{key}</span>
            <strong>{value}</strong>
          </div>
        ))}
        <div>
          <span>Verification</span>
          <strong className="verified-text">
            <Icon name="shield" size={16} />
            {vendor.badges.join(", ")} Verified · {vendor.verifiedDate}
          </strong>
        </div>
      </div>
    </section>
  )
}

function ReportDetail({ store, id }: { store: Store; id: string }) {
  const report = store.reports.find((item) => item.id === id)
  if (!report || report.moderationStatus === "Removed") return <NotFound />
  const vendor = findVendor(store, report.vendorId)
  return (
    <div className="page narrow-page">
      <Link to="/reports" className="back-link">
        <Icon name="back" size={17} />
        Back to Recent Reports
      </Link>
      <PageTitle
        eyebrow={`${report.category} report · ${report.id}`}
        title={vendor.name}
        text={`${report.location} · Submitted ${formatDate(report.submittedAt, true)}`}
      />
      <div className="detail-status">
        <StatusPill report={report} />
        {report.evidence && (
          <span>
            <Icon name="image" size={16} />
            Photo evidence attached
          </span>
        )}
      </div>
      
{report.evidenceImage && (
  <section className="content-card">
    <h2>Photo evidence</h2>
    <img
      src={report.evidenceImage}
      alt="Photo evidence submitted with this report"
      style={{
        display: "block",
        maxWidth: "100%",
        maxHeight: "420px",
        objectFit: "contain",
        borderRadius: "8px",
      }}
    />
  </section>
)}

      <section className="content-card">
        <span className="eyebrow">What was reported</span>
        <h2>{report.description}</h2>
        <p className="detail-copy">
          This is a community-submitted safety concern. It describes an alleged
          issue and should not be read as a legal finding.
        </p>
        <AuthorityComment report={report} store={store} />
      </section>
      <section className="content-card">
        <h2>Review timeline</h2>
        <div className="timeline">
          <div className="done">
            <i>
              <Icon name="check" size={15} />
            </i>
            <div>
              <strong>Report received</strong>
              <span>{formatDate(report.submittedAt, true)}</span>
            </div>
          </div>
          <div className={report.moderationStatus !== "Pending" ? "done" : ""}>
            <i>
              {report.moderationStatus !== "Pending" ? (
                <Icon name="check" size={15} />
              ) : (
                "2"
              )}
            </i>
            <div>
              <strong>Moderator review</strong>
              <span>
                {report.moderationStatus === "Pending"
                  ? "In progress"
                  : "Complete"}
              </span>
            </div>
          </div>
          {report.moderationStatus === "Escalated" && (
            <div
              className={report.authorityOutcome !== "Awaiting" ? "done" : ""}
            >
              <i>
                {report.authorityOutcome !== "Awaiting" ? (
                  <Icon name="check" size={15} />
                ) : (
                  "3"
                )}
              </i>
              <div>
                <strong>Authority review</strong>
                <span>{publicLabel(report)}</span>
              </div>
            </div>
          )}
        </div>
      </section>
      <div className="detail-actions">
        <Link to={`/vendor/${vendor.id}`} className="button dark">
          View {vendor.name}
        </Link>
        <Link to={`/report?vendor=${vendor.id}`} className="button secondary">
          Report another concern
        </Link>
      </div>
    </div>
  )
}

function ReportForm({
  store,
  updateStore,
  navigate,
}: StorePageProps & { navigate: (path: string) => void }) {
  const params = new URLSearchParams(window.location.search)
  const [category, setCategory] = useState<Category | "">("")
  const [vendorId, setVendorId] = useState(params.get("vendor") ?? "")
  const [description, setDescription] = useState("")
  const [anonymous, setAnonymous] = useState(true)
  const [locationMode, setLocationMode] = useState("manual")
  const [fileError, setFileError] = useState("")
  const [hasEvidence, setHasEvidence] = useState(false)
  const [evidenceImage, setEvidenceImage] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const backend = useBackend()
  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!category) nextErrors.category = "Choose a category."
    if (!vendorId) nextErrors.vendor = "Select a vendor or location."
    if (description.trim().length < 15)
      nextErrors.description =
        "Add at least 15 characters so moderators can understand the concern."
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    if (backend.online) {
      // Save to MySQL through the PHP API
      setSubmitting(true)
      try {
        const result = await api.createReport({
          vendorId,
          category,
          description,
          anonymous,
          evidenceImage: evidenceImage || undefined,
          deviceId: deviceId(),
        })
        await backend.refresh()
        sessionStorage.setItem("lastReportId", result.id)
        navigate("/report/done")
      } catch (error) {
        setErrors({ submit: errorText(error) })
      } finally {
        setSubmitting(false)
      }
      return
    }
    const vendor = store.vendors.find((item) => item.id === vendorId)!
    const id = `AA-${String(1100 + store.reports.length)}`
    const report: Report = {
      id,
      vendorId,
      category: category as Category,
      description,
      location: vendor.area,
      evidence: hasEvidence,
      evidenceImage: evidenceImage || undefined,
      submittedAt: new Date().toISOString(),
      reporterTier:
        store.session?.role === "public"
          ? anonymous
            ? "Anonymous"
            : "Identified"
          : "Guest",
      reporterId:
        store.session?.role === "public" ? store.session.userId : undefined,
      anonymous,
      ip: "103.84.12.121",
      deviceId: `dev-${Math.random().toString(16).slice(2, 8)}`,
      moderationStatus: "Pending",
      authorityOutcome: null,
      routedTo: null,
      outcomePublicComment: "",
      outcomeInternalNote: "",
      outcomeSetBy: "",
      outcomeSetAt: "",
    }
    updateStore((current) => ({
      ...current,
      reports: [report, ...current.reports],
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          reportId: id,
          action: "Report submitted",
          actor: "Community reporter",
          at: report.submittedAt,
        },
        ...current.auditLog,
      ],
    }))
    sessionStorage.setItem("lastReportId", id)
    navigate("/report/done")
  }
  return (
    <div className="page report-form-page">
      <Link to="/" className="back-link">
        <Icon name="back" size={17} />
        Back to Homepage
      </Link>
      <PageTitle
        eyebrow="No login required"
        title="Report a safety concern"
        text="Tell moderators what you observed. Reports are allegations until reviewed, and your submission will not change a vendor’s status on its own."
      />
      <form className="form-card" onSubmit={submit}>
        <fieldset>
          <legend>1. What is this about?</legend>
          <div className="choice-grid">
            {(["Food", "Fuel", "Other"] as Category[]).map((item) => (
              <label
                className={`choice-card ${category === item ? "selected" : ""}`}
                key={item}
              >
                <input
                  type="radio"
                  name="category"
                  value={item}
                  checked={category === item}
                  onChange={() => setCategory(item)}
                />
                <Icon
                  name={
                    item === "Fuel"
                      ? "pin"
                      : item === "Food"
                        ? "shield"
                        : "report"
                  }
                />
                <span>
                  <strong>{item}</strong>
                  <small>
                    {item === "Food"
                      ? "Food quality, storage or labeling"
                      : item === "Fuel"
                        ? "Fuel quality, quantity or service"
                        : "Another public safety concern"}
                  </small>
                </span>
              </label>
            ))}
          </div>
          {errors.category && (
            <span className="field-error">{errors.category}</span>
          )}
        </fieldset>
        <fieldset>
          <legend>2. Vendor or location</legend>
          <label className="field">
            <span>Search and select</span>
            <select
              value={vendorId}
              onChange={(event) => setVendorId(event.target.value)}
            >
              <option value="">Choose a vendor...</option>
              {store.vendors.map((vendor) => (
                <option value={vendor.id} key={vendor.id}>
                  {vendor.name} — {vendor.area}
                </option>
              ))}
            </select>
          </label>
          {errors.vendor && (
            <span className="field-error">{errors.vendor}</span>
          )}
          <div className="location-options">
            <button
              type="button"
              className={locationMode === "gps" ? "active" : ""}
              onClick={() => setLocationMode("gps")}
            >
              <Icon name="pin" />
              Use GPS/current location
            </button>
            <button
              type="button"
              className={locationMode === "manual" ? "active" : ""}
              onClick={() => setLocationMode("manual")}
            >
              <Icon name="map" />
              Manually place a pin
            </button>
          </div>
          <div className="mini-map">
            <Icon name="pin" />
            <span>
              {locationMode === "gps"
                ? "Current location found (simulated)"
                : "Drag the pin to the reported location (simulated)"}
            </span>
          </div>
        </fieldset>
        <fieldset>
          <legend>3. Describe the concern</legend>
          <label className="field">
            <span>What did you observe?</span>
            <textarea
              rows={6}
              placeholder="Include what happened, when you noticed it, and any useful product or batch details..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
            <small>{description.length} characters</small>
          </label>
          {errors.description && (
            <span className="field-error">{errors.description}</span>
          )}
        </fieldset>
        <fieldset>
          <legend>
            4. Add evidence <small>Optional</small>
          </legend>
          <label className="upload-area">
            <Icon name="image" size={28} />
            <strong>
              {hasEvidence ? "Photo ready to attach" : "Upload a photo"}
            </strong>
            <span>JPG or PNG, up to 10 MB</span>
            <input
              type="file"
              accept=".jpg,.jpeg,.png"
              
onChange={(event) => {
  const file = event.target.files?.[0]

  if (!file) {
    setHasEvidence(false)
    setEvidenceImage("")
    setFileError("")
    return
  }

  if (!["image/jpeg", "image/png"].includes(file.type)) {
    setFileError("Unsupported file. Please upload a JPG or PNG image.")
    setHasEvidence(false)
    setEvidenceImage("")
    return
  }

  if (file.size > 10 * 1024 * 1024) {
    setFileError("Image must be smaller than 10 MB.")
    setHasEvidence(false)
    setEvidenceImage("")
    return
  }

  const reader = new FileReader()

  reader.onload = () => {
    if (typeof reader.result === "string") {
      setEvidenceImage(reader.result)
      setHasEvidence(true)
      setFileError("")
    }
  }

  reader.onerror = () => {
    setFileError("Could not read this image. Please try another file.")
    setHasEvidence(false)
    setEvidenceImage("")
  }

  reader.readAsDataURL(file)
}}

            />
          </label>
          {fileError && <span className="field-error">{fileError}</span>}
        </fieldset>
        <fieldset>
          <legend>5. Privacy</legend>
          <label className="toggle-row">
            <div>
              <strong>Submit anonymously</strong>
              <p>
                Anonymous reporting hides your identity from public users.
                Moderators may still see session information to prevent abuse.
              </p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
            />
          </label>
        </fieldset>
        <div className="form-submit">
          <div>
            <Icon name="shield" />
            <span>
              <strong>Your report starts under moderator review.</strong>
              <small>
                It will not change a vendor’s trust status on its own.
              </small>
            </span>
          </div>
          <button
            className="button primary large"
            type="submit"
            disabled={submitting}
          >
            {submitting ? "Saving…" : "Submit report"}{" "}
            <Icon name="arrow" size={17} />
          </button>
        </div>
        {errors.submit && (
          <div className="field-error boxed form-error">{errors.submit}</div>
        )}
      </form>
    </div>
  )
}

function ReportDone() {
  const id = sessionStorage.getItem("lastReportId") ?? "AA-01128"
  return (
    <div className="page confirmation-page">
      <div className="confirmation-mark">
        <Icon name="check" size={34} />
      </div>
      <span className="eyebrow">Report received</span>
      <h1>Thank you for looking out for your community.</h1>
      <p>
        Your report <strong>{id}</strong> is now under moderator review. You did
        not need an account to submit it.
      </p>
      <div className="next-steps">
        <h2>What happens next</h2>
        <div>
          <span>1</span>
          <p>
            <strong>Moderators review the details</strong>They check the report,
            evidence, and basic abuse-prevention signals.
          </p>
        </div>
        <div>
          <span>2</span>
          <p>
            <strong>Independent sources are considered</strong>Status changes
            require reports from multiple independent sources.
          </p>
        </div>
        <div>
          <span>3</span>
          <p>
            <strong>An authority may review the concern</strong>Verified reports
            can be routed to the appropriate partner organization.
          </p>
        </div>
      </div>
      <div className="confirmation-actions">
        <Link to="/" className="button dark">
          Return to Homepage
        </Link>
        <Link to="/reports" className="button secondary">
          View Recent Reports
        </Link>
      </div>
    </div>
  )
}

type StorePageProps = {
  store: Store
  updateStore: (updater: (store: Store) => Store) => void
}

function AuthPage({
  kind,
  store,
  updateStore,
  navigate,
  guardMessage,
}: StorePageProps & {
  kind: "public" | "admin" | "org"
  navigate: (path: string) => void
  guardMessage?: string
}) {
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const headings =
    kind === "admin"
      ? ["Admin Login", "Moderation team access"]
      : kind === "org"
        ? ["Organization Login", "Partner authority access"]
        : ["Welcome back", "Sign in to your account"]
  const backend = useBackend()
  const [busy, setBusy] = useState(false)
  const [showDemo, setShowDemo] = useState(false)
  // The Admin login page is for admins AND moderators
  const allowedRoles: Role[] = kind === "admin" ? STAFF_ROLES : [kind]
  const relevant = (backend.online ? SEED_USERS : store.users).filter((user) =>
    allowedRoles.includes(user.role),
  )
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (backend.online) {
      setBusy(true)
      setError("")
      try {
        await api.login(login.trim(), password, kind)
        await backend.refresh()
        navigate(kind === "admin" ? "/admin" : kind === "org" ? "/org" : "/")
      } catch (loginError) {
        setError(errorText(loginError))
      } finally {
        setBusy(false)
      }
      return
    }
    const typed = login.trim()
    const account = store.users.find(
      (item) => item.login.toLowerCase() === typed.toLowerCase(),
    )
    const user = relevant.find(
      (item) =>
        item.login.toLowerCase() === typed.toLowerCase() &&
        item.password === password,
    )
    const logEvent = (entry: api.LoginEvent) =>
      updateStore((current) => ({
        ...current,
        loginHistory: [entry, ...(current.loginHistory ?? [])].slice(0, 300),
      }))
    if (!user) {
      logEvent(
        localLoginEvent(
          account,
          typed,
          "failed",
          !account
            ? "No account with this email/phone"
            : account.password !== password
              ? "Wrong password"
              : "Used the wrong login page",
        ),
      )
      setError("Incorrect email/phone or password.")
      return
    }
    if (user.active === false) {
      logEvent(localLoginEvent(user, typed, "failed", "Account turned off"))
      setError("This account has been turned off by the admin.")
      return
    }
    logEvent(localLoginEvent(user, typed, "login", "Logged in"))
    updateStore((current) => ({
      ...current,
      session: {
        userId: user.id,
        role: user.role,
        organization: user.organization,
      },
    }))
    navigate(kind === "admin" ? "/admin" : kind === "org" ? "/org" : "/")
  }
  return (
    <div className={`auth-page ${kind !== "public" ? "secure-auth" : ""}`}>
      <Link to="/" className="auth-brand">
        <span className="brand-mark">
          <Icon name="shield" />
        </span>
        Awareness<span>Alert</span>
      </Link>
      <div className="auth-layout">
        <div className="auth-copy">
          <span className="eyebrow">{headings[1]}</span>
          <h1>{headings[0]}</h1>
          <p>
            {kind === "public"
              ? "Save areas, follow your reports, and contribute customer reviews. Browsing and safety reporting always remain open."
              : "This is a simulated role-protected portal for the AwarenessAlert prototype."}
          </p>
          <div className="auth-points">
            <span>
              <Icon name="check" />
              Shared, up-to-date safety records
            </span>
            <span>
              <Icon name="check" />
              Clear review and outcome history
            </span>
            <span>
              <Icon name="check" />A visible path back to the public site
            </span>
          </div>
        </div>
        <div className="auth-card">
          {guardMessage && <div className="notice warning">{guardMessage}</div>}
          <form onSubmit={submit}>
            <label className="field">
              <span>Email or phone</span>
              <input
                value={login}
                onChange={(event) => setLogin(event.target.value)}
                placeholder="Enter email or phone"
                autoComplete="username"
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>
            {error && <div className="field-error boxed">{error}</div>}
            {kind === "public" && (
              <div className="form-meta">
                <label>
                  <input type="checkbox" /> Remember me
                </label>
                <Link to="/forgot-password">Forgot password?</Link>
              </div>
            )}
            <button
              className="button dark full large"
              type="submit"
              disabled={busy}
            >
              {busy ? "Checking…" : "Log in"} <Icon name="arrow" size={17} />
            </button>
          </form>
          <button
            type="button"
            className="demo-toggle"
            onClick={() => setShowDemo(!showDemo)}
          >
            {showDemo ? "Hide demo accounts" : "Show demo accounts"}
          </button>
          {showDemo && (
          <div className="demo-box">
            <strong>Demo accounts (prototype only)</strong>
            {relevant.filter((user) => user.active !== false).map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  setLogin(user.login)
                  setPassword(user.password)
                }}
              >
                <span>
                  {user.organization ??
                    (user.role === "moderator" ? `${user.name} (Moderator)` : user.name)}
                </span>
                <code>
                  {user.login} / {user.password}
                </code>
              </button>
            ))}
          </div>
          )}
          {kind === "public" && (
            <p className="auth-switch">
              New to AwarenessAlert? <Link to="/signup">Create an account</Link>
            </p>
          )}
          <Link to="/" className="back-home">
            <Icon name="back" size={16} />
            Back to public Homepage
          </Link>
        </div>
      </div>
      <DataSourceNote className="auth-note" />
    </div>
  )
}

function SignUp({
  store,
  updateStore,
  navigate,
}: StorePageProps & { navigate: (path: string) => void }) {
  const [name, setName] = useState("")
  const [login, setLogin] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const backend = useBackend()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name || !login || !password) return
    if (backend.online) {
      try {
        await api.register(name, login, password)
        await backend.refresh()
        navigate("/")
      } catch (signupError) {
        setError(errorText(signupError))
      }
      return
    }
    const id = `public-${Date.now()}`
    updateStore((current) => ({
      ...current,
      users: [...current.users, { id, name, login, password, role: "public" }],
      session: { userId: id, role: "public" },
    }))
    navigate("/")
  }
  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">
        <span className="brand-mark">
          <Icon name="shield" />
        </span>
        Awareness<span>Alert</span>
      </Link>
      <div className="single-auth-card">
        <span className="eyebrow">Optional account</span>
        <h1>Create your account</h1>
        <p>You can browse and submit reports without signing up.</p>
        <form onSubmit={submit}>
          <label className="field">
            <span>Full name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Email or phone</span>
            <input
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              required
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="field-error boxed">{error}</div>}
          <button className="button dark full large" type="submit">
            Create account
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
        <Link to="/" className="back-home">
          <Icon name="back" size={16} />
          Back to Homepage
        </Link>
      </div>
    </div>
  )
}

function PasswordPage({ reset }: { reset: boolean }) {
  const [sent, setSent] = useState(false)
  return (
    <div className="auth-page">
      <Link to="/" className="auth-brand">
        <span className="brand-mark">
          <Icon name="shield" />
        </span>
        Awareness<span>Alert</span>
      </Link>
      <div className="single-auth-card">
        <span className="eyebrow">Account recovery</span>
        <h1>{reset ? "Choose a new password" : "Forgot your password?"}</h1>
        <p>
          {reset
            ? "Set a new password for this simulated account."
            : "We’ll simulate sending a secure reset link. No OTP is used."}
        </p>
        {!sent ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setSent(true)
            }}
          >
            <label className="field">
              <span>{reset ? "New password" : "Email or phone"}</span>
              <input required type={reset ? "password" : "text"} />
            </label>
            {reset && (
              <label className="field">
                <span>Confirm password</span>
                <input required type="password" />
              </label>
            )}
            <button className="button dark full large" type="submit">
              {reset ? "Reset password" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="success-panel">
            <Icon name="check" />
            <strong>{reset ? "Password updated" : "Reset link ready"}</strong>
            <p>
              {reset
                ? "You can now log in with your new password."
                : "In this prototype, continue directly to the reset screen."}
            </p>
            <Link
              to={reset ? "/login" : "/reset-password"}
              className="button primary"
            >
              {reset ? "Back to Login" : "Open simulated reset link"}
            </Link>
          </div>
        )}
        <Link to="/login" className="back-home">
          <Icon name="back" size={16} />
          Back to Login
        </Link>
      </div>
    </div>
  )
}

function WriteReview({
  store,
  updateStore,
  vendorId,
  navigate,
}: StorePageProps & { vendorId: string ;navigate: (path: string) => void }) {
  const vendor = store.vendors.find((item) => item.id === vendorId)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState("")
  const [error, setError] = useState("")
  const backend = useBackend()
  if (!vendor) return <NotFound />
  if (store.session?.role !== "public") {
    sessionStorage.setItem("reviewDraftVendor", vendorId)
    return (
      <div className="page narrow-page">
        <div className="login-prompt">
          <Icon name="star" size={30} />
          <h1>Log in to write a review</h1>
          <p>
            Reviews are normal customer opinions and are separate from safety
            reports. We’ll keep your draft destination.
          </p>
          <Link to="/login" className="button dark">
            Log in to continue
          </Link>
          <Link to={`/vendor/${vendorId}`} className="button secondary">
            Back to vendor
          </Link>
        </div>
      </div>
    )
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!rating || !text.trim()) {
      setError("Choose a star rating and write your review.")
      return
    }
    if (backend.online) {
      try {
        await api.createReview(vendorId, rating, text.trim())
        await backend.refresh()
        navigate(`/vendor/${vendorId}`)
      } catch (reviewError) {
        setError(errorText(reviewError))
      }
      return
    }
    updateStore((current) => ({
      ...current,
      reviews: [
        {
          id: `RV-${Date.now()}`,
          vendorId,
          userId: current.session!.userId,
          rating,
          text,
          date: new Date().toISOString(),
          hidden: false,
          flags: 0,
        },
        ...current.reviews,
      ],
    }))
    navigate(`/vendor/${vendorId}`)
  }
  return (
    <div className="page narrow-page">
      <Link to={`/vendor/${vendorId}`} className="back-link">
        <Icon name="back" size={17} />
        Back to {vendor.name}
      </Link>
      <PageTitle
        eyebrow="Customer Reviews"
        title="Share your experience"
        text="Write a normal customer opinion. To report a safety concern, use the separate Report form."
      />
      <form className="form-card review-form" onSubmit={submit}>
        <fieldset>
          <legend>Your rating</legend>
          <div className="star-picker">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => setRating(star)}
                className={star <= rating ? "active" : ""}
              >
                ★
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>Your review</span>
          <textarea
            required
            rows={7}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="What was your customer experience like?"
          />
        </label>
        {error && <div className="field-error boxed">{error}</div>}
        <button className="button dark large" type="submit">
          Post review
        </button>
      </form>
    </div>
  )
}

function SavedAreas({ store, updateStore }: StorePageProps) {
  const areas = [...new Set(store.vendors.map((vendor) => vendor.area))]
  return (
    <div className="page">
      <PageTitle
        eyebrow="Your places"
        title="Saved Areas & Notifications"
        text="Choose the areas you care about. Everything is optional and off by default."
      />
      <div className="settings-layout">
        <section className="content-card">
          <h2>Saved areas</h2>
          <p>Select an area to receive optional updates.</p>
          <div className="area-grid">
            {areas.map((area) => {
              const saved = store.savedAreas.includes(area)
              return (
                <button
                  type="button"
                  className={`area-card ${saved ? "saved" : ""}`}
                  key={area}
                  onClick={() =>
                    updateStore((current) => ({
                      ...current,
                      savedAreas: saved
                        ? current.savedAreas.filter((item) => item !== area)
                        : [...current.savedAreas, area],
                    }))
                  }
                >
                  <span>
                    <Icon name="pin" />
                    <strong>{area}</strong>
                  </span>
                  <span>{saved ? "Saved" : "Add area"}</span>
                </button>
              )
            })}
          </div>
        </section>
        <aside className="content-card notification-settings">
          <h2>Notification settings</h2>
          {[
            "New report in saved area",
            "Significant trust-status change",
            "Report spike",
            "Weekly summary",
          ].map((setting) => (
            <label className="toggle-row compact" key={setting}>
              <span>{setting}</span>
              <input type="checkbox" role="switch" defaultChecked={false} />
            </label>
          ))}
          <div className="divider" />
          <label className="toggle-row compact">
            <div>
              <strong>Weekly Digest</strong>
              <p>A simple weekly overview.</p>
            </div>
            <input
              type="checkbox"
              role="switch"
              checked={store.weeklyDigest}
              onChange={(event) =>
                updateStore((current) => ({
                  ...current,
                  weeklyDigest: event.target.checked,
                }))
              }
            />
          </label>
        </aside>
      </div>
      <Link to="/" className="button dark">
        View Homepage map
      </Link>
    </div>
  )
}

function ProfilePages({
  store,
  updateStore,
  kind,
  logout,
}: StorePageProps & {
  kind: "profile" | "my-reports" | "notifications"
  logout: () => void
}) {
  const user = store.users.find((item) => item.id === store.session?.userId)
  if (!user || store.session?.role !== "public") return <AuthRequired />
  if (kind === "my-reports") {
    const reports = store.reports.filter(
      (report) =>
        report.reporterId === user.id && report.moderationStatus !== "Removed",
    )
    return (
      <div className="page">
        <PageTitle
          eyebrow="Private account view"
          title="My Reports"
          text="Your submitted reports, including anonymous submissions visible only to you."
        />
        {reports.length ? (
          <div className="report-grid">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} store={store} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="You have not submitted a report"
            text="Safety reporting never requires login, but reports made while signed in appear here."
            action={
              <Link to="/report" className="button primary">
                Report a concern
              </Link>
            }
          />
        )}
      </div>
    )
  }
  if (kind === "notifications")
    return (
      <div className="page narrow-page">
        <PageTitle
          eyebrow="Your updates"
          title="Notifications"
          text="Updates from saved areas and reports you follow."
        />{" "}
        <div className="notification-list">
          {store.notifications.map((note) => (
            <Link to={note.href} key={note.id}>
              <span className="notification-icon">
                <Icon name="bell" />
              </span>
              <div>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
                <small>{formatDate(note.at)}</small>
              </div>
              <Icon name="arrow" />
            </Link>
          ))}
        </div>
      </div>
    )
  return (
    <div className="page narrow-page">
      <PageTitle
        eyebrow="Public account"
        title={`Hello, ${user.name}`}
        text="Manage your optional AwarenessAlert account."
      />
      <div className="profile-menu">
        <Link to="/my-reports">
          <Icon name="report" />
          <span>
            <strong>My Reports</strong>
            <small>Follow your submitted concerns</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <Link to="/notifications">
          <Icon name="bell" />
          <span>
            <strong>Notifications</strong>
            <small>See recent updates</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <Link to="/saved-areas">
          <Icon name="pin" />
          <span>
            <strong>Saved Areas</strong>
            <small>Manage areas and preferences</small>
          </span>
          <Icon name="arrow" />
        </Link>
        <button type="button" onClick={logout}>
          <Icon name="logout" />
          <span>
            <strong>Logout</strong>
            <small>Return to the public Homepage</small>
          </span>
          <Icon name="arrow" />
        </button>
      </div>
    </div>
  )
}

function AuthRequired() {
  return (
    <div className="page narrow-page">
      <div className="login-prompt">
        <Icon name="user" size={32} />
        <h1>Please log in to continue</h1>
        <p>
          This account screen is optional. Public browsing and reporting remain
          open.
        </p>
        <Link to="/login" className="button dark">
          Go to Login
        </Link>
        <Link to="/" className="button secondary">
          Back to Homepage
        </Link>
      </div>
    </div>
  )
}

function AdminShell({
  store,
  children,
  logout,
}: {
  store: Store
  children: ReactNode
  logout: () => void
}) {
  const user = store.users.find((item) => item.id === store.session?.userId)
  const isAdmin = store.session?.role === "admin"
  return (
    <div className="portal-shell">
      <aside className="portal-sidebar">
        <Link to="/admin" className="brand inverse">
          <span className="brand-mark">
            <Icon name="shield" />
          </span>
          AwarenessAlert
        </Link>
        <span className="portal-label">
          {isAdmin ? "Admin portal" : "Moderator portal"}
        </span>
        <nav>
          <Link to="/admin">
            <Icon name="home" />
            Overview
          </Link>
          <Link to="/admin/reports">
            <Icon name="report" />
            Reports
          </Link>
          {isAdmin && (
            <Link to="/admin/vendors">
              <Icon name="pin" />
              Vendors
            </Link>
          )}
          <Link to="/admin/reviews">
            <Icon name="star" />
            Reviews
          </Link>
          {isAdmin && (
            <Link to="/admin/routing">
              <Icon name="map" />
              Routing rules
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/team">
              <Icon name="user" />
              Team
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin/logins">
              <Icon name="clock" />
              Login history
            </Link>
          )}
          <Link to="/admin/account">
            <Icon name="shield" />
            My account
          </Link>
        </nav>
        <Link to="/" className="public-site-link">
          <Icon name="back" />
          Public Homepage
        </Link>
      </aside>
      <div className="portal-main">
        <header className="portal-header">
          <div>
            <strong>Administration</strong>
            <DataSourceNote />
          </div>
          <div className="portal-user">
            <span className="avatar">{user?.name[0]}</span>
            <div>
              <strong>{user?.name}</strong>
              <small>{user?.title ?? (isAdmin ? "Admin" : "Moderator")}</small>
            </div>
            <button type="button" onClick={logout}>
              <Icon name="logout" size={17} />
              Logout
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

function AdminOverview({ store }: { store: Store }) {
  const count = (status: ModerationStatus) =>
    store.reports.filter((report) => report.moderationStatus === status).length
  const cards = [
    ["Total reports", store.reports.length, "All records"],
    ["Pending review", count("Pending"), "Needs attention"],
    ["Verified", count("Verified"), "Moderator reviewed"],
    ["Escalated", count("Escalated"), "With authorities"],
    ["Disputed", count("Disputed"), "Not counted"],
    [
      "Report spikes",
      store.vendors.filter((vendor) => vendorMetrics(vendor, store).spike)
        .length,
      "Unusual activity",
    ],
  ]
  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Overview"
        title="Safety network at a glance"
        text="Live totals computed from the report records."
      />
      <div className="metric-grid">
        {cards.map(([label, value, sub]) => (
          <Link to="/admin/reports" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{sub}</small>
            <Icon name="arrow" />
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="portal-card">
          <div className="card-heading">
            <h2>Reports by status</h2>
            <Link to="/admin/reports">View all</Link>
          </div>
          <div className="bar-chart">
            {([
              "Pending",
              "Verified",
              "Escalated",
              "Disputed",
              "Removed",
            ] as ModerationStatus[]).map((status) => (
              <div key={status}>
                <span>{status}</span>
                <div>
                  <i style={{ width: `${Math.max(6, count(status) * 7)}%` }} />
                </div>
                <strong>{count(status)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section className="portal-card">
          <div className="card-heading">
            <h2>Most reported areas</h2>
          </div>
          {[...new Set(store.reports.map((report) => report.location))]
            .sort(
              (a, b) =>
                store.reports.filter((report) => report.location === b).length -
                store.reports.filter((report) => report.location === a).length,
            )
            .slice(0, 5)
            .map((area) => (
            <div className="rank-row" key={area}>
              <span>{area}</span>
              <strong>
                {
                  store.reports.filter((report) => report.location === area)
                    .length
                }{" "}
                reports
              </strong>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

function AdminReports({ store }: { store: Store }) {
  const [tab, setTab] = useState("All")
  const reports = store.reports.filter(
    (report) => tab === "All" || report.moderationStatus === tab,
  )
  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Moderation"
        title="Report Management"
        text="Review one report record with separate moderation and authority fields."
      />
      <div className="tabs">
        {["All", "Pending", "Verified", "Escalated", "Disputed", "Removed"].map(
          (item) => (
            <button
              type="button"
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
              <span>
                {item === "All"
                  ? store.reports.length
                  : store.reports.filter(
                      (report) => report.moderationStatus === item,
                    ).length}
              </span>
            </button>
          ),
        )}
      </div>
      {reports.length ? (
        <DataTable>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Vendor / Location</th>
              <th>Submitted</th>
              <th>Evidence</th>
              <th>Reporter / Metadata</th>
              <th>Moderation status</th>
              <th>Authority outcome</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => {
              const vendor = findVendor(store, report.vendorId)
              const spike = vendorMetrics(vendor, store).spike
              return (
                <tr
                  key={report.id}
                  onClick={() => go(`/admin/reports/${report.id}`)}
                >
                  <td>
                    <strong>{report.id}</strong>
                    <span>{report.category}</span>
                  </td>
                  <td>
                    <strong>{vendor.name}</strong>
                    <span>{report.location}</span>
                  </td>
                  <td>{formatDate(report.submittedAt, true)}</td>
                  <td>{report.evidence ? "Photo" : "None"}</td>
                  <td>
                    <strong>{report.reporterTier}</strong>
                    <span>
                      {report.ip} · {report.deviceId}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`admin-status ${report.moderationStatus.toLowerCase()}`}
                    >
                      {report.moderationStatus}
                    </span>
                    {spike && <small className="spike-inline">Spike</small>}
                  </td>
                  <td>
                    {report.authorityOutcome ?? "—"}
                    {report.routedTo && <span>{report.routedTo}</span>}
                  </td>
                  <td>
                    <Icon name="arrow" />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          title="No reports in this tab"
          text="Try another moderation status."
        />
      )}
    </div>
  )
}

function DataTable({ children }: { children: ReactNode }) {
  return (
    <div className="table-wrap">
      <table>{children}</table>
    </div>
  )
}

function AdminReportDetail({
  store,
  updateStore,
  id,
}: StorePageProps & { id: string }) {
  const backend = useBackend()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const report = store.reports.find((item) => item.id === id)
  if (!report) return <NotFound />
  const vendor = findVendor(store, report.vendorId)
  const log = store.auditLog
    .filter((item) => item.reportId === id)
    .sort((a, b) => b.at.localeCompare(a.at))
  async function action(next: ModerationStatus, label: string) {
    setMessage("")
    if (backend.online) {
      setBusy(true)
      try {
        await api.setReportStatus(
          id,
          next,
          label,
          next === "Escalated" ? store.routingConfig[report!.category] : undefined,
        )
        await backend.refresh()
        setMessage(`Saved: ${label}`)
      } catch (error) {
        setMessage(errorText(error))
      } finally {
        setBusy(false)
      }
      return
    }
    setMessage(`Saved: ${label}`)
    updateStore((current) => ({
      ...current,
      reports: current.reports.map((item) =>
        item.id === id
          ? {
              ...item,
              moderationStatus: next,
              ...(next === "Escalated"
                ? {
                    authorityOutcome: "Awaiting" as AuthorityOutcome,
                    routedTo: current.routingConfig[item.category],
                  }
                : {}),
              ...(report!.moderationStatus === "Escalated" && next === "Verified"
                ? { authorityOutcome: null, routedTo: null }
                : {}),
            }
          : item,
      ),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          reportId: id,
          action: label,
          actor: currentUserName(current),
          at: new Date().toISOString(),
        },
        ...current.auditLog,
      ],
    }))
  }
  const locked = report.moderationStatus === "Escalated"
  return (
    <div className="portal-content" aria-busy={busy}>
      <Link to="/admin/reports" className="back-link">
        <Icon name="back" />
        Back to report table
      </Link>
      <PageTitle
        eyebrow={`${report.id} · ${report.category}`}
        title={vendor.name}
        text={`${report.location} · Submitted ${formatDate(report.submittedAt, true)}`}
      />
      <div className="admin-control-bar">
        <div>
          <span>Moderation status</span>
          <strong
            className={`admin-status ${report.moderationStatus.toLowerCase()}`}
          >
            {report.moderationStatus}
          </strong>
          {report.authorityOutcome && (
            <span className="outcome-plain">
              Authority: {report.authorityOutcome}
            </span>
          )}
        </div>
        <div>
          {!locked &&
            report.moderationStatus !== "Verified" &&
            report.moderationStatus !== "Removed" && (
              <button
                type="button"
                className="button teal"
                onClick={() => action("Verified", "Marked Verified")}
              >
                Mark Verified
              </button>
            )}
          {!locked &&
            ["Pending", "Verified"].includes(report.moderationStatus) && (
              <button
                type="button"
                className="button secondary"
                onClick={() => action("Disputed", "Marked Disputed")}
              >
                Dispute
              </button>
            )}
          {report.moderationStatus === "Disputed" && (
            <button
              type="button"
              className="button secondary"
              onClick={() => action("Pending", "Re-opened for review")}
            >
              Re-open
            </button>
          )}
          {!locked && report.moderationStatus !== "Removed" && (
            <button
              type="button"
              className="button danger-outline"
              onClick={() => action("Removed", "Removed from public view")}
            >
              Remove
            </button>
          )}
          {report.moderationStatus === "Verified" && (
            <button
              type="button"
              className="button authority"
              onClick={() => {
                if (
                  window.confirm(
                    `Assign this ${report.category} report to ${store.routingConfig[report.category]}?`,
                  )
                )
                  action(
                    "Escalated",
                    `Assigned to ${store.routingConfig[report.category]}`,
                  )
              }}
            >
              <Icon name="arrow" />
              Assign to {store.routingConfig[report.category]}
            </button>
          )}
          {report.moderationStatus === "Escalated" &&
            report.authorityOutcome === "Awaiting" && (
              <button
                type="button"
                className="button secondary"
                onClick={() => action("Verified", "Escalation recalled")}
              >
                Recall escalation
              </button>
            )}
        </div>
      </div>
      {message && (
        <div
          className={`notice ${message.startsWith("Saved") ? "success" : "warning"}`}
        >
          {message}
          {report.moderationStatus === "Verified" &&
            message.startsWith("Saved") &&
            ` · Next: click "Assign to ${store.routingConfig[report.category]}" to send it to the authority.`}
        </div>
      )}
      <div className="admin-detail-grid">
        <div>
          <section className="portal-card">
            <h2>Report information</h2>
            <InfoGrid
              items={[
                ["Description", report.description],
                ["Vendor", vendor.name],
                ["Location", report.location],
                ["Category", report.category],
                ["Submitted", formatDate(report.submittedAt, true)],
                [
                  "Evidence",
                  report.evidenceImage
                    ? "Photo attached"
                    : report.evidence
                      ? "Photo attached (sample data)"
                      : "None",
                ],
              ]}
            />
            {report.evidenceImage && (
              <img
                className="evidence-photo"
                src={report.evidenceImage}
                alt="Photo evidence submitted with this report"
              />
            )}
          </section>
          <section className="portal-card">
            <h2>Reporter & abuse-prevention signals</h2>
            <InfoGrid
              items={[
                ["Reporter tier", report.reporterTier],
                ["Account", report.reporterId ?? "Guest session"],
                [
                  "Anonymous",
                  report.anonymous ? "Yes — hidden publicly" : "No",
                ],
                ["IP address", report.ip],
                ["Device / session ID", report.deviceId],
                ["Report frequency", "2 reports in the last 30 days"],
                [
                  "Account activity",
                  "Active session · no automated pattern detected",
                ],
              ]}
            />
          </section>
          <section className="portal-card">
            <h2>Related reports</h2>
            {store.reports
              .filter(
                (item) =>
                  item.vendorId === report.vendorId && item.id !== report.id,
              )
              .slice(0, 4)
              .map((item) => (
                <Link
                  className="related-row"
                  key={item.id}
                  to={`/admin/reports/${item.id}`}
                >
                  <span>
                    <strong>{item.id}</strong>
                    <small>
                      {formatDate(item.submittedAt)} · {item.category}
                    </small>
                  </span>
                  <span
                    className={`admin-status ${item.moderationStatus.toLowerCase()}`}
                  >
                    {item.moderationStatus}
                  </span>
                  <Icon name="arrow" />
                </Link>
              ))}
          </section>
        </div>
        <aside>
          <section className="portal-card authority-panel">
            <span className="eyebrow">Read only for admin</span>
            <h2>Authority outcome</h2>
            {report.moderationStatus === "Escalated" ? (
              <>
                <InfoGrid
                  items={[
                    ["Routed to", report.routedTo ?? "—"],
                    ["Outcome", report.authorityOutcome ?? "—"],
                    ["Set by", report.outcomeSetBy || "Awaiting organization"],
                    ["When", formatDate(report.outcomeSetAt, true)],
                  ]}
                />
                <div className="admin-comment">
                  <strong>
                    Public comment <span>Visible to public</span>
                  </strong>
                  <p>
                    {report.outcomePublicComment || "No public comment yet."}
                  </p>
                </div>
                <div className="admin-comment internal">
                  <strong>
                    Internal note <span>Admin and organization only</span>
                  </strong>
                  <p>{report.outcomeInternalNote || "No internal note."}</p>
                </div>
              </>
            ) : (
              <p>This report has not been sent to an authority.</p>
            )}
          </section>
          <section className="portal-card">
            <h2>Audit history</h2>
            <div className="audit-list">
              {log.map((item) => (
                <div key={item.id}>
                  <i />
                  <span>
                    <strong>{item.action}</strong>
                    <small>
                      {item.actor} · {formatDate(item.at, true)}
                    </small>
                  </span>
                </div>
              ))}
              {!log.length && <p>No changes logged.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function InfoGrid({ items }: { items: string[][] }) {
  return (
    <div className="info-grid">
      {items.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}

function AdminVendors({ store }: { store: Store }) {
  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Directory"
        title="Vendor Management"
        text="Manual verification badges and approval-list provenance."
      />
      <DataTable>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Area</th>
            <th>Trust status</th>
            <th>Badges</th>
            <th>Verified?</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {store.vendors.map((vendor) => {
            const metrics = vendorMetrics(vendor, store)
            return (
              <tr
                key={vendor.id}
                onClick={() => go(`/admin/vendors/${vendor.id}`)}
              >
                <td>
                  <strong>{vendor.name}</strong>
                  <span>{vendor.kind}</span>
                </td>
                <td>{vendor.area}</td>
                <td>
                  <TrustBadge
                    band={metrics.band}
                    score={metrics.score}
                    compact
                  />
                </td>
                <td>
                  <AuthorityBadges vendor={vendor} />
                </td>
                <td>{vendor.badges.length ? "Yes" : "No"}</td>
                <td>
                  <Icon name="arrow" />
                </td>
              </tr>
            )
          })}
        </tbody>
      </DataTable>
    </div>
  )
}

function VendorEdit({
  store,
  updateStore,
  id,
}: StorePageProps & { id: string }) {
  const vendor = store.vendors.find((item) => item.id === id)
  const [draft, setDraft] = useState(vendor?.approval ?? {})
  const [newKey, setNewKey] = useState("")
  const [saved, setSaved] = useState("")
  const backend = useBackend()
  if (!vendor) return <NotFound />
  async function toggleBadge(badge: OrgId) {
    if (backend.online) {
      const badges = vendor!.badges.includes(badge)
        ? vendor!.badges.filter((value) => value !== badge)
        : [...vendor!.badges, badge]
      try {
        await api.updateVendor(id, { badges })
        await backend.refresh()
      } catch (error) {
        window.alert(errorText(error))
      }
      return
    }
    updateStore((current) => ({
      ...current,
      vendors: current.vendors.map((item) =>
        item.id === id
          ? {
              ...item,
              badges: item.badges.includes(badge)
                ? item.badges.filter((value) => value !== badge)
                : [...item.badges, badge],
              verifiedDate: formatDate(new Date().toISOString()),
            }
          : item,
      ),
    }))
  }
  async function save() {
    if (backend.online) {
      try {
        await api.updateVendor(id, { approval: draft })
        await backend.refresh()
        setSaved("Saved to database")
      } catch (error) {
        setSaved(errorText(error))
      }
      return
    }
    updateStore((current) => ({
      ...current,
      vendors: current.vendors.map((item) =>
        item.id === id ? { ...item, approval: draft } : item,
      ),
    }))
    setSaved("Saved")
  }
  return (
    <div className="portal-content">
      <Link to="/admin/vendors" className="back-link">
        <Icon name="back" />
        Back to vendor list
      </Link>
      <PageTitle
        eyebrow="Vendor Edit"
        title={vendor.name}
        text="Manual cross-checking tools. Changes update the public map and profile immediately."
      />
      <div className="admin-detail-grid">
        <div>
          <section className="portal-card">
            <h2>Verification badges</h2>
            <p>Grant or revoke a badge after manual cross-checking.</p>
            <div className="badge-editor">
              {store.organizations.map((badge) => (
                <label key={badge}>
                  <input
                    type="checkbox"
                    checked={vendor.badges.includes(badge)}
                    onChange={() => toggleBadge(badge)}
                  />
                  <span>
                    <Icon name="shield" />
                    <strong>{badge} Verified</strong>
                    <small>
                      {vendor.badges.includes(badge)
                        ? `Granted · ${vendor.verifiedDate}`
                        : "Not granted"}
                    </small>
                  </span>
                </label>
              ))}
            </div>
          </section>
          <section className="portal-card">
            <div className="card-heading">
              <h2>Approval List fields</h2>
              {saved && <small className="saved-note">{saved}</small>}
              <button
                type="button"
                className="button dark small"
                onClick={save}
              >
                Save fields
              </button>
            </div>
            <div className="approval-editor">
              {Object.entries(draft).map(([key, value]) => (
                <label className="field" key={key}>
                  <span>{key}</span>
                  <input
                    value={value}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <div className="add-field">
                <input
                  placeholder="New field name"
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value)}
                />
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => {
                    if (newKey) {
                      setDraft({ ...draft, [newKey]: "" })
                      setNewKey("")
                    }
                  }}
                >
                  Add field
                </button>
              </div>
            </div>
          </section>
        </div>
        <aside>
          <section className="portal-card">
            <h2>Public preview</h2>
            <AuthorityBadges vendor={vendor} />
            {vendor.badges.length ? (
              <div className="approval-table mini">
                {Object.entries(draft).map(([key, value]) => (
                  <div key={key}>
                    <span>{key}</span>
                    <strong>{value || "Not provided"}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p>
                The Approval List is hidden until at least one badge is granted.
              </p>
            )}
            <Link to={`/vendor/${id}`} className="button secondary full">
              Open public profile
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}

function AdminReviews({ store, updateStore }: StorePageProps) {
  const backend = useBackend()
  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Customer opinions"
        title="Review Moderation"
        text="Flagged and visible customer reviews. Hidden reviews leave rating averages."
      />
      <DataTable>
        <thead>
          <tr>
            <th>Review</th>
            <th>Vendor</th>
            <th>Rating</th>
            <th>Flags</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {store.reviews.map((review) => (
            <tr key={review.id}>
              <td>
                <strong>{review.id}</strong>
                <span>{review.text}</span>
              </td>
              <td>
                {findVendor(store, review.vendorId).name}
              </td>
              <td>{review.rating} / 5</td>
              <td>{review.flags}</td>
              <td>{review.hidden ? "Hidden" : "Visible"}</td>
              <td>
                <button
                  type="button"
                  className="button secondary small"
                  onClick={async (event) => {
                    event.stopPropagation()
                    if (backend.online) {
                      try {
                        await api.toggleReview(review.id)
                        await backend.refresh()
                      } catch (error) {
                        window.alert(errorText(error))
                      }
                      return
                    }
                    updateStore((current) => ({
                      ...current,
                      reviews: current.reviews.map((item) =>
                        item.id === review.id
                          ? { ...item, hidden: !item.hidden }
                          : item,
                      ),
                    }))
                  }}
                >
                  {review.hidden ? "Restore" : "Hide"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

function RoutingRules({ store, updateStore }: StorePageProps) {
  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Settings"
        title="Routing rules"
        text="A single configurable category-to-organization mapping used by Send to Authority."
      />
      <section className="portal-card routing-card">
        {(["Food", "Fuel", "Other"] as Category[]).map((category) => (
          <div key={category}>
            <span className={`category ${category.toLowerCase()}`}>
              {category}
            </span>
            <Icon name="arrow" />
            <label className="field">
              <span>Receiving organization</span>
              <select
                value={store.routingConfig[category]}
                onChange={(event) =>
                  updateStore((current) => ({
                    ...current,
                    routingConfig: {
                      ...current.routingConfig,
                      [category]: event.target.value as OrgId,
                    },
                  }))
                }
              >
                {store.organizations.map((organization) => (
                  <option key={organization}>{organization}</option>
                ))}
              </select>
            </label>
          </div>
        ))}
        <div className="config-toggle">
          <div>
            <strong>Show organization name publicly</strong>
            <p>
              Off by default. Public comments are attributed generically to
              “Authority.”
            </p>
          </div>
          <input
            type="checkbox"
            role="switch"
            checked={store.showOrgNamePublicly}
            onChange={(event) =>
              updateStore((current) => ({
                ...current,
                showOrgNamePublicly: event.target.checked,
              }))
            }
          />
        </div>
      </section>
    </div>
  )
}

function OrgShell({
  store,
  children,
  logout,
}: {
  store: Store
  children: ReactNode
  logout: () => void
}) {
  const user = store.users.find((item) => item.id === store.session?.userId)
  return (
    <div className="org-shell">
      <header className="org-header">
        <Link to="/org" className="brand">
          <span className="brand-mark">
            <Icon name="shield" />
          </span>
          AwarenessAlert <i>Partner</i>
        </Link>
        <div className="org-user">
          <DataSourceNote />
          <div>
            <strong>{user?.organization}</strong>
            <small>{user?.name}</small>
          </div>
          <button type="button" onClick={logout}>
            <Icon name="logout" size={17} />
            Logout
          </button>
        </div>
      </header>
      <nav className="org-nav">
        <Link to="/org">Report queue</Link>
        <Link to="/">Public Homepage</Link>
      </nav>
      <main className="org-main">{children}</main>
    </div>
  )
}

function OrgDashboard({ store }: { store: Store }) {
  const org = store.session?.organization
  const [status, setStatus] = useState("All")
  const reports = store.reports.filter(
    (report) =>
      report.moderationStatus === "Escalated" &&
      report.routedTo === org &&
      (status === "All" || report.authorityOutcome === status),
  )
  return (
    <div>
      <PageTitle
        eyebrow={`${org} partner portal`}
        title="Assigned report queue"
        text="Only reports routed to your organization are visible. Admin metadata is never shared here."
      />
      <div className="org-metrics">
        <div>
          <span>Awaiting</span>
          <strong>
            {
              reports.filter((report) => report.authorityOutcome === "Awaiting")
                .length
            }
          </strong>
        </div>
        <div>
          <span>Confirmed</span>
          <strong>
            {
              reports.filter(
                (report) => report.authorityOutcome === "Confirmed",
              ).length
            }
          </strong>
        </div>
        <div>
          <span>Cleared</span>
          <strong>
            {
              reports.filter((report) => report.authorityOutcome === "Cleared")
                .length
            }
          </strong>
        </div>
      </div>
      <div className="filter-bar org-filters">
        <Select
          label="Outcome status"
          value={status}
          onChange={setStatus}
          options={["All", "Awaiting", "Confirmed", "Cleared"]}
        />
        <Select
          label="Time"
          value="All"
          onChange={() => {}}
          options={["All", "Today", "This week", "This month"]}
        />
      </div>
      {reports.length ? (
        <DataTable>
          <thead>
            <tr>
              <th>Report ID</th>
              <th>Vendor / Location</th>
              <th>Category</th>
              <th>Submitted</th>
              <th>Evidence</th>
              <th>Authority outcome</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                onClick={() => go(`/org/reports/${report.id}`)}
              >
                <td>
                  <strong>{report.id}</strong>
                </td>
                <td>
                  <strong>
                    {
                      store.vendors.find(
                        (vendor) => vendor.id === report.vendorId,
                      )?.name
                    }
                  </strong>
                  <span>{report.location}</span>
                </td>
                <td>{report.category}</td>
                <td>{formatDate(report.submittedAt, true)}</td>
                <td>{report.evidence ? "Photo attached" : "None"}</td>
                <td>
                  <span
                    className={`outcome ${report.authorityOutcome?.toLowerCase()}`}
                  >
                    {report.authorityOutcome}
                  </span>
                </td>
                <td>
                  <Icon name="arrow" />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          title="No reports routed to you"
          text="New reports will appear here after an admin verifies and sends them to your organization."
        />
      )}
    </div>
  )
}

function OrgReportDetail({
  store,
  updateStore,
  id,
}: StorePageProps & { id: string }) {
  const report = store.reports.find(
    (item) =>
      item.id === id &&
      item.moderationStatus === "Escalated" &&
      item.routedTo === store.session?.organization,
  )
  const [outcome, setOutcome] = useState<AuthorityOutcome>(
    report?.authorityOutcome ?? "Awaiting",
  )
  const [publicComment, setPublicComment] = useState(
    report?.outcomePublicComment ?? "",
  )
  const [internalNote, setInternalNote] = useState(
    report?.outcomeInternalNote ?? "",
  )
  const [message, setMessage] = useState("")
  const backend = useBackend()
  if (!report) return <NotFound />
  const vendor = findVendor(store, report.vendorId)
  async function save() {
    if (
      (outcome === "Confirmed" || outcome === "Cleared") &&
      !publicComment.trim()
    ) {
      setMessage(
        "A public comment is required for Confirmed or Cleared outcomes.",
      )
      return
    }
    if (backend.online) {
      try {
        await api.setReportOutcome(id, outcome ?? "Awaiting", publicComment, internalNote)
        await backend.refresh()
        setMessage("Outcome and comment are now visible publicly.")
      } catch (error) {
        setMessage(errorText(error))
      }
      return
    }
    updateStore((current) => ({
      ...current,
      reports: current.reports.map((item) =>
        item.id === id
          ? {
              ...item,
              authorityOutcome: outcome,
              outcomePublicComment: publicComment,
              outcomeInternalNote: internalNote,
              outcomeSetBy: current.session?.organization ?? "",
              outcomeSetAt: new Date().toISOString(),
            }
          : item,
      ),
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          reportId: id,
          action: `Authority outcome set to ${outcome}`,
          actor: current.session?.organization ?? "Organization",
          at: new Date().toISOString(),
        },
        ...current.auditLog,
      ],
    }))
    setMessage("Outcome and comment are now visible publicly.")
  }
  return (
    <div>
      <Link to="/org" className="back-link">
        <Icon name="back" />
        Back to assigned queue
      </Link>
      <PageTitle
        eyebrow={`${report.id} · ${report.category}`}
        title={vendor.name}
        text={`${report.location} · Submitted ${formatDate(report.submittedAt, true)}`}
      />
      <div className="org-detail-grid">
        <div>
          <section className="content-card">
            <h2>Report information</h2>
            <InfoGrid
              items={[
                ["Description", report.description],
                ["Vendor", vendor.name],
                ["Location", report.location],
                ["Category", report.category],
                [
                  "Evidence",
                  report.evidenceImage
                    ? "Photo attached"
                    : report.evidence
                      ? "Photo attached (sample data)"
                      : "No evidence attached",
                ],
                ["Submitted", formatDate(report.submittedAt, true)],
              ]}
            />
            {report.evidenceImage ? (
              <img
                className="evidence-photo"
                src={report.evidenceImage}
                alt="Photo evidence submitted with this report"
              />
            ) : (
              <div className="evidence-viewer">
                <Icon name="image" size={32} />
                <span>
                  {report.evidence
                    ? "Sample report — no real photo file"
                    : "No attached evidence"}
                </span>
              </div>
            )}
          </section>
          <section className="content-card">
            <h2>Basic report history</h2>
            <div className="timeline">
              <div className="done">
                <i>
                  <Icon name="check" size={15} />
                </i>
                <div>
                  <strong>Report received</strong>
                  <span>{formatDate(report.submittedAt, true)}</span>
                </div>
              </div>
              <div className="done">
                <i>
                  <Icon name="check" size={15} />
                </i>
                <div>
                  <strong>Verified and routed</strong>
                  <span>Assigned to {report.routedTo}</span>
                </div>
              </div>
            </div>
          </section>
        </div>
        <aside className="outcome-editor">
          <span className="eyebrow">Always visible outcome control</span>
          <h2>Log authority outcome</h2>
          <p>
            Every save is logged. The outcome and public comment update public
            screens immediately.
          </p>
          <div className="outcome-picker">
            {(["Confirmed", "Cleared", "Awaiting"] as AuthorityOutcome[]).map(
              (item) => (
                <button
                  type="button"
                  key={item}
                  className={outcome === item ? "active" : ""}
                  onClick={() => setOutcome(item)}
                >
                  <span>
                    {item === "Confirmed"
                      ? "✓"
                      : item === "Cleared"
                        ? "○"
                        : "…"}
                  </span>
                  <strong>{item}</strong>
                </button>
              ),
            )}
          </div>
          <label className="field">
            <span>Public comment (shown to everyone)</span>
            <textarea
              maxLength={280}
              rows={5}
              value={publicComment}
              onChange={(event) => setPublicComment(event.target.value)}
              placeholder="Explain the outcome in clear, public language..."
            />
            <small>{publicComment.length} / 280</small>
          </label>
          <div className="public-preview">
            <strong>Public feed preview</strong>
            <StatusPill report={{ ...report, authorityOutcome: outcome }} />
            <p>{publicComment || "Your public comment will appear here."}</p>
          </div>
          <label className="field">
            <span>Internal note (admin only)</span>
            <textarea
              rows={4}
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Optional case notes..."
            />
          </label>
          {message && (
            <div
              className={`notice ${
                message.startsWith("Outcome") ? "success" : "warning"
              }`}
            >
              {message}
            </div>
          )}
          <button
            type="button"
            className="button authority large full"
            onClick={save}
          >
            Save outcome and comment
          </button>
        </aside>
      </div>
    </div>
  )
}

function VendorPortal() {
  return (
    <div className="page confirmation-page">
      <div className="confirmation-mark future">
        <Icon name="shield" size={34} />
      </div>
      <span className="eyebrow">Future phase</span>
      <h1>Vendor Dashboard — Coming Soon</h1>
      <p>
        A future right-of-reply space for reported vendors. This role is not
        active in the current prototype.
      </p>
      <div className="future-list">
        <span>Claim a vendor listing</span>
        <span>Respond publicly to reports</span>
        <span>Display verification</span>
        <span>Manage vendor information</span>
        <span>Raise a dispute on a report</span>
      </div>
      <Link to="/" className="button dark">
        Return to Homepage
      </Link>
    </div>
  )
}

// ---------- Team (admin only): add moderators & organization staff ----------
type StaffRow = {
  id: string
  name: string
  login: string
  role: Role
  organization?: string | null
  title?: string | null
  active: boolean
  lastLogin?: string
}

function TeamPage({ store, updateStore }: StorePageProps) {
  const backend = useBackend()
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(backend.online)
  const [message, setMessage] = useState("")
  const [form, setForm] = useState({
    name: "",
    login: "",
    password: "",
    role: "moderator" as "moderator" | "org",
    organization: "BSTI" as OrgId,
  })
  const [resetFor, setResetFor] = useState("")
  const [newPassword, setNewPassword] = useState("")

  // Demo mode: staff come from the local store
  const localStaff: StaffRow[] = store.users
    .filter((user) => user.role !== "public")
    .map((user) => ({
      ...user,
      active: user.active !== false,
      lastLogin: (store.loginHistory ?? []).find(
        (entry) => entry.userId === user.id && entry.event === "login",
      )?.at,
    }))
  const rows = backend.online ? staff : localStaff

  useEffect(() => {
    if (!backend.online) return
    api
      .listStaff()
      .then((data) => setStaff(data.users as StaffRow[]))
      .catch((error) => setMessage(errorText(error)))
      .finally(() => setLoading(false))
  }, [backend.online])

  function done(text: string) {
    setMessage(text)
    backend.refresh().catch(() => {})
  }

  async function addStaff(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    if (!form.name.trim() || !form.login.trim()) {
      setMessage("Name and email/phone are required.")
      return
    }
    if (form.password.length < 8) {
      setMessage("The password must be at least 8 characters.")
      return
    }
    if (backend.online) {
      try {
        const data = await api.createStaff({
          name: form.name.trim(),
          login: form.login.trim(),
          password: form.password,
          role: form.role,
          organization: form.role === "org" ? form.organization : undefined,
        })
        setStaff(data.users as StaffRow[])
      } catch (error) {
        setMessage(errorText(error))
        return
      }
    } else {
      if (store.users.some((user) => user.login.toLowerCase() === form.login.trim().toLowerCase())) {
        setMessage("An account with this email or phone already exists.")
        return
      }
      updateStore((current) => ({
        ...current,
        users: [
          ...current.users,
          {
            id: `staff-${Date.now()}`,
            name: form.name.trim(),
            login: form.login.trim(),
            password: form.password,
            role: form.role,
            organization: form.role === "org" ? form.organization : undefined,
            title: form.role === "moderator" ? "Moderator" : undefined,
            active: true,
          },
        ],
      }))
    }
    done(
      `Saved: ${form.name.trim()} can now log in on the ${
        form.role === "moderator" ? "Admin" : "Organization"
      } login page.`,
    )
    setForm({ ...form, name: "", login: "", password: "" })
  }

  async function toggle(row: StaffRow) {
    setMessage("")
    if (backend.online) {
      try {
        const data = await api.toggleStaff(row.id)
        setStaff(data.users as StaffRow[])
      } catch (error) {
        setMessage(errorText(error))
        return
      }
    } else {
      updateStore((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === row.id ? { ...user, active: user.active === false } : user,
        ),
      }))
    }
    done(`Saved: ${row.name} is now ${row.active ? "turned off" : "active"}.`)
  }

  async function resetPassword(row: StaffRow) {
    setMessage("")
    if (newPassword.length < 8) {
      setMessage("The new password must be at least 8 characters.")
      return
    }
    if (backend.online) {
      try {
        await api.resetStaffPassword(row.id, newPassword)
      } catch (error) {
        setMessage(errorText(error))
        return
      }
    } else {
      updateStore((current) => ({
        ...current,
        users: current.users.map((user) =>
          user.id === row.id ? { ...user, password: newPassword } : user,
        ),
      }))
    }
    setResetFor("")
    setNewPassword("")
    setMessage(`Saved: new password set for ${row.name}.`)
  }

  const roleLabel = (row: StaffRow) =>
    row.role === "admin"
      ? "Admin"
      : row.role === "moderator"
        ? "Moderator"
        : `Organization · ${row.organization}`

  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Admin only"
        title="Team"
        text="Add moderators and organization staff, turn accounts off, or reset a password."
      />
      {message && (
        <div className={`notice ${message.startsWith("Saved") ? "success" : "warning"}`}>
          {message}
        </div>
      )}
      <div className="team-layout">
        <section className="portal-card">
          <h2>Add a team member</h2>
          <form className="team-form" onSubmit={addStaff}>
            <label className="field">
              <span>Role</span>
              <select
                value={form.role}
                onChange={(event) =>
                  setForm({ ...form, role: event.target.value as "moderator" | "org" })
                }
              >
                <option value="moderator">Moderator (reviews reports)</option>
                <option value="org">Organization staff (BSTI / DNCRP / Lab)</option>
              </select>
            </label>
            {form.role === "org" && (
              <label className="field">
                <span>Organization</span>
                <select
                  value={form.organization}
                  onChange={(event) =>
                    setForm({ ...form, organization: event.target.value as OrgId })
                  }
                >
                  {store.organizations.map((organization) => (
                    <option key={organization}>{organization}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="field">
              <span>Full name</span>
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="e.g. Sadia Islam"
              />
            </label>
            <label className="field">
              <span>Email or phone (used to log in)</span>
              <input
                value={form.login}
                onChange={(event) => setForm({ ...form, login: event.target.value })}
                placeholder="e.g. sadia@awarenessalert.test"
              />
            </label>
            <label className="field">
              <span>Temporary password (min 8 characters)</span>
              <input
                type="text"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="They can change it in My account"
              />
            </label>
            <button className="button dark full" type="submit">
              Add team member
            </button>
          </form>
          <div className="permission-note">
            <strong>Moderators can:</strong> review reports, verify, dispute,
            remove, assign to an authority, hide reviews.
            <br />
            <strong>Only the admin can:</strong> manage the team, routing rules
            and vendor badges.
          </div>
        </section>
        <section className="portal-card">
          <h2>Staff accounts</h2>
          {loading ? (
            <p>Loading…</p>
          ) : (
            <div className="team-list">
              {rows.map((row) => (
                <div key={row.id} className={`team-row ${row.active ? "" : "off"}`}>
                  <span className="avatar">{row.name[0]}</span>
                  <span className="team-who">
                    <strong>
                      {row.name}
                      {row.id === store.session?.userId && " (you)"}
                    </strong>
                    <small>
                      {roleLabel(row)} · {row.login}
                    </small>
                    <small className="last-login">
                      Last login:{" "}
                      {row.lastLogin ? formatDate(row.lastLogin, true) : "never"}
                    </small>
                  </span>
                  <span className={`team-status ${row.active ? "on" : "off"}`}>
                    {row.active ? "Active" : "Turned off"}
                  </span>
                  {row.role !== "admin" && (
                    <span className="team-actions">
                      <button
                        type="button"
                        className="button secondary small"
                        onClick={() => {
                          setResetFor(resetFor === row.id ? "" : row.id)
                          setNewPassword("")
                        }}
                      >
                        Reset password
                      </button>
                      <button
                        type="button"
                        className={`button small ${row.active ? "danger-outline" : "teal"}`}
                        onClick={() => toggle(row)}
                      >
                        {row.active ? "Turn off" : "Turn on"}
                      </button>
                    </span>
                  )}
                  {resetFor === row.id && (
                    <div className="team-reset">
                      <input
                        type="text"
                        placeholder="New password (min 8 characters)"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                      />
                      <button
                        type="button"
                        className="button dark small"
                        onClick={() => resetPassword(row)}
                      >
                        Save password
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ---------- My account (every staff member): change own password ----------
function AccountPage({ store, updateStore }: StorePageProps) {
  const backend = useBackend()
  const user = store.users.find((item) => item.id === store.session?.userId)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [message, setMessage] = useState("")

  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    if (next.length < 8) return setMessage("The new password must be at least 8 characters.")
    if (next !== confirm) return setMessage("The two new passwords do not match.")
    if (backend.online) {
      try {
        await api.changeMyPassword(current, next)
      } catch (error) {
        return setMessage(errorText(error))
      }
    } else {
      if (user?.password !== current) return setMessage("Your current password is not correct.")
      updateStore((state) => ({
        ...state,
        users: state.users.map((item) =>
          item.id === user.id ? { ...item, password: next } : item,
        ),
      }))
    }
    setCurrent("")
    setNext("")
    setConfirm("")
    setMessage("Saved: your password has been changed.")
  }

  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="My account"
        title={user?.name ?? "My account"}
        text={`Role: ${
          store.session?.role === "admin" ? "Admin" : "Moderator"
        }. Change your password here.`}
      />
      <section className="portal-card account-card">
        <h2>Change password</h2>
        {message && (
          <div className={`notice ${message.startsWith("Saved") ? "success" : "warning"}`}>
            {message}
          </div>
        )}
        <form className="team-form" onSubmit={submit}>
          <label className="field">
            <span>Current password</span>
            <input type="password" value={current} onChange={(event) => setCurrent(event.target.value)} />
          </label>
          <label className="field">
            <span>New password (min 8 characters)</span>
            <input type="password" value={next} onChange={(event) => setNext(event.target.value)} />
          </label>
          <label className="field">
            <span>Repeat new password</span>
            <input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
          <button className="button dark" type="submit">
            Save new password
          </button>
        </form>
      </section>
    </div>
  )
}

// ---------- Login history (admin only) ----------
function LoginHistoryPage({ store }: { store: Store }) {
  const backend = useBackend()
  const [filter, setFilter] = useState("all")
  const [events, setEvents] = useState<api.LoginEvent[]>([])
  const [summary, setSummary] = useState({ logins24h: 0, failed24h: 0, people24h: 0 })
  const [loading, setLoading] = useState(backend.online)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const load = () => {
    if (!backend.online) return
    setLoading(true)
    api
      .loginHistory(filter)
      .then((data) => {
        setEvents(data.events)
        setSummary(data.summary)
        setError("")
      })
      .catch((loadError) => setError(errorText(loadError)))
      .finally(() => setLoading(false))
  }
  useEffect(load, [filter, backend.online])

  // Demo mode: history kept in this browser
  const dayAgo = Date.now() - DAY
  const local = store.loginHistory ?? []
  const all = backend.online
    ? events
    : local.filter((entry) => filter === "all" || entry.event === filter)
  const totals = backend.online
    ? summary
    : {
        logins24h: local.filter((e) => e.event === "login" && Date.parse(e.at) >= dayAgo).length,
        failed24h: local.filter((e) => e.event === "failed" && Date.parse(e.at) >= dayAgo).length,
        people24h: new Set(
          local.filter((e) => e.event === "login" && Date.parse(e.at) >= dayAgo).map((e) => e.userId),
        ).size,
      }
  const shown = all.filter((entry) =>
    `${entry.name ?? ""} ${entry.login} ${entry.ip}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )
  const roleName = (role: string | null) =>
    role === "admin"
      ? "Admin"
      : role === "moderator"
        ? "Moderator"
        : role === "org"
          ? "Organization"
          : role === "public"
            ? "Public user"
            : "Unknown"
  const browser = (agent: string) =>
    /Edg\//.test(agent)
      ? "Edge"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Firefox\//.test(agent)
          ? "Firefox"
          : /Safari\//.test(agent)
            ? "Safari"
            : agent
              ? "Other browser"
              : "—"

  return (
    <div className="portal-content">
      <PageTitle
        eyebrow="Security"
        title="Login history"
        text="Every login, failed attempt and logout is saved. Repeated failed attempts can mean someone is guessing a password."
        action={
          backend.online ? (
            <button type="button" className="button secondary" onClick={load}>
              Refresh
            </button>
          ) : undefined
        }
      />
      {error && <div className="notice warning">{error}</div>}
      <div className="org-metrics">
        <div>
          <span>Logins · last 24 h</span>
          <strong>{totals.logins24h}</strong>
        </div>
        <div>
          <span>People logged in · 24 h</span>
          <strong>{totals.people24h}</strong>
        </div>
        <div className={totals.failed24h >= 5 ? "metric-alert" : ""}>
          <span>Failed attempts · 24 h</span>
          <strong>{totals.failed24h}</strong>
        </div>
      </div>
      <div className="tabs">
        {[
          ["all", "All"],
          ["login", "Successful logins"],
          ["failed", "Failed attempts"],
          ["logout", "Logouts"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <input
        className="history-search"
        placeholder="Search by name, email/phone or IP…"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {loading ? (
        <p>Loading…</p>
      ) : shown.length ? (
        <DataTable>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Role</th>
              <th>Result</th>
              <th>IP address</th>
              <th>Browser</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
              <tr key={entry.id} className="no-click">
                <td>{formatDate(entry.at, true)}</td>
                <td>
                  <strong>{entry.name ?? "Unknown account"}</strong>
                  <span>{entry.login || "—"}</span>
                </td>
                <td>{roleName(entry.role)}</td>
                <td>
                  <span className={`login-event ${entry.event}`}>
                    {entry.event === "login"
                      ? "✓ Logged in"
                      : entry.event === "logout"
                        ? "Logged out"
                        : "✕ Failed"}
                  </span>
                  {entry.event !== "login" && entry.event !== "logout" && (
                    <span>{entry.reason}</span>
                  )}
                </td>
                <td>{entry.ip || "—"}</td>
                <td>{browser(entry.device)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      ) : (
        <EmptyState
          title="No login events yet"
          text="Events appear here as soon as someone logs in, fails a login or logs out."
        />
      )}
    </div>
  )
}

function AdminOnly() {
  return (
    <div className="portal-content">
      <EmptyState
        title="Only the admin can open this page"
        text="Moderators can review reports and reviews. Ask the admin if you need this changed."
        action={
          <Link to="/admin/reports" className="button dark">
            Go to Reports
          </Link>
        }
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="page confirmation-page">
      <div className="confirmation-mark future">
        <Icon name="search" size={30} />
      </div>
      <h1>Screen not found</h1>
      <p>The page or record you requested is not available.</p>
      <Link to="/" className="button dark">
        Return to Homepage
      </Link>
    </div>
  )
}

// Change page without reloading. App listens for "popstate" and re-renders.
function go(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
  const hash = path.split("#")[1]
  if (hash) {
    setTimeout(
      () =>
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }),
      60,
    )
  } else {
    window.scrollTo(0, 0)
  }
}

export default function App() {
  const [store, setStore] = useState<Store>(loadStore)
  const [online, setOnline] = useState(false)
  const [ready, setReady] = useState(false)
  // `route` changes whenever the URL changes, which makes React redraw the page
  const [route, setRoute] = useState(
    `${window.location.pathname}${window.location.search}${window.location.hash}`,
  )
  const [guardMessage, setGuardMessage] = useState("")

  // FIX: listen for page changes (links + browser back/forward buttons)
  useEffect(() => {
    const onRouteChange = () =>
      setRoute(
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      )
    window.addEventListener("popstate", onRouteChange)
    return () => window.removeEventListener("popstate", onRouteChange)
  }, [])

  // Load everything from MySQL; if XAMPP is off, fall back to demo data
  const refresh = async () => {
    const data = await api.loadAll()
    setStore((current) => storeFromServer(data, current))
  }
  useEffect(() => {
    api
      .loadAll()
      .then((data) => {
        setStore((current) => storeFromServer(data, current))
        setOnline(true)
      })
      .catch((error) => {
        console.warn("Database not reachable, using demo data:", error)
        setOnline(false)
      })
      .finally(() => setReady(true))
  }, [])

  // Save in the browser: settings only when the database is connected,
  // the whole demo store when it is not
  useEffect(() => {
    if (!ready) return
    try {
      if (online) {
        const settings: Settings = {
          savedAreas: store.savedAreas,
          routingConfig: store.routingConfig,
          showOrgNamePublicly: store.showOrgNamePublicly,
          weeklyDigest: store.weeklyDigest,
        }
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
      } else {
        localStorage.setItem(STORE_KEY, JSON.stringify(store))
      }
    } catch {
      // storage full or blocked - the app still works
    }
  }, [store, online, ready])

  const updateStore = (updater: (current: Store) => Store) =>
    setStore((current) => updater(current))
  const navigate = (path: string) => go(path)
  const logout = async () => {
    if (online) {
      try {
        await api.logout()
      } catch {
        // ignore - we clear the session below anyway
      }
    }
    updateStore((current) => {
      const user = current.users.find((item) => item.id === current.session?.userId)
      return {
        ...current,
        session: null,
        loginHistory:
          !online && user
            ? [
                localLoginEvent(user, user.login, "logout", "Logged out"),
                ...(current.loginHistory ?? []),
              ]
            : current.loginHistory,
      }
    })
    navigate("/")
  }
  const path = window.location.pathname

  // Role-based access: admin and organization pages need the right login
  useEffect(() => {
    if (!ready) return
    if (
      path.startsWith("/admin") &&
      path !== "/admin/login" &&
      !isStaff(store.session?.role)
    ) {
      setGuardMessage("Please log in to continue")
      navigate("/admin/login")
    } else if (
      path.startsWith("/org") &&
      path !== "/org/login" &&
      store.session?.role !== "org"
    ) {
      setGuardMessage("Please log in to continue")
      navigate("/org/login")
    }
  }, [path, route, ready, store.session?.role])

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="brand-mark">
          <Icon name="shield" size={21} />
        </span>
        <p>Loading AwarenessAlert…</p>
      </div>
    )
  }

  return (
    <BackendContext.Provider value={{ online, refresh }}>
      {renderPage()}
    </BackendContext.Provider>
  )

  function renderPage() {
    if (path === "/login")
      return (
        <AuthPage
          key="login-public"
          kind="public"
          store={store}
          updateStore={updateStore}
          navigate={navigate}
        />
      )
    if (path === "/signup")
      return (
        <SignUp store={store} updateStore={updateStore} navigate={navigate} />
      )
    if (path === "/forgot-password") return <PasswordPage reset={false} />
    if (path === "/reset-password") return <PasswordPage reset />
    if (path === "/admin/login")
      return (
        <AuthPage
          key="login-admin"
          kind="admin"
          store={store}
          updateStore={updateStore}
          navigate={navigate}
          guardMessage={guardMessage}
        />
      )
    if (path === "/org/login")
      return (
        <AuthPage
          key="login-org"
          kind="org"
          store={store}
          updateStore={updateStore}
          navigate={navigate}
          guardMessage={guardMessage}
        />
      )
    if (path.startsWith("/admin") && isStaff(store.session?.role)) {
      const isAdmin = store.session?.role === "admin"
      const adminOnly =
        path.startsWith("/admin/vendors") ||
        path === "/admin/routing" ||
        path === "/admin/team" ||
        path === "/admin/logins"
      let content: ReactNode = <AdminOverview store={store} />
      if (adminOnly && !isAdmin) content = <AdminOnly />
      else if (path === "/admin/team")
        content = <TeamPage store={store} updateStore={updateStore} />
      else if (path === "/admin/logins")
        content = <LoginHistoryPage store={store} />
      else if (path === "/admin/account")
        content = <AccountPage store={store} updateStore={updateStore} />
      else
      if (path === "/admin/reports") content = <AdminReports store={store} />
      else if (/^\/admin\/reports\/[^/]+$/.test(path))
        content = (
          <AdminReportDetail
            key={path}
            store={store}
            updateStore={updateStore}
            id={decodeURIComponent(path.split("/")[3])}
          />
        )
      else if (path === "/admin/vendors")
        content = <AdminVendors store={store} />
      else if (/^\/admin\/vendors\/[^/]+$/.test(path))
        content = (
          <VendorEdit
            key={path}
            store={store}
            updateStore={updateStore}
            id={path.split("/")[3]}
          />
        )
      else if (path === "/admin/reviews")
        content = <AdminReviews store={store} updateStore={updateStore} />
      else if (path === "/admin/routing")
        content = <RoutingRules store={store} updateStore={updateStore} />
      return (
        <AdminShell store={store} logout={logout}>
          {content}
        </AdminShell>
      )
    }
    if (path.startsWith("/org") && store.session?.role === "org") {
      const content = /^\/org\/reports\/[^/]+$/.test(path) ? (
        <OrgReportDetail
          key={path}
          store={store}
          updateStore={updateStore}
          id={decodeURIComponent(path.split("/")[3])}
        />
      ) : (
        <OrgDashboard store={store} />
      )
      return (
        <OrgShell store={store} logout={logout}>
          {content}
        </OrgShell>
      )
    }
    return (
      <PublicShell store={store} logout={logout}>
        {publicPage()}
      </PublicShell>
    )
  }

  function publicPage() {
    if (path === "/") return <Home key={route} store={store} />
    if (path === "/reports") return <ReportsPage store={store} />
    if (/^\/reports\/[^/]+$/.test(path))
      return (
        <ReportDetail
          store={store}
          id={decodeURIComponent(path.split("/")[2])}
        />
      )
    if (path === "/report")
      return (
        <ReportForm
          key={route}
          store={store}
          updateStore={updateStore}
          navigate={navigate}
        />
      )
    if (path === "/report/done") return <ReportDone />
    if (/^\/vendor\/[^/]+\/review$/.test(path))
      return (
        <WriteReview
          key={path}
          store={store}
          updateStore={updateStore}
          vendorId={path.split("/")[2]}
          navigate={navigate}
        />
      )
    if (/^\/vendor\/[^/]+$/.test(path))
      return <VendorProfile store={store} id={path.split("/")[2]} />
    if (path === "/saved-areas")
      return <SavedAreas store={store} updateStore={updateStore} />
    if (path === "/profile")
      return (
        <ProfilePages
          store={store}
          updateStore={updateStore}
          kind="profile"
          logout={logout}
        />
      )
    if (path === "/my-reports")
      return (
        <ProfilePages
          store={store}
          updateStore={updateStore}
          kind="my-reports"
          logout={logout}
        />
      )
    if (path === "/notifications")
      return (
        <ProfilePages
          store={store}
          updateStore={updateStore}
          kind="notifications"
          logout={logout}
        />
      )
    if (path === "/vendor-portal") return <VendorPortal />
    return <NotFound />
  }
}
