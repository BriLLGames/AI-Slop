// Full-screen overlays used by the game scene: pause, death (SKILL ISSUE), banners.

import * as Phaser from 'phaser'
import { COLORS, CSS, DEATH_LINES, H, W } from '../config'
import type { Controls } from '../controls'
import { Sfx } from '../audio'
import { Store } from '../save'
import { MenuList, panel, txt } from './widgets'

export function soundItems(): { label: () => string; adjust: (d: number) => void; action?: () => void }[] {
  return [
    {
      label: () => `Громкость: ${Math.round(Store.settings.volume * 100)}%`,
      adjust: (d: number) => {
        Store.settings.volume = Math.max(0, Math.min(1, Math.round((Store.settings.volume + d * 0.1) * 10) / 10))
        Store.saveSettings()
        Sfx.applyVolume()
      },
    },
    {
      label: () => `Музыка: ${Store.settings.music ? 'ВКЛ' : 'ВЫКЛ'}`,
      adjust: () => {
        Store.settings.music = !Store.settings.music
        Store.saveSettings()
        Sfx.applyVolume()
      },
    },
  ]
}

export class PauseMenu {
  private root: Phaser.GameObjects.Container
  private menu: MenuList

  constructor(ui: Phaser.Scene, h: { resume: () => void; restart: () => void; menu: () => void }) {
    this.root = ui.add.container(0, 0).setDepth(900)
    const dim = ui.add.rectangle(W / 2, H / 2, W, H, 0x07050d, 0.78).setInteractive()
    const g = ui.add.graphics()
    panel(g, W / 2 - 230, 60, 460, 430, COLORS.cyan)
    const title = txt(ui, W / 2, 84, 'ПАУЗА', 40, CSS.cyan, { big: true, stroke: 7 }).setOrigin(0.5, 0)
    const sub = txt(ui, W / 2, 134, 'Лента ждёт. Лента всегда ждёт.', 15, CSS.dim).setOrigin(0.5, 0)
    this.root.add([dim, g, title, sub])
    this.menu = new MenuList(ui, W / 2, 170, [
      { label: () => 'Продолжить', action: h.resume },
      { label: () => 'К контрольной точке', action: h.restart },
      ...soundItems(),
      { label: () => 'Главное меню', action: h.menu },
    ], { width: 360, size: 20, depth: 901 })
  }

  update(ctrl: Controls): void {
    this.menu.update(ctrl)
  }

  destroy(): void {
    this.menu.destroy()
    this.root.destroy()
  }
}

export class DeathScreen {
  private root: Phaser.GameObjects.Container
  private menu: MenuList | null = null
  private glitch: Phaser.GameObjects.Text[] = []
  private t = 0

  constructor(ui: Phaser.Scene, h: { retry: () => void; menu: () => void }) {
    this.root = ui.add.container(0, 0).setDepth(950)
    const dim = ui.add.rectangle(W / 2, H / 2, W, H, 0x12020a, 0).setInteractive()
    ui.tweens.add({ targets: dim, fillAlpha: 0.88, duration: 500 })
    const scan = ui.add.graphics()
    for (let y = 0; y < H; y += 4) { scan.fillStyle(0x000000, 0.25); scan.fillRect(0, y, W, 2) }
    this.root.add([dim, scan])
    const colors = [CSS.cyan, CSS.pink, CSS.white]
    colors.forEach((c, i) => {
      const t = txt(ui, W / 2, 150, 'SKILL ISSUE', 96, c, { big: true, stroke: i === 2 ? 10 : 0 }).setOrigin(0.5)
      if (i < 2) t.setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD)
      this.glitch.push(t)
      this.root.add(t)
    })
    const main = this.glitch[2]
    if (main) { main.setScale(3).setAlpha(0); ui.tweens.add({ targets: main, scale: 1, alpha: 1, duration: 350, ease: 'Back.easeOut' }) }
    const line = DEATH_LINES[Math.floor(Math.random() * DEATH_LINES.length)] ?? ''
    const roast = txt(ui, W / 2, 232, line, 20, CSS.white, { align: 'center', wrap: 720 }).setOrigin(0.5, 0)
    const stats = txt(ui, W / 2, 274, `Смертей за забег: ${Store.run.deaths}  ·  Просмотров твоего фейла: ${(Store.run.deaths * 13370 + 404).toLocaleString('ru-RU')}`, 14, CSS.dim, { align: 'center' }).setOrigin(0.5, 0)
    const views = txt(ui, W / 2, 300, '♥ 0   💬 «ахах»   ↗ 1 репост (от мамы)', 14, CSS.pink).setOrigin(0.5, 0)
    this.root.add([roast, stats, views])
    Sfx.play('death')
    ui.time.delayedCall(700, () => {
      if (!this.root.active) return
      this.menu = new MenuList(ui, W / 2, 344, [
        { label: () => 'Попробовать снова', action: h.retry },
        { label: () => 'В главное меню', action: h.menu },
      ], { width: 340, size: 22, depth: 951 })
    })
  }

  update(dt: number, ctrl: Controls): void {
    this.t += dt
    const a = this.glitch[0]
    const b = this.glitch[1]
    if (a && b) {
      const j = Math.random() < 0.15 ? 10 : 3
      a.setPosition(W / 2 - j + Math.sin(this.t * 30) * 2, 150 + Math.random() * 2)
      b.setPosition(W / 2 + j, 150 - Math.random() * 2)
    }
    this.menu?.update(ctrl)
  }

  destroy(): void {
    this.menu?.destroy()
    this.root.destroy()
  }
}

/** Big dramatic banner (level titles, boss phases). Resolves when finished. */
export function banner(ui: Phaser.Scene, title: string, subtitle: string, color: string = CSS.pink, ms = 2200): Promise<void> {
  return new Promise((res) => {
    const root = ui.add.container(0, 0).setDepth(800)
    const g = ui.add.graphics()
    g.fillStyle(0x07050d, 0.85).fillRect(0, H / 2 - 70, W, 140)
    g.fillStyle(Phaser.Display.Color.HexStringToColor(color).color, 1).fillRect(0, H / 2 - 74, W, 4).fillRect(0, H / 2 + 70, W, 4)
    const t = txt(ui, W / 2, H / 2 - 16, title, 50, color, { big: true, stroke: 8, align: 'center' }).setOrigin(0.5)
    const s = txt(ui, W / 2, H / 2 + 38, subtitle, 18, CSS.white, { align: 'center', wrap: 860 }).setOrigin(0.5)
    root.add([g, t, s])
    root.setAlpha(0)
    t.setScale(1.8)
    ui.tweens.add({ targets: root, alpha: 1, duration: 200 })
    ui.tweens.add({ targets: t, scale: 1, duration: 300, ease: 'Back.easeOut' })
    ui.tweens.add({
      targets: root, alpha: 0, delay: ms, duration: 300,
      onComplete: () => { root.destroy(); res() },
    })
  })
}
