// "Могание" duel overlay. One duel = several rounds; every round uses one of the
// mini-mechanics below. Configs mix kinds to build unique opponents.

import * as Phaser from 'phaser'
import { COLORS, CSS, H, MOG, W } from '../config'
import type { Controls } from '../controls'
import { Sfx } from '../audio'
import { Fx } from '../fx'
import { txt } from './widgets'

export type DuelKind = 'timing' | 'rhythm' | 'sequence' | 'dodge' | 'observe'

export interface DuelConfig {
  name: string
  tex: string
  kinds: DuelKind[]
  hits: number
  lives?: number
  speed?: number
  rule?: string
  tutorial?: boolean
  taunts?: string[]
  hurt?: string[]
  win?: string
  lose?: string
}

type Outcome = 'pending' | 'hit' | 'miss'

const HIT_POPS = ['+1000 АУРЫ', 'МОГНУТ!', 'СИГМА-МОМЕНТ', 'ЧЕЛЮСТЬ: ОСТРАЯ', 'АУРА +∞', 'ВЗГЛЯД УРОВНЯ БОСС']
const MISS_POPS = ['-1000 АУРЫ', 'КРИНЖ', 'АУРА НЕ ПРОШЛА ПРОВЕРКУ', 'СКИЛЛ ИШЬЮ', 'НЕ ТОТ ВАЙБ']
const DEFAULT_TAUNTS = ['Твоя аура не прошла проверку.', 'Система обнаружила недостаток сигма-энергии.', 'Это всё? Я даже не моргнул.']
const DEFAULT_HURT = ['Ой. Это было мощно.', 'Моя самооценка упала на 3 пункта.', 'Как ты это сделал глазами?!']

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)] as T

export class Duel {
  private ui: Phaser.Scene
  private cfg: DuelConfig
  private root: Phaser.GameObjects.Container
  private g: Phaser.GameObjects.Graphics
  private lines: Phaser.GameObjects.Graphics
  private hero: Phaser.GameObjects.Image
  private foe: Phaser.GameObjects.Image
  private bubble: Phaser.GameObjects.Text
  private info: Phaser.GameObjects.Text
  private big: Phaser.GameObjects.Text
  private fx: Fx
  private resolve: ((win: boolean) => void) | null = null
  private phase: 'intro' | 'round' | 'between' | 'end' = 'intro'
  private timer = 0
  private hitsDone = 0
  private lives: number
  private kind: DuelKind = 'timing'
  private win = false
  private mult: number
  private speed: number
  private t = 0
  // round state
  private pos = 0
  private dir = 1
  private sweep = 1
  private zoneC = 0.5
  private zoneW = 0.2
  private rhythmT = 0
  private ringR = 0
  private ringDur = 1
  private dodgeState: 'wait' | 'windup' | 'strike' | 'counter' = 'wait'
  private dodgeT = 0
  private feint = false
  private tell: 'stare' | 'blink' | 'side' | 'down' | 'up' = 'stare'
  private tellT = 0
  private sinceReal = 0

