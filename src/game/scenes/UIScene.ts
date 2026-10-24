import * as Phaser from 'phaser'

/** Persistent overlay scene. The game scene draws its HUD, dialogs and duels here
 * so camera shake/zoom in the world never moves the interface. */
export class UIScene extends Phaser.Scene {
  constructor() {
    super('UI')
  }

  create(): void {
    this.cameras.main.setRoundPixels(true)
  }
}
