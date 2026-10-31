import { defineConfig, devices } from "@playwright/test"

// E2E tests run the real React app in "demo mode" (no PHP backend needed),
// so they are fast and do not depend on XAMPP.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"], ["html", { outputFolder: "docs/testing/evidence/e2e-report", open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    // Second browser for compatibility testing (installed in CI)
    ...(process.env.CI ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }] : []),
  ],
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 4173",
    env: { PORT: "4173" },
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
