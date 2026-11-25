import fs from "fs"
import path from "path"
import type { Conversation, Store, Ticket } from "@/lib/types"

const caches = new Map<string, Store>()

export function defaultDataDir(): string {
  return process.env.KEYSTONE_DATA_DIR || path.join(process.cwd(), "data")
}

function storePath(dir: string): string {
  return path.join(dir, "store.json")
}

export function seedStore(): Store {
  const tickets: Ticket[] = [
    {
      id: "KR-1038",
      tenantId: "ten_chen",
      category: "general",
      priority: "low",
      status: "done",
      description: "Closet door in the bedroom rubs the frame.",
      entryPermission: "Permission granted to enter if the resident is out.",
      assignee: "Amina Rahman",
      etaLabel: "Within 5 business days.",
      rationale: "Cosmetic work is batched within five business days.",
      photo: null,
      createdAt: "2026-11-12T15:00:00.000Z",
      updatedAt: "2026-11-18T18:30:00.000Z",
    },
    {
      id: "KR-1040",
      tenantId: "ten_okonkwo",
      category: "general",
      priority: "low",
      status: "open",
      description: "Hallway scuff outside unit 12 needs paint.",
      entryPermission: "Call first, and enter if there is no answer.",
      assignee: null,
      etaLabel: "Within 5 business days.",
      rationale: "Cosmetic work is batched within five business days.",
      photo: null,
      createdAt: "2026-11-22T16:10:00.000Z",
      updatedAt: "2026-11-22T16:10:00.000Z",
    },
    {
      id: "KR-1041",
      tenantId: "ten_shah",
      category: "appliance",
      priority: "normal",
      status: "assigned",
      description: "Dishwasher stops mid-cycle and shows an E4 code.",
      entryPermission: "Permission granted to enter if the resident is out.",
      assignee: "Luis Ortega",
      etaLabel: "Next business day.",
      rationale: "This can go on the next business-day route.",
      photo: null,
      createdAt: "2026-11-24T14:20:00.000Z",
      updatedAt: "2026-11-24T19:05:00.000Z",
    },
  ]

  const conversation: Conversation = {
    id: "convo_seed_closet",
    createdAt: "2026-11-12T14:40:00.000Z",
    updatedAt: "2026-11-18T18:32:00.000Z",
    tenantId: "ten_chen",
    lastTicketId: "KR-1038",
    pending: null,
    handoffIds: [],
    messages: [
      {
        id: "msg_seed_1",
        role: "user",
        content: "I'm in unit 4B, last name Chen. The closet door rubs the frame.",
        createdAt: "2026-11-12T14:40:00.000Z",
      },
      {
        id: "msg_seed_2",
        role: "assistant",
        content:
          "You're verified as Maya Chen, The Alden, unit 4B. I opened KR-1038 for the closet door. Priority is low, so it is batched within 5 business days.",
        createdAt: "2026-11-12T14:40:05.000Z",
        toolCalls: [
          {
            name: "verify_tenant",
            input: { unit: "4B", last_name: "Chen" },
            output: { ok: true, tenantId: "ten_chen" },
          },
          {
            name: "create_maintenance_ticket",
            input: { description: "The closet door rubs the frame." },
            output: { ok: true, id: "KR-1038", priority: "low", status: "done" },
          },
        ],
      },
    ],
  }

  return {
    seq: { ticket: 1042, handoff: 501, booking: 2201, inspection: 3301, complaint: 4401 },
    tickets,
    handoffs: [
      {
        id: "HO-500",
        conversationId: "convo_seed_lobby",
        tenantId: null,
        kind: "gas",
        summary: "Lobby desk at Harbor Lofts reported a gas odor near the basement stair. No unit confirmed.",
        status: "acknowledged",
        unit: null,
        buildingId: "harbor",
        photo: null,
        createdAt: "2026-11-20T02:15:00.000Z",
        acknowledgedAt: "2026-11-20T02:18:00.000Z",
      },
    ],
    bookings: [],
    inspections: [],
    complaints: [],
    conversations: [conversation],
  }
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true })
}

export function loadStore(dir = defaultDataDir()): Store {
  const cached = caches.get(dir)
  if (cached) return cached
  ensureDir(dir)
  const file = storePath(dir)
  let store: Store
  if (!fs.existsSync(file)) {
    store = seedStore()
    fs.writeFileSync(file, JSON.stringify(store, null, 2))
  } else {
    store = JSON.parse(fs.readFileSync(file, "utf8")) as Store
  }
  caches.set(dir, store)
  return store
}

export function saveStore(dir: string, store: Store) {
  ensureDir(dir)
  caches.set(dir, store)
  const file = storePath(dir)
  const temporary = `${file}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(store, null, 2))
  fs.renameSync(temporary, file)
}

export function withStore<T>(dir: string, fn: (store: Store) => T): T {
  const store = loadStore(dir)
  const result = fn(store)
  if (result instanceof Promise) {
    return result.finally(() => {
      saveStore(dir, store)
    }) as T
  }
  saveStore(dir, store)
  return result
}

export function resetStore(dir = defaultDataDir()) {
  const fresh = seedStore()
  saveStore(dir, fresh)
  return fresh
}

export function clearStoreCache() {
  caches.clear()
}
