// Load test: 20 virtual users hit 3 key API endpoints for 30 seconds each and
// we report the 95th-percentile (p95) response time and error rate.
// Needs the test API running: npm run test:api:start
// Usage: node tests/performance/p95.mjs [seconds=30] [users=20]
import { writeFileSync, mkdirSync } from "node:fs"

const API = process.env.API_URL ?? "http://127.0.0.1:8090"
const SECONDS = Number(process.argv[2] ?? 30)
const USERS = Number(process.argv[3] ?? 20)
const TARGET_MS = 1000 // NFR: key pages respond in under 1 s (p95) for 20 users

const scenarios = [
  { name: "GET data.php (home page data)", run: () => fetch(`${API}/data.php`) },
  { name: "GET vendors.php (safety map)", run: () => fetch(`${API}/vendors.php`) },
  {
    name: "POST reports.php (submit a report)",
    run: () =>
      fetch(`${API}/reports.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: 1, category: "Food", anonymous: true, deviceId: "dev-perf",
          description: "Load test report - expired product seen on shelf",
        }),
      }),
  },
]

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]

const results = []
for (const s of scenarios) {
  const times = []
  let errors = 0
  const end = Date.now() + SECONDS * 1000
  await Promise.all(
    Array.from({ length: USERS }, async () => {
      while (Date.now() < end) {
        const t = performance.now()
        try {
          const res = await s.run()
          await res.text()
          if (!res.ok) errors++
        } catch {
          errors++
        }
        times.push(performance.now() - t)
      }
    }),
  )
  times.sort((a, b) => a - b)
  const row = {
    scenario: s.name,
    users: USERS,
    seconds: SECONDS,
    requests: times.length,
    p50_ms: Math.round(pct(times, 50)),
    p95_ms: Math.round(pct(times, 95)),
    max_ms: Math.round(times[times.length - 1]),
    error_rate: `${((errors / times.length) * 100).toFixed(2)}%`,
    target_ms: TARGET_MS,
    pass: pct(times, 95) < TARGET_MS && errors === 0,
  }
  results.push(row)
  console.log(JSON.stringify(row))
}
mkdirSync("docs/testing/evidence", { recursive: true })
writeFileSync("docs/testing/evidence/performance-p95.json", JSON.stringify(results, null, 2))
if (results.some((r) => !r.pass)) process.exitCode = 1
