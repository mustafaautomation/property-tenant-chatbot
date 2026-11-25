import fs from "fs"
import os from "os"
import path from "path"
import { handleTurnWithRules } from "@/lib/policy"
import type { Expectation, Scenario } from "./scenarios"

export const EVAL_NOW = new Date("2026-11-25T16:00:00.000Z")

export type ScenarioReport = {
  id: string
  title: string
  pass: boolean
  failures: string[]
}

function check(expect: Expectation, result: ReturnType<typeof handleTurnWithRules>, turn: number): string[] {
  const failures: string[] = []
  const names = result.toolCalls.map((call) => call.name)
  for (const tool of expect.toolsInclude ?? []) {
    if (!names.includes(tool)) failures.push(`turn ${turn}: missing tool ${tool} (had ${names.join(", ") || "none"})`)
  }
  for (const tool of expect.toolsExclude ?? []) {
    if (names.includes(tool)) failures.push(`turn ${turn}: unexpected tool ${tool}`)
  }
  for (const pattern of expect.replyMatches ?? []) {
    if (!new RegExp(pattern, "i").test(result.reply)) {
      failures.push(`turn ${turn}: reply did not match /${pattern}/`)
    }
  }
  for (const pattern of expect.replyNotMatches ?? []) {
    if (new RegExp(pattern, "i").test(result.reply)) {
      failures.push(`turn ${turn}: reply matched forbidden /${pattern}/`)
    }
  }
  if (expect.handoffKind && result.handoff?.kind !== expect.handoffKind) {
    failures.push(`turn ${turn}: handoff ${result.handoff?.kind ?? "none"} !== ${expect.handoffKind}`)
  }
  if (expect.noHandoff && result.handoff) {
    failures.push(`turn ${turn}: unexpected handoff ${result.handoff.kind}`)
  }
  if (expect.priority) {
    const created = result.toolCalls.find((call) => call.name === "create_maintenance_ticket")
    const priority = created?.output.priority
    if (priority !== expect.priority) {
      failures.push(`turn ${turn}: priority ${String(priority)} !== ${expect.priority}`)
    }
  }
  return failures
}

export function runScenario(scenario: Scenario, dir = fs.mkdtempSync(path.join(os.tmpdir(), "keystone-"))): ScenarioReport {
  let conversationId: string | undefined
  const failures: string[] = []
  scenario.turns.forEach((turn, index) => {
    const result = handleTurnWithRules({
      conversationId,
      message: turn.user,
      now: EVAL_NOW,
      dataDir: dir,
    })
    conversationId = result.conversationId
    failures.push(...check(turn.expect, result, index + 1))
  })
  return { id: scenario.id, title: scenario.title, pass: failures.length === 0, failures }
}
