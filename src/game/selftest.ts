// Automated smoke test. Open the app with ?selftest in the URL; results go to the console
// with the [SELFTEST] prefix. NOTE: overwrites the current save.
import type * as Phaser from 'phaser'
import { Store } from './save'
import { LEVELS } from './levels'
import type { GameScene } from './scenes/GameScene'

const log = (...a: unknown[]): void => console.log('[SELFTEST]', ...a)
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

function key(code: number, type: 'keydown' | 'keyup'): void {
  const ev = new KeyboardEvent(type, { bubbles: true, cancelable: true })
  Object.defineProperty(ev, 'keyCode', { get: () => code })
  Object.defineProperty(ev, 'which', { get: () => code })
  window.dispatchEvent(ev)
}
async function tap(code: number, hold = 60): Promise<void> {
  key(code, 'keydown'); await sleep(hold); key(code, 'keyup'); await sleep(50)
}
async function waitFor(fn: () => boolean, ms = 8000): Promise<boolean> {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if (fn()) return true; await sleep(50) }
  return false
}
const G = (): GameScene | undefined => (window as unknown as { __eov?: GameScene }).__eov

async function loadLevel(game: Phaser.Game, n: number, flags: string[] = []): Promise<GameScene | undefined> {
  Store.newGame()
  Store.run.level = n
  Store.run.flags[`L${n}_entered`] = true
  for (const f of flags) Store.run.flags[f] = true
  game.scene.stop('Menu')
  game.scene.start('Game')
  const ok = await waitFor(() => { const g = G(); return !!g && g.alive && g.levelNo === n })
  await sleep(400)
  return ok ? G() : undefined
}

async function duelTest(g: GameScene, kinds: string[], keys: number[]): Promise<void> {
  const hp0 = Store.run.hp
  let done = false
  void g.duel({ name: 'Тест', tex: 'valera', kinds: kinds as never, hits: 1, lives: 2 }).then((w) => { done = true; log(`duel ${kinds.join('+')} resolved win=${w}`) })
  for (let i = 0; i < 40 && !done; i++) { await sleep(250); for (const k of keys) await tap(k, k === 69 ? 700 : 60) }
  await sleep(300)
  log(`after duel ${kinds.join('+')}: mode=${g.mode} hp ${hp0}->${Store.run.hp}`)
  Store.run.hp = Store.run.maxHp
}

export async function runSelfTest(game: Phaser.Game): Promise<void> {
  window.addEventListener('error', (e) => console.error('[SELFTEST] window error', e.message))
  window.addEventListener('unhandledrejection', (e) => console.error('[SELFTEST] rejection', String((e as PromiseRejectionEvent).reason)))
  try {
    log('menu active', await waitFor(() => game.scene.isActive('Menu')))
    for (let n = 1; n <= LEVELS.length; n++) {
      const g = await loadLevel(game, n)
      if (!g) { log(`L${n} failed to load`); continue }
      log(`L${n}: mode=${g.mode} npcs=${g.npcs.length} enemies=${g.enemies.length} items=${g.world.items.getLength()} cps=${g.world.checkpoints.length} exit=${!!g.world.exit} switches=${g.world.interactables.length}`)
    }
    // new duel mechanics
    let g = await loadLevel(game, 1)
    if (g) {
      await duelTest(g, ['combo'], [87, 65, 83, 68])
      await duelTest(g, ['hold'], [69])
      await duelTest(g, ['timing'], [69])
      // pause + death + retry
      await tap(27); await sleep(200)
      log('paused', (g as unknown as { paused: boolean }).paused)
      await tap(13); await sleep(200)
      Store.run.hp = 1; g.player.inv = 0
      g.hurt(1, g.player.x, g.player.y)
      await sleep(1600)
      log('dead mode', g.mode)
      await tap(13)
      await sleep(1200)
      g = G()
      log('after retry', g?.mode, g?.alive, Store.run.hp)
    }
    // stealth: put the hero inside a drone cone in chapter 7
    g = await loadLevel(game, 7)
    if (g) {
      const body = g.player.sprite.body as Phaser.Physics.Arcade.Body
      const hp0 = Store.run.hp
      body.reset(19 * 48 + 24, 3 * 48 + 30)
      let spotted = false
      for (let i = 0; i < 80 && !spotted; i++) {
        await sleep(100)
        spotted = Store.run.hp < hp0 || g.player.y > 4 * 48 + 40 || g.player.x < 17 * 48
        if (!spotted) body.reset(19 * 48 + 24, 3 * 48 + 30)
      }
      log(`stealth: hp ${hp0}->${Store.run.hp} player at ${Math.round(g.player.x)},${Math.round(g.player.y)} vignette`)
    }
    // challenge helper in chapter 3 (grandma)
    g = await loadLevel(game, 3)
    if (g) {
      g.startChallenge(1, 'TEST', () => log('challenge timeout fired'))
      await sleep(1600)
      log('challenge active after timeout', g.challengeActive)
    }
    // final boss phase 4 + ending
    const last = LEVELS.length
    g = await loadLevel(game, last, [`L${last}_boss_p4`, `L${last}_bossIntro`])
    if (g) {
      const body = g.player.sprite.body as Phaser.Physics.Arcade.Body
      body.reset(20 * 48, 13 * 48 + 20)
      await sleep(300)
      for (let i = 0; i < 30 && g.mode !== 'play'; i++) { await tap(70); await sleep(150) }
      await sleep(2800)
      body.reset(6 * 48 + 24, 13 * 48 + 50)
      await sleep(200)
      for (let i = 0; i < 50 && game.scene.isActive('Game'); i++) { await tap(70); await sleep(200) }
      log('ending active', await waitFor(() => game.scene.isActive('Ending'), 6000))
    }
    log('selftest finished')
  } catch (e) {
    console.error('[SELFTEST] exception', e instanceof Error ? `${e.message}\n${e.stack}` : String(e))
  }
}
