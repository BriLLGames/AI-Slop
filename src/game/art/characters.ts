// Procedural character art. Every character is drawn with Canvas 2D at 2x
// resolution (96x128) and shown at scale 0.5 in the world, so portraits in
// dialogs and duels stay crisp.

import type * as Phaser from 'phaser'

export type Ctx = CanvasRenderingContext2D
const OUT = '#1a1426'

export function makeTex(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void, scale = 1): void {
  if (scene.textures.exists(key)) return
  const c = document.createElement('canvas')
  c.width = Math.ceil(w * scale)
  c.height = Math.ceil(h * scale)
  const ctx = c.getContext('2d')
  if (!ctx) return
  ctx.scale(scale, scale)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  draw(ctx)
  scene.textures.addCanvas(key, c)
}

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function fillStroke(ctx: Ctx, fill: string, lw = 2): void {
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = OUT
  ctx.lineWidth = lw
  ctx.stroke()
}

function shadow(ctx: Ctx, rx = 14): void {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(24, 60, rx, 4, 0, 0, Math.PI * 2)
  ctx.fill()
}

export interface PersonOpts {
  skin: string
  shirt: string
  pants: string
  hair: string
  style: 'short' | 'long' | 'spiky' | 'bald' | 'bun' | 'mohawk' | 'curly' | 'slick'
  acc?: string[]
  bodyW?: number
  shoes?: string
  eyes?: 'normal' | 'happy' | 'tired' | 'angry'
  hunch?: number
}

