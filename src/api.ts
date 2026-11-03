// Talks to the PHP API in the "awarenessalert-api" folder.
// - Development (npm run dev on port 8443): the website and XAMPP's Apache (port 80) are separate,
//   so the API is http://<same host name>/awarenessalert-api (same host name keeps the login cookie).
// - Online (deployed build on a normal port): the API is on the SAME website,
//   e.g. https://awarenessalert.example.com/awarenessalert-api
const { protocol, hostname } = window.location
const port = window.location.port ?? ""
const onDevServer = port !== "" && port !== "80" && port !== "443"
export const API_BASE =
  onDevServer || !protocol
    ? `http://${hostname}/awarenessalert-api`
    : `${protocol}//${hostname}/awarenessalert-api`

async function request<T = any>(file: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}/${file}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  let data: any = null
  try {
    data = await response.json()
  } catch {
    throw new Error("The server sent an invalid response. Check XAMPP (Apache + MySQL).")
  }
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error ?? "Request failed")
  }
  return data as T
}

// Everything the website needs, in one call
export const loadAll = () => request("data.php")

// Old helpers (still work)
export const getReports = () => request("reports.php")
export const getVendors = () => request("vendors.php")

// Login / accounts
export const login = (login: string, password: string, kind: string) =>
  request("auth.php", { action: "login", login, password, kind })
export const register = (name: string, login: string, password: string) =>
  request("auth.php", { action: "register", name, login, password })
export const logout = () => request("auth.php", { action: "logout" })

// Reports
export const createReport = (report: {
  vendorId: string
  category: string
  description: string
  anonymous: boolean
  evidenceImage?: string
  deviceId: string
}) => request<{ success: boolean; id: string }>("reports.php", report)

export const setReportStatus = (id: string, status: string, label: string, routedTo?: string) =>
  request("report_action.php", { id, action: "status", status, label, routedTo })

export const setReportOutcome = (
  id: string,
  outcome: string,
  publicComment: string,
  internalNote: string,
) => request("report_action.php", { id, action: "outcome", outcome, publicComment, internalNote })

// Reviews
export const createReview = (vendorId: string, rating: number, text: string) =>
  request("reviews.php", { action: "create", vendorId, rating, text })
export const toggleReview = (id: string) => request("reviews.php", { action: "toggle", id })
export const flagReview = (id: string) => request("reviews.php", { action: "flag", id })

// Vendors (admin)
export const updateVendor = (
  id: string,
  changes: { badges?: string[]; approval?: Record<string, string> },
) => request("vendors.php", { id, ...changes })

// Staff accounts (Team page)
export type StaffUser = {
  id: string
  name: string
  login: string
  role: "admin" | "moderator" | "org"
  organization: string | null
  title: string | null
  active: boolean
  createdAt: string
  lastLogin?: string
}
export const listStaff = () => request<{ users: StaffUser[] }>("users.php")
export const createStaff = (staff: {
  name: string
  login: string
  password: string
  role: "moderator" | "org"
  organization?: string
}) => request<{ users: StaffUser[] }>("users.php", { action: "create", ...staff })
export const toggleStaff = (id: string) =>
  request<{ users: StaffUser[] }>("users.php", { action: "toggle", id })
export const resetStaffPassword = (id: string, password: string) =>
  request<{ users: StaffUser[] }>("users.php", { action: "reset_password", id, password })
export const changeMyPassword = (current: string, password: string) =>
  request("users.php", { action: "change_password", current, password })

// Login history (admin)
export type LoginEvent = {
  id: string
  userId: string | null
  login: string
  name: string | null
  role: string | null
  event: "login" | "failed" | "logout"
  reason: string
  ip: string
  device: string
  at: string
}
export const loginHistory = (filter: string) =>
  request<{
    events: LoginEvent[]
    summary: { logins24h: number; failed24h: number; people24h: number }
  }>(`login_history.php?filter=${encodeURIComponent(filter)}`)
export const validateStaffInput = (name: string, login: string, password: string): string | null => {
  if (!name.trim() || !login.trim()) return "Name and email/phone are required."
  if (password.length < 8) return "The password must be at least 8 characters."
  return null
}

// Vendor portal
export type VendorClaimInput = {
  vendorId: string
  businessRole: string
  phone: string
  tradeLicense: string
  message: string
}
export const registerVendor = (
  account: { name: string; login: string; password: string } & VendorClaimInput,
) => request("vendor_portal.php", { action: "register", ...account })
export const claimShop = (claim: VendorClaimInput) =>
  request("vendor_portal.php", { action: "claim", ...claim })
export const vendorReply = (reportId: string, text: string) =>
  request("vendor_portal.php", { action: "reply", reportId, text })
export const vendorDispute = (reportId: string, reason: string) =>
  request("vendor_portal.php", { action: "dispute", reportId, reason })
export const updateShopInfo = (info: { phone: string; openingHours: string; description: string }) =>
  request("vendor_portal.php", { action: "update_info", ...info })
export const decideClaim = (claimId: string, decision: "Approved" | "Rejected", note: string) =>
  request("vendor_portal.php", { action: "decide_claim", claimId, decision, note })
export const decideDispute = (responseId: string, decision: "Accepted" | "Rejected", note: string) =>
  request("vendor_portal.php", { action: "decide_dispute", responseId, decision, note })
