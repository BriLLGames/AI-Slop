// Game entry point: creates the Phaser game inside the given DOM element.

import * as Phaser from 'phaser'
import { H, W } from './config'
import { Sfx } from './audio'
import { BootScene } from './scenes/BootScene'
import { MenuScene } from './scenes/MenuScene'
import { GameScene } from './scenes/GameScene'
import { EndingScene } from './scenes/EndingScene'
import { UIScene } from './scenes/UIScene'

export function createGame(parent: HTMLElement): Phaser.Game {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: W,
    height: H,
    backgroundColor: '#0d0a16',
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    disableContextMenu: true,
    // UI must be last so it renders on top of every other scene
    scene: [BootScene, MenuScene, GameScene, EndingScene, UIScene],
  })
  return game
}

export function destroyGame(game: Phaser.Game): void {
  Sfx.stopMusic()
  game.destroy(true)
}
