import type { ProfilePlayer, Scale } from "./profile"
import { isJsonRecord } from "../utils"
import { mapValues } from 'remeda'

export type DatabaseEntryAxis = "x" | "y" | "z"

export interface DatabaseData {
  entries: Record<string, DatabaseEntry>,
  owners: Record<string, DatabaseOwner>,
}

export interface DatabaseOwner {
  hasName: boolean
  hasSize: boolean
}

export const databaseOwnerFromUnknown = (value: unknown): DatabaseOwner => {
  if (! isJsonRecord(value)) return { hasName: false, hasSize: false }

  return {
    hasName: value.hasName === true,
    hasSize: value.hasSize === true
  }
}

export const databaseOwnersFromUnknown = (value: unknown): Record<string, DatabaseOwner> => {
  if (! isJsonRecord(value)) return {}
  return mapValues(value, databaseOwnerFromUnknown)
}

export default class DatabaseEntry {
  private name: string
  private sizeX: number
  private sizeY: number
  private sizeZ: number

  constructor(name: string | null = null, sizeX: number | null = null, sizeY: number | null = null, sizeZ: number | null = null) {
    this.name = name ?? ""
    this.sizeX = DatabaseEntry.readSize(sizeX)
    this.sizeY = DatabaseEntry.readSize(sizeY)
    this.sizeZ = DatabaseEntry.readSize(sizeZ)
  }

  static fromUnknown(value: unknown) {
    if (value instanceof DatabaseEntry) return value
    if (! isJsonRecord(value)) return new DatabaseEntry()

    return new DatabaseEntry(
      DatabaseEntry.readName(value.name),
      DatabaseEntry.readSize(value.sizeX),
      DatabaseEntry.readSize(value.sizeY),
      DatabaseEntry.readSize(value.sizeZ)
    )
  }

  static entriesFromUnknown(value: unknown): Record<string, DatabaseEntry> {
    if (! isJsonRecord(value)) return {}
    return mapValues(value, DatabaseEntry.fromUnknown)
  }

  private static readName(value: unknown) {
    return typeof value === "string" ? value : ""
  }

  private static readSize(value: unknown) {
    if (typeof value !== "number") return 1
    return Number.isFinite(value) ? value : 1
  }

  getName() {
    return this.name
  }

  getSizeX() {
    return this.sizeX
  }

  getSizeY() {
    return this.sizeY
  }

  getSizeZ() {
    return this.sizeZ
  }

  getSize(axis: DatabaseEntryAxis) {
    if (axis === "x") return this.sizeX
    if (axis === "y") return this.sizeY
    return this.sizeZ
  }

  setName(customName: string) {
    this.name = customName
    return this
  }

  setSizeX(sizeX: number) {
    this.sizeX = DatabaseEntry.readSize(sizeX)
    return this
  }

  setSizeY(sizeY: number) {
    this.sizeY = DatabaseEntry.readSize(sizeY)
    return this
  }

  setSizeZ(sizeZ: number) {
    this.sizeZ = DatabaseEntry.readSize(sizeZ)
    return this
  }

  setSize(axis: DatabaseEntryAxis, size: number) {
    if (axis === "x") return this.setSizeX(size)
    if (axis === "y") return this.setSizeY(size)
    return this.setSizeZ(size)
  }

  hasCustomScale() {
    return this.sizeX !== 1 || this.sizeY !== 1 || this.sizeZ !== 1
  }

  hasCustomName() {
    return Boolean(this.name.trim())
  }

  toScale(): Scale {
    return {
      x: this.sizeX,
      y: this.sizeY,
      z: this.sizeZ
    }
  }

  toProfilePlayer(player: ProfilePlayer): ProfilePlayer {
    return {
      ...player,
      displayName: this.getName().trim() || null,
      scale: this.toScale()
    }
  }

  toJSON() {
    return {
      name: this.name,
      sizeX: this.sizeX,
      sizeY: this.sizeY,
      sizeZ: this.sizeZ
    }
  }

  copy() {
    return new DatabaseEntry(this.name, this.sizeX, this.sizeY, this.sizeZ)
  }
}
