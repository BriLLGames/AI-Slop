// Progress + settings persistence. Uses localStorage when available, otherwise
// falls back to in-memory storage (progress then lives only until the tab closes).

import { TUNING } from './config'

export interface Upgrades {
  jaw: boolean
  lungs: boolean
  glasses: boolean
  nft: boolean
}

export interface RunState {
  level: number
  checkpoint: string | null
  hp: number
  maxHp: number
  aura: number
  fragments: number
  totalFragments: number
  collected: string[]
  flags: Record<string, boolean>
  items: Record<string, number>
  upgrades: Upgrades
  deaths: number
  duelsWon: number
  playMs: number
}

export interface Settings {
  volume: number
  music: boolean
}

const SAVE_KEY = 'eov_save_v1'
const SETTINGS_KEY = 'eov_settings_v1'

const memory: Record<string, string> = {}

function storageWorks(): boolean {
  try {
    const k = '__eov_test__'
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

const persistent = storageWorks()

function readRaw(key: string): string | null {
  if (persistent) {
    try {
      return window.localStorage.getItem(key)
    } catch {
      return memory[key] ?? null
    }
  }
  return memory[key] ?? null
}

function writeRaw(key: string, value: string | null): void {
  if (value === null) delete memory[key]
  else memory[key] = value
  if (!persistent) return
  try {
    if (value === null) window.localStorage.removeItem(key)
    else window.localStorage.setItem(key, value)
  } catch {
    /* quota or privacy mode - memory copy is still valid */
  }
}

export function freshRun(): RunState {
  return {
    level: 1,
    checkpoint: null,
    hp: TUNING.baseHp,
    maxHp: TUNING.baseHp,
    aura: 0,
    fragments: 0,
    totalFragments: 0,
    collected: [],
    flags: {},
    items: {},
    upgrades: { jaw: false, lungs: false, glasses: false, nft: false },
    deaths: 0,
    duelsWon: 0,
    playMs: 0,
  }
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T

function isRun(v: unknown): v is RunState {
  return typeof v === 'object' && v !== null && typeof (v as RunState).level === 'number' && Array.isArray((v as RunState).collected)
}

class StoreImpl {
  run: RunState = freshRun()
  /** Snapshot taken at the last checkpoint / level start. Death restores it. */
  snap: RunState | null = null
  settings: Settings = { volume: 0.7, music: true }
  readonly persistent = persistent

  constructor() {
    const s = readRaw(SETTINGS_KEY)
    if (s) {
      try {
        const parsed = JSON.parse(s) as Partial<Settings>
        if (typeof parsed.volume === 'number') this.settings.volume = Math.max(0, Math.min(1, parsed.volume))
        if (typeof parsed.music === 'boolean') this.settings.music = parsed.music
      } catch {
        /* ignore broken settings */
      }
    }
    const raw = readRaw(SAVE_KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        if (isRun(parsed)) this.snap = { ...freshRun(), ...parsed, upgrades: { ...freshRun().upgrades, ...parsed.upgrades } }
      } catch {
        this.snap = null
      }
    }
  }

  hasSave(): boolean {
    return this.snap !== null
  }

  newGame(): void {
    this.run = freshRun()
    this.checkpoint(null)
  }

  continueGame(): void {
    if (this.snap) this.run = clone(this.snap)
    else this.newGame()
  }

  /** Record checkpoint (null = level start) and persist. */
  checkpoint(id: string | null): void {
    this.run.checkpoint = id
    this.snap = clone(this.run)
    writeRaw(SAVE_KEY, JSON.stringify(this.snap))
  }

  /** Restore state from the last checkpoint after death. */
  restoreAfterDeath(): void {
    const deaths = this.run.deaths
    const playMs = this.run.playMs
    if (this.snap) this.run = clone(this.snap)
    this.run.deaths = deaths
    this.run.playMs = playMs
    this.run.hp = this.run.maxHp
    if (this.snap) {
      this.snap.deaths = deaths
      writeRaw(SAVE_KEY, JSON.stringify(this.snap))
    }
  }

  /** Flag that survives death (written to both live state and snapshot). */
  persistFlag(name: string): void {
    this.run.flags[name] = true
    if (this.snap) {
      this.snap.flags[name] = true
      writeRaw(SAVE_KEY, JSON.stringify(this.snap))
    }
  }

  nextLevel(): void {
    this.run.level += 1
    this.run.hp = this.run.maxHp
    this.checkpoint(null)
  }

  clearSave(): void {
    this.snap = null
    writeRaw(SAVE_KEY, null)
  }

  saveSettings(): void {
    writeRaw(SETTINGS_KEY, JSON.stringify(this.settings))
  }
}

export const Store = new StoreImpl()
