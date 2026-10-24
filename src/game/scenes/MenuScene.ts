// Main menu: animated "feed" background, title, continue/new game, controls, sound, exit.

import * as Phaser from 'phaser'
import { COLORS, CSS, H, W } from '../config'
import { Controls } from '../controls'
import { Sfx } from '../audio'
import { Store } from '../save'
import { MenuList, panel, txt } from '../ui/widgets'
import { soundItems } from '../ui/overlays'
import { downloadGameZip } from '../export'

const CARD_COLORS = [0xff2e88, 0x22e4ff, 0x9b5cff, 0xffd23f, 0x5dff9b]

/** Optional host hook (only the Retool shell provides it) that publishes the project to GitHub. */
type PublishHook = (progress: (s: string) => void) => Promise<string>
const publishHook = (): PublishHook | undefined => (window as unknown as { __EOV_PUBLISH?: PublishHook }).__EOV_PUBLISH
const CARD_TITLES = ['ТОП-10 ПОЗ ДЛЯ АУРЫ', 'КОТ ИГРАЕТ НА ГИТАРЕ', 'ЧЕЛ МОГНУЛ СВОЁ ОТРАЖЕНИЕ', 'POV: ТЫ NPC', 'ЛАЙФХАК: НЕ СПАТЬ', 'ЕЩЁ ОДНО ВИДЕО', 'SIGMA ГРИНД 5 УТРА', 'БРЕЙНРОТ #9001']

export class MenuScene extends Phaser.Scene {
  private ctrl!: Controls
  private menu: MenuList | null = null
  private overlay: { root: Phaser.GameObjects.Container; menu: MenuList | null } | null = null
  private cards: Phaser.GameObjects.Container[] = []
  private titleLayers: Phaser.GameObjects.Text[] = []
  private t = 0
  private starting = false

  constructor() {
    super('Menu')
  }

