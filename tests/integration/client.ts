// Small HTTP client for the PHP API that keeps the PHP session cookie (like a browser).
export const API = process.env.API_URL ?? "http://127.0.0.1:8090"

export class Client {
  cookie = ""
  async call(file: string, body?: unknown) {
    const res = await fetch(`${API}/${file}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(this.cookie ? { Cookie: this.cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const setCookie = res.headers.get("set-cookie")
    if (setCookie) this.cookie = setCookie.split(";")[0]
    const text = await res.text()
    let json: any = null
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    return { status: res.status, body: json }
  }
  login(login: string, password: string, kind: string) {
    return this.call("auth.php", { action: "login", login, password, kind })
  }
}

export const ACCOUNTS = {
  admin: ["admin@awarenessalert.test", "Admin#1234", "admin"],
  moderator: ["moderator@awarenessalert.test", "Mod#12345", "admin"],
  bsti: ["bsti@awarenessalert.test", "Org#1234", "org"],
  dncrp: ["dncrp@awarenessalert.test", "Org#1234", "org"],
  rafi: ["rafi@example.test", "User#1234", "public"],
} as const

export async function as(who: keyof typeof ACCOUNTS) {
  const c = new Client()
  const [login, password, kind] = ACCOUNTS[who]
  const r = await c.login(login, password, kind)
  if (r.status !== 200) throw new Error(`login as ${who} failed: ${JSON.stringify(r.body)}`)
  return c
}

// Wipes the TEST database and reloads the demo data (setup.php?reset=1).
export async function resetDatabase() {
  const res = await fetch(`${API}/setup.php?reset=1`)
  const html = await res.text()
  if (!html.includes("Setup complete")) throw new Error("Test database reset failed")
}

// 1x1 transparent PNG
export const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
