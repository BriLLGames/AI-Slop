// Level data types. Each level is an ASCII map + legend + small script hooks.

import type { GameScene } from '../scenes/GameScene'
import type { NpcSpec } from '../entities/npc'
import type { EnemyType } from '../entities/enemies'

export type ItemType = 'fragment' | 'heart' | 'rose' | 'fan'

export type Spec =
  | NpcSpec
  | { kind: 'enemy'; type: EnemyType }
  | { kind: 'item'; type: ItemType }
  | { kind: 'prop'; tex: string; solid?: boolean; name?: string; read?: string[]; big?: boolean }
  | { kind: 'gate'; id: string }
  | { kind: 'switch'; id: string; tex: string; name: string }
  | { kind: 'plate'; id: string; tex: string }
  | { kind: 'mark'; id: string }

export interface Zone {
  x: number
  y: number
  w: number
  h: number
  type: 'wind' | 'invert' | 'silence' | 'trigger' | 'laser'
  id?: string
  dx?: number
  dy?: number
  label?: string
  run?: (g: GameScene) => Promise<void> | void
  period?: number
  onTime?: number
  offset?: number
}

export interface LevelDef {
  index: number
  map: string[]
  legend: Record<string, Spec>
  zones?: Zone[]
  hazardCycle?: boolean
  /** Runs once when the level is first entered (not after checkpoint reloads). */
  intro?: (g: GameScene) => Promise<void>
  /** Runs on every (re)load after entities exist: restore state from flags, set objective. */
  setup?: (g: GameScene) => void
  update?: (g: GameScene, dt: number) => void
  onSwitch?: (g: GameScene, id: string) => Promise<void> | void
  onPickup?: (g: GameScene, type: ItemType) => void
  /** Return true if the E press was consumed by level logic. */
  onMog?: (g: GameScene) => boolean
  onPulse?: (g: GameScene) => void
  onHurt?: (g: GameScene) => void
  onExit?: (g: GameScene) => Promise<boolean> | boolean
  /** Extra constant force applied to the player (px/s). */
  push?: (g: GameScene) => { x: number; y: number }
}
