// Shared UI building blocks: text helper, styled panel, keyboard+mouse menu list.

import * as Phaser from 'phaser'
import { COLORS, CSS, FONT, FONT_BIG } from '../config'
import type { Controls } from '../controls'
import { Sfx } from '../audio'

export function txt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  s: string,
  size = 18,
  color: string = CSS.white,
  opts: { big?: boolean; wrap?: number; align?: string; stroke?: number } = {},
): Phaser.GameObjects.Text {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: opts.big ? FONT_BIG : FONT,
    fontSize: `${size}px`,
    color,
    align: opts.align ?? 'left',
    stroke: '#120f1c',
    strokeThickness: opts.stroke ?? (opts.big ? 6 : 0),
  }
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true }
  return scene.add.text(x, y, s, style)
}

export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, border: number = COLORS.pink, alpha = 0.94): void {
  g.fillStyle(0x000000, 0.35)
  g.fillRoundedRect(x + 4, y + 6, w, h, 14)
  g.fillStyle(COLORS.panel, alpha)
  g.fillRoundedRect(x, y, w, h, 14)
  g.lineStyle(3, border, 1)
  g.strokeRoundedRect(x, y, w, h, 14)
  g.lineStyle(1, 0xffffff, 0.12)
  g.strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, 10)
}

export interface MenuItem {
  label: () => string
  action?: () => void
  adjust?: (dir: number) => void
}

export class MenuList {
  readonly container: Phaser.GameObjects.Container
  private items: MenuItem[]
  private texts: Phaser.GameObjects.Text[] = []
  private bgs: Phaser.GameObjects.Graphics[] = []
  private index = 0
  private alive = true
  private w: number
  private h: number

  constructor(scene: Phaser.Scene, x: number, y: number, items: MenuItem[], opts: { width?: number; size?: number; gap?: number; depth?: number } = {}) {
    this.items = items
    this.w = opts.width ?? 320
    const size = opts.size ?? 22
    this.h = size + 22
    const gap = opts.gap ?? 10
    this.container = scene.add.container(x, y).setDepth(opts.depth ?? 9000)
    items.forEach((it, i) => {
      const yy = i * (this.h + gap)
      const bg = scene.add.graphics()
      const t = txt(scene, 0, yy + this.h / 2, it.label(), size, CSS.white, { big: true, stroke: 4 }).setOrigin(0.5)
      const zone = scene.add.zone(0, yy + this.h / 2, this.w, this.h).setInteractive({ useHandCursor: true })
      zone.on('pointerover', () => { if (this.alive && this.index !== i) { this.index = i; Sfx.play('select'); this.redraw() } })
      zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (!this.alive) return
        Sfx.unlock()
        this.index = i
        if (it.adjust && !it.action) {
          it.adjust(p.x - (this.container.x) < 0 ? -1 : 1)
          Sfx.play('select')
          this.redraw()
          return
        }
        this.activate()
      })
      this.container.add([bg, t, zone])
      this.texts.push(t)
      this.bgs.push(bg)
    })
    this.redraw()
  }

  private redraw(): void {
    this.items.forEach((it, i) => {
      const bg = this.bgs[i]
      const t = this.texts[i]
      if (!bg || !t) return
      const sel = i === this.index
      const yy = i * (this.h + 10)
      bg.clear()
      bg.fillStyle(sel ? COLORS.pink : COLORS.panel, sel ? 1 : 0.85)
      bg.fillRoundedRect(-this.w / 2, yy, this.w, this.h, 12)
      bg.lineStyle(2, sel ? 0xffffff : COLORS.cyan, sel ? 1 : 0.6)
      bg.strokeRoundedRect(-this.w / 2, yy, this.w, this.h, 12)
      const label = it.adjust ? `◀  ${it.label()}  ▶` : it.label()
      if (t.text !== label) t.setText(label)
      t.setScale(sel ? 1.06 : 1)
    })
  }

  private activate(): void {
    const it = this.items[this.index]
    if (!it || !it.action) return
    Sfx.play('confirm')
    it.action()
  }

  update(ctrl: Controls): void {
    if (!this.alive) return
    const n = this.items.length
    if (ctrl.take('W') || ctrl.take('UP')) { this.index = (this.index - 1 + n) % n; Sfx.play('select'); this.redraw() }
    if (ctrl.take('S') || ctrl.take('DOWN')) { this.index = (this.index + 1) % n; Sfx.play('select'); this.redraw() }
    const it = this.items[this.index]
    if (it?.adjust) {
      if (ctrl.take('A') || ctrl.take('LEFT')) { it.adjust(-1); Sfx.play('select'); this.redraw() }
      if (ctrl.take('D') || ctrl.take('RIGHT')) { it.adjust(1); Sfx.play('select'); this.redraw() }
    }
    if (ctrl.take('ENTER') || ctrl.take('SPACE') || ctrl.take('F') || ctrl.take('E')) {
      if (it?.adjust && !it.action) { it.adjust(1); Sfx.play('select'); this.redraw() } else this.activate()
    }
  }

  refresh(): void {
    if (this.alive) this.redraw()
  }

  destroy(): void {
    if (!this.alive) return
    this.alive = false
    this.container.destroy()
  }
}
