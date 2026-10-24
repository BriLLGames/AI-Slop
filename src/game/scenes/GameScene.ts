// The level runner. One scene instance plays every level: it builds the world from
// the level definition, runs the player/NPC/enemy systems and exposes a small
// scripting API (say, ask, duel, openGate, ...) used by the level files.

import * as Phaser from 'phaser'
import { COLORS, CSS, THEMES, TILE, TUNING } from '../config'
import { Controls } from '../controls'
import { Fx } from '../fx'
import { Sfx } from '../audio'
import { Store } from '../save'
import { Player } from '../entities/player'
import { Npc } from '../entities/npc'
import { Bullets, Enemy, type EnemyType } from '../entities/enemies'
import { Hud } from '../ui/hud'
import { Dialog, type DialogLine } from '../ui/dialog'
import { Duel, type DuelConfig } from '../ui/duel'
import { DeathScreen, PauseMenu, banner } from '../ui/overlays'
import { LEVELS } from '../levels'
import type { ItemType, LevelDef, Zone } from '../levels/types'
import { buildWorld, type World } from './world'

type Mode = 'play' | 'dialog' | 'duel' | 'cutscene' | 'dead' | 'transition'

const SHOP = [
  { id: 'jaw', name: 'Скулы-Ультра', cost: 3, desc: '«СКУЛЫ-УЛЬТРА»! Челюсть настолько острая, что режет хлеб. +1 к максимальному здоровью!' },
  { id: 'lungs', name: 'Дыхание сигмы', cost: 3, desc: '«ДЫХАНИЕ СИГМЫ» — курс «как дышать эффектно». Рывок перезаряжается почти вдвое быстрее!' },
  { id: 'glasses', name: 'Очки невозмутимости', cost: 4, desc: '«ОЧКИ НЕВОЗМУТИМОСТИ»! Сквозь них всё кажется медленнее. Окна в Могании шире на 30%!' },
  { id: 'nft', name: 'NFT-пиксель', cost: 2, desc: '«NFT-ПИКСЕЛЬ». Один пиксель. Твой. Навсегда. Ничего не делает. Вообще. Это и есть его сила.' },
] as const

const never = <T,>(): Promise<T> => new Promise<T>(() => undefined)

export class GameScene extends Phaser.Scene {
  def!: LevelDef
  levelNo = 1
  world!: World
  player!: Player
  ctrl!: Controls
  fx!: Fx
  bullets!: Bullets
  npcs: Npc[] = []
  enemies: Enemy[] = []
  enemyGroup!: Phaser.Physics.Arcade.Group
  hud!: Hud
  ui!: Phaser.Scene
  mode: Mode = 'play'
  private dialog!: Dialog
  private duelObj: Duel | null = null
  private pauseMenu: PauseMenu | null = null
  private death: DeathScreen | null = null
  private paused = false
  alive = false
  private objective = ''
  private time0 = 0
  private hazardT = 0
  private zoneFx = 0
  private laserG!: Phaser.GameObjects.Graphics
  private zoneInside = new Set<Zone>()
  levelTime = 0

  constructor() {
    super('Game')
  }

  get run() { return Store.run }

