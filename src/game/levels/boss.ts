// Final boss «Рекомендатор»: four phases that remix every mechanic learned before.

import * as Phaser from 'phaser'
import { COLORS, CSS, FONT_BIG, TILE } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { Enemy } from '../entities/enemies'
import type { DuelConfig } from '../ui/duel'

const ARENA = { x0: 5 * TILE, x1: 35 * TILE, y0: 4 * TILE, y1: 15 * TILE }
const BOSS_X = 20 * TILE
const BOSS_Y = 96

const PHASES = [
  { title: 'БЕСКОНЕЧНАЯ ЛЕНТА', hp: 3 },
  { title: 'NPC-АРМИЯ', hp: 2 },
  { title: 'ТРЕНД — ТЫ', hp: 2 },
  { title: 'ЕЩЁ ОДНО ВИДЕО', hp: 1 },
]

const BARKS: string[][] = [
  ['Смотри! Ещё! Ещё! ЕЩЁ!', 'Это видео тебе точно понравится!', 'Свайпай, свайпай, свайпай!', 'Удержание аудитории: максимальное!'],
  ['Мои NPC непобедимы! Они повторяют одно и то же!', 'Клонирую тренд! Клонирую тренд!', 'Каждый клон — новый подписчик!'],
  ['Смотри — это ТЫ! Самый вирусный ты!', 'Лайк себе! Лайк себе!', 'Ты — контент. Контент не уходит домой.'],
  ['Ещё одно... последнее...', 'Тебе же интересно, чем кончится?', 'Всего 15 секунд. Ну 30. Ну час.', 'Ты же не закроешь меня... правда?'],
]

export class Boss {
  private g: GameScene
  phase = 0
  private hp = 0
  private img: Phaser.GameObjects.Image
  private eye: Phaser.GameObjects.Graphics
  private face: Phaser.GameObjects.Image
  private screenText: Phaser.GameObjects.Text
  private t = 0
  private ringT = 4
  private ring: Phaser.GameObjects.Image | null = null
  private ringLife = 0
  private spawnT = 1
  private shotT = 1.5
  private barkT = 3
  private clones: Enemy[] = []
  private kills = 0
  private watch: Phaser.GameObjects.Image | null = null
  private adT = 1
  private p4T = 0
  private skipped = false
  private confused = false
  busy = false
  active = false

