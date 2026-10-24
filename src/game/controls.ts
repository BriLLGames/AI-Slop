// Keyboard wrapper. Edge-triggered presses are sampled ONCE per frame in update(),
// so several systems can read them without "stealing" each other's presses.

import * as Phaser from 'phaser'

const NAMES = ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'E', 'F', 'ESC', 'ENTER', 'ONE', 'TWO', 'THREE', 'FOUR'] as const
export type KeyName = (typeof NAMES)[number]

export class Controls {
  private keys = {} as Record<KeyName, Phaser.Input.Keyboard.Key>
  private just = {} as Record<KeyName, boolean>
  private scene: Phaser.Scene
  private onBlur = (): void => this.reset()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
    const kb = scene.input.keyboard
    for (const n of NAMES) {
      this.just[n] = false
      if (kb) this.keys[n] = kb.addKey(n === 'ESC' ? Phaser.Input.Keyboard.KeyCodes.ESC : Phaser.Input.Keyboard.KeyCodes[n], true, false)
    }
    scene.game.events.on(Phaser.Core.Events.BLUR, this.onBlur)
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy())
  }

  /** Call at the start of the scene's update. */
  update(): void {
    for (const n of NAMES) {
      const k = this.keys[n]
      this.just[n] = k ? Phaser.Input.Keyboard.JustDown(k) : false
    }
  }

  down(n: KeyName): boolean {
    return this.keys[n]?.isDown ?? false
  }

  /** True only on the frame the key was pressed. */
  pressed(n: KeyName): boolean {
    return this.just[n]
  }

  /** Same as pressed() but consumes the press so nobody else sees it this frame. */
  take(n: KeyName): boolean {
    const v = this.just[n]
    this.just[n] = false
    return v
  }

  confirm(): boolean {
    return this.take('ENTER') || this.take('F') || this.take('SPACE') || this.take('E')
  }

  move(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.down('A') || this.down('LEFT')) x -= 1
    if (this.down('D') || this.down('RIGHT')) x += 1
    if (this.down('W') || this.down('UP')) y -= 1
    if (this.down('S') || this.down('DOWN')) y += 1
    if (x !== 0 && y !== 0) {
      x *= Math.SQRT1_2
      y *= Math.SQRT1_2
    }
    return { x, y }
  }

  reset(): void {
    this.scene.input.keyboard?.resetKeys()
    for (const n of NAMES) this.just[n] = false
  }

  destroy(): void {
    this.scene.game.events.off(Phaser.Core.Events.BLUR, this.onBlur)
  }
}
