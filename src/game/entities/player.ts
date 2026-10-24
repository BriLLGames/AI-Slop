// The hero: movement, dash with i-frames, facing, walk animation, knockback.

import * as Phaser from 'phaser'
import { COLORS, TUNING } from '../config'
import type { Controls } from '../controls'
import type { Fx } from '../fx'
import { Sfx } from '../audio'

export interface MoveOpts {
  frozen: boolean
  invert: boolean
  push: { x: number; y: number }
  dashCooldown: number
}

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite
  readonly facing = new Phaser.Math.Vector2(0, 1)
  private dashDir = new Phaser.Math.Vector2(0, 1)
  private knock = new Phaser.Math.Vector2(0, 0)
  dashT = 0
  dashCd = 0
  inv = 0
  private animT = 0
  private frame = 0
  private ghostT = 0
  private stepT = 0
  moving = false
  stillTime = 0

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'hero_0')
    this.sprite.setScale(0.5).setOrigin(0.5, 0.85)
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    body.setSize(40, 30, false)
    body.setOffset(28, 86)
    body.setCollideWorldBounds(true)
  }

  get x(): number { return this.sprite.x }
  get y(): number { return this.sprite.y }
  get dashing(): boolean { return this.dashT > 0 }

  update(dt: number, ctrl: Controls, o: MoveOpts, fx: Fx): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.dashCd = Math.max(0, this.dashCd - dt)
    this.inv = Math.max(0, this.inv - dt)
    this.knock.scale(Math.max(0, 1 - dt * 9))

    if (o.frozen) {
      body.setVelocity(0, 0)
      this.dashT = 0
      this.moving = false
      this.setFrame(0)
      this.sprite.setAlpha(1)
      return
    }

    let mv = ctrl.move()
    if (o.invert) mv = { x: -mv.x, y: -mv.y }
    this.moving = mv.x !== 0 || mv.y !== 0
    if (this.moving) {
      this.facing.set(mv.x, mv.y).normalize()
      if (mv.x !== 0) this.sprite.setFlipX(mv.x < 0)
      this.stillTime = 0
    } else {
      this.stillTime += dt
    }

    if (ctrl.take('SPACE') && this.dashCd <= 0) {
      this.dashT = TUNING.dashTime
      this.dashCd = o.dashCooldown
      this.inv = Math.max(this.inv, TUNING.dashTime + 0.08)
      this.dashDir.copy(this.moving ? new Phaser.Math.Vector2(mv.x, mv.y).normalize() : this.facing)
      Sfx.play('dash')
      fx.burst(this.x, this.y, COLORS.cyan, 6, 90, 300)
    }

    if (this.dashT > 0) {
      this.dashT -= dt
      body.setVelocity(this.dashDir.x * TUNING.dashSpeed, this.dashDir.y * TUNING.dashSpeed)
      this.ghostT -= dt
      if (this.ghostT <= 0) { this.ghostT = 0.03; fx.ghost(this.sprite, COLORS.cyan) }
    } else {
      body.setVelocity(mv.x * TUNING.speed + o.push.x + this.knock.x, mv.y * TUNING.speed + o.push.y + this.knock.y)
    }

    // walk cycle + squash
    if (this.moving) {
      this.animT += dt
      if (this.animT > 0.13) { this.animT = 0; this.setFrame(this.frame ? 0 : 1) }
      this.stepT -= dt
      if (this.stepT <= 0) { this.stepT = 0.28; Sfx.play('step') }
      this.sprite.setScale(0.5, 0.5 + Math.abs(Math.sin(this.sprite.x * 0.05 + this.sprite.y * 0.05)) * 0.02)
    } else {
      this.setFrame(0)
      this.sprite.setScale(0.5, 0.5 + Math.sin(performance.now() / 300) * 0.008)
    }
    // invulnerability blink (not while dashing)
    this.sprite.setAlpha(this.inv > 0 && this.dashT <= 0 ? (Math.floor(this.inv * 14) % 2 ? 0.35 : 1) : 1)
    this.sprite.setDepth(this.sprite.y)
  }

  private setFrame(f: number): void {
    if (this.frame === f && this.sprite.texture.key === `hero_${f}`) return
    this.frame = f
    this.sprite.setTexture(`hero_${f}`)
  }

  knockback(fromX: number, fromY: number, power = 380): void {
    const v = new Phaser.Math.Vector2(this.x - fromX, this.y - fromY)
    if (v.lengthSq() < 0.01) v.set(0, 1)
    v.normalize().scale(power)
    this.knock.copy(v)
  }
}
