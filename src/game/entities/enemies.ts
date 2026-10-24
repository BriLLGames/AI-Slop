// Enemies (scrollers, bots, haters, chat turrets, NPC clones) and a pooled bullet system.

import * as Phaser from 'phaser'
import type { Player } from './player'

export type EnemyType = 'scroller' | 'bot' | 'hater' | 'turret' | 'clone' | 'drone'

const STATS: Record<EnemyType, { hp: number; speed: number; aggro: number; tex: string }> = {
  scroller: { hp: 2, speed: 58, aggro: 290, tex: 'scroller' },
  bot: { hp: 1, speed: 135, aggro: 330, tex: 'bot' },
  hater: { hp: 2, speed: 80, aggro: 380, tex: 'hater' },
  turret: { hp: 9999, speed: 0, aggro: 430, tex: 'turret' },
  clone: { hp: 1, speed: 100, aggro: 99999, tex: 'hero' },
  drone: { hp: 9999, speed: 0, aggro: 0, tex: 'drone' },
}

export const DRONE = { range: 240, halfFov: 0.42 }

const MAX_BULLETS = 180

export class Bullets {
  readonly group: Phaser.Physics.Arcade.Group

  constructor(scene: Phaser.Scene) {
    this.group = scene.physics.add.group({ allowGravity: false })
  }

  fire(x: number, y: number, vx: number, vy: number, tex: string, life = 3, spin = false): void {
    let b = this.group.getFirstDead(false) as Phaser.Physics.Arcade.Image | null
    if (!b) {
      if (this.group.getLength() >= MAX_BULLETS) return
      b = this.group.create(x, y, tex) as Phaser.Physics.Arcade.Image
    }
    b.enableBody(true, x, y, true, true)
    b.setTexture(tex).setDepth(7000).setAngle(0).setAlpha(1)
    const body = b.body as Phaser.Physics.Arcade.Body
    body.setSize(b.width * 0.7, b.height * 0.7, true)
    body.setVelocity(vx, vy)
    b.setData('life', life)
    b.setData('spin', spin)
  }

  update(dt: number): void {
    for (const obj of this.group.getChildren()) {
      const b = obj as Phaser.Physics.Arcade.Image
      if (!b.active) continue
      const life = (b.getData('life') as number) - dt
      b.setData('life', life)
      if (b.getData('spin')) b.angle += dt * 360
      if (life <= 0) this.kill(b)
    }
  }

  kill(b: Phaser.Physics.Arcade.Image): void {
    b.disableBody(true, true)
  }

  clear(): void {
    for (const obj of this.group.getChildren()) this.kill(obj as Phaser.Physics.Arcade.Image)
  }
}

export class Enemy {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly type: EnemyType
  hp: number
  alive = true
  private t = Math.random() * 5
  private shootT = 1 + Math.random()
  private frame = 0
  private frameT = 0
  private stunT = 0
  private angleT = 0
  private home: { x: number; y: number }
  private cone: Phaser.GameObjects.Graphics | null = null
  look = 0
  private baseDir = 0
  private sweep = 0.9
  alarm = 0

  constructor(scene: Phaser.Scene, group: Phaser.Physics.Arcade.Group, x: number, y: number, type: EnemyType, dirDeg = 90, sweepDeg = 50) {
    this.type = type
    const st = STATS[type]
    this.hp = st.hp
    this.home = { x, y }
    this.sprite = scene.physics.add.sprite(x, y, `${st.tex}_0`).setScale(0.5).setOrigin(0.5, 0.85)
    group.add(this.sprite)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(44, 34, false)
    body.setOffset(26, 84)
    if (type === 'turret' || type === 'drone') { body.setImmovable(true); body.pushable = false }
    if (type === 'drone') {
      this.baseDir = Phaser.Math.DegToRad(dirDeg)
      this.sweep = Phaser.Math.DegToRad(sweepDeg)
      this.look = this.baseDir
      this.cone = scene.add.graphics().setDepth(-700)
    }
    if (type === 'clone') this.sprite.setTint(0xb48cff)
    this.sprite.setData('enemy', this)
  }

  get x(): number { return this.sprite.x }
  get y(): number { return this.sprite.y }

