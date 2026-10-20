// Accessibility: axe-core (WCAG 2.2 A/AA rules) must find ZERO critical issues on key screens.
import AxeBuilder from "@axe-core/playwright"
import { expect, test } from "@playwright/test"
import { writeFileSync, mkdirSync } from "node:fs"

const pages = ["/", "/report", "/reports", "/admin/login"]

for (const path of pages) {
  test(`A11Y ${path} has no critical accessibility violations`, async ({ page }, info) => {
    await page.goto(path)
    await page.waitForLoadState("networkidle")
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()
    const count = (impact: string) => results.violations.filter((v) => v.impact === impact).length
    const summary = {
      page: path,
      project: info.project.name,
      critical: count("critical"),
      serious: count("serious"),
      moderate: count("moderate"),
      minor: count("minor"),
      rules: results.violations.map((v) => `${v.impact}: ${v.id} (${v.nodes.length})`),
    }
    mkdirSync("docs/testing/evidence/axe", { recursive: true })
    writeFileSync(`docs/testing/evidence/axe/${info.project.name}${path.replace(/\//g, "_") || "_home"}.json`, JSON.stringify(summary, null, 2))
    expect(summary.critical, summary.rules.join("\n")).toBe(0)
  })
}