  constructor(g: GameScene) {
    this.g = g
    this.img = g.add.image(BOSS_X, BOSS_Y, 'boss').setDepth(6000)
    this.eye = g.add.graphics().setDepth(6001)
    this.face = g.add.image(BOSS_X, BOSS_Y - 6, 'hero_0').setScale(0.75).setDepth(6001).setVisible(false)
    this.screenText = g.add.text(BOSS_X, BOSS_Y - 8, '', { fontFamily: FONT_BIG, fontSize: '22px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setDepth(6002)
    g.tweens.add({ targets: this.img, y: BOSS_Y + 6, yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.easeInOut' })
  }

  async start(phase: number): Promise<void> {
    this.active = true
    await this.enterPhase(phase, true)
  }

  private async enterPhase(n: number, first: boolean): Promise<void> {
    const g = this.g
    this.busy = true
    g.setMode('cutscene')
    g.bullets.clear()
    this.clearClones()
    this.removeRing()
    this.phase = n
    const ph = PHASES[n - 1] ?? PHASES[0]!
    this.hp = ph.hp
    this.kills = 0
    this.timers = {}
    this.ringT = 4
    this.spawnT = 1
    this.shotT = 1.5
    if (n > 1) g.persistFlag(`boss_p${n}`)
    Sfx.play('phase')
    g.cameras.main.shake(400, 0.012)
    g.cameras.main.flash(300, 255, 46, 136)
    if (!first || n > 1) {
      const pre = [
        [],
        ['ВНИМАНИЕ, ИНТЕРНЕТ! СЕЙЧАС ПРОИЗОЙДЁТ САМАЯ ВАЖНАЯ СМЕНА ФАЗЫ В ИСТОРИИ ЧЕЛОВЕЧЕСТВА!', 'Включаю NPC-армию! Новое правило: могать, только когда я моргаю! ...Нет. Когда НЕ моргаю. ...Короче, когда смотрю вниз. Я сам запутался.'],
        ['Это не финальная фаза. Это финальная фаза ПЕРЕД финальной. Чувствуете разницу? Я — да.', 'Новый тренд — ТЫ! Смотри, какой ты вирусный!'],
        ['...Ладно. Стоп. Давай без драки.', 'Просто... ещё одно видео. Последнее. Честно-честно.', 'Иди сюда. Нажми «смотреть». Тебе понравится. Я знаю. Я всегда знаю.'],
      ][n - 1] ?? []
      if (pre.length) await g.say('РЕКОМЕНДАТОР', pre, 'bossface')
    }
    const subs = [
      'Уворачивайся от видео (рывок сквозь них тоже работает). Встань в МОГ-КОЛЬЦО и жми E.',
      'Разгони клонов аура-волной (E без цели). Когда клонов станет меньше — появится кольцо.',
      'Лайки летят в тебя. Кольцо: уклонись (SPACE), потом контр-мог (E).',
      'НЕ жми E. Не поддавайся притяжению. Доберись до крестика внизу слева и нажми F.',
    ]
    await g.banner(`ФАЗА ${n}: ${ph.title}`, subs[n - 1] ?? '', CSS.pink, 2200)
    if (n === 4) this.setupFinal()
    this.updateBar()
    this.busy = false
    g.setMode('play')
  }

  private updateBar(): void {
    const ph = PHASES[this.phase - 1]
    if (!ph) return
    this.g.hud.setBoss(`РЕКОМЕНДАТОР — ФАЗА ${this.phase}/4`, this.phase === 4 ? 1 : this.hp / ph.hp)
  }

  private setupFinal(): void {
    const g = this.g
    this.watch = g.add.image(BOSS_X, 6 * TILE + 20, 'watch').setDepth(5500)
    g.tweens.add({ targets: this.watch, scale: 1.08, yoyo: true, repeat: -1, duration: 500 })
    const btn = g.add.image(6 * TILE + 24, 13 * TILE + 24, 'closeBtn').setDepth(5500).setScale(0.8)
    g.tweens.add({ targets: btn, angle: 10, yoyo: true, repeat: -1, duration: 300 })
    g.world.interactables.push({ x: btn.x, y: btn.y - 16, label: 'F — ЗАКРЫТЬ ПРИЛОЖЕНИЕ', id: 'close', kind: 'switch', img: btn })
    this.p4T = 0
    this.adT = 1.5
    g.setObjective('НЕ смотри. Доберись до ✕ и нажми F.')
  }

  /** Arena-wide pull toward the "watch" button in the final phase. */
  pull(): { x: number; y: number } {
    if (this.phase !== 4 || !this.watch || this.busy) return { x: 0, y: 0 }
    const p = this.g.player
    const dx = this.watch.x - p.x
    const dy = this.watch.y - p.y
    const d = Math.hypot(dx, dy) || 1
    const f = this.skipped ? 80 : 150
    return { x: (dx / d) * f, y: (dy / d) * f }
  }

  update(dt: number): void {
    if (!this.active) return
    this.t += dt
    this.drawScreen()
    if (this.busy || this.g.mode !== 'play') return
    const g = this.g
    this.barkT -= dt
    if (this.barkT <= 0) {
      this.barkT = 4 + Math.random() * 2
      const list = BARKS[this.phase - 1] ?? []
      g.fx.floatText(BOSS_X + Phaser.Math.Between(-140, 140), BOSS_Y + 120, list[Math.floor(Math.random() * list.length)] ?? '', CSS.cyan, 16)
    }
    if (this.ring) {
      this.ringLife -= dt
      if (this.ringLife <= 0) this.removeRing()
    }
    switch (this.phase) {
      case 1:
        this.every('wall', dt, 2.3, () => this.feedWall(150, 0))
        this.ringT -= dt
        if (this.ringT <= 0 && !this.ring) { this.ringT = 4.5; this.spawnRing() }
        break
      case 2: {
        this.every('wall', dt, 4, () => this.feedWall(120, 0))
        this.spawnT -= dt
        const alive = this.clones.filter((c) => c.alive)
        for (const c of this.clones) if (!c.alive && !c.sprite.getData('counted')) { c.sprite.setData('counted', true); this.kills++ }
        if (this.spawnT <= 0 && alive.length < 5) { this.spawnT = 2.4; this.spawnClone() }
        if (this.kills >= 4 && !this.ring) { this.kills = 0; this.spawnRing() }
        if (this.hp === 1 && !this.confused) { this.confused = true; void this.fakePhase() }
        break
      }
      case 3:
        this.every('wall', dt, 3.2, () => this.feedWall(140, Math.random() < 0.5 ? -70 : 70))
        this.shotT -= dt
        if (this.shotT <= 0) {
          this.shotT = 1.4
          const p = g.player
          const a = Math.atan2(p.y - 20 - (BOSS_Y + 110), p.x - BOSS_X)
          for (const da of [-0.25, 0, 0.25]) g.bullets.fire(BOSS_X, BOSS_Y + 110, Math.cos(a + da) * 210, Math.sin(a + da) * 210, 'likeShot', 4, true)
          Sfx.play('shoot', 1.3)
        }
        this.ringT -= dt
        if (this.ringT <= 0 && !this.ring) { this.ringT = 5; this.spawnRing() }
        break
      case 4:
        this.p4T += dt
        if (!this.skipped) {
          this.adT -= dt
          if (this.adT <= 0) {
            this.adT = 1.5
            const row = Phaser.Math.Between(6, 13) * TILE + 24
            const fromLeft = Math.random() < 0.5
            g.bullets.fire(fromLeft ? ARENA.x0 + 70 : ARENA.x1 - 70, row, fromLeft ? 170 : -170, 0, 'ad', 8)
          }
          if (this.p4T > 7) void this.skipReturns()
        }
        break
    }
  }

  private timers: Record<string, number> = {}
  private every(key: string, dt: number, period: number, fn: () => void): void {
    const v = (this.timers[key] ?? period * 0.6) - dt
    if (v <= 0) { fn(); this.timers[key] = period } else this.timers[key] = v
  }

  private feedWall(vy: number, vx: number): void {
    const cols = 30
    const gap = Phaser.Math.Between(0, cols - 3)
    for (let c = 0; c < cols; c++) {
      if (c >= gap && c < gap + 3) continue
      this.g.bullets.fire(ARENA.x0 + c * TILE + 24, ARENA.y0 + 26, vx, vy, 'card', 6)
    }
    Sfx.play('shoot', 0.8)
  }

  private spawnRing(): void {
    const g = this.g
    let x = 0
    let y = 0
    for (let i = 0; i < 10; i++) {
      x = Phaser.Math.Between(ARENA.x0 + 80, ARENA.x1 - 80)
      y = Phaser.Math.Between(ARENA.y0 + 140, ARENA.y1 - 80)
      if (Phaser.Math.Distance.Between(x, y, g.player.x, g.player.y) > 160) break
    }
    this.ring = g.add.image(x, y, 'ring').setDepth(-500).setAlpha(0)
    g.tweens.add({ targets: this.ring, alpha: 1, duration: 200 })
    g.tweens.add({ targets: this.ring, scale: 1.12, yoyo: true, repeat: -1, duration: 350 })
    this.ringLife = 6
    Sfx.play('checkpoint')
    g.toast('МОГ-КОЛЬЦО! Встань в него и жми E', CSS.yellow)
  }

  private removeRing(): void {
    this.ring?.destroy()
    this.ring = null
  }

  private spawnClone(): void {
    const g = this.g
    const x = Phaser.Math.Between(ARENA.x0 + 60, ARENA.x1 - 60)
    const y = ARENA.y0 + 150
    const e = g.spawnEnemy('clone', x, y)
    this.clones.push(e)
    g.fx.burst(x, y - 20, COLORS.purple, 10, 120, 400)
  }

  private clearClones(): void {
    for (const c of this.clones) if (c.alive) { c.alive = false; c.sprite.disableBody(true, true) }
    this.clones = []
  }

  /** Called by the level when E is pressed. Returns true if consumed. */
  onMog(): boolean {
    if (!this.active || this.busy) return false
    const g = this.g
    if (this.phase === 4) {
      Sfx.play('error')
      g.fx.floatText(g.player.x, g.player.y - 60, '+1 ПРОСМОТР', CSS.pink, 20)
      g.toast('Ты моганул видео. Видео моганулo тебя в ответ. (Не жми E!)', CSS.red)
      g.hurt(1, g.player.x, g.player.y + 50)
      return true
    }
    if (!this.ring) return false
    if (Phaser.Math.Distance.Between(this.ring.x, this.ring.y, g.player.x, g.player.y - 10) > 56) return false
    this.removeRing()
    void this.ringDuel()
    return true
  }

  private async ringDuel(): Promise<void> {
    const g = this.g
    const base = { name: 'РЕКОМЕНДАТОР', tex: 'bossface', taunts: ['Пролистано!', 'Не интересно. Следующий!', 'Твоё удержание: 0,3 секунды.'], hurt: ['МОИ МЕТРИКИ!', 'Удержание падает!', 'Это... не рекомендовано!'] }
    const cfgs: DuelConfig[] = [
      { ...base, kinds: ['timing'], hits: 1, lives: 1, speed: 1.15, rule: 'Быстрый мог: одно точное попадание в зону.', win: 'АЙ! Это был дизлайк?!', lose: 'Ха! Пролистано!' },
      { ...base, kinds: ['observe'], hits: 2, lives: 2, speed: 1.1, rule: 'Он путается в правилах, но правда одна: E — когда взгляд ВНИЗ.', win: 'Как ты понял моё правило?! Я сам его не понял!', lose: 'Правила поменялись! Опять!' },
      { ...base, kinds: ['dodge', 'sequence'], hits: 2, lives: 2, speed: 1.25, rule: 'Уклон (SPACE) → контр-мог (E). Или кольца. Он сам не решил.', win: 'Мой собственный тренд... моганул меня!', lose: 'Ты — контент! Контент не побеждает!' },
    ]
    const cfg = cfgs[this.phase - 1]
    if (!cfg) return
    const win = await g.duel(cfg)
    g.bullets.clear()
    if (!win || !this.active) return
    this.hp--
    Sfx.play('boss')
    g.cameras.main.shake(300, 0.015)
    this.img.setTint(0xff5c7a)
    g.time.delayedCall(250, () => this.img.clearTint())
    g.fx.burst(BOSS_X, BOSS_Y + 40, COLORS.pink, 30, 300, 700, 'spark')
    this.updateBar()
    if (this.hp <= 0) await this.enterPhase(this.phase + 1, false)
  }

  private async fakePhase(): Promise<void> {
    const g = this.g
    this.busy = true
    g.setMode('cutscene')
    await g.banner('ФАЗА 3!', 'Величайшая смена фазы в истории!', CSS.pink, 900)
    await g.say('РЕКОМЕНДАТОР', ['...Стоп. Это всё ещё вторая. Отменяю.', 'Монтажёр, вырежи это. Монтажёр? У меня нет монтажёра. Я и есть монтажёр.'], 'bossface')
    this.busy = false
    g.setMode('play')
  }

  private async skipReturns(): Promise<void> {
    const g = this.g
    if (this.skipped) return
    this.skipped = true
    this.busy = true
    g.setMode('cutscene')
    const skip = g.add.image(g.player.x - 60, g.player.y - 400, 'skip_0').setScale(0.5).setOrigin(0.5, 0.85).setDepth(9000)
    g.tweens.add({ targets: skip, y: g.player.y - 20, duration: 600, ease: 'Bounce.easeOut' })
    await g.wait(650)
    await g.say('СКИП', ['ЭЙ! РЕКОМЕНДАТОР!', 'Я перечитал контракт. Мелким шрифтом: «Кнопка Пропустить имеет право пропустить что угодно».', 'Даже рекламу. Даже тебя. ПРОПУСКАЮ!'], 'skip')
    g.bullets.clear()
    Sfx.play('swipe')
    g.cameras.main.flash(300, 255, 255, 255)
    await g.say('РЕКОМЕНДАТОР', ['НЕТ! Мою рекламу нельзя пропустить! Она же на 15 секунд! И ещё 15! И ещё!'], 'bossface')
    await g.say('СКИП', ['Беги к крестику! Притяжение я ослабил. Закрой его!'], 'skip')
    g.tweens.add({ targets: skip, x: skip.x - 40, alpha: 0.85, duration: 300 })
    this.busy = false
    g.setMode('play')
  }

  async close(): Promise<void> {
    const g = this.g
    if (this.phase !== 4 || this.busy) return
    this.busy = true
    g.setMode('cutscene')
    g.bullets.clear()
    this.watch?.destroy()
    this.watch = null
    Sfx.play('vineBoom')
    await g.say('РЕКОМЕНДАТОР', ['Ты... просто... закрыл?', 'Без лайка? Без коммента? Без... досмотра?', 'Это... не... по... ал-го-рит-му...'], 'bossface')
    g.hud.setBoss(null)
    for (let i = 0; i < 6; i++) {
      g.time.delayedCall(i * 220, () => {
        Sfx.play('kill')
        g.fx.burst(BOSS_X + Phaser.Math.Between(-150, 150), BOSS_Y + Phaser.Math.Between(-60, 80), i % 2 ? COLORS.cyan : COLORS.pink, 24, 300, 800, 'spark')
        g.cameras.main.shake(200, 0.02)
      })
    }
    g.tweens.add({ targets: [this.img, this.screenText], scale: 0, angle: 30, alpha: 0, delay: 900, duration: 900, ease: 'Cubic.easeIn' })
    this.eye.clear()
    this.face.setVisible(false)
    await g.wait(2000)
    await g.say('ТЫ', ['...Пока.'])
    this.active = false
    g.finishGame()
  }

  private drawScreen(): void {
    const e = this.eye
    e.clear()
    if (!this.img.visible || this.img.alpha < 0.1) return
    const cx = BOSS_X
    const cy = this.img.y - 8
    this.face.setPosition(cx, cy + 34).setVisible(this.phase === 3 && !this.busy)
    if (this.phase === 4) {
      this.screenText.setPosition(cx, cy).setText('ЕЩЁ\nОДНО?')
      return
    }
    this.screenText.setText('')
    if (this.phase === 3 && !this.busy) return
    const p = this.g.player
    const a = Math.atan2(p.y - cy, p.x - cx)
    const blink = Math.sin(this.t * 1.7) > 0.97
    e.fillStyle(0xffffff, 1).fillEllipse(cx, cy, 110, blink ? 6 : 64)
    if (!blink) {
      e.fillStyle(COLORS.pink, 1).fillCircle(cx + Math.cos(a) * 26, cy + Math.sin(a) * 14, 20)
      e.fillStyle(0x120f1c, 1).fillCircle(cx + Math.cos(a) * 28, cy + Math.sin(a) * 15, 9)
      e.fillStyle(0xffffff, 1).fillCircle(cx + Math.cos(a) * 28 + 5, cy + Math.sin(a) * 15 - 5, 4)
    }
  }
}
