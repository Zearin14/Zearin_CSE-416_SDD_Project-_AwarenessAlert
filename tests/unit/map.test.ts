// Unit tests for the safety-map layout (vendors placed by real latitude/longitude).
import { describe, expect, it } from "vitest"
import { areaLabels, layoutVendors } from "../../src/logic"
import { vendor } from "./factories"

describe("layoutVendors — map pins", () => {
  it("TC-U50 vendors without coordinates are returned unchanged", () => {
    const list = [vendor({ id: "a", x: 10, y: 20 }), vendor({ id: "b", x: 30, y: 40 })]
    expect(layoutVendors(list)).toBe(list)
  })

  it("TC-U51 west/east and north/south order is kept and pins stay inside the map", () => {
    const out = layoutVendors([
      vendor({ id: "west", lat: 23.79, lng: 90.40 }),
      vendor({ id: "east", lat: 23.79, lng: 90.43 }),
      vendor({ id: "north", lat: 23.81, lng: 90.415 }),
    ])
    const by = Object.fromEntries(out.map((v) => [v.id, v]))
    expect(by.west.x).toBeLessThan(by.east.x)
    expect(by.north.y).toBeLessThan(by.west.y) // north is higher on the screen
    for (const v of out) {
      expect(v.x).toBeGreaterThanOrEqual(4)
      expect(v.x).toBeLessThanOrEqual(92)
      expect(v.y).toBeGreaterThanOrEqual(6)
      expect(v.y).toBeLessThanOrEqual(84)
    }
  })

  it("TC-U52 two vendors at the same spot are pushed apart so both pins are clickable", () => {
    const [a, b] = layoutVendors([
      vendor({ id: "a", lat: 23.79, lng: 90.41 }),
      vendor({ id: "b", lat: 23.79, lng: 90.41 }),
      vendor({ id: "c", lat: 23.80, lng: 90.42 }),
    ])
    const distancePx = Math.hypot((a.x - b.x) * 9, (a.y - b.y) * 6)
    expect(distancePx).toBeGreaterThan(40)
  })

  it("TC-U53 a vendor with no coordinates keeps its own position among geo vendors", () => {
    const out = layoutVendors([
      vendor({ id: "geo1", lat: 23.79, lng: 90.40 }),
      vendor({ id: "geo2", lat: 23.80, lng: 90.43 }),
      vendor({ id: "manual", x: 50, y: 50 }),
    ])
    expect(out.find((v) => v.id === "manual")).toMatchObject({ x: 50, y: 50 })
  })
})

describe("layoutVendors — single location edge case", () => {
  it("TC-U55 one geo vendor (no spread) does not divide by zero", () => {
    const [only] = layoutVendors([vendor({ id: "a", lat: 23.79, lng: 90.41 })])
    expect(Number.isFinite(only.x)).toBe(true)
    expect(Number.isFinite(only.y)).toBe(true)
  })
})

describe("areaLabels — area names on the map", () => {
  it("TC-U54 one label per area, centred under its vendors", () => {
    const labels = areaLabels([
      vendor({ area: "Banani", x: 20, y: 30 }),
      vendor({ area: "Banani", x: 40, y: 50 }),
      vendor({ area: "Gulshan-1", x: 70, y: 88 }),
    ])
    expect(labels).toEqual([
      { area: "Banani", x: 30, y: 59 },
      { area: "Gulshan-1", x: 70, y: 92 }, // 88 + 9 capped at 92
    ])
  })
})