  create(): void {
    this.alive = true
    this.mode = 'play'
    this.paused = false
    this.npcs = []
    this.enemies = []
    this.duelObj = null
    this.pauseMenu = null
    this.death = null
    this.objective = ''
    this.hazardT = 0
    this.levelTime = 0
    this.zoneInside = new Set()
    this.time.paused = false
    this.tweens.resumeAll()
    this.physics.world.resume()

    this.levelNo = Phaser.Math.Clamp(Store.run.level, 1, LEVELS.length)
    const def = LEVELS[this.levelNo - 1]
    if (!def) throw new Error('Level missing')
    this.def = def
    const theme = THEMES[def.index] ?? THEMES[0]!
    this.cameras.main.setBackgroundColor(theme.bg)

    this.ctrl = new Controls(this)
    this.fx = new Fx(this)
    this.world = buildWorld(this, def, this.levelNo, new Set(Store.run.collected))
    const W_PX = this.world.cols * TILE
    const H_PX = this.world.rows * TILE
    this.physics.world.setBounds(0, 0, W_PX, H_PX)

    // spawn point: checkpoint or level start
    let sp = this.world.start
    const cp = this.world.checkpoints.find((c) => c.id === Store.run.checkpoint)
    if (cp) { sp = { x: cp.x, y: cp.y + 40 }; cp.img.setTexture('ringlight_on') }
    this.player = new Player(this, sp.x, sp.y)

    this.bullets = new Bullets(this)
    this.enemyGroup = this.physics.add.group()
    for (const s of this.world.npcSpawns) this.npcs.push(new Npc(this, s.x, s.y, s.spec))
    for (const s of this.world.enemySpawns) this.spawnEnemy(s.type, s.x, s.y, s.dir, s.sweep)
    this.laserG = this.add.graphics().setDepth(8000)
    this.challenge = null
    this.spotCd = 0
    this.lastSafe = null
    this.vignette = def.dark ? this.add.image(0, 0, 'vignette').setScale(3.2).setDepth(9500) : null

    this.setupPhysics()

    const cam = this.cameras.main
    cam.setBounds(0, 0, W_PX, H_PX)
    cam.startFollow(this.player.sprite, true, 0.12, 0.12)
    cam.setRoundPixels(true)
    cam.fadeIn(450, 0, 0, 0)

    this.ui = this.scene.get('UI')
    this.scene.bringToTop('UI')
    this.hud = new Hud(this.ui, `${this.levelNo}/${LEVELS.length} · ${theme.name}`)
    this.dialog = new Dialog(this.ui)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup())

    // restore gates from flags
    for (const id of Object.keys(this.world.gateMap)) if (this.flag(`gate_${id}`)) this.openGate(id, true)

    Sfx.playMusic(def.index)
    def.setup?.(this)