  constructor(ui: Phaser.Scene, cfg: DuelConfig, glasses: boolean) {
    this.ui = ui
    this.cfg = cfg
    this.mult = glasses ? MOG.glassesBonus : 1
    this.speed = cfg.speed ?? 1
    this.lives = cfg.lives ?? 3
    this.fx = new Fx(ui)
    this.root = ui.add.container(0, 0).setDepth(400)
    const back = ui.add.rectangle(W / 2, H / 2, W, H, 0x08060f, 0.9).setInteractive()
    this.lines = ui.add.graphics().setPosition(W / 2, H / 2)
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2
      this.lines.fillStyle(i % 2 ? COLORS.pink : COLORS.purple, 0.12)
      this.lines.fillTriangle(0, 0, Math.cos(a) * 900, Math.sin(a) * 900, Math.cos(a + 0.09) * 900, Math.sin(a + 0.09) * 900)
    }
    this.g = ui.add.graphics()
    this.hero = ui.add.image(-200, 300, 'hero_0').setScale(1.7)
    this.foe = ui.add.image(W + 200, 300, `${cfg.tex}_0`).setScale(1.7).setFlipX(true)
    const title = txt(ui, W / 2, 30, 'МОГ-ДУЭЛЬ', 44, CSS.pink, { big: true, stroke: 8 }).setOrigin(0.5, 0)
    const rule = txt(ui, W / 2, 86, cfg.rule ?? '', 16, CSS.yellow, { align: 'center', wrap: 560 }).setOrigin(0.5, 0)
    const names = [
      txt(ui, 160, 420, 'ТЫ', 22, CSS.cyan, { big: true, stroke: 5 }).setOrigin(0.5),
      txt(ui, W - 160, 420, cfg.name, 20, CSS.pink, { big: true, stroke: 5, align: 'center', wrap: 260 }).setOrigin(0.5),
    ]
    this.bubble = txt(ui, W - 160, 150, '', 16, CSS.white, { align: 'center', wrap: 250, stroke: 4 }).setOrigin(0.5)
    this.info = txt(ui, W / 2, 360, '', 18, CSS.white, { align: 'center', wrap: 480, big: true, stroke: 4 }).setOrigin(0.5)
    this.big = txt(ui, W / 2, 190, '', 46, CSS.yellow, { big: true, stroke: 8, align: 'center' }).setOrigin(0.5).setAlpha(0)
    this.root.add([back, this.lines, this.g, this.hero, this.foe, title, rule, ...names, this.bubble, this.info, this.big])
    ui.tweens.add({ targets: this.hero, x: 160, duration: 380, ease: 'Back.easeOut' })
    ui.tweens.add({ targets: this.foe, x: W - 160, duration: 380, ease: 'Back.easeOut' })
    ui.tweens.add({ targets: title, scale: { from: 2.2, to: 1 }, duration: 300, ease: 'Back.easeOut' })
    this.say('...')
    Sfx.play('mogStart')
  }

  run(): Promise<boolean> {
    return new Promise((res) => { this.resolve = res })
  }

  private say(s: string): void {
    this.bubble.setText(`«${s}»`)
    this.ui.tweens.add({ targets: this.bubble, scale: { from: 1.25, to: 1 }, duration: 160 })
  }

  private pop(s: string, color: string): void {
    this.big.setText(s).setColor(color).setAlpha(1).setScale(0.4)
    this.ui.tweens.killTweensOf(this.big)
    this.ui.tweens.add({ targets: this.big, scale: 1, duration: 220, ease: 'Back.easeOut' })
    this.ui.tweens.add({ targets: this.big, alpha: 0, delay: 700, duration: 300 })
  }

  private startRound(): void {
    const kinds = this.cfg.kinds
    this.kind = kinds.length === 1 ? (kinds[0] as DuelKind) : pick(kinds)
    this.phase = 'round'
    const s = this.speed
    switch (this.kind) {
      case 'timing':
      case 'rhythm':
        this.pos = Math.random() < 0.5 ? 0 : 1
        this.dir = this.pos === 0 ? 1 : -1
        this.sweep = 0.75 * s
        this.zoneW = Math.max(0.08, (this.kind === 'timing' ? 0.2 : 0.18) * (1 - this.hitsDone * 0.08)) * this.mult
        this.zoneC = 0.2 + Math.random() * 0.6
        this.rhythmT = 0.4
        this.info.setText(this.cfg.tutorial ? 'Жми E, когда бегунок в ЗЕЛЁНОЙ зоне' : this.kind === 'rhythm' ? 'Он меняет ритм! E — в зелёной зоне' : 'E — в зелёной зоне')
        break
      case 'sequence':
        this.ringDur = 1.15 / s
        this.ringR = 120
        this.info.setText(this.cfg.tutorial ? 'Кольцо сжимается. Жми E, когда оно совпадёт с белым кругом' : `Серия взглядов ${this.hitsDone + 1}/${this.cfg.hits} — E на совпадении`)
        break
      case 'dodge':
        this.dodgeState = 'wait'
        this.dodgeT = 0.5 + Math.random() * 1.0
        this.ui.tweens.killTweensOf(this.big)
        this.big.setAlpha(0)
        this.info.setText(this.cfg.tutorial ? 'Он атакует аурой. SPACE — увернуться, затем сразу E — контр-мог' : 'Жди атаку → SPACE → E')
        break
      case 'observe':
        this.tell = 'stare'
        this.tellT = 0.6 + Math.random() * 0.6
        this.sinceReal = 0
        this.info.setText(this.cfg.tutorial ? 'Следи за глазами. E — только когда он отвёл взгляд ВНИЗ' : 'Крупный план. Жди нужный момент.')
        break
    }
  }

  private outcome(o: Outcome, msg?: string): void {
    if (o === 'pending') return
    this.phase = 'between'
    this.timer = 0.75
    if (o === 'hit') {
      this.hitsDone++
      Sfx.play('mogHit', 1 + this.hitsDone * 0.08)
      this.pop(pick(HIT_POPS), CSS.yellow)
      this.say(pick(this.cfg.hurt ?? DEFAULT_HURT))
      this.ui.cameras.main.flash(120, 255, 240, 200)
      this.ui.cameras.main.shake(160, 0.012)
      this.fx.burst(W - 160, 280, COLORS.yellow, 24, 260, 600, 'spark', 450)
      this.fx.ring(160, 300, COLORS.yellow, 160, 500, 450, 8)
      this.ui.tweens.add({ targets: this.foe, angle: { from: -12, to: 0 }, x: { from: W - 120, to: W - 160 }, duration: 260 })
      this.ui.tweens.add({ targets: this.hero, scale: { from: 2, to: 1.7 }, duration: 260 })
    } else {
      this.lives--
      Sfx.play('mogMiss')
      this.pop(msg ?? pick(MISS_POPS), CSS.red)
      this.say(pick(this.cfg.taunts ?? DEFAULT_TAUNTS))
      this.ui.cameras.main.shake(220, 0.01)
      this.fx.burst(160, 300, COLORS.red, 14, 200, 500, 'dot', 450)
      this.ui.tweens.add({ targets: this.hero, angle: { from: 10, to: 0 }, x: { from: 120, to: 160 }, duration: 260 })
    }
    if (this.hitsDone >= this.cfg.hits) this.finish(true)
    else if (this.lives <= 0) this.finish(false)
  }

  private finish(win: boolean): void {
    this.win = win
    this.phase = 'end'
    this.timer = 1.7
    this.info.setText('')
    if (win) {
      Sfx.play('mogWin')
      this.say(this.cfg.win ?? 'Ладно... ты победил.')
      this.ui.time.delayedCall(250, () => this.pop('МОГНУТ!', CSS.yellow))
      this.ui.tweens.add({ targets: this.foe, angle: 360, scale: 1.1, alpha: 0.5, duration: 900, ease: 'Cubic.easeIn' })
      this.fx.burst(W - 160, 280, COLORS.pink, 40, 320, 900, 'spark', 450)
    } else {
      Sfx.play('mogLose')
      this.say(this.cfg.lose ?? 'Возвращайся, когда прокачаешь скулы.')
      this.ui.time.delayedCall(250, () => this.pop('ТЕБЯ МОГНУЛИ', CSS.red))
      this.ui.tweens.add({ targets: this.hero, angle: -90, alpha: 0.4, duration: 700 })
    }
  }

  update(dt: number, ctrl: Controls): void {
    this.t += dt
    this.lines.rotation += dt * 0.15
    const e = ctrl.take('E')
    const sp = ctrl.take('SPACE')
    if (this.phase === 'intro') {
      if (this.t > 1.0) this.startRound()
    } else if (this.phase === 'between') {
      this.timer -= dt
      if (this.timer <= 0) this.startRound()
    } else if (this.phase === 'end') {
      this.timer -= dt
      if (this.timer <= 0 && this.resolve) {
        const r = this.resolve
        this.resolve = null
        r(this.win)
      }
    } else {
      this.roundUpdate(dt, e, sp)
    }
    this.draw()
  }

  private roundUpdate(dt: number, e: boolean, sp: boolean): void {
    switch (this.kind) {
      case 'timing':
      case 'rhythm': {
        if (this.kind === 'rhythm') {
          this.rhythmT -= dt
          if (this.rhythmT <= 0) {
            this.rhythmT = 0.35 + Math.random() * 0.5
            this.sweep = (0.35 + Math.random() * 1.25) * this.speed
            if (Math.random() < 0.25) { this.zoneC = 0.15 + Math.random() * 0.7; this.info.setText('ТЕМП СМЕНИЛСЯ!') }
          }
        }
        this.pos += this.dir * this.sweep * dt * 1.6
        if (this.pos >= 1) { this.pos = 1; this.dir = -1 }
        if (this.pos <= 0) { this.pos = 0; this.dir = 1 }
        if (e) this.outcome(Math.abs(this.pos - this.zoneC) <= this.zoneW / 2 ? 'hit' : 'miss')
        if (sp) this.outcome('miss', 'ЭТО НЕ ТА КНОПКА')
        break
      }
      case 'sequence': {
        const target = 36
        const tol = MOG.ringTolerance * this.mult
        this.ringR -= ((120 - target + 20) / this.ringDur) * dt
        if (e) this.outcome(Math.abs(this.ringR - target) <= tol ? 'hit' : 'miss', this.ringR > target ? 'РАНО!' : 'ПОЗДНО!')
        else if (this.ringR < target - tol) this.outcome('miss', 'ПОЗДНО!')
        if (this.phase === 'between' && this.kind === 'sequence') this.timer = 0.25 + Math.random() * 0.35
        break
      }
      case 'dodge': {
        this.dodgeT -= dt
        if (this.dodgeState === 'wait' || this.dodgeState === 'windup') {
          if (e) { this.outcome('miss', 'РАНО! ТЫ МОГНУЛ ВОЗДУХ'); return }
          if (this.dodgeT <= 0) {
            if (this.dodgeState === 'wait') {
              this.dodgeState = 'windup'
              this.feint = this.speed >= 1.15 && Math.random() < 0.3
              this.dodgeT = 0.55 / Math.max(0.8, this.speed * 0.9)
              this.say(pick(['ХААА...', 'Получай ауру!', 'Сейчас будет больно для эго!']))
            } else if (this.feint) {
              this.dodgeState = 'wait'
              this.dodgeT = 0.6 + Math.random() * 0.6
              this.say('...передумал. Это был финт.')
            } else {
              this.dodgeState = 'strike'
              this.dodgeT = MOG.dodgeWindow * this.mult / Math.max(0.85, this.speed * 0.95)
              Sfx.play('hit')
            }
          }
        } else if (this.dodgeState === 'strike') {
          if (sp) { this.dodgeState = 'counter'; this.dodgeT = MOG.counterWindow * this.mult; Sfx.play('dash'); this.info.setText('УВЕРНУЛСЯ! ЖМИ E!') }
          else if (e) this.outcome('miss', 'СНАЧАЛА УВЕРНИСЬ')
          else if (this.dodgeT <= 0) this.outcome('miss', 'ПРИЛЕТЕЛО АУРОЙ')
        } else if (this.dodgeState === 'counter') {
          if (e) this.outcome('hit')
          else if (this.dodgeT <= 0) { this.dodgeState = 'wait'; this.dodgeT = 0.7; this.info.setText('Упустил момент. Ещё раз!') }
        }
        break
      }
      case 'observe': {
        this.tellT -= dt
        if (this.tellT <= 0) {
          if (this.tell !== 'stare') {
            this.tell = 'stare'
            this.tellT = 0.35 + Math.random() * 0.6
          } else {
            this.sinceReal++
            const real = this.sinceReal >= 4 || Math.random() < 0.32
            if (real) { this.tell = 'down'; this.sinceReal = 0 } else this.tell = pick(['blink', 'side', 'up'] as const)
            this.tellT = (this.tell === 'blink' ? 0.35 : MOG.observeShow * this.mult) / this.speed
          }
        }
        if (e) this.outcome(this.tell === 'down' ? 'hit' : 'miss', this.tell === 'stare' ? 'ОН СМОТРЕЛ НА ТЕБЯ' : 'ЭТО БЫЛ ФЕЙК')
        if (sp) this.outcome('miss', 'ЭТО НЕ ТА КНОПКА')
        break
      }
    }
  }

  private draw(): void {
    const g = this.g
    g.clear()
    const cx = W / 2
    const cy = 262
    // progress + lives
    const pw = 360
    g.fillStyle(0x000000, 0.6).fillRoundedRect(cx - pw / 2, 470, pw, 20, 10)
    g.fillStyle(COLORS.yellow, 1).fillRoundedRect(cx - pw / 2 + 2, 472, (pw - 4) * (this.hitsDone / this.cfg.hits), 16, 8)
    g.lineStyle(2, 0xffffff, 0.8).strokeRoundedRect(cx - pw / 2, 470, pw, 20, 10)
    for (let i = 0; i < (this.cfg.lives ?? 3); i++) {
      g.fillStyle(i < this.lives ? COLORS.cyan : 0x333344, 1)
      g.fillCircle(cx - 30 * ((this.cfg.lives ?? 3) - 1) / 2 + i * 30, 510, 9)
    }
    if (this.phase !== 'round' && this.phase !== 'between') return
    switch (this.kind) {
      case 'timing':
      case 'rhythm': {
        const bw = 420
        const x0 = cx - bw / 2
        g.fillStyle(0x000000, 0.7).fillRoundedRect(x0 - 6, cy - 22, bw + 12, 44, 12)
        g.fillStyle(this.kind === 'rhythm' ? COLORS.purple : 0x2a2140, 1).fillRoundedRect(x0, cy - 14, bw, 28, 8)
        g.fillStyle(COLORS.green, 0.9).fillRect(x0 + bw * (this.zoneC - this.zoneW / 2), cy - 14, bw * this.zoneW, 28)
        const px = x0 + bw * this.pos
        g.fillStyle(0xffffff, 0.25).fillRect(px - 8, cy - 26, 16, 52)
        g.fillStyle(0xffffff, 1).fillRect(px - 3, cy - 24, 6, 48)
        break
      }
      case 'sequence': {
        g.lineStyle(6, 0xffffff, 0.9).strokeCircle(cx, cy, 36)
        g.fillStyle(0xffffff, 0.12).fillCircle(cx, cy, 36)
        if (this.phase === 'round') {
          const near = Math.abs(this.ringR - 36) <= MOG.ringTolerance * this.mult
          g.lineStyle(7, near ? COLORS.green : COLORS.pink, 1).strokeCircle(cx, cy, Math.max(4, this.ringR))
        }
        break
      }
      case 'dodge': {
        const s = this.dodgeState
        g.fillStyle(0x000000, 0.6).fillRoundedRect(cx - 170, cy - 50, 340, 100, 16)
        const label = s === 'wait' ? '...' : s === 'windup' ? '!  ЗАМАХ  !' : s === 'strike' ? 'SPACE!' : 'E!'
        const col = s === 'strike' ? COLORS.red : s === 'counter' ? COLORS.green : s === 'windup' ? COLORS.orange : 0x666688
        g.lineStyle(5, col, 1).strokeRoundedRect(cx - 170, cy - 50, 340, 100, 16)
        if (s === 'strike') { g.fillStyle(COLORS.red, 0.35).fillTriangle(W - 240, 300, 240, 260, 240, 340) }
        if (s === 'windup') this.foe.x = W - 160 + Math.sin(this.t * 60) * 5
        if (this.phase === 'round') {
          this.big.setText(label).setColor(s === 'counter' ? CSS.green : s === 'strike' ? CSS.red : CSS.white).setAlpha(s === 'wait' ? 0.4 : 1).setScale(1)
        }
        break
      }
      case 'observe': {
        g.fillStyle(0xf2d2b5, 1).fillRoundedRect(cx - 170, cy - 70, 340, 140, 30)
        g.lineStyle(4, 0x1a1426, 1).strokeRoundedRect(cx - 170, cy - 70, 340, 140, 30)
        const t = this.phase === 'round' ? this.tell : 'stare'
        const eye = (ex: number): void => {
          if (t === 'blink') { g.lineStyle(6, 0x1a1426, 1).lineBetween(ex - 40, cy, ex + 40, cy); return }
          g.fillStyle(0xffffff, 1).fillEllipse(ex, cy, 92, 58)
          g.lineStyle(4, 0x1a1426, 1).strokeEllipse(ex, cy, 92, 58)
          const off = t === 'side' ? { x: 26, y: 0 } : t === 'down' ? { x: 0, y: 16 } : t === 'up' ? { x: -8, y: -16 } : { x: 0, y: 0 }
          g.fillStyle(0x1a1426, 1).fillCircle(ex + off.x, cy + off.y, 15)
          g.fillStyle(0xffffff, 1).fillCircle(ex + off.x + 5, cy + off.y - 5, 4)
        }
        eye(cx - 75)
        eye(cx + 75)
        if (t === 'down') { g.fillStyle(COLORS.cyan, 1).fillCircle(cx + 130, cy - 40, 8); g.fillTriangle(cx + 122, cy - 40, cx + 138, cy - 40, cx + 130, cy - 58) }
        if (this.cfg.tutorial) {
          const cap = t === 'down' ? 'ОТВЁЛ ВЗГЛЯД — СЕЙЧАС!' : t === 'blink' ? 'моргнул (не то)' : t === 'side' ? 'косится вбок (не то)' : t === 'up' ? 'закатил глаза (не то)' : 'смотрит на тебя'
          this.info.setText(cap)
        }
        break
      }
    }
  }

  destroy(): void {
    this.resolve = null
    this.root.destroy()
  }
}
