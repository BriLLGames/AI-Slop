// Turns an ASCII level map into tiles, physics bodies and entity spawn lists.
//
// Common map symbols:  #  wall      .  floor     ,  alt floor   P  player start
//                      C  checkpoint *  fragment  h  heart       X  exit portal
//                      %  cracked wall (break it with a dash)    o  decoration (solid)
//                      ~ ^ hazard tiles (two alternating groups when the level cycles them)
// Any other symbol is looked up in the level's legend.

import * as Phaser from 'phaser'
import { TILE } from '../config'
import type { NpcSpec } from '../entities/npc'
import type { EnemyType } from '../entities/enemies'
import type { ItemType, LevelDef } from '../levels/types'

export interface Interactable {
  x: number
  y: number
  label: string
  id: string
  kind: 'sign' | 'switch'
  read?: string[]
  name?: string
  img: Phaser.GameObjects.Image
}

export interface World {
  cols: number
  rows: number
  grid: string[]
  start: { x: number; y: number }
  walls: Phaser.Physics.Arcade.StaticGroup
  cracked: Phaser.Physics.Arcade.StaticGroup
  gates: Phaser.Physics.Arcade.StaticGroup
  gateMap: Record<string, Phaser.Physics.Arcade.Image[]>
  hazards: { tx: number; ty: number; group: number; img: Phaser.GameObjects.Image }[]
  hazardAt: Map<string, number>
  checkpoints: { id: string; img: Phaser.Physics.Arcade.Image; x: number; y: number }[]
  items: Phaser.Physics.Arcade.Group
  exit: Phaser.Physics.Arcade.Image | null
  npcSpawns: { spec: NpcSpec; x: number; y: number }[]
  enemySpawns: { type: EnemyType; x: number; y: number }[]
  interactables: Interactable[]
  plates: Record<string, { img: Phaser.GameObjects.Image; x: number; y: number; tex: string; on: boolean }>
  marks: Record<string, { x: number; y: number; tx: number; ty: number }>
}

export const tileCenter = (tx: number, ty: number): { x: number; y: number } => ({ x: tx * TILE + TILE / 2, y: ty * TILE + TILE / 2 })

function hash(x: number, y: number): number {
  return Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
}