    const first = !this.flag('entered')
    if (first) {
      this.persistFlag('entered')
      this.mode = 'cutscene'
      void (async () => {
        await this.wait(300)
        await banner(this.ui, `${this.levelNo}. ${theme.name}`, theme.subtitle, CSS.cyan, 1800)
        if (!this.alive) return
        if (def.intro) { this.setMode('cutscene'); await def.intro(this) }
        if (this.alive && this.mode === 'cutscene') this.setMode('play')
      })()
    }
    this.applyPhysicsPause()
    this.time0 = this.time.now
    ;(window as unknown as { __eov?: unknown }).__eov = this
  }

  private setupPhysics(): void {
    const p = this.player.sprite
    const w = this.world
    this.physics.add.collider(p, w.walls)
    this.physics.add.collider(p, w.gates)
    this.physics.add.collider(p, w.cracked, (_a, b) => {
      if (!this.player.dashing) return
      const wall = b as Phaser.Physics.Arcade.Image
      this.fx.burst(wall.x, wall.y, COLORS.white, 20, 220, 600)
      this.cameras.main.shake(150, 0.008)
      Sfx.play('hit')
      wall.destroy()
      this.toast('Секретный проход!', CSS.cyan)
    })
    this.physics.add.collider(p, this.npcs.map((n) => n.sprite))
    this.physics.add.collider(this.enemyGroup, w.walls)
    this.physics.add.collider(this.enemyGroup, w.gates)
    this.physics.add.collider(this.enemyGroup, w.cracked)
    const killBullet = (a: unknown): void => this.bullets.kill(a as Phaser.Physics.Arcade.Image)
    this.physics.add.collider(this.bullets.group, w.walls, killBullet)
    this.physics.add.collider(this.bullets.group, w.gates, killBullet)
    this.physics.add.overlap(p, this.bullets.group, (_a, b) => {
      const bul = b as Phaser.Physics.Arcade.Image
      if (!bul.active || this.player.inv > 0) return
      this.bullets.kill(bul)
      this.hurt(1, bul.x, bul.y)
    })
    this.physics.add.overlap(p, this.enemyGroup, (_a, b) => {
      const e = (b as Phaser.Physics.Arcade.Sprite).getData('enemy') as Enemy | undefined
      if (e && e.alive && e.type !== 'drone') this.hurt(1, e.x, e.y)
    })
    this.physics.add.overlap(p, w.items, (_a, b) => this.pickup(b as Phaser.Physics.Arcade.Image))
    for (const c of w.checkpoints) this.physics.add.overlap(p, c.img, () => this.activateCheckpoint(c.id))
    if (w.exit) this.physics.add.overlap(p, w.exit, () => void this.tryExit())
  }

  // ------------------------------------------------------------------ loop
  update(_t: number, delta: number): void {
    if (!this.alive) return
    const dt = Math.min(delta / 1000, 0.05)
    this.ctrl.update()
    if (this.paused) {
      if (this.ctrl.take('ESC')) { this.closePause(); return }
      this.pauseMenu?.update(this.ctrl)
      return
    }
    if (this.mode === 'dead') { this.death?.update(dt, this.ctrl); return }
    Store.run.playMs += delta
    if (this.ctrl.take('ESC') && this.mode !== 'transition') { this.openPause(); return }

    if (this.mode === 'dialog') this.dialog.update(dt, this.ctrl)
    else if (this.mode === 'duel') this.duelObj?.update(dt, this.ctrl)
    else if (this.mode === 'play') this.handleActions()

    const play = this.mode === 'play'
    const z = this.zoneEffects(dt, play)
    if (play && this.def.push) {
      const lp = this.def.push(this)
      z.push.x += lp.x
      z.push.y += lp.y
    }
    this.player.update(dt, this.ctrl, {
      frozen: !play,
      invert: z.invert,
      push: z.push,
      dashCooldown: Store.run.upgrades.lungs ? TUNING.dashCooldownUpgraded : TUNING.dashCooldown,
    }, this.fx)
    for (const n of this.npcs) n.update(dt, this.player.x, this.player.y, !play)
    for (const e of this.enemies) e.update(dt, this.player, this.bullets, !play)
    if (play) {
      this.levelTime += dt
      this.bullets.update(dt)
      this.hazards(dt)
      this.stealth(dt)
      this.tickChallenge(dt)
      this.def.update?.(this, dt)
    }
    this.vignette?.setPosition(this.player.x, this.player.y - 16)
    this.hud.update(Store.run, play ? this.hint() : '', dt)
  }

  private handleActions(): void {
    if (this.ctrl.take('F')) {
      const t = this.nearestInteract()
      if (t) void t.run()
    }
    if (this.ctrl.take('E')) {
      if (this.def.onMog?.(this)) return
      const npc = this.nearestNpc(TUNING.mogRange, true)
      if (npc && npc.spec.mog) { void npc.spec.mog(this, npc); return }
      this.pulse()
    }
  }

  private nearestNpc(range: number, mog: boolean): Npc | null {
    let best: Npc | null = null
    let bd = range
    for (const n of this.npcs) {
      if (!n.active) continue
      if (mog ? !n.mogEnabled : !n.spec.talk) continue
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y)
      if (d < bd) { bd = d; best = n }
    }
    return best
  }

  private nearestInteract(): { label: string; run: () => unknown } | null {
    let best: { label: string; run: () => unknown } | null = null
    let bd = TUNING.interactRange
    for (const n of this.npcs) {
      if (!n.active || !n.spec.talk) continue
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, n.x, n.y)
      const talk = n.spec.talk
      if (d < bd) { bd = d; best = { label: `F — Говорить: ${n.spec.name}`, run: () => talk(this, n) } }
    }
    for (const it of this.world.interactables) {
      if (!it.img.visible) continue
      const d = Phaser.Math.Distance.Between(this.player.x, this.player.y, it.x, it.y + 16)
      if (d < bd) {
        bd = d
        best = {
          label: it.label,
          run: it.kind === 'sign' ? () => this.say(it.name ?? 'Надпись', it.read ?? [], 'none') : () => this.def.onSwitch?.(this, it.id),
        }
      }
    }
    return best
  }

  private hint(): string {
    const parts: string[] = []
    const t = this.nearestInteract()
    if (t) parts.push(t.label)
    const m = this.nearestNpc(TUNING.mogRange, true)
    if (m) parts.push(`E — Могнуть: ${m.spec.name}`)
    return parts.join('     ')
  }

  // ------------------------------------------------------------------ zones & hazards
  private zoneEffects(dt: number, play: boolean): { invert: boolean; push: { x: number; y: number } } {
    const res = { invert: false, push: { x: 0, y: 0 } }
    const zones = this.def.zones ?? []
    this.laserG.clear()
    this.zoneFx -= dt
    const spawnFx = this.zoneFx <= 0
    if (spawnFx) this.zoneFx = 0.06
    for (const z of zones) {
      const rx = z.x * TILE
      const ry = z.y * TILE
      const rw = z.w * TILE
      const rh = z.h * TILE
      const inside = this.player.x >= rx && this.player.x <= rx + rw && this.player.y >= ry && this.player.y <= ry + rh
      const entered = inside && !this.zoneInside.has(z)
      if (inside) this.zoneInside.add(z)
      else this.zoneInside.delete(z)
      switch (z.type) {
        case 'wind':
          if (inside && play) { res.push.x += z.dx ?? 0; res.push.y += z.dy ?? 0 }
          if (spawnFx && Math.random() < 0.8) {
            const sx = rx + Math.random() * rw
            const sy = ry + Math.random() * rh
            const s = this.add.image(sx, sy, 'dot').setTint(COLORS.white).setAlpha(0.5).setScale(0.35, 0.2).setDepth(7500)
            s.setRotation(Math.atan2(z.dy ?? 0, z.dx ?? 0))
            this.tweens.add({ targets: s, x: sx + (z.dx ?? 0) * 0.6, y: sy + (z.dy ?? 0) * 0.6, alpha: 0, duration: 600, onComplete: () => s.destroy() })
          }
          break
        case 'invert':
          if (inside) res.invert = true
          this.laserG.fillStyle(COLORS.purple, 0.06 + Math.sin(this.levelTime * 3) * 0.03).fillRect(rx, ry, rw, rh)
          if (entered && play && z.label) this.toast(z.label, CSS.purple)
          break
        case 'silence':
          if (entered && play && z.label) this.toast(z.label, CSS.yellow)
          break
        case 'trigger':
          if (entered && play && z.run && z.id && !this.flag(`trig_${z.id}`)) {
            this.setFlag(`trig_${z.id}`)
            void z.run(this)
          }
          break
        case 'laser': {
          const period = z.period ?? 2.4
          const on = z.onTime ?? 1
          const ph = (this.levelTime + (z.offset ?? 0)) % period
          const active = ph < on
          const warn = ph > period - 0.5
          if (active) {
            this.laserG.fillStyle(COLORS.pink, 0.35).fillRect(rx - 4, ry, rw + 8, rh)
            this.laserG.fillStyle(0xffffff, 0.9).fillRect(rx + rw / 2 - 5, ry, 10, rh)
            if (inside && play && !this.player.dashing) this.hurt(1, this.player.x - 1, this.player.y)
          } else if (warn) {
            this.laserG.fillStyle(COLORS.pink, Math.floor(ph * 20) % 2 ? 0.6 : 0.15).fillRect(rx + rw / 2 - 1, ry, 2, rh)
          }
          this.laserG.fillStyle(0x1b2440, 1).fillRect(rx + 4, ry - 6, rw - 8, 10).fillRect(rx + 4, ry + rh - 4, rw - 8, 10)
          break
        }
      }
    }
    return res
  }

  inZone(type: Zone['type']): boolean {
    for (const z of this.zoneInside) if (z.type === type) return true
    return false
  }

  private hazards(dt: number): void {
    const hz = this.world.hazards
    if (!hz.length) return
    this.hazardT += dt
    const P = 4.2
    const ph = this.hazardT % P
    const hot = (g: number): boolean => !this.def.hazardCycle || (g === 0 ? ph < 1.6 : ph >= 2.1 && ph < 3.7)
    const warn = (g: number): boolean => !!this.def.hazardCycle && (g === 0 ? ph >= 3.7 : ph >= 1.6 && ph < 2.1)
    for (const h of hz) {
      const a = hot(h.group) ? 1 : warn(h.group) ? (Math.floor(this.hazardT * 12) % 2 ? 0.75 : 0.25) : 0.12
      if (h.img.alpha !== a) h.img.setAlpha(a)
    }
    const tx = Math.floor(this.player.x / TILE)
    const ty = Math.floor(this.player.y / TILE)
    const idx = this.world.hazardAt.get(`${tx},${ty}`)
    if (idx !== undefined && !this.player.dashing) {
      const h = hz[idx]
      if (h && hot(h.group)) this.hurt(1, this.player.x, this.player.y - 1)
    }
  }

  // ------------------------------------------------------------------ actions
  pulse(): void {
    if (Store.run.aura < TUNING.pulseCost) {
      Sfx.play('error')
      this.toast('Недостаточно ауры. Потрогай траву и возвращайся.', CSS.dim)
      return
    }
    Store.run.aura -= TUNING.pulseCost
    Sfx.play('pulse')
    this.fx.ring(this.player.x, this.player.y - 16, COLORS.yellow, TUNING.pulseRadius, 420, 7000, 10)
    this.fx.burst(this.player.x, this.player.y - 16, COLORS.yellow, 18, 260, 500, 'spark')
    this.cameras.main.shake(120, 0.006)
    for (const e of this.enemies) {
      if (!e.alive) continue
      if (Phaser.Math.Distance.Between(this.player.x, this.player.y, e.x, e.y) < TUNING.pulseRadius + 10) {
        if (e.hit(1, this.player.x, this.player.y)) this.onEnemyKilled(e)
        else if (e.type !== 'drone') Sfx.play('hit')
      }
    }
    if (Store.run.flags['reflect']) {
      let n = 0
      for (const obj of this.bullets.group.getChildren()) {
        const b = obj as Phaser.Physics.Arcade.Image
        if (!b.active) continue
        if (Phaser.Math.Distance.Between(this.player.x, this.player.y - 16, b.x, b.y) < TUNING.pulseRadius + 30) {
          this.fx.burst(b.x, b.y, COLORS.cyan, 4, 120, 300)
          this.bullets.kill(b)
          n++
        }
      }
      if (n > 0) this.fx.floatText(this.player.x, this.player.y - 70, n > 2 ? `RATIO ×${n}` : 'ОТВЕТ НА ХЕЙТ', CSS.cyan, 18)
    }
    this.def.onPulse?.(this)
  }

  onEnemyKilled(e: Enemy): void {
    Sfx.play('kill')
    this.fx.burst(e.x, e.y - 16, COLORS.pink, 16, 200, 500, 'spark')
    this.fx.floatText(e.x, e.y - 40, e.type === 'clone' ? 'отписался' : 'ЗАБАНЕН', CSS.pink, 16)
    this.addAura(TUNING.auraPerKill)
  }

  spawnEnemy(type: EnemyType, x: number, y: number, dir?: number, sweep?: number): Enemy {
    const e = new Enemy(this, this.enemyGroup, x, y, type, dir ?? 90, sweep ?? 50)
    this.enemies.push(e)
    return e
  }

  // ------------------------------------------------------------------ stealth (drones)
  private spotCd = 0
  private lastSafe: { x: number; y: number } | null = null
  private vignette: Phaser.GameObjects.Image | null = null

  isSolidAt(x: number, y: number): boolean {
    const ch = this.world.grid[Math.floor(y / TILE)]?.[Math.floor(x / TILE)] ?? '#'
    return ch === '#' || ch === '%' || ch === 'o'
  }

  private stealth(dt: number): void {
    this.spotCd = Math.max(0, this.spotCd - dt)
    for (const [id, m] of Object.entries(this.world.marks)) {
      if (id.startsWith('safe') && Phaser.Math.Distance.Between(this.player.x, this.player.y, m.x, m.y) < 70) this.lastSafe = { x: m.x, y: m.y + 12 }
    }
    if (this.spotCd > 0) return
    for (const e of this.enemies) {
      if (e.type !== 'drone' || !e.canSee(this.player.x, this.player.y, (x, y) => this.isSolidAt(x, y))) continue
      e.alarm = 1.2
      this.spotCd = 1.4
      Sfx.play('error')
      this.cameras.main.flash(200, 255, 46, 136)
      if (this.def.onSpotted?.(this)) return
      this.toast('ТЕБЯ ЗАМЕТИЛ АЛГОРИТМ. Отправлен в рекомендации…', CSS.red)
      this.player.inv = 0
      this.hurt(1, this.player.x, this.player.y - 1)
      if (this.mode !== 'play') return
      const back = this.lastSafe ?? this.world.start
      ;(this.player.sprite.body as Phaser.Physics.Arcade.Body).reset(back.x, back.y)
      this.player.inv = 1.2
      return
    }
  }

  // ------------------------------------------------------------------ timed challenges
  private challenge: { t: number; label: string; onTimeout: () => void } | null = null

  startChallenge(seconds: number, label: string, onTimeout: () => void): void {
    this.challenge = { t: seconds, label, onTimeout }
    Sfx.play('phase')
  }

  endChallenge(): void {
    this.challenge = null
    this.hud.setTimer(null)
  }

  get challengeActive(): boolean { return this.challenge !== null }

  private tickChallenge(dt: number): void {
    const c = this.challenge
    if (!c) return
    c.t -= dt
    this.hud.setTimer(`${c.label}  ${Math.max(0, c.t).toFixed(1)}`, c.t < 5)
    if (c.t <= 0) {
      this.endChallenge()
      Sfx.play('mogLose')
      c.onTimeout()
    }
  }

  hurt(n: number, fromX: number, fromY: number): void {
    if (this.mode !== 'play' || this.player.inv > 0) return
    Store.run.hp = Math.max(0, Store.run.hp - n)
    this.player.inv = TUNING.iframes
    this.player.knockback(fromX, fromY)
    this.hud.flashDamage()
    this.cameras.main.shake(180, 0.01)
    Sfx.play('hurt')
    this.fx.burst(this.player.x, this.player.y - 20, COLORS.red, 12, 180, 400)
    this.def.onHurt?.(this)
    if (Store.run.hp <= 0) this.die()
  }

  /** Damage that ignores i-frames (lost duels). */
  damageDirect(n: number): void {
    Store.run.hp = Math.max(0, Store.run.hp - n)
    this.hud.flashDamage()
    Sfx.play('hurt')
    if (Store.run.hp <= 0) this.die()
  }

  private die(): void {
    if (this.mode === 'dead') return
    this.mode = 'dead'
    Store.run.deaths++
    this.dialog.close()
    this.duelObj?.destroy()
    this.duelObj = null
    this.applyPhysicsPause()
    this.cameras.main.shake(300, 0.02)
    this.tweens.add({ targets: this.player.sprite, angle: 90, alpha: 0.5, duration: 500 })
    this.time.delayedCall(650, () => {
      if (!this.alive) return
      this.hud.setVisible(false)
      this.death = new DeathScreen(this.ui, {
        retry: () => { Store.restoreAfterDeath(); this.scene.restart() },
        menu: () => { Store.restoreAfterDeath(); this.scene.start('Menu') },
      })
    })
  }

  private pickup(img: Phaser.Physics.Arcade.Image): void {
    if (!img.active || this.mode === 'dead') return
    const type = img.getData('type') as ItemType
    const id = img.getData('id') as string
    if (type === 'heart') {
      if (Store.run.hp >= Store.run.maxHp) return
      Store.run.hp++
      Sfx.play('heart')
      this.fx.floatText(img.x, img.y - 20, '+♥', CSS.red)
    } else if (type === 'fragment') {
      Store.run.fragments++
      Store.run.totalFragments++
      this.addAura(TUNING.auraPerFragment)
      Sfx.play('pickup')
      this.toast('+1 фрагмент внимания ◆', CSS.cyan)
    } else {
      Store.run.items[type] = (Store.run.items[type] ?? 0) + 1
      Sfx.play('pickup')
      this.toast(type === 'rose' ? 'Подобрана виртуальная роза 🌹' : type === 'floppy' ? 'Подобрана дискета с мемом 2007 года' : 'Подобран вентилятор для позирования', CSS.pink)
    }
    Store.run.collected.push(id)
    this.fx.burst(img.x, img.y, type === 'heart' ? COLORS.red : COLORS.cyan, 14, 150, 450, 'spark')
    img.destroy()
    this.def.onPickup?.(this, type)
  }

  private activateCheckpoint(id: string): void {
    if (Store.run.checkpoint === id || this.mode === 'dead') return
    Store.run.hp = Store.run.maxHp
    Store.checkpoint(id)
    for (const c of this.world.checkpoints) c.img.setTexture(c.id === id ? 'ringlight_on' : 'ringlight')
    const c = this.world.checkpoints.find((k) => k.id === id)
    if (c) { this.fx.burst(c.x, c.y - 20, COLORS.yellow, 20, 160, 600, 'spark'); this.fx.floatText(c.x, c.y - 50, 'СОХРАНЕНО', CSS.yellow, 18) }
    Sfx.play('checkpoint')
    this.toast(Store.persistent ? 'Контрольная точка. Здоровье восстановлено, прогресс сохранён.' : 'Контрольная точка (сохранение только до закрытия вкладки).', CSS.yellow)
  }

  private exiting = false
  private async tryExit(): Promise<void> {
    if (this.mode !== 'play' || this.exiting) return
    this.exiting = true
    const ok = this.def.onExit ? await this.def.onExit(this) : true
    if (!this.alive) return
    if (!ok) { this.time.delayedCall(800, () => { this.exiting = false }); return }
    this.setMode('transition')
    Sfx.play('swipe')
    this.cameras.main.fadeOut(600, 255, 255, 255)
    this.time.delayedCall(650, () => { Store.nextLevel(); this.scene.restart() })
  }

  finishGame(): void {
    this.setMode('transition')
    this.cameras.main.fadeOut(1200, 255, 255, 255)
    this.time.delayedCall(1250, () => this.scene.start('Ending'))
  }

  // ------------------------------------------------------------------ pause
  private openPause(): void {
    this.paused = true
    this.applyPhysicsPause()
    this.tweens.pauseAll()
    this.time.paused = true
    Sfx.play('select')
    this.pauseMenu = new PauseMenu(this.ui, {
      resume: () => this.closePause(),
      restart: () => { Store.restoreAfterDeath(); this.scene.restart() },
      menu: () => { Store.restoreAfterDeath(); this.scene.start('Menu') },
    })
  }

  private closePause(): void {
    this.pauseMenu?.destroy()
    this.pauseMenu = null
    this.paused = false
    this.tweens.resumeAll()
    this.time.paused = false
    this.ctrl.reset()
    this.applyPhysicsPause()
  }

  // ------------------------------------------------------------------ scripting API
  setMode(m: Mode): void {
    if (this.mode === 'dead') return
    this.mode = m
    this.applyPhysicsPause()
  }

  private applyPhysicsPause(): void {
    if (this.paused || this.mode !== 'play') this.physics.world.pause()
    else this.physics.world.resume()
  }

  isDead(): boolean { return this.mode === 'dead' }

  flag(name: string): boolean { return !!Store.run.flags[`L${this.levelNo}_${name}`] }
  setFlag(name: string, v = true): void { Store.run.flags[`L${this.levelNo}_${name}`] = v }
  persistFlag(name: string): void { Store.persistFlag(`L${this.levelNo}_${name}`) }

  npc(id: string): Npc | undefined { return this.npcs.find((n) => n.spec.id === id) }

  async talk(lines: DialogLine[], choices: string[] = []): Promise<number> {
    if (!this.alive || this.mode === 'dead' || this.mode === 'transition') return never()
    const prev: Mode = this.mode === 'dialog' || this.mode === 'duel' ? 'play' : this.mode
    this.setMode('dialog')
    const n = await this.dialog.show(lines, choices)
    if (!this.alive || this.isDead()) return never()
    if (this.mode === 'dialog') this.setMode(prev)
    return n
  }

  say(who: string, lines: string[] | string, tex?: string): Promise<number> {
    const arr = Array.isArray(lines) ? lines : [lines]
    const t = tex ?? (who === 'ТЫ' ? 'hero' : 'none')
    return this.talk(arr.map((text) => ({ who, text, tex: t })))
  }

  ask(who: string, text: string, options: string[], tex?: string): Promise<number> {
    return this.talk([{ who, text, tex: tex ?? 'none' }], options)
  }

  async duel(cfg: DuelConfig): Promise<boolean> {
    if (!this.alive || this.mode === 'dead' || this.mode === 'transition') return never()
    const prev: Mode = this.mode === 'duel' || this.mode === 'dialog' ? 'play' : this.mode
    this.setMode('duel')
    this.hud.setVisible(false)
    this.duelObj = new Duel(this.ui, cfg, Store.run.upgrades.glasses)
    const win = await this.duelObj.run()
    if (!this.alive) return never()
    this.duelObj?.destroy()
    this.duelObj = null
    this.hud.setVisible(true)
    if (win) {
      Store.run.duelsWon++
      this.addAura(TUNING.auraPerDuelWin)
      this.fx.ring(this.player.x, this.player.y - 20, COLORS.yellow, 200, 600, 7000, 10)
      this.fx.burst(this.player.x, this.player.y - 20, COLORS.yellow, 30, 260, 700, 'spark')
      this.cameras.main.flash(200, 255, 240, 180)
    } else {
      this.damageDirect(1)
    }
    if (this.mode === 'duel') this.setMode(prev)
    if (this.isDead()) return never()
    return win
  }

  wait(ms: number): Promise<void> {
    return new Promise((res) => this.time.delayedCall(ms, () => res()))
  }

  banner(title: string, sub: string, color: string = CSS.pink, ms = 2000): Promise<void> {
    return banner(this.ui, title, sub, color, ms)
  }

  toast(text: string, color?: string): void { this.hud.toast(text, color) }

  setObjective(text: string): void {
    if (this.objective === text) return
    this.objective = text
    this.hud.setObjective(text)
  }

  addAura(n: number): void { Store.run.aura = Phaser.Math.Clamp(Store.run.aura + n, 0, TUNING.auraMax) }

  heal(n: number): void { Store.run.hp = Math.min(Store.run.maxHp, Store.run.hp + n) }

  giveFragment(x: number, y: number): void {
    Store.run.fragments++
    Store.run.totalFragments++
    Sfx.play('pickup')
    this.fx.burst(x, y, COLORS.cyan, 16, 160, 500, 'spark')
    this.toast('+1 фрагмент внимания ◆', CSS.cyan)
  }

  openGate(id: string, instant = false): void {
    const tiles = this.world.gateMap[id]
    if (!tiles) return
    this.setFlag(`gate_${id}`)
    for (const t of tiles) {
      t.disableBody(false, false)
      if (instant) t.setVisible(false)
      else {
        this.fx.burst(t.x, t.y, COLORS.pink, 8, 120, 400)
        this.tweens.add({ targets: t, alpha: 0, scaleY: 0.1, duration: 400, onComplete: () => t.setVisible(false) })
      }
    }
    if (!instant) { Sfx.play('door'); this.cameras.main.shake(120, 0.004) }
  }

  closeGate(id: string): void {
    const tiles = this.world.gateMap[id]
    if (!tiles) return
    this.setFlag(`gate_${id}`, false)
    for (const t of tiles) {
      t.enableBody(true, t.x, t.y, true, true)
      t.setAlpha(1).setScale(1)
    }
    Sfx.play('door')
  }

  async panTo(x: number, y: number, ms = 700): Promise<void> {
    const cam = this.cameras.main
    cam.stopFollow()
    cam.pan(x, y, ms, 'Sine.easeInOut')
    await this.wait(ms + 50)
  }

  async panBack(ms = 500): Promise<void> {
    const cam = this.cameras.main
    cam.pan(this.player.x, this.player.y, ms, 'Sine.easeInOut')
    await this.wait(ms + 30)
    cam.startFollow(this.player.sprite, true, 0.12, 0.12)
  }

  async openShop(npc: Npc): Promise<void> {
    await this.say('СТАСЯН', ['Йоу! Стасян, барыга бустов. Лучшие апгрейды ленты. Без возвратов, без гарантий, без смысла!'], npc.spec.tex)
    for (;;) {
      const up = Store.run.upgrades as unknown as Record<string, boolean>
      const avail = SHOP.filter((s) => !up[s.id])
      const opts = [...avail.map((s) => `${s.name} — ${s.cost} ◆`), 'Уйти']
      const n = await this.ask('СТАСЯН', `Что берём? У тебя ${Store.run.fragments} ◆ фрагментов внимания.`, opts, npc.spec.tex)
      const item = avail[n]
      if (!item) { await this.say('СТАСЯН', 'Заходи ещё! Не забудь поставить лайк моему ларьку.', npc.spec.tex); return }
      if (Store.run.fragments < item.cost) {
        Sfx.play('error')
        await this.say('СТАСЯН', 'Не хватает фрагментов, бро. Насмотри ещё немного внимания и возвращайся.', npc.spec.tex)
        continue
      }
      Store.run.fragments -= item.cost
      up[item.id] = true
      if (item.id === 'jaw') { Store.run.maxHp += 1; Store.run.hp = Store.run.maxHp }
      Sfx.play('mogWin')
      this.fx.burst(this.player.x, this.player.y - 20, COLORS.yellow, 20, 200, 600, 'spark')
      await this.say('СТАСЯН', [item.desc, 'Спасибо за покупку! Отзыв на пять звёзд оставишь в комментариях.'], npc.spec.tex)
    }
  }

  // ------------------------------------------------------------------ cleanup
  private cleanup(): void {
    this.alive = false
    this.duelObj?.destroy()
    this.duelObj = null
    this.pauseMenu?.destroy()
    this.pauseMenu = null
    this.death?.destroy()
    this.death = null
    this.dialog?.destroy()
    this.hud?.destroy()
    for (const n of this.npcs) n.destroy()
    this.npcs = []
    this.enemies = []
    this.exiting = false
    this.time.paused = false
    this.tweens.resumeAll()
    void this.time0
  }
}
