// Central place for all tunable numbers. Change values here to rebalance the game.

export const W = 960
export const H = 540
export const TILE = 48

export const FONT = '"Segoe UI", "Trebuchet MS", Arial, sans-serif'
export const FONT_BIG = 'Impact, "Arial Black", "Segoe UI Black", sans-serif'

export const COLORS = {
  pink: 0xff2e88,
  cyan: 0x22e4ff,
  yellow: 0xffd23f,
  dark: 0x120f1c,
  panel: 0x1d1830,
  white: 0xffffff,
  green: 0x5dff9b,
  red: 0xff4757,
  purple: 0x9b5cff,
  orange: 0xff9f43,
}

export const CSS = {
  pink: '#ff2e88',
  cyan: '#22e4ff',
  yellow: '#ffd23f',
  white: '#ffffff',
  dim: '#b3a9d6',
  green: '#5dff9b',
  red: '#ff4757',
  purple: '#b48cff',
  dark: '#120f1c',
}

export const TUNING = {
  speed: 215,
  dashSpeed: 640,
  dashTime: 0.17,
  dashCooldown: 0.7,
  dashCooldownUpgraded: 0.42,
  iframes: 1.0,
  baseHp: 5,
  auraMax: 100,
  pulseCost: 20,
  pulseRadius: 140,
  auraPerMogHit: 8,
  auraPerDuelWin: 25,
  auraPerFragment: 5,
  auraPerKill: 4,
  interactRange: 70,
  mogRange: 90,
}

// Mog duel difficulty knobs (zone = share of the bar that counts as success)
export const MOG = {
  glassesBonus: 1.3, // "Очки невозмутимости" upgrade multiplier for windows
  ringTolerance: 13, // px tolerance for sequence rings
  dodgeWindow: 0.5, // seconds to press SPACE after "УДАР!"
  counterWindow: 0.75, // seconds to press E after a dodge
  observeShow: 0.95, // seconds each NPC "tell" is visible
  comboTime: 2.6, // seconds to enter a WASD combo
  holdZone: 0.16, // share of the "hold" meter that counts as success
}

export interface Theme {
  name: string
  subtitle: string
  floorA: string
  floorB: string
  floorAlt: string
  wallTop: string
  wallFace: string
  wallLine: string
  hazard: string
  bg: number
  accent: number
  music: { tempo: number; root: number; scale: number[]; bass: number[]; lead: number[] }
}