export function buildWorld(scene: Phaser.Scene, def: LevelDef, levelNo: number, collected: Set<string>): World {
  const i = def.index
  const cols = Math.max(...def.map.map((r) => r.length))
  const rows = def.map.length
  // normalize: pad rows and force a solid border
  const grid = def.map.map((r, y) => {
    let row = r.padEnd(cols, '#')
    if (y === 0 || y === rows - 1) row = '#'.repeat(cols)
    return '#' + row.slice(1, cols - 1) + '#'
  })
  const at = (x: number, y: number): string => (y < 0 || y >= rows || x < 0 || x >= cols ? '#' : (grid[y]?.[x] ?? '#'))

  const w: World = {
    cols, rows, grid,
    start: tileCenter(2, 2),
    walls: scene.physics.add.staticGroup(),
    cracked: scene.physics.add.staticGroup(),
    gates: scene.physics.add.staticGroup(),
    gateMap: {},
    hazards: [],
    hazardAt: new Map(),
    checkpoints: [],
    items: scene.physics.add.group({ allowGravity: false }),
    exit: null,
    npcSpawns: [],
    enemySpawns: [],
    interactables: [],
    plates: {},
    marks: {},
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const ch = at(x, y)
      const { x: cx, y: cy } = tileCenter(x, y)
      const isWall = ch === '#' || ch === '%'
      if (!isWall) {
        const fk = ch === ',' ? `floorAlt_${i}` : (x + y) % 2 ? `floorA_${i}` : `floorB_${i}`
        scene.add.image(cx, cy, fk).setDepth(-1000)
      }
      if (ch === '#') {
        const below = at(x, y + 1)
        const front = below !== '#' && below !== '%'
        const img = w.walls.create(cx, cy, front ? `wallFront_${i}` : `wallTop_${i}`) as Phaser.Physics.Arcade.Image
        img.setDepth(front ? cy + TILE / 2 : cy + TILE / 2 + 1)
        continue
      }
      if (ch === '%') {
        const img = w.cracked.create(cx, cy, `wallCrack_${i}`) as Phaser.Physics.Arcade.Image
        img.setDepth(cy + TILE / 2)
        continue
      }
      const id = `L${levelNo}_${x}_${y}`
      switch (ch) {
        case '.': case ',': break
        case 'P': w.start = { x: cx, y: cy + 10 }; break
        case 'C': {
          const img = scene.physics.add.image(cx, cy + 8, 'ringlight').setOrigin(0.5, 0.85).setDepth(cy + 8)
          ;(img.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).moves = false
          w.checkpoints.push({ id: `${x},${y}`, img, x: cx, y: cy })
          break
        }
        case '*': case 'h':
          addItem(scene, w, cx, cy, ch === '*' ? 'fragment' : 'heart', id, collected)
          break
        case 'X': {
          const img = scene.physics.add.image(cx, cy, 'portal').setDepth(cy + 20)
          ;(img.body as Phaser.Physics.Arcade.Body).setAllowGravity(false).moves = false
          ;(img.body as Phaser.Physics.Arcade.Body).setSize(40, 50)
          scene.tweens.add({ targets: img, scaleX: 1.06, scaleY: 0.96, yoyo: true, repeat: -1, duration: 600 })
          w.exit = img
          break
        }
        case 'o': {
          const key = `deco_${i}${hash(x, y) > 0.5 ? 'a' : 'b'}`
          scene.add.image(cx, cy + 22, key).setOrigin(0.5, 1).setDepth(cy + 14)
          addSolid(scene, w, cx, cy + 6, 34, 30)
          break
        }
        case '~': case '^': {
          const img = scene.add.image(cx, cy, `hazard_${i}`).setDepth(-900)
          w.hazardAt.set(`${x},${y}`, w.hazards.length)
          w.hazards.push({ tx: x, ty: y, group: ch === '~' ? 0 : 1, img })
          break
        }
        default: {
          const spec = def.legend[ch]
          if (!spec) break
          switch (spec.kind) {
            case 'npc': w.npcSpawns.push({ spec, x: cx, y: cy + 12 }); break
            case 'enemy': w.enemySpawns.push({ type: spec.type, x: cx, y: cy + 12 }); break
            case 'item': addItem(scene, w, cx, cy, spec.type, id, collected); break
            case 'prop': {
              const img = scene.add.image(cx, cy + 22, spec.tex).setOrigin(0.5, 1).setDepth(cy + 14)
              if (spec.solid !== false) addSolid(scene, w, cx, cy + 4, spec.big ? 96 : 38, 32)
              if (spec.read) w.interactables.push({ x: cx, y: cy, label: 'F — Читать', id: ch, kind: 'sign', read: spec.read, name: spec.name ?? 'Надпись', img })
              break
            }
            case 'gate': {
              const img = w.gates.create(cx, cy, 'gate') as Phaser.Physics.Arcade.Image
              img.setDepth(cy + TILE / 2)
              ;(w.gateMap[spec.id] ??= []).push(img)
              break
            }
            case 'switch': {
              const img = scene.add.image(cx, cy + 20, spec.tex).setOrigin(0.5, 1).setDepth(cy + 14)
              addSolid(scene, w, cx, cy + 4, 34, 28)
              w.interactables.push({ x: cx, y: cy, label: `F — ${spec.name}`, id: spec.id, kind: 'switch', img })
              break
            }
            case 'plate': {
              const img = scene.add.image(cx, cy, spec.tex).setDepth(-800)
              w.plates[spec.id] = { img, x: cx, y: cy, tex: spec.tex, on: false }
              break
            }
            case 'mark': w.marks[spec.id] = { x: cx, y: cy, tx: x, ty: y }; break
          }
        }
      }
    }
  }
  return w
}

function addSolid(scene: Phaser.Scene, w: World, x: number, y: number, bw: number, bh: number): void {
  const z = scene.add.zone(x, y, bw, bh)
  w.walls.add(z)
}

function addItem(scene: Phaser.Scene, w: World, x: number, y: number, type: ItemType, id: string, collected: Set<string>): void {
  if (collected.has(id)) return
  const tex = type === 'fragment' ? 'fragment' : type === 'heart' ? 'heart' : type
  const img = w.items.create(x, y, tex) as Phaser.Physics.Arcade.Image
  img.setDepth(y + 10)
  img.setData('type', type)
  img.setData('id', id)
  const body = img.body as Phaser.Physics.Arcade.Body
  body.setAllowGravity(false)
  body.moves = false
  scene.tweens.add({ targets: img, y: y - 6, yoyo: true, repeat: -1, duration: 700 + Math.random() * 300, ease: 'Sine.easeInOut' })
}
