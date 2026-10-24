// Web Audio synthesizer: all sound effects and the tiny per-level music loops are
// generated in code, no audio files needed.

import { Store } from './save'
import { THEMES } from './config'

type Wave = OscillatorType

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private musicTimer: number | null = null
  private musicLevel = -1
  private nextNoteTime = 0
  private step = 0

  /** Must be called from a user gesture at least once (browsers block autoplay). */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      try {
        this.ctx = new Ctor()
      } catch {
        return
      }
      this.master = this.ctx.createGain()
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.connect(this.master)
      const len = this.ctx.sampleRate * 0.5
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
      const d = this.noiseBuf.getChannelData(0)
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
      this.applyVolume()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
  }

  applyVolume(): void {
    if (!this.master || !this.musicGain || !this.ctx) return
    this.master.gain.setValueAtTime(Store.settings.volume * 0.6, this.ctx.currentTime)
    this.musicGain.gain.setValueAtTime(Store.settings.music ? 0.28 : 0, this.ctx.currentTime)
  }

  private tone(freq: number, dur: number, wave: Wave = 'square', vol = 0.3, slideTo?: number, delay = 0, dest?: AudioNode): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime + delay
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = wave
    o.frequency.setValueAtTime(freq, t)
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(dest ?? this.master)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  private noise(dur: number, vol = 0.3, freq = 1200, delay = 0): void {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noiseBuf) return
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + dur + 0.05)
  }

  play(name: string, pitch = 1): void {
    if (!this.ctx) return
    switch (name) {
      case 'select': this.tone(660 * pitch, 0.06, 'square', 0.15); break
      case 'confirm': this.tone(520, 0.07, 'square', 0.18); this.tone(880, 0.1, 'square', 0.18, undefined, 0.06); break
      case 'talk': this.tone((300 + Math.random() * 120) * pitch, 0.04, 'triangle', 0.12); break
      case 'step': this.noise(0.03, 0.04, 500); break
      case 'dash': this.noise(0.18, 0.25, 2400); this.tone(300, 0.15, 'sawtooth', 0.08, 900); break
      case 'pickup': this.tone(880, 0.07, 'square', 0.18); this.tone(1320, 0.12, 'square', 0.18, undefined, 0.07); break
      case 'heart': this.tone(523, 0.1, 'triangle', 0.25); this.tone(784, 0.18, 'triangle', 0.25, undefined, 0.09); break
      case 'hurt': this.tone(220, 0.25, 'sawtooth', 0.3, 70); this.noise(0.15, 0.3, 600); break
      case 'hit': this.noise(0.1, 0.3, 900); this.tone(160, 0.1, 'square', 0.2, 80); break
      case 'kill': this.tone(600, 0.18, 'square', 0.2, 1200); this.noise(0.2, 0.2, 3000); break
      case 'pulse': this.tone(120, 0.45, 'sawtooth', 0.3, 600); this.noise(0.35, 0.25, 1800); break
      case 'mogStart': this.tone(110, 0.6, 'sawtooth', 0.25, 55); this.tone(165, 0.6, 'square', 0.12, 82); this.noise(0.4, 0.2, 400); break
      case 'mogHit': this.tone(392 * pitch, 0.08, 'square', 0.25); this.tone(784 * pitch, 0.2, 'sawtooth', 0.2, 1568 * pitch, 0.05); this.noise(0.15, 0.2, 5000); break
      case 'mogMiss': this.tone(300, 0.35, 'sawtooth', 0.25, 90); this.tone(100, 0.4, 'square', 0.15, 50, 0.05); break
      case 'mogWin': [0, 4, 7, 12, 16].forEach((n, i) => this.tone(392 * Math.pow(2, n / 12), 0.25, 'square', 0.2, undefined, i * 0.08)); break
      case 'mogLose': [7, 5, 3, 0].forEach((n, i) => this.tone(220 * Math.pow(2, n / 12), 0.3, 'triangle', 0.25, undefined, i * 0.15)); break
      case 'door': this.tone(200, 0.3, 'square', 0.15, 400); this.noise(0.25, 0.15, 300); break
      case 'checkpoint': [0, 7, 12].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), 0.2, 'triangle', 0.22, undefined, i * 0.07)); break
      case 'error': this.tone(180, 0.15, 'square', 0.2); this.tone(140, 0.2, 'square', 0.2, undefined, 0.12); break
      case 'swipe': this.noise(0.4, 0.35, 1500); this.tone(200, 0.4, 'sine', 0.2, 2000); break
      case 'shoot': this.tone(700 * pitch, 0.08, 'square', 0.08, 300); break
      case 'laser': this.tone(1200, 0.12, 'sawtooth', 0.05, 900); break
      case 'boss': this.tone(80, 1.2, 'sawtooth', 0.35, 40); this.tone(83, 1.2, 'square', 0.2, 41); this.noise(1, 0.25, 200); break
      case 'phase': [0, 3, 7, 10, 12].forEach((n, i) => this.tone(110 * Math.pow(2, n / 12), 0.5, 'sawtooth', 0.2, undefined, i * 0.12)); break
      case 'lamp': this.tone(330 * pitch, 0.3, 'triangle', 0.3); break
      case 'gift': this.tone(1046, 0.08, 'square', 0.18); this.tone(1318, 0.08, 'square', 0.18, undefined, 0.08); this.tone(1568, 0.15, 'square', 0.18, undefined, 0.16); break
      case 'death': this.tone(440, 0.9, 'sawtooth', 0.3, 55); this.noise(0.8, 0.25, 300, 0.1); break
      case 'win': [0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) => this.tone(523 * Math.pow(2, n / 12), 0.22, 'square', 0.18, undefined, i * 0.11)); break
      case 'vineBoom': this.tone(70, 0.8, 'sine', 0.6, 35); this.noise(0.3, 0.4, 150); break
      default: break
    }
  }

  // ---------- music ----------
  playMusic(levelIndex: number): void {
    if (!this.ctx) return
    if (this.musicLevel === levelIndex && this.musicTimer !== null) return
    this.stopMusic()
    this.musicLevel = levelIndex
    this.step = 0
    this.nextNoteTime = this.ctx.currentTime + 0.1
    this.musicTimer = window.setInterval(() => this.scheduler(), 50)
  }

  stopMusic(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer)
    this.musicTimer = null
    this.musicLevel = -1
  }

  private scheduler(): void {
    const ctx = this.ctx
    if (!ctx || !this.musicGain) return
    const theme = this.musicLevel >= 0 ? THEMES[this.musicLevel] : THEMES[0]
    if (!theme) return
    const m = theme.music
    const stepDur = 60 / m.tempo / 2 // eighth notes
    while (this.nextNoteTime < ctx.currentTime + 0.2) {
      const delay = Math.max(0, this.nextNoteTime - ctx.currentTime)
      const s = this.step
      const deg = (i: number): number => {
        const n = m.scale.length
        const oct = Math.floor(i / n)
        const idx = ((i % n) + n) % n
        return (m.scale[idx] ?? 0) + oct * 12
      }
      const hz = (midi: number): number => 440 * Math.pow(2, (midi - 69) / 12)
      if (s % 4 === 0) {
        const b = m.bass[Math.floor(s / 8) % m.bass.length] ?? 0
        this.tone(hz(m.root - 12 + deg(b)), stepDur * 3.5, 'triangle', 0.5, undefined, delay, this.musicGain)
      }
      if (s % 2 === 0 || Math.random() < 0.25) {
        const l = m.lead[s % m.lead.length] ?? 0
        this.tone(hz(m.root + 12 + deg(l)), stepDur * 0.9, 'square', 0.12, undefined, delay, this.musicGain)
      }
      if (s % 4 === 2) this.noiseTo(delay, 0.05)
      this.step++
      this.nextNoteTime += stepDur
    }
  }

  private noiseTo(delay: number, vol: number): void {
    const ctx = this.ctx
    if (!ctx || !this.musicGain || !this.noiseBuf) return
    const t = ctx.currentTime + delay
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const f = ctx.createBiquadFilter()
    f.type = 'highpass'
    f.frequency.value = 6000
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol * 4, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    src.connect(f)
    f.connect(g)
    g.connect(this.musicGain)
    src.start(t)
    src.stop(t + 0.1)
  }
}

export const Sfx = new AudioEngine()
