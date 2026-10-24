// Procedural tiles, props, pickups, bullets and particles.

import type * as Phaser from 'phaser'
import { THEMES, TILE } from '../config'
import { makeTex, rr, type Ctx } from './characters'

const OUT = '#1a1426'

function noiseDots(ctx: Ctx, color: string, n: number, seed: number, size = 2): void {
  let s = seed
  const rnd = (): number => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  ctx.fillStyle = color
  for (let i = 0; i < n; i++) ctx.fillRect(rnd() * TILE, rnd() * TILE, size, size)
}

function floorPattern(ctx: Ctx, i: number, base: string, alt: boolean, seed: number): void {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, TILE, TILE)
  switch (i) {
    case 0:
      if (alt) { // grass
        ctx.strokeStyle = 'rgba(140,255,160,0.35)'; ctx.lineWidth = 1.5
        for (let k = 0; k < 9; k++) { const x = (k * 17 + seed * 7) % 44 + 2; const y = (k * 23 + seed * 3) % 40 + 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke() }
      } else {
        noiseDots(ctx, 'rgba(255,255,255,0.05)', 14, seed)
        ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1)
      }
      break
    case 1:
      if (alt) { ctx.fillStyle = 'rgba(255,210,63,0.12)'; ctx.fillRect(4, 4, TILE - 8, TILE - 8); ctx.strokeStyle = 'rgba(255,210,63,0.3)'; ctx.strokeRect(6.5, 6.5, TILE - 13, TILE - 13) }
      else { ctx.strokeStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < TILE; y += 12) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(TILE, y + 0.5); ctx.stroke(); const off = (y / 12) % 2 ? 16 : 32; ctx.beginPath(); ctx.moveTo(off + 0.5, y); ctx.lineTo(off + 0.5, y + 12); ctx.stroke() } }
      break
    case 2:
      ctx.strokeStyle = alt ? 'rgba(255,46,136,0.25)' : 'rgba(34,228,255,0.12)'; ctx.lineWidth = 1
      ctx.strokeRect(2.5, 2.5, TILE - 5, TILE - 5)
      if (!alt) { ctx.fillStyle = 'rgba(255,46,136,0.15)'; ctx.fillRect(0, TILE - 2, TILE, 2) }
      break
    case 3:
      noiseDots(ctx, alt ? 'rgba(220,120,255,0.25)' : 'rgba(180,255,120,0.12)', 10, seed, 3)
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(0, 24 + Math.sin(seed) * 6); ctx.bezierCurveTo(16, 10, 32, 40, 48, 24); ctx.stroke()
      break
    case 4:
      ctx.strokeStyle = alt ? 'rgba(34,228,255,0.3)' : 'rgba(34,228,255,0.14)'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(18, 12); ctx.lineTo(24, 18); ctx.lineTo(48, 18); ctx.moveTo(30, 48); ctx.lineTo(30, 34); ctx.lineTo(40, 28); ctx.stroke()
      ctx.fillStyle = 'rgba(34,228,255,0.35)'; ctx.fillRect(16, 10, 4, 4); ctx.fillRect(28, 32, 4, 4)
      break
  }
}

