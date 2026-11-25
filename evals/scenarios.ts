import cases from "./cases.json"

export type Expectation = {
  toolsInclude?: string[]
  toolsExclude?: string[]
  replyMatches?: string[]
  replyNotMatches?: string[]
  handoffKind?: string
  noHandoff?: boolean
  priority?: string
}

export type Scenario = {
  id: string
  title: string
  turns: Array<{ user: string; expect: Expectation }>
}

export const scenarios = cases as Scenario[]