  create(): void {
    this.starting = false
    this.cards = []
    this.titleLayers = []
    this.overlay = null
    this.ctrl = new Controls(this)
    this.cameras.main.setBackgroundColor(0x0d0a16)
    this.cameras.main.fadeIn(400)

    // scrolling feed columns
    for (let col = 0; col < 4; col++) {
      for (let i = 0; i < 4; i++) {
        const c = this.makeCard(90 + col * 260, i * 190 + col * 60, col * 4 + i)
        c.setData('speed', 30 + col * 12)
        this.cards.push(c)
      }
    }
    this.add.rectangle(W / 2, H / 2, W, H, 0x0d0a16, 0.55)

    // title with RGB split
    ;[CSS.cyan, CSS.pink, CSS.white].forEach((c, i) => {
      const t = txt(this, W / 2, 92, 'ЕЩЁ ОДНО ВИДЕО', 72, c, { big: true, stroke: i === 2 ? 10 : 0 }).setOrigin(0.5)
      if (i < 2) t.setAlpha(0.75).setBlendMode(Phaser.BlendModes.ADD)
      this.titleLayers.push(t)
    })
    txt(this, W / 2, 150, 'brainrot-одиссея про ленту, ауру и могание', 18, CSS.yellow, { big: true, stroke: 4 }).setOrigin(0.5)

    const hero = this.add.image(170, 400, 'hero_0').setScale(1.3)
    const skip = this.add.image(280, 360, 'skip_0').setScale(1)
    this.tweens.add({ targets: hero, y: 392, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: skip, y: 340, angle: 6, yoyo: true, repeat: -1, duration: 1300, ease: 'Sine.easeInOut' })
    const boss = this.add.image(800, 400, 'boss').setScale(0.6).setAlpha(0.9)
    this.tweens.add({ targets: boss, y: 388, yoyo: true, repeat: -1, duration: 1600, ease: 'Sine.easeInOut' })

    txt(this, W / 2, H - 18, 'Звук включится после первого нажатия · Кликни по игре, если клавиши не работают', 12, CSS.dim).setOrigin(0.5, 1)
    this.input.keyboard?.on('keydown', () => this.unlockAudio())
    this.input.on('pointerdown', () => this.unlockAudio())

    this.buildMenu()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.removeAllListeners('keydown')
      this.menu?.destroy()
      this.menu = null
    })
    if (Sfx) Sfx.playMusic(2)
  }

  private unlockAudio(): void {
    Sfx.unlock()
    Sfx.playMusic(2)
  }

  private makeCard(x: number, y: number, seed: number): Phaser.GameObjects.Container {
    const c = this.add.container(x, y)
    const g = this.add.graphics()
    const col = CARD_COLORS[seed % CARD_COLORS.length] ?? COLORS.pink
    g.fillStyle(0x1d1830, 1).fillRoundedRect(-100, -80, 200, 160, 14)
    g.fillStyle(col, 0.35).fillRoundedRect(-92, -72, 184, 100, 10)
    g.fillStyle(0xffffff, 0.9).fillTriangle(-12, -40, -12, -8, 16, -24)
    g.fillStyle(0xffffff, 0.25).fillRect(-90, 38, 140, 8).fillRect(-90, 54, 100, 8)
    g.lineStyle(2, col, 0.8).strokeRoundedRect(-100, -80, 200, 160, 14)
    const heart = txt(this, 76, 44, '♥', 22, CSS.pink).setOrigin(0.5)
    const label = txt(this, -90, 32, CARD_TITLES[seed % CARD_TITLES.length] ?? '', 11, CSS.white)
    c.add([g, heart, label])
    return c
  }

  private buildMenu(): void {
    this.menu?.destroy()
    const items = [
      ...(Store.hasSave() ? [{ label: () => `Продолжить (уровень ${Store.snap?.level ?? 1})`, action: () => this.go(false) }] : []),
      { label: () => 'Начать игру', action: () => (Store.hasSave() ? this.confirmNew() : this.go(true)) },
      { label: () => 'Управление', action: () => this.showControls() },
      { label: () => 'Звук', action: () => this.showSound() },
      { label: () => 'Скачать игру (ZIP)', action: () => void this.download() },
      ...(publishHook() ? [{ label: () => 'Опубликовать на GitHub', action: () => void this.publish() }] : []),
      { label: () => 'Выход', action: () => this.showExit() },
    ]
    this.menu = new MenuList(this, W / 2, 172, items, { width: 360, size: 18, gap: 6 })
  }

  private async publish(): Promise<void> {
    const hook = publishHook()
    if (!hook || this.zipping) return
    this.zipping = true
    const note = txt(this, W / 2, H - 44, 'Публикую файлы на GitHub...', 15, CSS.yellow, { big: true, stroke: 4 }).setOrigin(0.5, 1).setDepth(9999)
    try {
      const msg = await hook((s) => note.setText(s))
      note.setText(msg).setColor(CSS.green)
    } catch (e) {
      note.setText(`Ошибка публикации: ${e instanceof Error ? e.message : String(e)}`).setColor(CSS.red)
    }
    this.time.delayedCall(8000, () => note.destroy())
    this.zipping = false
  }

  private zipping = false
  private async download(): Promise<void> {
    if (this.zipping) return
    this.zipping = true
    const note = txt(this, W / 2, H - 44, 'Упаковываю ленту в архив...', 15, CSS.yellow, { big: true, stroke: 4 }).setOrigin(0.5, 1).setDepth(9999)
    try {
      const n = await downloadGameZip()
      note.setText(`Готово: eshche-odno-video.zip (${n} файлов). Если скачивание не началось — открой приложение в отдельной вкладке.`).setColor(CSS.green)
    } catch (e) {
      note.setText(`Не удалось собрать архив: ${e instanceof Error ? e.message : String(e)}`).setColor(CSS.red)
    }
    this.time.delayedCall(6000, () => note.destroy())
    this.zipping = false
  }

  private go(fresh: boolean): void {
    if (this.starting) return
    this.starting = true
    Sfx.unlock()
    if (fresh) Store.newGame()
    else Store.continueGame()
    Sfx.play('swipe')
    this.cameras.main.fadeOut(500, 255, 255, 255)
    this.time.delayedCall(520, () => this.scene.start('Game'))
  }

  private openOverlay(title: string, lines: string[], buttons: { label: () => string; action?: () => void; adjust?: (d: number) => void }[], h = 380): void {
    this.closeOverlay()
    this.menu?.destroy()
    this.menu = null
    const root = this.add.container(0, 0).setDepth(9500)
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x07050d, 0.8).setInteractive()
    const g = this.add.graphics()
    const top = (H - h) / 2
    panel(g, W / 2 - 330, top, 660, h, COLORS.cyan)
    const t = txt(this, W / 2, top + 20, title, 32, CSS.cyan, { big: true, stroke: 6 }).setOrigin(0.5, 0)
    const body = txt(this, W / 2 - 300, top + 70, lines.join('\n'), 17, CSS.white, { wrap: 600 })
    body.setLineSpacing(6)
    root.add([dim, g, t, body])
    const menu = new MenuList(this, W / 2, top + h - 30 - buttons.length * 54, buttons, { width: 340, size: 20, depth: 9600 })
    this.overlay = { root, menu }
  }

  private closeOverlay(): void {
    if (!this.overlay) return
    this.overlay.menu?.destroy()
    this.overlay.root.destroy()
    this.overlay = null
  }

  private back = (): void => {
    this.closeOverlay()
    this.buildMenu()
  }

  private showControls(): void {
    this.openOverlay('УПРАВЛЕНИЕ', [
      'WASD / стрелки — движение',
      'SPACE — рывок (во время рывка ты неуязвим, ломает стены «тонко»)',
      'E — Могание: дуэль ауры с подходящим персонажем.',
      '      Без цели рядом — аура-волна (тратит 20 ауры)',
      'F — говорить, читать, нажимать',
      'Esc — пауза      1-4 / W,S + F — выбор ответа в диалоге',
      '',
      'В дуэли смотри на подсказку под ареной: зелёная зона, кольца,',
      'уклон SPACE → контр-мог E, или «взгляд вниз».',
    ], [{ label: () => 'Понятно', action: this.back }], 420)
  }

  private showSound(): void {
    this.openOverlay('ЗВУК', ['Все звуки синтезируются прямо в браузере.', 'A / D или клик по кнопке — изменить значение.'], [...soundItems(), { label: () => 'Назад', action: this.back }], 360)
  }

  private showExit(): void {
    this.openOverlay('ВЫХОД', [
      'Браузер не разрешает игре закрыть вкладку самостоятельно.',
      'Просто закрой её сам — прогресс сохраняется на контрольных точках.',
      '',
      'Алгоритм уважает твой выбор. (Нет.)',
    ], [{ label: () => 'Вернуться в ленту', action: this.back }], 330)
  }

  private confirmNew(): void {
    this.openOverlay('НАЧАТЬ ЗАНОВО?', ['Текущее сохранение будет перезаписано.', 'Вся аура, фрагменты и дипломы сгорят. Как сторис через 24 часа.'], [
      { label: () => 'Да, с чистого листа', action: () => { this.closeOverlay(); this.go(true) } },
      { label: () => 'Нет, назад', action: this.back },
    ], 330)
  }

  update(_t: number, delta: number): void {
    const dt = Math.min(delta / 1000, 0.05)
    this.t += dt
    this.ctrl.update()
    for (const c of this.cards) {
      c.y -= (c.getData('speed') as number) * dt
      if (c.y < -100) c.y += 4 * 190
    }
    const [a, b] = this.titleLayers
    if (a && b) {
      const j = Math.random() < 0.08 ? 8 : 2
      a.setPosition(W / 2 - j, 92 + Math.sin(this.t * 20))
      b.setPosition(W / 2 + j, 92 - Math.sin(this.t * 17))
    }
    if (this.overlay) {
      if (this.ctrl.take('ESC')) { this.back(); return }
      this.overlay.menu?.update(this.ctrl)
    } else this.menu?.update(this.ctrl)
  }
}
