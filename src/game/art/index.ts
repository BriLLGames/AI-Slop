// Registers every generated texture. Characters get two walk frames: key_0 / key_1.

import type * as Phaser from 'phaser'
import { drawBoss, drawBossFace, drawBot, drawDumpling, drawFridge, drawHater, drawPerson, drawSkip, drawTurret, makeTex, type PersonOpts } from './characters'
import { generateWorldTextures } from './world'

export const PEOPLE: Record<string, PersonOpts> = {
  hero: { skin: '#f2c7a5', shirt: '#ff2e88', pants: '#2b2d42', hair: '#2b1b12', style: 'short', acc: ['hoodie', 'headphones'] },
  gena: { skin: '#e0ac85', shirt: '#5dff9b', pants: '#3a3a5a', hair: '#c46a2b', style: 'curly', eyes: 'happy', acc: ['cap'] },
  valera: { skin: '#f0c09a', shirt: '#8a8fa8', pants: '#2b2d42', hair: '#5a4030', style: 'short', eyes: 'tired', bodyW: 26 },
  oldman: { skin: '#e8c0a0', shirt: '#9b5cff', pants: '#3a3a5a', hair: '#dddddd', style: 'bald', eyes: 'tired', acc: ['halo'] },
  scroller: { skin: '#c9d6c0', shirt: '#5a6378', pants: '#2b2d42', hair: '#333333', style: 'long', eyes: 'tired', acc: ['hood', 'phone', 'phoneGlow'], hunch: 3 },
  dean: { skin: '#d9a27c', shirt: '#ffd23f', pants: '#7a5a22', hair: '#111111', style: 'slick', bodyW: 26, acc: ['robe', 'crown', 'sunglasses', 'chain'] },
  guard1: { skin: '#c98d6b', shirt: '#222222', pants: '#111111', hair: '#111111', style: 'slick', bodyW: 28, acc: ['sunglasses', 'jaw'] },
  guard2: { skin: '#e8b48a', shirt: '#3b2a6b', pants: '#111111', hair: '#9b5cff', style: 'mohawk', bodyW: 28, acc: ['sunglasses', 'jaw', 'chain'] },
  guard3: { skin: '#d9a27c', shirt: '#f6f5fb', pants: '#f6f5fb', hair: '#111111', style: 'short', bodyW: 26, eyes: 'angry', acc: ['band', 'jaw'] },
  merchant: { skin: '#f2c7a5', shirt: '#ff9f43', pants: '#2b2d42', hair: '#333333', style: 'spiky', eyes: 'happy', acc: ['chain', 'cap', 'capPink'] },
  platon: { skin: '#e8b48a', shirt: '#f6f5fb', pants: '#3a3f58', hair: '#ffd23f', style: 'long', acc: ['sunglasses'] },
  monk: { skin: '#d9a27c', shirt: '#ff9f43', pants: '#ff9f43', hair: '#111111', style: 'bald', eyes: 'tired', acc: ['robe'] },
  host: { skin: '#f2c7a5', shirt: '#22e4ff', pants: '#2b2d42', hair: '#ff2e88', style: 'mohawk', eyes: 'happy', acc: ['tie', 'headset'] },
  mimi: { skin: '#f6d0b5', shirt: '#ff8cc3', pants: '#5a1f4a', hair: '#9b5cff', style: 'bun', eyes: 'happy', acc: ['headset', 'star'] },
  donat: { skin: '#e0ac85', shirt: '#222222', pants: '#2b2d42', hair: '#c46a2b', style: 'short', bodyW: 28, acc: ['headset', 'mic', 'chain'] },
  grisha: { skin: '#f0c09a', shirt: '#3a3f58', pants: '#222222', hair: '#111111', style: 'short', acc: ['phone', 'cap'] },
  fan: { skin: '#e8b48a', shirt: '#ffd23f', pants: '#3a3f58', hair: '#5a4030', style: 'curly', eyes: 'happy', acc: ['phone'] },
  banned: { skin: '#dddddd', shirt: '#555555', pants: '#333333', hair: '#777777', style: 'long', eyes: 'tired', acc: ['hood'] },
  admin: { skin: '#f2c7a5', shirt: '#3b5bdb', pants: '#2b2d42', hair: '#6b4f3a', style: 'curly', bodyW: 26, eyes: 'tired', acc: ['headset'] },
  // ---- expansion characters
  grandma: { skin: '#f0c8a8', shirt: '#9b5cff', pants: '#5a3a7a', hair: '#e6e6e6', style: 'bun', eyes: 'happy', acc: ['phone', 'roundGlasses'] },
  ratioKing: { skin: '#e8b48a', shirt: '#ff4757', pants: '#2b2d42', hair: '#111111', style: 'slick', bodyW: 26, acc: ['crown', 'sunglasses', 'chain'] },
  trollkid: { skin: '#f2c7a5', shirt: '#5dff9b', pants: '#3a3f58', hair: '#c46a2b', style: 'spiky', bodyW: 18, eyes: 'angry', acc: ['headset'] },
  bear: { skin: '#8b5a2b', shirt: '#8b5a2b', pants: '#6b4423', hair: '#8b5a2b', style: 'bald', bodyW: 30, eyes: 'happy', acc: ['bearEars', 'snout'], shoes: '#6b4423' },
  hamster: { skin: '#e8b07a', shirt: '#f6f5fb', pants: '#7a5a22', hair: '#e8b07a', style: 'bald', bodyW: 30, eyes: 'happy', acc: ['bearEars', 'roundGlasses', 'tie'] },
  pixelkid: { skin: '#ffd23f', shirt: '#22e4ff', pants: '#ff2e88', hair: '#ffd23f', style: 'bald', eyes: 'happy', bodyW: 20 },
  oleg: { skin: '#cfd8c6', shirt: '#3a3a5a', pants: '#2b2d42', hair: '#555555', style: 'long', eyes: 'tired', hunch: 4, acc: ['hood', 'phone', 'phoneGlow', 'mustache'] },
  warden: { skin: '#b9a6d9', shirt: '#1b1030', pants: '#1b1030', hair: '#111111', style: 'slick', bodyW: 28, eyes: 'angry', acc: ['hood', 'sunglasses', 'headset'] },
  influencer: { skin: '#f2c7a5', shirt: '#ffd23f', pants: '#2b2d42', hair: '#2b1b12', style: 'slick', acc: ['hoodie', 'headphones', 'sunglasses', 'chain', 'star'] },
}

export function generateAllTextures(scene: Phaser.Scene): void {
  for (const [key, opts] of Object.entries(PEOPLE)) {
    for (const f of [0, 1]) makeTex(scene, `${key}_${f}`, 48, 64, (c) => drawPerson(c, opts, f), 2)
  }
  const creatures: Record<string, (c: CanvasRenderingContext2D, f: number) => void> = {
    skip: (c) => drawSkip(c),
    dumpling: drawDumpling,
    fridge: drawFridge,
    hater: drawHater,
    bot: drawBot,
    turret: (c) => drawTurret(c),
    bossface: (c) => drawBossFace(c),
  }
  for (const [key, fn] of Object.entries(creatures)) {
    for (const f of [0, 1]) makeTex(scene, `${key}_${f}`, 48, 64, (c) => fn(c, f), 2)
  }
  makeTex(scene, 'boss', 360, 240, drawBoss, 1)
  generateWorldTextures(scene)
}
