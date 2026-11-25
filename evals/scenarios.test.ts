import { describe, expect, it } from "vitest"
import { runScenario } from "./engine"
import { scenarios } from "./scenarios"

describe("resident desk evals", () => {
  for (const scenario of scenarios) {
    it(scenario.title, () => {
      const report = runScenario(scenario)
      expect(report.failures, report.failures.join("\n")).toEqual([])
    })
  }
})