export const THEMES: Theme[] = [
  {
    name: 'ФОР-Ю',
    subtitle: 'Улица, где всё — контент',
    floorA: '#3a3f58', floorB: '#353a52', floorAlt: '#3f6b4f',
    wallTop: '#6b5f8f', wallFace: '#463c66', wallLine: '#8d80b8',
    hazard: '#ff4757', bg: 0x1b1a2b, accent: COLORS.cyan,
    music: { tempo: 112, root: 57, scale: [0, 3, 5, 7, 10], bass: [0, 0, 3, 5], lead: [0, 2, 4, 3, 2, 1, 2, 4] },
  },
  {
    name: 'АКАДЕМИЯ АУРЫ',
    subtitle: 'Здесь не учатся. Здесь позируют.',
    floorA: '#4a3b2f', floorB: '#45372c', floorAlt: '#6a4b8f',
    wallTop: '#c9a24a', wallFace: '#7a5a22', wallLine: '#f0d27a',
    hazard: '#ffd23f', bg: 0x1f1610, accent: COLORS.yellow,
    music: { tempo: 96, root: 52, scale: [0, 2, 3, 7, 8], bass: [0, 0, 4, 3], lead: [4, 3, 2, 0, 2, 3, 4, 3] },
  },
  {
    name: 'NPC LIVE-АРЕНА',
    subtitle: 'Эфир не заканчивается никогда',
    floorA: '#2a2140', floorB: '#251d3a', floorAlt: '#5a1f4a',
    wallTop: '#ff2e88', wallFace: '#8a1550', wallLine: '#ff8cc3',
    hazard: '#22e4ff', bg: 0x140f22, accent: COLORS.pink,
    music: { tempo: 124, root: 55, scale: [0, 4, 7, 9, 11], bass: [0, 3, 1, 2], lead: [0, 1, 2, 3, 4, 3, 2, 1] },
  },
  {
    name: 'BRAINROT-ПОЛИГОН',
    subtitle: 'Логика покинула чат',
    floorA: '#2f4a2a', floorB: '#2a4426', floorAlt: '#4a2f5a',
    wallTop: '#7cff4f', wallFace: '#2f8a1a', wallLine: '#c4ff9c',
    hazard: '#ff6a00', bg: 0x0f1a0c, accent: COLORS.green,
    music: { tempo: 136, root: 50, scale: [0, 1, 4, 6, 7, 10], bass: [0, 3, 0, 5], lead: [5, 0, 4, 1, 3, 2, 5, 0] },
  },
  {
    name: 'СЕРВЕР РЕКОМЕНДАТОРА',
    subtitle: 'Здесь рождаются тренды. И умирает смысл.',
    floorA: '#141a2e', floorB: '#111628', floorAlt: '#1e2a4a',
    wallTop: '#22e4ff', wallFace: '#0e5a7a', wallLine: '#9cf3ff',
    hazard: '#ff2e88', bg: 0x070912, accent: COLORS.cyan,
    music: { tempo: 140, root: 45, scale: [0, 2, 3, 6, 7, 8], bass: [0, 0, 5, 4], lead: [0, 3, 5, 4, 3, 1, 0, 2] },
  },
  {
    name: 'СЕКЦИЯ КОММЕНТАРИЕВ',
    subtitle: 'Здесь все знают лучше тебя',
    floorA: '#e9e6f2', floorB: '#e2dfee', floorAlt: '#d4ecff',
    wallTop: '#5b6b8c', wallFace: '#38445e', wallLine: '#9fb3d9',
    hazard: '#ff4757', bg: 0x2a2f3d, accent: COLORS.red,
    music: { tempo: 118, root: 53, scale: [0, 2, 4, 7, 9], bass: [0, 4, 2, 3], lead: [0, 2, 4, 2, 3, 1, 0, 4] },
  },
  {
    name: 'АРХИВ МЕМОВ 2007',
    subtitle: 'Здесь тренды доживают свои дни',
    floorA: '#5a4a3a', floorB: '#544536', floorAlt: '#3f6b8f',
    wallTop: '#c0c0c0', wallFace: '#808080', wallLine: '#ffffff',
    hazard: '#ff9f43', bg: 0x1f1a14, accent: COLORS.orange,
    music: { tempo: 100, root: 57, scale: [0, 2, 4, 5, 7, 9, 11], bass: [0, 5, 3, 4], lead: [4, 2, 0, 2, 4, 4, 4, 2] },
  },
  {
    name: 'ТЁМНАЯ ЛЕНТА',
    subtitle: 'Конца нет. Есть только следующее видео.',
    floorA: '#16121f', floorB: '#130f1b', floorAlt: '#2a1030',
    wallTop: '#4b2a6b', wallFace: '#2a1540', wallLine: '#9b5cff',
    hazard: '#9b5cff', bg: 0x05030a, accent: COLORS.purple,
    music: { tempo: 84, root: 43, scale: [0, 1, 3, 5, 6, 8], bass: [0, 0, 1, 0], lead: [5, 3, 1, 0, 1, 3, 2, 0] },
  },
]

export const DEATH_LINES = [
  'Алгоритм посмотрел на твой геймплей и пролистнул.',
  'Твоя аура ушла в минус. Банк ауры уже выставил счёт.',
  'Это видео не набрало ни одного просмотра. Даже от мамы.',
  'Система обнаружила критический недостаток сигма-энергии.',
  'Даже NPC сыграли бы лучше. Они так и сказали. 47 раз подряд.',
  'Комментарии отключены. Из жалости.',
  'Рекомендатор добавил этот момент в подборку «Фейлы недели».',
  'Тебя моганула собственная клавиатура.',
]
