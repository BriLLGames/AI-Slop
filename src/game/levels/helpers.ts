// Shared level helpers.

import * as Phaser from 'phaser'
import { COLORS, CSS, TILE } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'

/** "Collect all tokens before the timer runs out" challenge. */
export function tokenChallenge(
  g: GameScene,
  opts: { tiles: [number, number][]; seconds: number; label: string; tex: string; onWin: () => void; onFail: () => void },
): void {
  if (g.challengeActive) return
  const tokens = opts.tiles.map(([tx, ty]) => {
    const img = g.add.image(tx * TILE + TILE / 2, ty * TILE + TILE / 2, opts.tex).setDepth(ty * TILE + 40).setScale(1.3)
    g.tweens.add({ targets: img, scale: 1.6, yoyo: true, repeat: -1, duration: 400 })
    return img
  })
  let left = tokens.length
  const cleanup = (): void => {
    loop.remove(false)
    tokens.forEach((t) => t.active && t.destroy())
  }
  const loop = g.time.addEvent({
    delay: 50,
    loop: true,
    callback: () => {
      if (g.mode !== 'play') return
      for (const t of tokens) {
        if (!t.active) continue
        if (Phaser.Math.Distance.Between(g.player.x, g.player.y - 10, t.x, t.y) < 34) {
          g.fx.burst(t.x, t.y, COLORS.yellow, 12, 160, 400, 'spark')
          Sfx.play('pickup', 1 + (tokens.length - left) * 0.08)
          t.destroy()
          left--
          if (left <= 0) {
            g.endChallenge()
            cleanup()
            Sfx.play('win')
            opts.onWin()
            return
          }
        }
      }
    },
  })
  g.startChallenge(opts.seconds, opts.label, () => {
    cleanup()
    g.toast('Время вышло! Челлендж провален. Можно попробовать ещё раз.', CSS.red)
    opts.onFail()
  })
  g.toast(`ЧЕЛЛЕНДЖ: собери ${tokens.length} за ${opts.seconds} секунд!`, CSS.yellow)
}
