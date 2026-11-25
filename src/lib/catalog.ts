import type { BuildingId, Tenant } from "@/lib/types"

export const EMERGENCY_PHONE = "(555) 019-2400"
export const DESK_PHONE = "(555) 019-2401"
export const DESK_EMAIL = "desk@keystone-residences.example"
export const TIME_ZONE = "America/Chicago"
export const CITY = "Cedarhaven"

export const TECHNICIANS = ["Luis Ortega", "Amina Rahman", "Chris Nguyen"] as const

export type Building = {
  id: BuildingId
  name: string
  short: string
  address: string
  units: number
  kind: string
  blurb: string
  waterValve: string
}

export const BUILDINGS: Building[] = [
  {
    id: "alden",
    name: "The Alden",
    short: "Alden",
    address: "410 Cedar Street, Cedarhaven",
    units: 210,
    kind: "18-story mid-rise",
    blurb: "Concierge lobby, garage, and a rooftop lounge. Cats only.",
    waterValve: "the utility closet at the end of the floor hall, labeled WATER",
  },
  {
    id: "birch",
    name: "Birch Court",
    short: "Birch",
    address: "88 Birch Court, Cedarhaven",
    units: 84,
    kind: "garden apartments",
    blurb: "Three-story walk-ups around a courtyard. Dogs under 40 pounds are housed.",
    waterValve: "the mechanical closet under the stair in the building, labeled WATER",
  },
  {
    id: "harbor",
    name: "Harbor Lofts",
    short: "Harbor",
    address: "15 Wharf Lane, Cedarhaven",
    units: 62,
    kind: "converted warehouse",
    blurb: "Lofts with a freight elevator and a bike room. Pets are not housed.",
    waterValve: "the basement meter room off the lobby, labeled WATER",
  },
]

export function buildingById(id: BuildingId): Building {
  const found = BUILDINGS.find((building) => building.id === id)
  if (!found) throw new Error(`Unknown building ${id}`)
  return found
}

export const TENANTS: Tenant[] = [
  {
    id: "ten_chen",
    firstName: "Maya",
    lastName: "Chen",
    unit: "4B",
    buildingId: "alden",
    email: "maya.chen@example.com",
    phone: "(555) 014-2208",
    leaseStart: "2026-03-01",
    leaseEnd: "2027-02-28",
    monthlyRentCents: 248000,
    balanceCents: 0,
    lateFeeCents: 0,
    pets: [],
    parking: "Garage stall A-42, included with the lease",
  },
  {
    id: "ten_okonkwo",
    firstName: "James",
    lastName: "Okonkwo",
    unit: "12",
    buildingId: "birch",
    email: "james.okonkwo@example.com",
    phone: "(555) 014-7741",
    leaseStart: "2026-07-01",
    leaseEnd: "2027-06-30",
    monthlyRentCents: 185000,
    balanceCents: 185000,
    lateFeeCents: 7500,
    pets: [{ type: "dog", name: "Pepper", weightLb: 32 }],
    parking: "Surface space 12",
  },
  {
    id: "ten_shah",
    firstName: "Priya",
    lastName: "Shah",
    unit: "308",
    buildingId: "harbor",
    email: "priya.shah@example.com",
    phone: "(555) 014-6630",
    leaseStart: "2026-02-01",
    leaseEnd: "2027-01-31",
    monthlyRentCents: 219500,
    balanceCents: 0,
    lateFeeCents: 0,
    pets: [],
    parking: "No assigned stall. Bike room fob is on the lease.",
  },
]

export function findTenant(unit: string, lastName: string): Tenant | null {
  const unitKey = unit.trim().toLowerCase()
  const nameKey = lastName.trim().toLowerCase()
  return (
    TENANTS.find(
      (tenant) => tenant.unit.toLowerCase() === unitKey && tenant.lastName.toLowerCase() === nameKey,
    ) ?? null
  )
}

export function tenantById(id: string): Tenant | null {
  return TENANTS.find((tenant) => tenant.id === id) ?? null
}

export type Amenity = {
  id: string
  buildingId: BuildingId
  name: string
  bookable: boolean
  open: string
  close: string
  note: string
}

export const AMENITIES: Amenity[] = [
  {
    id: "rooftop-lounge",
    buildingId: "alden",
    name: "rooftop lounge",
    bookable: true,
    open: "10:00",
    close: "20:00",
    note: "No amplified music. Capacity 20.",
  },
  {
    id: "party-room",
    buildingId: "alden",
    name: "party room",
    bookable: true,
    open: "10:00",
    close: "20:00",
    note: "Off the lobby. Capacity 30.",
  },
  {
    id: "gym",
    buildingId: "alden",
    name: "gym",
    bookable: false,
    open: "05:00",
    close: "22:00",
    note: "First come, first served. It is not reserved.",
  },
  {
    id: "courtyard-grill",
    buildingId: "birch",
    name: "courtyard grill",
    bookable: true,
    open: "11:00",
    close: "21:00",
    note: "Two grills. Extinguish coals before you leave.",
  },
  {
    id: "clubhouse",
    buildingId: "birch",
    name: "clubhouse",
    bookable: true,
    open: "10:00",
    close: "21:00",
    note: "Capacity 25. No amplified music after 9:00 p.m.",
  },
  {
    id: "roof-deck",
    buildingId: "harbor",
    name: "roof deck",
    bookable: true,
    open: "10:00",
    close: "20:00",
    note: "Wind can close the deck. The desk posts a sign in the lobby.",
  },
]

export function amenityById(id: string): Amenity | null {
  return AMENITIES.find((amenity) => amenity.id === id) ?? null
}
