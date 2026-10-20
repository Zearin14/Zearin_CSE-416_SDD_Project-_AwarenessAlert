import { defineConfig, mergeConfig } from "vitest/config"
import base from "./vitest.config"

// Unit tests only (used by Stryker mutation testing).
export default mergeConfig(base, defineConfig({ test: { include: ["tests/unit/**/*.test.ts"] } }))
