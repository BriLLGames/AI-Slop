import * as Phaser from 'phaser'
import { CSS, FONT_BIG, H, W } from '../config'
import { generateAllTextures } from '../art'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot')
  }

  create(): void {
    const t = this.add.text(W / 2, H / 2, 'ЗАГРУЗКА ЛЕНТЫ...', { fontFamily: FONT_BIG, fontSize: '28px', color: CSS.pink }).setOrigin(0.5)
    // give the text one frame to render, then generate all procedural art
    this.time.delayedCall(30, () => {
      generateAllTextures(this)
      t.destroy()
      this.scene.launch('UI')
      this.scene.start('Menu')
    })
  }
}