export function drawPerson(ctx: Ctx, o: PersonOpts, frame: number): void {
  const acc = o.acc ?? []
  const bw = o.bodyW ?? 22
  const legOff = frame === 1 ? 2 : 0
  const hy = 18 + (o.hunch ?? 0)
  shadow(ctx, bw / 2 + 4)
  // legs
  ctx.fillStyle = o.pants
  rr(ctx, 16, 44 - legOff, 7, 12, 2); fillStroke(ctx, o.pants)
  rr(ctx, 25, 44 + legOff - (frame === 1 ? 2 : 0), 7, 12, 2); fillStroke(ctx, o.pants)
  rr(ctx, 14, 54 - legOff, 10, 5, 2); fillStroke(ctx, o.shoes ?? '#f2f2f2')
  rr(ctx, 24, 54 + legOff - (frame === 1 ? 2 : 0), 10, 5, 2); fillStroke(ctx, o.shoes ?? '#f2f2f2')
  // arms
  const sw = frame === 1 ? 2 : -1
  rr(ctx, 24 - bw / 2 - 5, 30 + sw, 6, 14, 3); fillStroke(ctx, o.shirt)
  rr(ctx, 24 + bw / 2 - 1, 30 - sw, 6, 14, 3); fillStroke(ctx, o.shirt)
  ctx.beginPath(); ctx.arc(24 - bw / 2 - 2, 45 + sw, 3, 0, Math.PI * 2); fillStroke(ctx, o.skin, 1.5)
  ctx.beginPath(); ctx.arc(24 + bw / 2 + 2, 45 - sw, 3, 0, Math.PI * 2); fillStroke(ctx, o.skin, 1.5)
  // body
  rr(ctx, 24 - bw / 2, 28, bw, 19, 6); fillStroke(ctx, o.shirt)
  if (acc.includes('hoodie')) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(21, 31); ctx.lineTo(21, 37); ctx.moveTo(27, 31); ctx.lineTo(27, 37); ctx.stroke()
    rr(ctx, 18, 39, 12, 5, 2); ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fill()
  }
  if (acc.includes('chain')) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2
    ctx.beginPath(); ctx.arc(24, 29, 7, 0.2, Math.PI - 0.2); ctx.stroke()
  }
  if (acc.includes('tie')) {
    ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.moveTo(24, 29); ctx.lineTo(27, 33); ctx.lineTo(24, 42); ctx.lineTo(21, 33); ctx.closePath(); ctx.fill()
  }
  if (acc.includes('star')) {
    ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', 24, 41)
  }
  if (acc.includes('robe')) {
    rr(ctx, 24 - bw / 2 - 2, 28, bw + 4, 26, 6); fillStroke(ctx, o.shirt)
  }
  // head
  if (acc.includes('hood')) { ctx.beginPath(); ctx.arc(24, hy, 15, 0, Math.PI * 2); fillStroke(ctx, o.shirt) }
  ctx.beginPath(); ctx.arc(24, hy, 12, 0, Math.PI * 2); fillStroke(ctx, o.skin)
  // hair
  ctx.fillStyle = o.hair; ctx.strokeStyle = OUT; ctx.lineWidth = 2
  switch (o.style) {
    case 'short':
      ctx.beginPath(); ctx.arc(24, hy - 2, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.lineTo(34, hy - 4); ctx.quadraticCurveTo(24, hy - 9, 14, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'slick':
      ctx.beginPath(); ctx.moveTo(12, hy - 1); ctx.quadraticCurveTo(14, hy - 16, 30, hy - 14); ctx.quadraticCurveTo(38, hy - 10, 36, hy - 2); ctx.quadraticCurveTo(26, hy - 10, 12, hy - 1); ctx.fill(); ctx.stroke(); break
    case 'long':
      ctx.beginPath(); ctx.arc(24, hy - 1, 13.5, Math.PI, 0); ctx.lineTo(37, hy + 14); ctx.lineTo(33, hy + 14); ctx.lineTo(33, hy - 3); ctx.lineTo(15, hy - 3); ctx.lineTo(15, hy + 14); ctx.lineTo(11, hy + 14); ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'spiky':
      ctx.beginPath(); ctx.moveTo(11, hy - 2)
      for (let i = 0; i <= 6; i++) { const x = 11 + i * 4.3; ctx.lineTo(x + 2, hy - 15 - (i % 2) * 4); ctx.lineTo(x + 4.3, hy - 6) }
      ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'bun':
      ctx.beginPath(); ctx.arc(24, hy - 14, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
      ctx.beginPath(); ctx.arc(24, hy - 2, 12.5, Math.PI * 1.05, Math.PI * 1.95); ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'mohawk':
      ctx.beginPath(); ctx.moveTo(20, hy - 9); ctx.lineTo(22, hy - 22); ctx.lineTo(26, hy - 22); ctx.lineTo(28, hy - 9); ctx.closePath(); ctx.fill(); ctx.stroke(); break
    case 'curly':
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(13 + i * 3.7, hy - 8 - Math.sin(i) * 2, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke() }
      break
    case 'bald':
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(20, hy - 7, 4, 2, -0.4, 0, Math.PI * 2); ctx.fill(); break
  }
  // face
  const eyes = o.eyes ?? 'normal'
  ctx.fillStyle = OUT
  if (eyes === 'happy') {
    ctx.lineWidth = 2; ctx.strokeStyle = OUT
    ctx.beginPath(); ctx.arc(19, hy + 2, 2.5, Math.PI, 0); ctx.stroke()
    ctx.beginPath(); ctx.arc(29, hy + 2, 2.5, Math.PI, 0); ctx.stroke()
  } else if (eyes === 'tired') {
    ctx.fillRect(16.5, hy + 1, 5, 2); ctx.fillRect(26.5, hy + 1, 5, 2)
  } else {
    ctx.beginPath(); ctx.ellipse(19, hy + 1, 2.2, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.beginPath(); ctx.ellipse(29, hy + 1, 2.2, 3, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.fillRect(19, hy - 1, 1.2, 1.2); ctx.fillRect(29, hy - 1, 1.2, 1.2)
    if (eyes === 'angry') { ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(15, hy - 5); ctx.lineTo(22, hy - 2); ctx.moveTo(33, hy - 5); ctx.lineTo(26, hy - 2); ctx.stroke() }
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.arc(24, hy + 6, 3, 0.2, Math.PI - 0.2); ctx.stroke()
  // accessories over the head
  if (acc.includes('sunglasses')) {
    ctx.fillStyle = '#111'; rr(ctx, 14, hy - 2, 9, 6, 2); ctx.fill(); rr(ctx, 25, hy - 2, 9, 6, 2); ctx.fill(); ctx.fillRect(22, hy, 4, 1.5)
    ctx.fillStyle = 'rgba(34,228,255,0.7)'; ctx.fillRect(15.5, hy - 1, 3, 1.3); ctx.fillRect(26.5, hy - 1, 3, 1.3)
  }
  if (acc.includes('mustache')) {
    ctx.fillStyle = '#3b2412'; ctx.beginPath(); ctx.ellipse(21, hy + 5, 4, 1.8, 0.3, 0, Math.PI * 2); ctx.ellipse(27, hy + 5, 4, 1.8, -0.3, 0, Math.PI * 2); ctx.fill()
  }
  if (acc.includes('jaw')) {
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(13, hy + 3); ctx.lineTo(18, hy + 12); ctx.lineTo(30, hy + 12); ctx.lineTo(35, hy + 3); ctx.stroke()
  }
  if (acc.includes('headphones')) {
    ctx.strokeStyle = '#22e4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(24, hy, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke()
    rr(ctx, 8, hy - 3, 6, 10, 3); fillStroke(ctx, '#ff2e88'); rr(ctx, 34, hy - 3, 6, 10, 3); fillStroke(ctx, '#ff2e88')
  }
  if (acc.includes('headset')) {
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(24, hy, 13.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(36, hy + 2); ctx.quadraticCurveTo(36, hy + 9, 29, hy + 9); ctx.stroke()
    ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(29, hy + 9, 2, 0, Math.PI * 2); ctx.fill()
  }
  if (acc.includes('cap')) {
    ctx.beginPath(); ctx.arc(24, hy - 3, 12.5, Math.PI, 0); ctx.closePath(); fillStroke(ctx, acc.includes('capPink') ? '#ff2e88' : '#22e4ff')
    rr(ctx, 22, hy - 6, 18, 4, 2); fillStroke(ctx, '#222')
  }
  if (acc.includes('crown')) {
    ctx.beginPath(); ctx.moveTo(14, hy - 9); ctx.lineTo(15, hy - 20); ctx.lineTo(19.5, hy - 14); ctx.lineTo(24, hy - 22); ctx.lineTo(28.5, hy - 14); ctx.lineTo(33, hy - 20); ctx.lineTo(34, hy - 9); ctx.closePath(); fillStroke(ctx, '#ffd23f')
    ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(24, hy - 13, 1.8, 0, Math.PI * 2); ctx.fill()
  }
  if (acc.includes('halo')) {
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.ellipse(24, hy - 17, 9, 3, 0, 0, Math.PI * 2); ctx.stroke()
  }
  if (acc.includes('band')) {
    ctx.fillStyle = '#ff4757'; ctx.fillRect(12, hy - 6, 24, 4)
  }
  if (acc.includes('phone')) {
    rr(ctx, 33, 38, 7, 11, 1.5); fillStroke(ctx, '#222', 1.5)
    ctx.fillStyle = '#22e4ff'; ctx.fillRect(34.5, 39.5, 4, 8)
  }
  if (acc.includes('phoneGlow')) {
    const g = ctx.createRadialGradient(24, hy + 4, 2, 24, hy + 4, 18)
    g.addColorStop(0, 'rgba(34,228,255,0.35)'); g.addColorStop(1, 'rgba(34,228,255,0)')
    ctx.fillStyle = g; ctx.fillRect(4, hy - 14, 40, 36)
  }
  if (acc.includes('mic')) {
    ctx.fillStyle = '#333'; ctx.fillRect(4, 36, 3, 10); ctx.beginPath(); ctx.arc(5.5, 34, 4, 0, Math.PI * 2); fillStroke(ctx, '#666', 1.5)
  }
}

export function drawSkip(ctx: Ctx): void {
  shadow(ctx, 12)
  ctx.globalAlpha = 1
  rr(ctx, 3, 14, 42, 26, 9); fillStroke(ctx, '#f6f5fb', 2.5)
  ctx.fillStyle = '#1a1426'
  ctx.beginPath(); ctx.ellipse(17, 23, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.ellipse(31, 23, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.ellipse(12, 28, 3, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(36, 28, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill()
  ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#1a1426'; ctx.fillText('ПРОПУСК ▸', 24, 36)
  ctx.strokeStyle = OUT; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(16, 40); ctx.lineTo(14, 50); ctx.moveTo(32, 40); ctx.lineTo(34, 50); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(24, 14); ctx.lineTo(24, 7); ctx.stroke()
  ctx.fillStyle = '#22e4ff'; ctx.beginPath(); ctx.arc(24, 6, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}

export function drawDumpling(ctx: Ctx, frame: number): void {
  shadow(ctx, 18)
  const b = frame === 1 ? 1.5 : 0
  ctx.beginPath(); ctx.moveTo(4, 50 - b); ctx.quadraticCurveTo(24, 6 - b, 44, 50 - b); ctx.quadraticCurveTo(24, 58, 4, 50 - b); fillStroke(ctx, '#f7ecd2', 2.5)
  ctx.strokeStyle = '#d6c49c'; ctx.lineWidth = 1.5
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 5.5, 34 - Math.sin((i / 5) * Math.PI) * 14); ctx.lineTo(12 + i * 5.5, 40 - Math.sin((i / 5) * Math.PI) * 12); ctx.stroke() }
  ctx.fillStyle = '#111'; rr(ctx, 13, 36, 9, 5, 2); ctx.fill(); rr(ctx, 26, 36, 9, 5, 2); ctx.fill(); ctx.fillRect(21, 37.5, 6, 1.5)
  ctx.fillStyle = '#3b2412'; ctx.beginPath(); ctx.ellipse(20, 45, 5, 2, 0.4, 0, Math.PI * 2); ctx.ellipse(28, 45, 5, 2, -0.4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(15, 18); ctx.lineTo(33, 18); ctx.lineTo(30, 8); ctx.quadraticCurveTo(24, 2, 18, 8); ctx.closePath(); fillStroke(ctx, '#ffffff')
}

export function drawFridge(ctx: Ctx, frame: number): void {
  shadow(ctx, 16)
  const b = frame === 1 ? 1 : 0
  rr(ctx, 9, 4 - b, 30, 54, 5); fillStroke(ctx, '#dfe7f2', 2.5)
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(9, 24 - b); ctx.lineTo(39, 24 - b); ctx.stroke()
  ctx.fillStyle = '#9aa7b8'; ctx.fillRect(33, 10 - b, 3, 10); ctx.fillRect(33, 28 - b, 3, 14)
  ctx.fillStyle = OUT; ctx.fillRect(15, 11 - b, 6, 2.5); ctx.fillRect(25, 11 - b, 6, 2.5)
  ctx.beginPath(); ctx.arc(18, 16 - b, 1.8, 0, Math.PI * 2); ctx.arc(28, 16 - b, 1.8, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(12, 30 - b); ctx.lineTo(17, 46 - b); ctx.lineTo(31, 46 - b); ctx.lineTo(36, 30 - b); ctx.stroke()
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(19, 40 - b); ctx.lineTo(29, 40 - b); ctx.stroke()
  ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GIGA', 24, 54 - b)
}

export function drawHater(ctx: Ctx, frame: number): void {
  const b = frame === 1 ? 2 : 0
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(24, 60, 11, 3, 0, 0, Math.PI * 2); ctx.fill()
  rr(ctx, 4, 12 - b, 40, 28, 10); fillStroke(ctx, '#ff4757', 2.5)
  ctx.beginPath(); ctx.moveTo(14, 39 - b); ctx.lineTo(10, 50 - b); ctx.lineTo(22, 39 - b); fillStroke(ctx, '#ff4757', 2.5)
  ctx.fillStyle = '#ff4757'; ctx.fillRect(13, 36 - b, 10, 4)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(17, 24 - b, 5, 4, 0, 0, Math.PI * 2); ctx.ellipse(31, 24 - b, 5, 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(18, 25 - b, 2, 0, Math.PI * 2); ctx.arc(30, 25 - b, 2, 0, Math.PI * 2); ctx.fill()
  ctx.lineWidth = 2.5; ctx.strokeStyle = OUT; ctx.beginPath(); ctx.moveTo(11, 17 - b); ctx.lineTo(21, 21 - b); ctx.moveTo(37, 17 - b); ctx.lineTo(27, 21 - b); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(18, 34 - b); ctx.lineTo(30, 33 - b); ctx.stroke()
}

export function drawBot(ctx: Ctx, frame: number): void {
  shadow(ctx, 11)
  const b = frame === 1 ? 2 : 0
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 22 - b); ctx.lineTo(24, 12 - b); ctx.stroke()
  ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', 24, 13 - b)
  rr(ctx, 10, 22 - b, 28, 24, 9); fillStroke(ctx, '#c9c2e8', 2.5)
  rr(ctx, 14, 27 - b, 20, 11, 4); fillStroke(ctx, '#1a1426', 1.5)
  ctx.fillStyle = '#5dff9b'; ctx.fillRect(17, 31 - b, 4, 3); ctx.fillRect(27, 31 - b, 4, 3)
  ctx.fillStyle = '#9b5cff'; rr(ctx, 14, 46 - b, 6, 8, 2); ctx.fill(); rr(ctx, 28, 46 - b, 6, 8, 2); ctx.fill()
}

export function drawTurret(ctx: Ctx): void {
  shadow(ctx, 15)
  ctx.fillStyle = '#333'; ctx.fillRect(21, 40, 6, 16)
  rr(ctx, 4, 6, 40, 36, 6); fillStroke(ctx, '#2a2140', 2.5)
  ctx.fillStyle = '#ff2e88'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('ЧАТ ●', 8, 15)
  ctx.fillStyle = '#b3a9d6'
  for (let i = 0; i < 4; i++) ctx.fillRect(8, 19 + i * 5, 12 + ((i * 13) % 20), 2.5)
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(34, 30, 6, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(34, 30, 3, 0, Math.PI * 2); ctx.fill()
}

export function drawBossFace(ctx: Ctx): void {
  rr(ctx, 3, 8, 42, 34, 6); fillStroke(ctx, '#1b2440', 2.5)
  ctx.strokeStyle = '#22e4ff'; ctx.lineWidth = 2; rr(ctx, 3, 8, 42, 34, 6); ctx.stroke()
  rr(ctx, 7, 12, 34, 26, 4); ctx.fillStyle = '#070912'; ctx.fill()
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(24, 25, 11, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(24, 25, 4.5, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#120f1c'; ctx.beginPath(); ctx.arc(24, 25, 2, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#0e5a7a'; ctx.lineWidth = 3
  ctx.beginPath(); ctx.moveTo(8, 42); ctx.quadraticCurveTo(2, 52, 6, 60); ctx.moveTo(40, 42); ctx.quadraticCurveTo(46, 52, 42, 60); ctx.stroke()
  ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(24, 8); ctx.lineTo(24, 3); ctx.stroke()
  ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(24, 3, 2.5, 0, Math.PI * 2); ctx.fill()
}

export function drawBoss(ctx: Ctx): void {
  // 360x240 logical; cables, monitor, antenna
  ctx.strokeStyle = '#0e5a7a'; ctx.lineWidth = 10
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(70, 90 + i * 25); ctx.bezierCurveTo(30, 100 + i * 30, 30, 170 + i * 10, 6 + i * 6, 230)
    ctx.moveTo(290, 90 + i * 25); ctx.bezierCurveTo(330, 100 + i * 30, 330, 170 + i * 10, 354 - i * 6, 230); ctx.stroke()
  }
  ctx.strokeStyle = '#22e4ff'; ctx.lineWidth = 3
  for (let i = 0; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(70, 90 + i * 25); ctx.bezierCurveTo(30, 100 + i * 30, 30, 170 + i * 10, 6 + i * 6, 230)
    ctx.moveTo(290, 90 + i * 25); ctx.bezierCurveTo(330, 100 + i * 30, 330, 170 + i * 10, 354 - i * 6, 230); ctx.stroke()
  }
  ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(180, 30); ctx.lineTo(180, 8); ctx.stroke()
  ctx.fillStyle = '#ff2e88'; ctx.beginPath(); ctx.arc(180, 8, 7, 0, Math.PI * 2); ctx.fill()
  rr(ctx, 60, 28, 240, 170, 18); ctx.fillStyle = '#1b2440'; ctx.fill(); ctx.strokeStyle = '#22e4ff'; ctx.lineWidth = 5; ctx.stroke()
  rr(ctx, 74, 42, 212, 142, 10); ctx.fillStyle = '#070912'; ctx.fill()
  ctx.fillStyle = 'rgba(34,228,255,0.08)'
  for (let y = 44; y < 182; y += 4) ctx.fillRect(76, y, 208, 1.5)
  rr(ctx, 150, 198, 60, 20, 4); fillStroke(ctx, '#1b2440', 3)
  ctx.fillStyle = '#22e4ff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('REC●MMEND', 180, 212)
}
