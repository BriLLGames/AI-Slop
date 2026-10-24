// Lightweight particle / juice helpers built on tweens (bounded object count).

import * as Phaser from 'phaser'
import { FONT_BIG } from './config'

const MAX_PARTICLES = 220

export class Fx {
  private scene: Phaser.Scene
  private live = 0

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  burst(x: number, y: number, color: number, count = 12, speed = 170, life = 520, tex = 'dot', depth = 5000): void {
    for (let i = 0; i < count; i++) {
      if (this.live >= MAX_PARTICLES) return
      const a = Math.random() * Math.PI * 2
      const s = speed * (0.4 + Math.random() * 0.8)
      const p = this.scene.add.image(x, y, tex).setTint(color).setDepth(depth).setScale(0.5 + Math.random() * 0.7)
      p.setBlendMode(Phaser.BlendModes.ADD)
      this.live++
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(a) * s * (life / 1000),
        y: y + Math.sin(a) * s * (life / 1000),
        alpha: 0,
        scale: 0.1,
        angle: Math.random() * 360,
        duration: life * (0.7 + Math.random() * 0.5),
        ease: 'Cubic.easeOut',
        onComplete: () => {
          p.destroy()
          this.live--
        },
      })
    }
  }

  ring(x: number, y: number, color: number, radius: number, dur = 400, depth = 4999, width = 6): void {
    const g = this.scene.add.graphics().setDepth(depth)
    const state = { r: 8, a: 1 }
    this.scene.tweens.add({
      targets: state,
      r: radius,
      a: 0,
      duration: dur,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        g.clear()
        g.lineStyle(width, color, state.a)
        g.strokeCircle(x, y, state.r)
      },
      onComplete: () => g.destroy(),
    })
  }

  floatText(x: number, y: number, text: string, color = '#ffffff', size = 22, depth = 6000): void {
    const t = this.scene.add
      .text(x, y, text, { fontFamily: FONT_BIG, fontSize: `${size}px`, color, stroke: '#120f1c', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(depth)
    this.scene.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() })
  }

  ghost(sprite: Phaser.GameObjects.Sprite, color: number): void {
    if (this.live >= MAX_PARTICLES) return
    const g = this.scene.add.image(sprite.x, sprite.y, sprite.texture.key).setScale(sprite.scaleX, sprite.scaleY).setFlipX(sprite.flipX)
    g.setOrigin(sprite.originX, sprite.originY).setTint(color).setAlpha(0.6).setDepth(sprite.depth - 1)
    this.live++
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => { g.destroy(); this.live-- } })
  }
}
