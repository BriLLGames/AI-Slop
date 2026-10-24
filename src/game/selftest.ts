// TEMPORARY automated smoke test (removed after verification).
import type * as Phaser from 'phaser'
import { Store } from './save'
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

function reach(g: GameScene): string {
  const w = g.world
  const solidCh = new Set(['#', '%', 'o'])
  for (const [ch, s] of Object.entries(g.def.legend)) if (s.kind === 'prop' || s.kind === 'switch') solidCh.add(ch)
  const start = { x: Math.floor(w.start.x / 48), y: Math.floor((w.start.y - 10) / 48) }
  const seen = new Set<string>([`${start.x},${start.y}`])
  const q = [start]
  while (q.length) {
    const c = q.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const nx = c.x + dx, ny = c.y + dy
      const k = `${nx},${ny}`
      if (seen.has(k)) continue
      const ch = w.grid[ny]?.[nx] ?? '#'
      if (solidCh.has(ch)) continue
      seen.add(k); q.push({ x: nx, y: ny })
    }
  }
  const problems: string[] = []
  w.grid.forEach((row, y) => [...row].forEach((ch, x) => {
    const s = g.def.legend[ch]
    const important = ch === 'X' || ch === '*' || ch === 'C' || ch === 'h' || (s && (s.kind === 'npc' || s.kind === 'item' || s.kind === 'plate' || s.kind === 'switch'))
    if (!important) return
    const adj = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => seen.has(`${x + (dx ?? 0)},${y + (dy ?? 0)}`))
    if (!adj) problems.push(`${ch}@${x},${y}`)
  }))
  return problems.length ? `UNREACHABLE: ${problems.join(' ')}` : 'all reachable'
}

export async function runSelfTest(game: Phaser.Game): Promise<void> {
  window.addEventListener('error', (e) => console.error('[SELFTEST] window error', e.message))
  window.addEventListener('unhandledrejection', (e) => console.error('[SELFTEST] rejection', String((e as PromiseRejectionEvent).reason)))
  try {
    const okMenu = await waitFor(() => game.scene.isActive('Menu'))
    log('menu active', okMenu)
    for (let n = 1; n <= 5; n++) {
      Store.newGame()
      Store.run.level = n
      Store.run.flags[`L${n}_entered`] = true
      game.scene.stop('Menu')
      game.scene.start('Game')
      const ok = await waitFor(() => { const g = G(); return !!g && g.alive && g.levelNo === n })
      await sleep(400)
      const g = G()
      if (!ok || !g) { log(`L${n} failed to load`); continue }
      log(`L${n}: loaded mode=${g.mode} npcs=${g.npcs.length} enemies=${g.enemies.length} items=${g.world.items.getLength()} cps=${g.world.checkpoints.length} exit=${!!g.world.exit} ${reach(g)}`)
    }
    // ---- level 1 interactive: intro, duel, pause, death/retry
    Store.newGame()
    game.scene.start('Game')
    await waitFor(() => { const g = G(); return !!g && g.alive && g.levelNo === 1 })
    await sleep(2600)
    let g = G()!
    log('L1 intro mode', g.mode)
    for (let i = 0; i < 40 && g.mode !== 'play'; i++) { await tap(70); await sleep(80) }
    log('after intro mode', g.mode)
    // movement test
    const x0 = g.player.x
    key(68, 'keydown'); await sleep(500); key(68, 'keyup')
    log('moved right px', Math.round(g.player.x - x0))
    await tap(32)
    log('dash cd after dash', g.player.dashCd.toFixed(2))
    // duel lifecycle (press E periodically until it resolves)
    const hp0 = Store.run.hp
    const p = g.duel({ name: 'Тест', tex: 'valera', kinds: ['timing'], hits: 1, lives: 2 })
    let done = false
    void p.then((w) => { done = true; log('duel resolved win=', w) })
    for (let i = 0; i < 40 && !done; i++) { await sleep(330); await tap(69) }
    await sleep(300)
    log('after duel mode', g.mode, 'hp', hp0, '->', Store.run.hp)
    // pause
    await tap(27)
    await sleep(200)
    log('paused', (g as unknown as { paused: boolean }).paused)
    await tap(13)
    await sleep(200)
    log('resumed', !(g as unknown as { paused: boolean }).paused, 'mode', g.mode)
    // death
    Store.run.hp = 1
    g.player.inv = 0
    g.hurt(1, g.player.x, g.player.y)
    await sleep(1600)
    log('dead mode', g.mode, 'deaths', Store.run.deaths)
    await tap(13)
    await waitFor(() => { const gg = G(); return !!gg && gg !== g ? true : !!gg && gg.alive && gg.mode !== 'dead' }, 4000)
    await sleep(500)
    g = G()!
    log('after retry mode', g.mode, 'hp', Store.run.hp, '/', Store.run.maxHp, 'alive', g.alive)
    // ---- boss final phase + ending
    Store.newGame()
    Store.run.level = 5
    Store.run.flags['L5_entered'] = true
    Store.run.flags['L5_boss_p4'] = true
    Store.run.flags['L5_bossIntro'] = true
    game.scene.start('Game')
    await waitFor(() => { const gg = G(); return !!gg && gg.alive && gg.levelNo === 5 })
    await sleep(500)
    g = G()!
    const body = g.player.sprite.body as Phaser.Physics.Arcade.Body
    body.reset(20 * 48, 13 * 48 + 20)
    await sleep(300)
    log('L5 trigger mode', g.mode)
    for (let i = 0; i < 30 && g.mode !== 'play'; i++) { await tap(70); await sleep(150) }
    await sleep(2800)
    log('boss phase4 mode', g.mode, 'interactables', g.world.interactables.map((i) => i.id).join(','))
    body.reset(6 * 48 + 24, 13 * 48 + 50)
    await sleep(200)
    await tap(70)
    for (let i = 0; i < 40 && game.scene.isActive('Game'); i++) { await tap(70); await sleep(200) }
    const ending = await waitFor(() => game.scene.isActive('Ending'), 6000)
    log('ending active', ending)
    for (let i = 0; i < 60; i++) { await tap(70); await sleep(180) }
    log('selftest finished. save exists?', Store.hasSave())
  } catch (e) {
    console.error('[SELFTEST] exception', e instanceof Error ? `${e.message}\n${e.stack}` : String(e))
  }
}
