// In-game HUD: hearts, aura, fragments, objective, context hint, toasts, boss bar.

import * as Phaser from 'phaser'
import { COLORS, CSS, H, TUNING, W } from '../config'
import type { RunState } from '../save'
import { panel, txt } from './widgets'

export class Hud {
  private ui: Phaser.Scene
  private root: Phaser.GameObjects.Container
  private hearts: Phaser.GameObjects.Image[] = []
  private auraBar: Phaser.GameObjects.Graphics
  private auraText: Phaser.GameObjects.Text
  private fragText: Phaser.GameObjects.Text
  private objText: Phaser.GameObjects.Text
  private objBg: Phaser.GameObjects.Graphics
  private hintText: Phaser.GameObjects.Text
  private bossRoot: Phaser.GameObjects.Container
  private bossBar: Phaser.GameObjects.Graphics
  private bossName: Phaser.GameObjects.Text
  private damage: Phaser.GameObjects.Rectangle
  private toasts: Phaser.GameObjects.Text[] = []
  private timerText: Phaser.GameObjects.Text
  private last = { hp: -1, maxHp: -1, aura: -1, frag: -1 }
  private auraShown = 0

  constructor(ui: Phaser.Scene, levelName: string) {
    this.ui = ui
    this.root = ui.add.container(0, 0).setDepth(100)
    const g = ui.add.graphics()
    panel(g, 12, 10, 250, 92, COLORS.pink, 0.85)
    this.root.add(g)
    this.auraBar = ui.add.graphics()
    this.root.add(this.auraBar)
    this.root.add(ui.add.image(32, 64, 'auraIcon'))
    this.auraText = txt(ui, 52, 54, 'АУРА 0', 13, CSS.yellow, { big: true, stroke: 3 })
    this.fragText = txt(ui, 182, 54, '◆ 0', 15, CSS.cyan, { big: true, stroke: 3 })
    this.root.add([this.auraText, this.fragText])
    this.root.add(txt(ui, 26, 80, levelName, 11, CSS.dim))

    this.objBg = ui.add.graphics()
    this.objText = txt(ui, W - 24, 22, '', 15, CSS.white, { wrap: 300, align: 'right' }).setOrigin(1, 0)
    this.root.add([this.objBg, this.objText])

    this.hintText = txt(ui, W - 16, H - 14, '', 15, CSS.white, { big: true, stroke: 4 }).setOrigin(1, 1)
    this.root.add(this.hintText)

    this.bossRoot = ui.add.container(W / 2, 0).setVisible(false)
    this.bossBar = ui.add.graphics()
    this.bossName = txt(ui, 0, 118, '', 16, CSS.pink, { big: true, stroke: 4 }).setOrigin(0.5, 0)
    this.bossRoot.add([this.bossBar, this.bossName])
    this.root.add(this.bossRoot)

    this.damage = ui.add.rectangle(W / 2, H / 2, W, H, COLORS.red, 0).setDepth(99)
    this.timerText = txt(ui, W / 2, 16, '', 26, CSS.yellow, { big: true, stroke: 6 }).setOrigin(0.5, 0).setDepth(110).setVisible(false)
  }

  /** Countdown for timed challenges. Pass null to hide. */
  setTimer(text: string | null, urgent = false): void {
    if (text === null) { this.timerText.setVisible(false); return }
    this.timerText.setVisible(true).setText(text).setColor(urgent ? CSS.red : CSS.yellow)
  }

