// Final cutscene + victory screen.

import * as Phaser from 'phaser'
import { COLORS, CSS, FONT_BIG, H, W } from '../config'
import { Controls } from '../controls'
import { Sfx } from '../audio'
import { Store } from '../save'
import { Dialog } from '../ui/dialog'
import { MenuList, panel, txt } from '../ui/widgets'
import { makeTex, rr } from '../art/characters'

export class EndingScene extends Phaser.Scene {
  private ctrl!: Controls
  private dialog!: Dialog
  private menu: MenuList | null = null
  private alive = false
  private leaving = false

  constructor() {
    super('Ending')
  }

  create(): void {
    this.alive = true
    this.leaving = false
    this.menu = null
    this.ctrl = new Controls(this)
    this.dialog = new Dialog(this)
    const stats = { ...Store.run }
    Store.clearSave()
    Sfx.stopMusic()
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { this.alive = false; this.menu?.destroy(); this.dialog.destroy() })

    makeTex(this, 'cat_0', 48, 64, (c) => {
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 60, 14, 4, 0, 0, Math.PI * 2); c.fill()
      c.strokeStyle = '#1a1426'; c.lineWidth = 2
      c.fillStyle = '#ff9f43'; rr(c, 10, 34, 28, 22, 10); c.fill(); c.stroke()
      c.beginPath(); c.moveTo(36, 50); c.quadraticCurveTo(48, 40, 42, 28); c.stroke()
      c.beginPath(); c.arc(24, 26, 12, 0, Math.PI * 2); c.fill(); c.stroke()
      c.beginPath(); c.moveTo(13, 20); c.lineTo(15, 8); c.lineTo(22, 16); c.closePath(); c.fill(); c.stroke()
      c.beginPath(); c.moveTo(35, 20); c.lineTo(33, 8); c.lineTo(26, 16); c.closePath(); c.fill(); c.stroke()
      c.fillStyle = '#111'; rr(c, 13, 22, 9, 5, 2); c.fill(); rr(c, 26, 22, 9, 5, 2); c.fill(); c.fillRect(21, 23.5, 6, 1.5)
      c.fillStyle = '#ff8cc3'; c.beginPath(); c.arc(24, 31, 1.8, 0, Math.PI * 2); c.fill()
    }, 2)

    // --- room ---
    const g = this.add.graphics()
    g.fillStyle(0x2a2140, 1).fillRect(0, 0, W, H)
    g.fillStyle(0x3a2f5a, 1).fillRect(0, 330, W, H - 330)
    g.fillStyle(0x1d1830, 1).fillRect(0, 322, W, 10)
    g.fillStyle(0x0b0820, 1).fillRoundedRect(600, 70, 260, 170, 10)
    g.lineStyle(8, 0x6b5f8f, 1).strokeRoundedRect(600, 70, 260, 170, 10)
    g.lineStyle(4, 0x6b5f8f, 1).lineBetween(730, 70, 730, 240).lineBetween(600, 155, 860, 155)
    for (let i = 0; i < 14; i++) {
      g.fillStyle(i % 3 ? 0xffd23f : 0x22e4ff, 0.8).fillRect(615 + ((i * 47) % 230), 120 + ((i * 31) % 100), 6, 8)
    }
    g.fillStyle(0xffffff, 0.9).fillCircle(820, 100, 14)
    g.fillStyle(0x4a3b6b, 1).fillRect(120, 250, 8, 80)
    g.fillStyle(0xffd23f, 0.25).fillCircle(124, 230, 70)
    g.fillStyle(0xffd23f, 1).fillTriangle(100, 250, 148, 250, 124, 210)
    this.add.text(300, 60, 'ДОМ', { fontFamily: FONT_BIG, fontSize: '16px', color: '#6b5f8f' })
    const couch = this.add.image(W / 2 - 40, 380, 'couch').setScale(2.2)
    const hero = this.add.image(W / 2 - 40, 360, 'hero_0').setScale(0.9).setAngle(-80).setAlpha(1)
    const glow = this.add.circle(W / 2 + 10, 350, 40, COLORS.cyan, 0).setBlendMode(Phaser.BlendModes.ADD)
    void couch
    this.cameras.main.fadeIn(1200, 255, 255, 255)
    void this.script(hero, glow, stats)
  }

  private wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()))
  }

  private async say(who: string, lines: string[], tex: string): Promise<void> {
    if (!this.alive) return new Promise(() => undefined)
    await this.dialog.show(lines.map((text) => ({ who, text, tex })))
  }

  private async script(hero: Phaser.GameObjects.Image, glow: Phaser.GameObjects.Arc, stats: typeof Store.run): Promise<void> {
    await this.wait(1400)
    this.tweens.add({ targets: hero, angle: 0, y: 344, duration: 600, ease: 'Back.easeOut' })
    Sfx.play('vineBoom')
    await this.wait(700)
    await this.say('ТЫ', ['...Я дома?', 'Диван. Окно. Потолок! У меня снова есть потолок!'], 'hero')
    glow.setFillStyle(COLORS.cyan, 0.35)
    Sfx.play('pickup')
    await this.say('ТЕЛЕФОН', ['Экранное время сегодня: 1 видео.', 'Прошло: 0 минут.'], 'none')
    await this.say('ТЫ', ['Ноль минут?.. То есть всё это... было за одно видео?'], 'hero')
    Sfx.play('gift')
    const note = this.add.container(W / 2, -60)
    const ng = this.add.graphics()
    panel(ng, -260, -34, 520, 68, COLORS.pink)
    note.add([ng, txt(this, -240, -22, '🔥 Рекомендовано: «Чел моганул алгоритм и просто закрыл приложение»', 14, CSS.white, { wrap: 480 }), txt(this, -240, 12, '14,8 млн просмотров · 2 млн лайков · 1 коммент от мамы', 12, CSS.yellow)])
    note.setDepth(500)
    this.tweens.add({ targets: note, y: 60, duration: 500, ease: 'Back.easeOut' })
    await this.wait(900)
    await this.say('ТЫ', ['...Это же я.'], 'hero')
    await this.say('СКИП', ['Привет-привет! Я теперь живу у тебя в телефоне. Кнопка «Пропустить» — фрилансер.', 'Рекомендатор ушёл на перезагрузку. Говорит, будет рекомендовать «больше прогулок». Посмотрим.'], 'skip')
    this.tweens.add({ targets: note, y: -80, duration: 400 })
    await this.say('ТЫ', ['Ладно. Одно видео — и спать.'], 'hero')
    Sfx.play('swipe')
    this.cameras.main.shake(300, 0.01)
    await this.wait(700)
    await this.say('ТЫ', ['...', 'Шучу.'], 'hero')
    glow.setFillStyle(COLORS.cyan, 0)
    Sfx.play('confirm')
    await this.wait(600)
    // final callback joke: the lost cat from level 1 comes home
    const cat = this.add.image(-60, 400, 'cat_0').setScale(0.8)
    this.tweens.add({ targets: cat, x: 280, duration: 1500, ease: 'Sine.easeOut' })
    await this.wait(1600)
    await this.say('КОТ', ['*смотрит на тебя через солнечные очки*', '...', 'Это мой третий раз за сегодня.'], 'cat')
    Sfx.play('vineBoom')
    this.cameras.main.flash(200, 255, 255, 255)
    await this.say('ТЫ', ['...У кота два миллиона подписчиков, да?'], 'hero')
    await this.wait(500)
    this.showCredits(stats)
  }

  private showCredits(s: typeof Store.run): void {
    if (!this.alive) return
    const root = this.add.container(0, 0).setDepth(1000)
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x07050d, 0)
    this.tweens.add({ targets: dim, fillAlpha: 0.9, duration: 800 })
    const g = this.add.graphics()
    panel(g, W / 2 - 340, 30, 680, 480, COLORS.yellow)
    const mins = Math.floor(s.playMs / 60000)
    const secs = Math.floor((s.playMs % 60000) / 1000)
    const lines = [
      `Время в ленте: ${mins} мин ${secs} с`,
      `Смертей (SKILL ISSUE): ${s.deaths}`,
      `Выиграно мог-дуэлей: ${s.duelsWon}`,
      `Фрагментов внимания собрано: ${s.totalFragments}`,
      s.upgrades.nft ? 'NFT-пиксель: всё ещё ничего не делает. Спасибо за поддержку.' : 'NFT-пиксель: не куплен. Мудро.',
      '',
      'Ты не победил алгоритм. Ты просто вовремя закрыл приложение.',
      'Иногда это и есть самый сигма-поступок.',
    ]
    root.add([
      dim, g,
      txt(this, W / 2, 50, 'КОНЕЦ', 64, CSS.yellow, { big: true, stroke: 9 }).setOrigin(0.5, 0),
      txt(this, W / 2, 122, '(пока алгоритм не решит иначе)', 16, CSS.dim).setOrigin(0.5, 0),
      txt(this, W / 2 - 300, 160, lines.join('\n'), 17, CSS.white, { wrap: 600 }).setLineSpacing(6),
    ])
    Sfx.play('win')
    this.time.delayedCall(800, () => {
      if (!this.alive) return
      this.menu = new MenuList(this, W / 2, 400, [
        { label: () => 'Новая игра', action: () => { if (this.leaving) return; this.leaving = true; Store.newGame(); this.cameras.main.fadeOut(400); this.time.delayedCall(420, () => this.scene.start('Game')) } },
        { label: () => 'Главное меню', action: () => { if (this.leaving) return; this.leaving = true; this.scene.start('Menu') } },
      ], { width: 320, size: 20, depth: 1100 })
    })
  }

  update(_t: number, delta: number): void {
    this.ctrl.update()
    const dt = Math.min(delta / 1000, 0.05)
    if (this.dialog.open) this.dialog.update(dt, this.ctrl)
    this.menu?.update(this.ctrl)
  }
}
