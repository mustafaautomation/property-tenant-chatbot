import fs from "fs"
import path from "path"
import { runScenario } from "./engine"
import { scenarios } from "./scenarios"

const reports = scenarios.map((scenario) => runScenario(scenario))
const failed = reports.filter((report) => !report.pass)
const lines = [
  "# Keystone resident desk scorecard",
  "",
  `Ran ${reports.length} scenarios. ${reports.length - failed.length} passed, ${failed.length} failed.`,
  "",
  "| Scenario | Result |",
  "| --- | --- |",
  ...reports.map((report) => `| ${report.id} | ${report.pass ? "pass" : "fail"} |`),
  "",
]
if (failed.length) {
  lines.push("## Failures", "")
  for (const report of failed) {
    lines.push(`### ${report.id}`, "")
    for (const failure of report.failures) lines.push(`- ${failure}`)
    lines.push("")
  }
}

const outDir = path.join(process.cwd(), "evals", "out")
fs.mkdirSync(outDir, { recursive: true })
const markdown = lines.join("\n")
fs.writeFileSync(path.join(outDir, "scorecard.md"), markdown)
fs.writeFileSync(path.join(outDir, "scorecard.json"), JSON.stringify(reports, null, 2))
process.stdout.write(`${markdown}\n`)
process.exit(failed.length ? 1 : 0)