  update(run: RunState, hint: string, dt: number): void {
    if (run.maxHp !== this.last.maxHp || run.hp !== this.last.hp) {
      if (run.maxHp !== this.last.maxHp) {
        this.hearts.forEach((h) => h.destroy())
        this.hearts = []
        for (let i = 0; i < run.maxHp; i++) {
          const h = this.ui.add.image(32 + i * 30, 32, 'heart')
          this.root.add(h)
          this.hearts.push(h)
        }
      }
      this.hearts.forEach((h, i) => h.setTexture(i < run.hp ? 'heart' : 'heart_empty'))
      if (run.hp < this.last.hp && this.last.hp !== -1) {
        const h = this.hearts[run.hp]
        if (h) this.ui.tweens.add({ targets: h, scale: 1.6, yoyo: true, duration: 120 })
      }
      this.last.hp = run.hp
      this.last.maxHp = run.maxHp
    }
    // smooth aura bar
    this.auraShown += (run.aura - this.auraShown) * Math.min(1, dt * 8)
    if (Math.abs(this.auraShown - this.last.aura) > 0.2) {
      this.last.aura = this.auraShown
      const g = this.auraBar
      g.clear()
      g.fillStyle(0x000000, 0.5)
      g.fillRoundedRect(50, 70, 200, 8, 4)
      const ratio = Math.max(0, Math.min(1, this.auraShown / TUNING.auraMax))
      const ready = run.aura >= TUNING.pulseCost
      g.fillStyle(ready ? COLORS.yellow : 0xb08a2a, 1)
      g.fillRoundedRect(50, 70, 200 * ratio, 8, 4)
      g.lineStyle(1, 0xffffff, 0.6)
      g.lineBetween(50 + 200 * (TUNING.pulseCost / TUNING.auraMax), 68, 50 + 200 * (TUNING.pulseCost / TUNING.auraMax), 80)
      this.auraText.setText(`АУРА ${Math.round(run.aura)}${ready ? '  · E-волна' : ''}`)
    }
    if (run.fragments !== this.last.frag) {
      if (this.last.frag !== -1) this.ui.tweens.add({ targets: this.fragText, scale: 1.4, yoyo: true, duration: 150 })
      this.last.frag = run.fragments
      this.fragText.setText(`◆ ${run.fragments}`)
    }
    if (this.hintText.text !== hint) this.hintText.setText(hint)
  }

  setObjective(text: string): void {
    this.objText.setText(text ? `ЗАДАЧА\n${text}` : '')
    this.objBg.clear()
    if (!text) return
    const b = this.objText.getBounds()
    panel(this.objBg, b.x - 14, b.y - 10, b.width + 28, b.height + 20, COLORS.cyan, 0.8)
    this.ui.tweens.add({ targets: this.objText, alpha: { from: 0.2, to: 1 }, duration: 400 })
  }

  toast(text: string, color: string = CSS.white): void {
    const t = txt(this.ui, W / 2, 150, text, 20, color, { big: true, stroke: 5, align: 'center', wrap: 700 }).setOrigin(0.5).setDepth(120)
    this.toasts.push(t)
    if (this.toasts.length > 4) { const old = this.toasts.shift(); old?.destroy() }
    this.toasts.forEach((o, i) => { o.y = 150 + i * 32 })
    t.setScale(0.6)
    this.ui.tweens.add({ targets: t, scale: 1, duration: 180, ease: 'Back.easeOut' })
    this.ui.tweens.add({
      targets: t, alpha: 0, delay: 2200, duration: 500,
      onComplete: () => { this.toasts = this.toasts.filter((o) => o !== t); t.destroy() },
    })
  }

  setBoss(name: string | null, ratio = 1): void {
    if (!name) { this.bossRoot.setVisible(false); return }
    this.bossRoot.setVisible(true)
    this.bossName.setText(name)
    const g = this.bossBar
    g.clear()
    g.fillStyle(0x000000, 0.7)
    g.fillRoundedRect(-260, 100, 520, 16, 8)
    g.fillStyle(COLORS.pink, 1)
    g.fillRoundedRect(-258, 102, 516 * Math.max(0, Math.min(1, ratio)), 12, 6)
    g.lineStyle(2, 0xffffff, 0.8)
    g.strokeRoundedRect(-260, 100, 520, 16, 8)
  }

  flashDamage(): void {
    this.damage.setAlpha(0.35)
    this.ui.tweens.add({ targets: this.damage, alpha: 0, duration: 350 })
  }

  setVisible(v: boolean): void {
    this.root.setVisible(v)
  }

  destroy(): void {
    this.toasts.forEach((t) => t.destroy())
    this.toasts = []
    this.root.destroy()
    this.damage.destroy()
    this.timerText.destroy()
  }
}