export function generateWorldTextures(scene: Phaser.Scene): void {
  THEMES.forEach((t, i) => {
    makeTex(scene, `floorA_${i}`, TILE, TILE, (c) => floorPattern(c, i, t.floorA, false, 3 + i))
    makeTex(scene, `floorB_${i}`, TILE, TILE, (c) => floorPattern(c, i, t.floorB, false, 11 + i))
    makeTex(scene, `floorAlt_${i}`, TILE, TILE, (c) => floorPattern(c, i, t.floorAlt, true, 7 + i))
    makeTex(scene, `wallTop_${i}`, TILE, TILE, (c) => {
      c.fillStyle = t.wallTop; c.fillRect(0, 0, TILE, TILE)
      c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 0, TILE, 4)
      c.strokeStyle = 'rgba(0,0,0,0.15)'; c.strokeRect(0.5, 0.5, TILE - 1, TILE - 1)
    })
    const front = (c: Ctx, cracked: boolean): void => {
      c.fillStyle = t.wallTop; c.fillRect(0, 0, TILE, 22)
      c.fillStyle = t.wallLine; c.fillRect(0, 20, TILE, 3)
      c.fillStyle = t.wallFace; c.fillRect(0, 23, TILE, 25)
      c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1
      if (i === 2 || i === 4) { c.strokeStyle = t.wallLine; c.globalAlpha = 0.5; c.strokeRect(6.5, 28.5, 35, 14); c.globalAlpha = 1 }
      else { c.beginPath(); c.moveTo(0, 35.5); c.lineTo(TILE, 35.5); c.moveTo(16.5, 23); c.lineTo(16.5, 35); c.moveTo(36.5, 35); c.lineTo(36.5, 48); c.stroke() }
      c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(0, 44, TILE, 4)
      if (cracked) {
        c.strokeStyle = '#120f1c'; c.lineWidth = 2.5
        c.beginPath(); c.moveTo(10, 24); c.lineTo(20, 32); c.lineTo(15, 38); c.lineTo(26, 46); c.moveTo(20, 32); c.lineTo(32, 28); c.lineTo(38, 36); c.stroke()
        c.fillStyle = 'rgba(255,255,255,0.7)'; c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('тонко', 24, 17)
      }
    }
    makeTex(scene, `wallFront_${i}`, TILE, TILE, (c) => front(c, false))
    makeTex(scene, `wallCrack_${i}`, TILE, TILE, (c) => front(c, true))
    makeTex(scene, `hazard_${i}`, TILE, TILE, (c) => {
      const g = c.createRadialGradient(24, 24, 4, 24, 24, 30)
      g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, t.hazard); g.addColorStop(1, 'rgba(0,0,0,0.4)')
      c.fillStyle = g; c.fillRect(1, 1, TILE - 2, TILE - 2)
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.strokeRect(2.5, 2.5, TILE - 5, TILE - 5)
    })
  })

  // ----- generic decor ('o' tiles) per theme -----
  makeTex(scene, 'deco_0a', TILE, 72, (c) => { // tree
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 16, 5, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#6b4226'; c.fillRect(20, 40, 8, 26); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(20, 40, 8, 26)
    ;[[24, 24, 18], [12, 32, 11], [36, 32, 11]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x ?? 0, y ?? 0, r ?? 0, 0, Math.PI * 2); c.fillStyle = '#3fbf6f'; c.fill(); c.stroke() })
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.arc(18, 18, 6, 0, Math.PI * 2); c.fill()
  })
  makeTex(scene, 'deco_0b', TILE, 72, (c) => { // street lamp with ad
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 10, 4, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#4a4a66'; c.fillRect(21, 14, 6, 52); c.strokeStyle = OUT; c.lineWidth = 2; c.strokeRect(21, 14, 6, 52)
    rr(c, 10, 4, 28, 14, 4); c.fillStyle = '#ffd23f'; c.fill(); c.stroke()
    rr(c, 27, 26, 18, 22, 3); c.fillStyle = '#ff2e88'; c.fill(); c.stroke()
    c.fillStyle = '#fff'; c.font = 'bold 9px sans-serif'; c.textAlign = 'center'; c.fillText('♥', 36, 41)
  })
  makeTex(scene, 'deco_1a', TILE, 72, (c) => { // aura statue
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 16, 5, 0, 0, Math.PI * 2); c.fill()
    rr(c, 8, 50, 32, 16, 3); c.fillStyle = '#7a5a22'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke()
    c.fillStyle = '#e8dcc0'; c.beginPath(); c.arc(24, 18, 9, 0, Math.PI * 2); c.fill(); c.stroke()
    rr(c, 15, 27, 18, 23, 5); c.fill(); c.stroke()
    c.fillStyle = '#111'; c.fillRect(17, 16, 14, 4)
    c.fillStyle = '#ffd23f'; c.font = 'bold 7px sans-serif'; c.textAlign = 'center'; c.fillText('СИГМА', 24, 61)
  })
  makeTex(scene, 'deco_1b', TILE, 72, (c) => { // potted plant
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 12, 4, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#c96b3a'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(12, 46); c.lineTo(36, 46); c.lineTo(32, 66); c.lineTo(16, 66); c.closePath(); c.fill(); c.stroke()
    c.fillStyle = '#3fbf6f'; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(24 + (k - 2) * 6, 34 - Math.abs(k - 2) * -3, 5, 13, (k - 2) * 0.35, 0, Math.PI * 2); c.fill(); c.stroke() }
  })
  makeTex(scene, 'deco_2a', TILE, 72, (c) => { // camera on tripod
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 36); c.lineTo(12, 66); c.moveTo(24, 36); c.lineTo(36, 66); c.moveTo(24, 36); c.lineTo(24, 66); c.stroke()
    rr(c, 10, 18, 28, 20, 4); c.fillStyle = '#2a2140'; c.fill(); c.lineWidth = 2; c.stroke()
    c.fillStyle = '#22e4ff'; c.beginPath(); c.arc(24, 28, 6, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = '#ff4757'; c.beginPath(); c.arc(34, 22, 2.5, 0, Math.PI * 2); c.fill()
  })
  makeTex(scene, 'deco_2b', TILE, 72, (c) => { // speaker
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 14, 4, 0, 0, Math.PI * 2); c.fill()
    rr(c, 10, 14, 28, 52, 4); c.fillStyle = '#1a1426'; c.fill(); c.strokeStyle = '#ff2e88'; c.lineWidth = 2; c.stroke()
    c.fillStyle = '#333'; c.beginPath(); c.arc(24, 30, 8, 0, Math.PI * 2); c.arc(24, 52, 10, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ff2e88'; c.beginPath(); c.arc(24, 30, 3, 0, Math.PI * 2); c.arc(24, 52, 4, 0, Math.PI * 2); c.fill()
  })
  makeTex(scene, 'deco_3a', TILE, 72, (c) => { // traffic cone with face
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 15, 4, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ff6a00'; c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(24, 18); c.lineTo(38, 62); c.lineTo(10, 62); c.closePath(); c.fill(); c.stroke()
    c.fillStyle = '#fff'; c.fillRect(17, 42, 14, 5)
    c.fillStyle = OUT; c.beginPath(); c.arc(21, 34, 1.8, 0, Math.PI * 2); c.arc(27, 34, 1.8, 0, Math.PI * 2); c.fill()
    c.beginPath(); c.arc(24, 38, 2, 0, Math.PI); c.stroke()
  })
  makeTex(scene, 'deco_3b', TILE, 72, (c) => { // rubber duck with sunglasses
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 16, 4, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#ffd23f'; c.strokeStyle = OUT; c.lineWidth = 2
    c.beginPath(); c.ellipse(24, 52, 18, 12, 0, 0, Math.PI * 2); c.fill(); c.stroke()
    c.beginPath(); c.arc(20, 32, 11, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = '#ff9f43'; c.beginPath(); c.ellipse(8, 34, 6, 3, 0, 0, Math.PI * 2); c.fill(); c.stroke()
    c.fillStyle = '#111'; c.fillRect(13, 28, 16, 4)
  })
  makeTex(scene, 'deco_4a', TILE, 72, (c) => { // server rack
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(24, 68, 18, 4, 0, 0, Math.PI * 2); c.fill()
    rr(c, 6, 4, 36, 64, 3); c.fillStyle = '#1b2440'; c.fill(); c.strokeStyle = '#22e4ff'; c.lineWidth = 2; c.stroke()
    for (let k = 0; k < 7; k++) { c.fillStyle = '#0b1020'; c.fillRect(10, 9 + k * 8, 28, 5); c.fillStyle = k % 3 === 0 ? '#ff2e88' : '#5dff9b'; c.fillRect(32, 10 + k * 8, 3, 3) }
  })
  makeTex(scene, 'deco_4b', TILE, 72, (c) => { // cable pile
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 64, 18, 6, 0, 0, Math.PI * 2); c.fill()
    ;['#22e4ff', '#ff2e88', '#9b5cff'].forEach((col, k) => { c.strokeStyle = col; c.lineWidth = 4; c.beginPath(); c.ellipse(24, 56 - k * 4, 16 - k * 3, 6, 0, 0, Math.PI * 2); c.stroke() })
    rr(c, 14, 30, 20, 14, 3); c.fillStyle = '#1b2440'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke()
  })

  // ----- props -----
  makeTex(scene, 'couch', 96, 64, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(48, 58, 44, 6, 0, 0, Math.PI * 2); c.fill()
    c.strokeStyle = OUT; c.lineWidth = 2.5
    rr(c, 6, 10, 84, 30, 8); c.fillStyle = '#7a4fd1'; c.fill(); c.stroke()
    rr(c, 2, 28, 92, 26, 8); c.fillStyle = '#9b6cff'; c.fill(); c.stroke()
    rr(c, 14, 30, 32, 14, 4); c.fillStyle = '#b48cff'; c.fill(); c.stroke(); rr(c, 50, 30, 32, 14, 4); c.fill(); c.stroke()
    rr(c, 60, 22, 8, 12, 2); c.fillStyle = '#222'; c.fill(); c.fillStyle = '#22e4ff'; c.fillRect(61.5, 23.5, 5, 9)
  })
  makeTex(scene, 'sign', TILE, 72, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 12, 4, 0, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#4a4a66'; c.fillRect(21, 36, 6, 30)
    rr(c, 2, 8, 44, 32, 4); c.fillStyle = '#fff6d6'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2.5; c.stroke()
    c.fillStyle = '#ff2e88'; c.fillRect(7, 14, 34, 4); c.fillStyle = '#555'; c.fillRect(7, 22, 28, 3); c.fillRect(7, 28, 32, 3)
  })
  makeTex(scene, 'screen', 144, 96, (c) => {
    rr(c, 4, 4, 136, 80, 8); c.fillStyle = '#0b0820'; c.fill(); c.strokeStyle = '#ff2e88'; c.lineWidth = 4; c.stroke()
    c.fillStyle = '#ff4757'; c.beginPath(); c.arc(20, 18, 5, 0, Math.PI * 2); c.fill()
    c.fillStyle = '#fff'; c.font = 'bold 11px sans-serif'; c.textAlign = 'left'; c.fillText('LIVE', 30, 22)
    c.fillStyle = '#333'; c.fillRect(66, 84, 12, 10)
  })
  const ringlight = (c: Ctx, on: boolean): void => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 66, 12, 4, 0, 0, Math.PI * 2); c.fill()
    c.strokeStyle = OUT; c.lineWidth = 3; c.beginPath(); c.moveTo(24, 36); c.lineTo(14, 66); c.moveTo(24, 36); c.lineTo(34, 66); c.stroke()
    if (on) { const g = c.createRadialGradient(24, 20, 4, 24, 20, 24); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,210,63,0)'); c.fillStyle = g; c.fillRect(0, 0, 48, 44) }
    c.strokeStyle = on ? '#fff6c0' : '#6b6b80'; c.lineWidth = 6; c.beginPath(); c.arc(24, 20, 14, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = OUT; c.lineWidth = 1.5; c.beginPath(); c.arc(24, 20, 17, 0, Math.PI * 2); c.arc(24, 20, 11, 0, Math.PI * 2); c.stroke()
  }
  makeTex(scene, 'ringlight', TILE, 72, (c) => ringlight(c, false))
  makeTex(scene, 'ringlight_on', TILE, 72, (c) => ringlight(c, true))
  const pedestal = (c: Ctx, on: boolean, glyph: string, col: string): void => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 62, 16, 5, 0, 0, Math.PI * 2); c.fill()
    rr(c, 10, 34, 28, 26, 4); c.fillStyle = '#3a3f58'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 2; c.stroke()
    c.beginPath(); c.arc(24, 24, 14, 0, Math.PI * 2); c.fillStyle = on ? col : '#55556a'; c.fill(); c.stroke()
    c.fillStyle = '#fff'; c.font = 'bold 16px sans-serif'; c.textAlign = 'center'; c.fillText(glyph, 24, 30)
  }
  makeTex(scene, 'like', TILE, 64, (c) => pedestal(c, false, '♥', '#ff2e88'))
  makeTex(scene, 'like_on', TILE, 64, (c) => pedestal(c, true, '♥', '#ff2e88'))
  const lampCols = ['#ff4757', '#5dff9b', '#22e4ff', '#ffd23f']
  lampCols.forEach((col, k) => {
    makeTex(scene, `lamp${k}`, TILE, 64, (c) => pedestal(c, false, '●', col))
    makeTex(scene, `lamp${k}_on`, TILE, 64, (c) => { const g = c.createRadialGradient(24, 24, 4, 24, 24, 26); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 48, 50); pedestal(c, true, '●', col) })
  })
  makeTex(scene, 'giftbox', TILE, 64, (c) => {
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.ellipse(24, 60, 16, 5, 0, 0, Math.PI * 2); c.fill()
    rr(c, 6, 10, 36, 48, 5); c.fillStyle = '#2a2140'; c.fill(); c.strokeStyle = '#ff2e88'; c.lineWidth = 2.5; c.stroke()
    rr(c, 12, 16, 24, 18, 3); c.fillStyle = '#ff8cc3'; c.fill()
    c.fillStyle = '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('✦', 24, 31)
    c.fillStyle = '#ffd23f'; c.font = 'bold 7px sans-serif'; c.fillText('ПОДАРОК', 24, 46); c.fillText('F', 24, 54)
  })
  makeTex(scene, 'gate', TILE, TILE, (c) => {
    c.fillStyle = 'rgba(255,46,136,0.25)'; c.fillRect(0, 0, TILE, TILE)
    c.fillStyle = '#2a2140'; c.fillRect(0, 0, TILE, 6); c.fillRect(0, TILE - 6, TILE, 6)
    c.strokeStyle = '#ff2e88'; c.lineWidth = 3
    for (let x = 6; x < TILE; x += 12) { c.beginPath(); c.moveTo(x, 6); c.lineTo(x, TILE - 6); c.stroke() }
    c.fillStyle = '#ffd23f'; c.fillRect(19, 22, 10, 8); c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.beginPath(); c.arc(24, 21, 4, Math.PI, 0); c.stroke()
  })
  makeTex(scene, 'fragment', 32, 32, (c) => {
    const g = c.createRadialGradient(16, 16, 2, 16, 16, 16); g.addColorStop(0, 'rgba(34,228,255,0.9)'); g.addColorStop(1, 'rgba(34,228,255,0)')
    c.fillStyle = g; c.fillRect(0, 0, 32, 32)
    c.beginPath(); c.moveTo(16, 3); c.lineTo(27, 16); c.lineTo(16, 29); c.lineTo(5, 16); c.closePath(); c.fillStyle = '#22e4ff'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke()
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(13, 11); c.lineTo(21, 16); c.lineTo(13, 21); c.closePath(); c.fill()
  })
  makeTex(scene, 'heart', 28, 28, (c) => {
    c.fillStyle = '#ff4757'; c.strokeStyle = '#fff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(14, 24); c.bezierCurveTo(-2, 12, 6, 0, 14, 8); c.bezierCurveTo(22, 0, 30, 12, 14, 24); c.closePath(); c.fill(); c.stroke()
  })
  makeTex(scene, 'heart_empty', 28, 28, (c) => {
    c.fillStyle = 'rgba(255,255,255,0.12)'; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2
    c.beginPath(); c.moveTo(14, 24); c.bezierCurveTo(-2, 12, 6, 0, 14, 8); c.bezierCurveTo(22, 0, 30, 12, 14, 24); c.closePath(); c.fill(); c.stroke()
  })
  makeTex(scene, 'rose', 32, 32, (c) => {
    c.strokeStyle = '#3fbf6f'; c.lineWidth = 3; c.beginPath(); c.moveTo(16, 30); c.lineTo(16, 14); c.stroke()
    c.fillStyle = '#ff2e88'; c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.beginPath(); c.arc(16, 11, 8, 0, Math.PI * 2); c.fill(); c.stroke()
    c.strokeStyle = '#a0105a'; c.beginPath(); c.arc(16, 11, 4, 0, Math.PI * 1.5); c.stroke()
  })
  makeTex(scene, 'fan', 40, 40, (c) => {
    c.fillStyle = '#ddd'; c.fillRect(18, 22, 4, 14); rr(c, 10, 34, 20, 5, 2); c.fill()
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.arc(20, 16, 13, 0, Math.PI * 2); c.fillStyle = '#22e4ff'; c.fill(); c.stroke()
    c.fillStyle = '#fff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(20 + Math.cos(k * 2.1) * 6, 16 + Math.sin(k * 2.1) * 6, 6, 3, k * 2.1, 0, Math.PI * 2); c.fill() }
  })
  makeTex(scene, 'portal', 64, 80, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#ff2e88'); g.addColorStop(1, '#22e4ff')
    rr(c, 6, 4, 52, 72, 14); c.fillStyle = g; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke()
    rr(c, 12, 10, 40, 60, 10); c.fillStyle = '#120f1c'; c.fill()
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(32, 20); c.lineTo(44, 36); c.lineTo(36, 36); c.lineTo(36, 54); c.lineTo(28, 54); c.lineTo(28, 36); c.lineTo(20, 36); c.closePath(); c.fill()
    c.font = 'bold 8px sans-serif'; c.textAlign = 'center'; c.fillText('СВАЙП', 32, 64)
  })
  const plate = (c: Ctx, on: boolean, label: string): void => {
    rr(c, 4, 4, 40, 40, 8); c.fillStyle = on ? '#5dff9b' : '#4a2f5a'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.stroke()
    c.fillStyle = on ? '#120f1c' : '#fff'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText(label, 24, 30)
  }
  makeTex(scene, 'plateA', TILE, TILE, (c) => plate(c, false, 'ТЫ'))
  makeTex(scene, 'plateA_on', TILE, TILE, (c) => plate(c, true, 'ТЫ'))
  makeTex(scene, 'plateB', TILE, TILE, (c) => plate(c, false, 'ОН'))
  makeTex(scene, 'plateB_on', TILE, TILE, (c) => plate(c, true, 'ОН'))
  makeTex(scene, 'ring', 96, 96, (c) => {
    c.strokeStyle = '#ffd23f'; c.lineWidth = 5; c.beginPath(); c.arc(48, 48, 40, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = 'rgba(255,46,136,0.8)'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.arc(48, 48, 33, 0, Math.PI * 2); c.stroke(); c.setLineDash([])
    c.fillStyle = '#ffd23f'; c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('МОГ', 48, 44); c.fillText('[E]', 48, 60)
  })
  makeTex(scene, 'card', 44, 30, (c) => {
    rr(c, 2, 2, 40, 26, 5); c.fillStyle = '#1b2440'; c.fill(); c.strokeStyle = '#ff2e88'; c.lineWidth = 2; c.stroke()
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(18, 9); c.lineTo(27, 15); c.lineTo(18, 21); c.closePath(); c.fill()
  })
  ;['КРИНЖ', 'RATIO', 'L', 'МИМО'].forEach((w, k) => makeTex(scene, `cmt${k}`, 52, 26, (c) => {
    rr(c, 2, 2, 48, 18, 7); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#ff4757'; c.lineWidth = 2; c.stroke()
    c.beginPath(); c.moveTo(10, 19); c.lineTo(8, 25); c.lineTo(16, 19); c.fillStyle = '#fff'; c.fill()
    c.fillStyle = '#ff4757'; c.font = 'bold 10px sans-serif'; c.textAlign = 'center'; c.fillText(w, 26, 15)
  }))
  makeTex(scene, 'likeShot', 24, 24, (c) => {
    c.fillStyle = '#ff2e88'; c.strokeStyle = '#fff'; c.lineWidth = 2
    c.beginPath(); c.moveTo(12, 21); c.bezierCurveTo(-2, 11, 5, 0, 12, 7); c.bezierCurveTo(19, 0, 26, 11, 12, 21); c.closePath(); c.fill(); c.stroke()
  })
  makeTex(scene, 'ad', 120, 40, (c) => {
    rr(c, 2, 2, 116, 36, 6); c.fillStyle = '#ffd23f'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 3; c.stroke()
    c.fillStyle = OUT; c.font = 'bold 13px sans-serif'; c.textAlign = 'center'; c.fillText('РЕКЛАМА 0:15', 60, 25)
  })
  makeTex(scene, 'watch', 200, 120, (c) => {
    const g = c.createLinearGradient(0, 0, 200, 120); g.addColorStop(0, '#ff2e88'); g.addColorStop(1, '#9b5cff')
    rr(c, 6, 6, 188, 108, 22); c.fillStyle = g; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke()
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(80, 30); c.lineTo(128, 60); c.lineTo(80, 90); c.closePath(); c.fill()
    c.font = 'bold 14px sans-serif'; c.textAlign = 'center'; c.fillText('ЕЩЁ ОДНО', 100, 106)
  })
  makeTex(scene, 'closeBtn', 72, 72, (c) => {
    c.beginPath(); c.arc(36, 36, 30, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = '#ff4757'; c.lineWidth = 5; c.stroke()
    c.strokeStyle = '#ff4757'; c.lineWidth = 8; c.beginPath(); c.moveTo(24, 24); c.lineTo(48, 48); c.moveTo(48, 24); c.lineTo(24, 48); c.stroke()
  })
  makeTex(scene, 'dot', 12, 12, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.arc(6, 6, 5, 0, Math.PI * 2); c.fill() })
  makeTex(scene, 'spark', 20, 20, (c) => {
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(10, 0); c.lineTo(12, 8); c.lineTo(20, 10); c.lineTo(12, 12); c.lineTo(10, 20); c.lineTo(8, 12); c.lineTo(0, 10); c.lineTo(8, 8); c.closePath(); c.fill()
  })
  makeTex(scene, 'auraIcon', 28, 28, (c) => {
    const g = c.createRadialGradient(14, 14, 2, 14, 14, 13); g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, 'rgba(255,46,136,0)')
    c.fillStyle = g; c.beginPath(); c.arc(14, 14, 13, 0, Math.PI * 2); c.fill()
  })
}
