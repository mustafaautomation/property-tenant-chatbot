import fs from "fs"
import path from "path"
import type { BuildingId } from "@/lib/types"

export type Chunk = {
  slug: string
  title: string
  heading: string
  text: string
  buildingId: BuildingId | null
}

export type ScoredChunk = Chunk & { score: number }

const STOP = new Set(
  "a an the of to and or for in on at is are was be it this that with from by as if do does can i my your we our you what when where how who why".split(
    " ",
  ),
)

let cache: Chunk[] | null = null

function buildingFromHeading(heading: string): BuildingId | null {
  if (/alden/i.test(heading)) return "alden"
  if (/birch/i.test(heading)) return "birch"
  if (/harbor/i.test(heading)) return "harbor"
  return null
}

export function knowledgeDir(): string {
  return path.join(process.cwd(), "kb")
}

export function loadChunks(): Chunk[] {
  if (cache) return cache
  const dir = knowledgeDir()
  const files = fs.readdirSync(dir).filter((name) => name.endsWith(".md")).sort()
  const chunks: Chunk[] = []
  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8")
    const slug = file.replace(/\.md$/, "")
    const titleMatch = raw.match(/^#\s+(.+)$/m)
    const title = titleMatch?.[1]?.trim() ?? slug
    const parts = raw.split(/^##\s+/m)
    const preamble = parts[0]?.replace(/^#\s+.+$/m, "").trim()
    if (preamble) {
      chunks.push({ slug, title, heading: title, text: preamble, buildingId: null })
    }
    for (const part of parts.slice(1)) {
      const [headingLine, ...rest] = part.split("\n")
      const heading = headingLine.trim()
      const text = rest.join("\n").trim()
      if (!text) continue
      chunks.push({
        slug,
        title,
        heading,
        text,
        buildingId: buildingFromHeading(heading),
      })
    }
  }
  cache = chunks
  return chunks
}

export function resetKnowledgeCache(): void {
  cache = null
}

function stem(token: string): string {
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1)
  return token
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9$]/g, " ")
    .split(/\s+/)
    .map(stem)
    .filter((token) => token && !STOP.has(token) && token.length > 1)
}

const EMBED_DIMS = 48

function hashEmbed(input: string[]): Float64Array {
  const vector = new Float64Array(EMBED_DIMS)
  for (const token of input) {
    let hash = 2166136261
    for (let index = 0; index < token.length; index += 1) {
      hash = Math.imul(hash ^ token.charCodeAt(index), 16777619)
    }
    vector[Math.abs(hash) % EMBED_DIMS] += hash & 1 ? 1 : -1
  }
  let norm = 0
  for (const value of vector) norm += value * value
  norm = Math.sqrt(norm) || 1
  for (let index = 0; index < vector.length; index += 1) vector[index] /= norm
  return vector
}

function cosine(left: Float64Array, right: Float64Array): number {
  let sum = 0
  for (let index = 0; index < left.length; index += 1) sum += left[index] * right[index]
  return sum
}

/** Below this hybrid score the desk treats the notes as a miss and hands off. */
export const LOW_CONFIDENCE_SCORE = 0.85

export function searchKb(query: string, options?: { buildingId?: BuildingId | null }): ScoredChunk[] {
  const chunks = loadChunks()
  const queryTokens = tokens(query)
  const documentFrequency = new Map<string, number>()
  const chunkTokens = chunks.map((chunk) => {
    const body = tokens(`${chunk.title} ${chunk.heading} ${chunk.text}`)
    const seen = new Set(body)
    for (const token of seen) documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1)
    return body
  })
  const total = chunks.length
  const scored = chunks.map((chunk, index) => {
    const body = chunkTokens[index]
    const titleTokens = tokens(`${chunk.title} ${chunk.heading}`)
    let bm25 = 0
    for (const term of queryTokens) {
      const idf = Math.log(1 + total / ((documentFrequency.get(term) ?? 0) + 1))
      const termFrequency = body.filter((token) => token === term).length
      const titleFrequency = titleTokens.filter((token) => token === term).length
      bm25 += idf * (termFrequency + titleFrequency * 3)
    }
    const similarity = cosine(hashEmbed(queryTokens), hashEmbed(body))
    let score = bm25 === 0 ? 0 : bm25 * (0.85 + 0.15 * Math.max(similarity, 0))
    if (options?.buildingId && chunk.buildingId === options.buildingId) score *= 1.45
    if (options?.buildingId && chunk.buildingId && chunk.buildingId !== options.buildingId) score *= 0.35
    return { ...chunk, score }
  })
  return scored
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
}

export function isLowConfidence(query: string, matches: Array<{ title: string; heading: string; text?: string; excerpt?: string; score: number }>): boolean {
  if (matches.length === 0) return true
  const queryTokens = tokens(query)
  if (queryTokens.length === 0) return true
  const corpus = new Set<string>()
  for (const chunk of loadChunks()) {
    for (const token of tokens(`${chunk.title} ${chunk.heading} ${chunk.text}`)) corpus.add(token)
  }
  const relevant = queryTokens.filter((token) => corpus.has(token))
  if (relevant.length === 0) return true
  const top = matches[0]
  const body = new Set(tokens(`${top.title} ${top.heading} ${top.text ?? ""} ${top.excerpt ?? ""}`))
  const overlap = relevant.filter((token) => body.has(token)).length
  if (overlap === 0) return true
  if (relevant.length === 1 && queryTokens.length >= 3 && top.score < 5) return true
  return false
}
