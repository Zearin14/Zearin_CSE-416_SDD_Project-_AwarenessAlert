// Talks to the PHP API in C:\xampp\htdocs\awarenessalert-api
// Uses the same host name as the website (localhost / 127.0.0.1) so the login cookie works.
export const API_BASE = `http://${window.location.hostname}/awarenessalert-api`

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