  /** Returns true if this hit killed the enemy. */
  hit(dmg: number, fromX: number, fromY: number): boolean {
    if (!this.alive || this.type === 'turret' || this.type === 'drone') return false
    this.hp -= dmg
    this.stunT = 0.45
    const v = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY).normalize().scale(360)
    ;(this.sprite.body as Phaser.Physics.Arcade.Body).setVelocity(v.x, v.y)
    this.sprite.setTint(0xff5c7a)
    if (this.hp <= 0) {
      this.alive = false
      this.sprite.disableBody(true, true)
      return true
    }
    return false
  }

  update(dt: number, player: Player, bullets: Bullets, frozen: boolean): void {
    if (!this.alive) return
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.sprite.setDepth(this.sprite.y)
    if (frozen) { body.setVelocity(0, 0); return }
    this.t += dt
    if (this.stunT > 0) {
      this.stunT -= dt
      body.velocity.scale(0.9)
      if (this.stunT <= 0) this.sprite.setTint(this.type === 'clone' ? 0xb48cff : 0xffffff)
      return
    }
    const st = STATS[this.type]
    const dx = player.x - this.x
    const dy = player.y - this.y
    const dist = Math.hypot(dx, dy) || 1
    const aggro = dist < st.aggro
    let moving = false
    switch (this.type) {
      case 'scroller':
      case 'bot':
      case 'clone': {
        if (aggro) {
          const wob = this.type === 'bot' ? Math.sin(this.t * 6) * 40 : 0
          body.setVelocity((dx / dist) * st.speed - (dy / dist) * wob, (dy / dist) * st.speed + (dx / dist) * wob)
          moving = true
        } else {
          const hx = this.home.x - this.x
          const hy = this.home.y - this.y
          const hd = Math.hypot(hx, hy)
          if (hd > 8) { body.setVelocity((hx / hd) * st.speed * 0.6, (hy / hd) * st.speed * 0.6); moving = true } else body.setVelocity(0, 0)
        }
        break
      }
      case 'hater': {
        if (aggro) {
          const want = dist > 230 ? 1 : dist < 160 ? -1 : 0
          body.setVelocity((dx / dist) * st.speed * want + Math.sin(this.t) * 30, (dy / dist) * st.speed * want + Math.cos(this.t) * 30)
          moving = true
          this.shootT -= dt
          if (this.shootT <= 0) {
            this.shootT = 1.7
            bullets.fire(this.x, this.y - 20, (dx / dist) * 200, (dy / dist) * 200, `cmt${Math.floor(Math.random() * 4)}`, 2.6)
          }
        } else body.setVelocity(0, 0)
        break
      }
      case 'drone': {
        body.setVelocity(0, 0)
        this.look = this.baseDir + Math.sin(this.t * 0.9) * this.sweep
        this.alarm = Math.max(0, this.alarm - dt)
        const g = this.cone
        if (g) {
          g.clear()
          g.fillStyle(this.alarm > 0 ? 0xff4757 : 0xffd23f, this.alarm > 0 ? 0.35 : 0.16)
          g.slice(this.x, this.y - 20, DRONE.range, this.look - DRONE.halfFov, this.look + DRONE.halfFov, false)
          g.fillPath()
        }
        this.sprite.setY(this.home.y + Math.sin(this.t * 3) * 3)
        break
      }
      case 'turret': {
        body.setVelocity(0, 0)
        if (aggro) {
          this.shootT -= dt
          if (this.shootT <= 0) {
            this.shootT = 0.95
            this.angleT += 0.45
            for (let k = 0; k < 4; k++) {
              const a = this.angleT + (k * Math.PI) / 2
              bullets.fire(this.x, this.y - 20, Math.cos(a) * 150, Math.sin(a) * 150, `cmt${k}`, 3)
            }
          }
        }
        break
      }
    }
    if (Math.abs(body.velocity.x) > 5) this.sprite.setFlipX(body.velocity.x < 0)
    if (moving) {
      this.frameT += dt
      if (this.frameT > 0.18) {
        this.frameT = 0
        this.frame = this.frame ? 0 : 1
        this.sprite.setTexture(`${STATS[this.type].tex}_${this.frame}`)
      }
    }
  }

  /** Switch the enemy off for good (scripted events). */
  deactivate(): void {
    if (!this.alive) return
    this.alive = false
    this.sprite.setTint(0x555566).setAlpha(0.6)
    ;(this.sprite.body as Phaser.Physics.Arcade.Body).enable = false
    this.cone?.clear()
  }

  /** Drone vision: player inside the cone and not hidden behind a wall. */
  canSee(px: number, py: number, solid: (x: number, y: number) => boolean): boolean {
    if (this.type !== 'drone' || !this.alive) return false
    const ox = this.x
    const oy = this.y - 20
    const dx = px - ox
    const dy = py - 10 - oy
    const d = Math.hypot(dx, dy)
    if (d > DRONE.range || d < 1) return false
    const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - this.look))
    if (diff > DRONE.halfFov) return false
    for (let s = 16; s < d; s += 16) if (solid(ox + (dx / d) * s, oy + (dy / d) * s)) return false
    return true
  }

  destroy(): void {
    this.cone?.destroy()
    this.sprite.destroy()
  }
}
