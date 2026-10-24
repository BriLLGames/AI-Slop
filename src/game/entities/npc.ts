// NPCs: idle/bob/dance/patrol behaviors, name tags, speech bubbles ("barks").

import * as Phaser from 'phaser'
import { CSS, FONT, TILE } from '../config'
import type { GameScene } from '../scenes/GameScene'

export type Behavior =
  | { type: 'idle' }
  | { type: 'bob' }
  | { type: 'dance' }
  | { type: 'float' }
  | { type: 'pose' }
  | { type: 'patrol'; path: [number, number][]; speed: number }

export type NpcAction = (g: GameScene, npc: Npc) => Promise<void> | void

export interface NpcSpec {
  kind: 'npc'
  id: string
  tex: string
  name: string
  behavior?: Behavior
  barks?: string[]
  barkEvery?: number
  talk?: NpcAction
  mog?: NpcAction
  flip?: boolean
}

export class Npc {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly spec: NpcSpec
  private scene: Phaser.Scene
  private nameTag: Phaser.GameObjects.Text
  private bubble: Phaser.GameObjects.Text
  private bubbleT = 0
  private barkT: number
  private t = Math.random() * 10
  private frame = 0
  private frameT = 0
  private pathIdx = 0
  private home: { x: number; y: number }
  private scripted = false
  mogEnabled: boolean
  active = true

  constructor(scene: Phaser.Scene, x: number, y: number, spec: NpcSpec) {
    this.scene = scene
    this.spec = { ...spec }
    this.home = { x, y }
    this.mogEnabled = !!spec.mog
    this.sprite = scene.physics.add.sprite(x, y, `${spec.tex}_0`).setScale(0.5).setOrigin(0.5, 0.85)
    this.sprite.setFlipX(!!spec.flip)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(48, 34, false)
    body.setOffset(24, 84)
    body.setImmovable(true)
    body.pushable = false
    this.nameTag = scene.add
      .text(x, y - 66, spec.name, { fontFamily: FONT, fontSize: '12px', color: CSS.white, backgroundColor: 'rgba(18,15,28,0.75)', padding: { x: 5, y: 2 } })
      .setOrigin(0.5)
      .setAlpha(0)
    this.bubble = scene.add
      .text(x, y - 90, '', { fontFamily: FONT, fontSize: '13px', color: '#120f1c', backgroundColor: '#ffffff', padding: { x: 7, y: 4 }, wordWrap: { width: 220 }, align: 'center' })
      .setOrigin(0.5, 1)
      .setVisible(false)
    this.barkT = 1 + Math.random() * 3
  }

  get x(): number { return this.sprite.x }
  get y(): number { return this.sprite.y }

  bark(text: string, ms = 2600): void {
    this.bubble.setText(text).setVisible(true).setScale(0.6)
    this.scene.tweens.add({ targets: this.bubble, scale: 1, duration: 150, ease: 'Back.easeOut' })
    this.bubbleT = ms / 1000
  }

  setTexBase(tex: string): void {
    this.spec.tex = tex
    this.sprite.setTexture(`${tex}_0`)
  }

  /** Tween to a tile position. Disables the AI path while moving. */
  moveTo(tx: number, ty: number, ms = 700): Promise<void> {
    this.scripted = true
    const x = tx * TILE + TILE / 2
    const y = ty * TILE + TILE / 2 + 12
    return new Promise((res) => {
      this.scene.tweens.add({
        targets: this.sprite, x, y, duration: ms, ease: 'Sine.easeInOut',
        onUpdate: () => (this.sprite.body as Phaser.Physics.Arcade.Body).reset(this.sprite.x, this.sprite.y),
        onComplete: () => { this.home = { x, y }; (this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y); res() },
      })
    })
  }

  placeAt(tx: number, ty: number): void {
    const x = tx * TILE + TILE / 2
    const y = ty * TILE + TILE / 2 + 12
    this.home = { x, y }
    this.sprite.setPosition(x, y)
    ;(this.sprite.body as Phaser.Physics.Arcade.Body).reset(x, y)
  }

  remove(): void {
    this.active = false
    this.sprite.disableBody(true, true)
    this.nameTag.setVisible(false)
    this.bubble.setVisible(false)
  }

  update(dt: number, px: number, py: number, frozen: boolean): void {
    if (!this.active) return
    this.t += dt
    const b = this.spec.behavior ?? { type: 'bob' }
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    const dist = Phaser.Math.Distance.Between(px, py, this.x, this.y)
    let moving = false
    if (b.type === 'patrol' && !this.scripted && !frozen) {
      const p = b.path[this.pathIdx % b.path.length]
      if (p) {
        const tx = this.home.x + p[0] * TILE
        const ty = this.home.y + p[1] * TILE
        const d = Phaser.Math.Distance.Between(this.x, this.y, tx, ty)
        if (d < 4) { this.pathIdx++; body.setVelocity(0, 0) } else {
          body.setVelocity(((tx - this.x) / d) * b.speed, ((ty - this.y) / d) * b.speed)
          if (Math.abs(tx - this.x) > 2) this.sprite.setFlipX(tx < this.x)
          moving = true
        }
      }
    } else if (b.type === 'patrol') {
      body.setVelocity(0, 0)
    }
    // procedural animation
    const sx = 0.5
    if (b.type === 'dance') {
      this.sprite.setAngle(Math.sin(this.t * 8) * 10)
      this.sprite.setScale(sx * (1 + Math.sin(this.t * 16) * 0.04), sx * (1 - Math.sin(this.t * 16) * 0.04))
      moving = true
    } else if (b.type === 'float') {
      this.sprite.setDisplayOrigin(48, 108 + Math.sin(this.t * 3) * 8)
    } else if (b.type === 'pose') {
      this.sprite.setAngle(Math.sin(this.t * 1.2) * 3)
      this.sprite.setScale(sx * (1 + Math.sin(this.t * 2.4) * 0.02))
    } else if (b.type === 'bob') {
      this.sprite.setScale(sx, sx * (1 + Math.sin(this.t * 3) * 0.025))
    }
    if (moving) {
      this.frameT += dt
      if (this.frameT > 0.16) { this.frameT = 0; this.frame = this.frame ? 0 : 1; this.sprite.setTexture(`${this.spec.tex}_${this.frame}`) }
    }
    this.sprite.setDepth(this.sprite.y)
    // name tag + bubble
    this.nameTag.setPosition(this.x, this.y - 66).setDepth(9000)
    const near = dist < 130
    this.nameTag.setAlpha(Phaser.Math.Linear(this.nameTag.alpha, near ? 1 : 0, Math.min(1, dt * 8)))
    this.bubble.setPosition(this.x, this.y - 76).setDepth(9001)
    if (this.bubbleT > 0) {
      this.bubbleT -= dt
      if (this.bubbleT <= 0) this.bubble.setVisible(false)
    }
    const barks = this.spec.barks
    if (barks && barks.length && !frozen && dist < 260) {
      this.barkT -= dt
      if (this.barkT <= 0) {
        this.barkT = this.spec.barkEvery ?? 4 + Math.random() * 3
        this.bark(barks[Math.floor(Math.random() * barks.length)] ?? '')
      }
    }
  }

  destroy(): void {
    this.nameTag.destroy()
    this.bubble.destroy()
    this.sprite.destroy()
  }
}
