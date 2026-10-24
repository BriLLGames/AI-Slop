// Bottom-of-screen dialog box with typewriter text, portraits and choices.

import * as Phaser from 'phaser'
import { COLORS, CSS, H, W } from '../config'
import type { Controls } from '../controls'
import { Sfx } from '../audio'
import { panel, txt } from './widgets'

export interface DialogLine {
  who: string
  text: string
  tex?: string
}

export class Dialog {
  private ui: Phaser.Scene
  private root: Phaser.GameObjects.Container
  private bg: Phaser.GameObjects.Graphics
  private portrait: Phaser.GameObjects.Image
  private nameText: Phaser.GameObjects.Text
  private body: Phaser.GameObjects.Text
  private arrow: Phaser.GameObjects.Text
  private choiceTexts: Phaser.GameObjects.Text[] = []
  private lines: DialogLine[] = []
  private choices: string[] = []
  private lineIdx = 0
  private shown = 0
  private choiceIdx = 0
  private resolve: ((n: number) => void) | null = null
  private clickAdvance = false
  private t = 0
  open = false

  constructor(ui: Phaser.Scene) {
    this.ui = ui
    this.root = ui.add.container(0, 0).setDepth(500).setVisible(false)
    this.bg = ui.add.graphics()
    this.portrait = ui.add.image(92, H - 92, 'hero_0').setScale(0.95)
    this.nameText = txt(ui, 168, H - 168, '', 18, CSS.pink, { big: true, stroke: 4 })
    this.body = txt(ui, 168, H - 138, '', 19, CSS.white, { wrap: W - 220 })
    this.body.setLineSpacing(4)
    this.arrow = txt(ui, W - 46, H - 40, '▼', 18, CSS.cyan)
    const hit = ui.add.zone(W / 2, H - 95, W - 20, 180).setInteractive()
    hit.on('pointerdown', () => { this.clickAdvance = true })
    this.root.add([this.bg, hit, this.portrait, this.nameText, this.body, this.arrow])
  }

  show(lines: DialogLine[], choices: string[] = []): Promise<number> {
    if (this.resolve) {
      const prev = this.resolve
      this.resolve = null
      prev(-1)
    }
    this.lines = lines
    this.choices = choices
    this.lineIdx = 0
    this.shown = 0
    this.choiceIdx = 0
    this.open = true
    this.root.setVisible(true)
    this.root.setAlpha(0)
    this.ui.tweens.add({ targets: this.root, alpha: 1, duration: 120 })
    this.drawLine()
    return new Promise<number>((res) => { this.resolve = res })
  }

  private drawLine(): void {
    const line = this.lines[this.lineIdx]
    if (!line) return
    const hasChoices = this.choices.length > 0 && this.lineIdx === this.lines.length - 1
    const extra = hasChoices ? this.choices.length * 26 + 6 : 0
    const top = H - 190 - extra
    this.bg.clear()
    panel(this.bg, 16, top, W - 32, 176 + extra, line.who === 'ТЫ' ? COLORS.cyan : COLORS.pink)
    this.bg.fillStyle(0x000000, 0.35)
    this.bg.fillRoundedRect(36, top + 24, 112, 132, 10)
    const tex = line.tex ?? 'hero'
    if (tex !== 'none') this.portrait.setTexture(`${tex}_0`).setPosition(92, top + 92)
    this.portrait.setVisible(tex !== 'none')
    this.nameText.setText(line.who).setPosition(168, top + 18).setColor(line.who === 'ТЫ' ? CSS.cyan : CSS.pink)
    this.body.setPosition(168, top + 50).setText('')
    this.choiceTexts.forEach((c) => c.destroy())
    this.choiceTexts = []
    this.arrow.setPosition(W - 52, H - 44)
  }

  private showChoices(): void {
    if (this.choiceTexts.length) return
    const top = this.body.y + this.body.height + 12
    this.choices.forEach((c, i) => {
      const t = txt(this.ui, 190, top + i * 26, '', 18, CSS.white).setInteractive({ useHandCursor: true })
      t.on('pointerover', () => { this.choiceIdx = i; this.paintChoices() })
      t.on('pointerdown', () => { this.choiceIdx = i; this.finish(i) })
      this.root.add(t)
      this.choiceTexts.push(t)
      void c
    })
    this.paintChoices()
  }

  private paintChoices(): void {
    this.choiceTexts.forEach((t, i) => {
      const sel = i === this.choiceIdx
      t.setText(`${sel ? '▶ ' : '   '}${i + 1}. ${this.choices[i] ?? ''}`)
      t.setColor(sel ? CSS.yellow : CSS.dim)
    })
  }

  private finish(n: number): void {
    const r = this.resolve
    this.resolve = null
    this.open = false
    this.root.setVisible(false)
    this.choiceTexts.forEach((c) => c.destroy())
    this.choiceTexts = []
    Sfx.play('select')
    r?.(n)
  }

  update(dt: number, ctrl: Controls): void {
    if (!this.open) return
    const line = this.lines[this.lineIdx]
    if (!line) { this.finish(-1); return }
    this.t += dt
    const full = line.text
    const typing = this.shown < full.length
    if (typing) {
      const before = Math.floor(this.shown)
      this.shown = Math.min(full.length, this.shown + dt * 60)
      const now = Math.floor(this.shown)
      if (now !== before) {
        this.body.setText(full.slice(0, now))
        if (now % 3 === 0) Sfx.play('talk', line.who === 'ТЫ' ? 1.3 : 1)
      }
    }
    const isLast = this.lineIdx === this.lines.length - 1
    const choicesVisible = isLast && this.choices.length > 0 && !typing
    if (choicesVisible) this.showChoices()
    this.arrow.setVisible(!typing && !choicesVisible)
    this.arrow.setAlpha(0.5 + Math.sin(this.t * 8) * 0.5)

    const click = this.clickAdvance
    this.clickAdvance = false
    if (choicesVisible) {
      const n = this.choices.length
      if (ctrl.take('W') || ctrl.take('UP')) { this.choiceIdx = (this.choiceIdx - 1 + n) % n; this.paintChoices(); Sfx.play('select') }
      if (ctrl.take('S') || ctrl.take('DOWN')) { this.choiceIdx = (this.choiceIdx + 1) % n; this.paintChoices(); Sfx.play('select') }
      const nums = [ctrl.take('ONE'), ctrl.take('TWO'), ctrl.take('THREE'), ctrl.take('FOUR')]
      const ni = nums.findIndex((v, i) => v && i < n)
      if (ni >= 0) { this.finish(ni); return }
      if (ctrl.confirm()) this.finish(this.choiceIdx)
      return
    }
    if (ctrl.confirm() || click) {
      if (typing) {
        this.shown = full.length
        this.body.setText(full)
      } else if (isLast) {
        this.finish(-1)
      } else {
        this.lineIdx++
        this.shown = 0
        this.drawLine()
      }
    }
  }

  /** Hide without resolving (used on death / scene exit). */
  close(): void {
    this.resolve = null
    this.open = false
    this.root.setVisible(false)
  }

  destroy(): void {
    this.resolve = null
    this.root.destroy()
  }
}
