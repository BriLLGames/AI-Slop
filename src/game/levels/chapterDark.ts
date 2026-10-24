import { CSS, TILE } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { LevelDef } from './types'

// Chapter 7 — «Тёмная лента»: darkness, stealth past the Algorithm's eyes (vision cones),
// an infinite-scroll conveyor, the Feed Warden and the hero's own influencer double.

function objective(g: GameScene): void {
  if (!g.flag('trig_stealthDone')) g.setObjective('Прокрадись мимо Глаз Алгоритма. Прячься за колоннами.')
  else if (!g.flag('warden')) g.setObjective('Пробейся против бесконечного скролла к Надзирателю ленты')
  else if (!g.flag('double')) g.setObjective('Кто ждёт за воротами Надзирателя?..')
  else g.setObjective('Выход из Тёмной ленты — в левом верхнем углу')
}

const CONVEYOR = { x: 14, y: 13, w: 25, h: 10, dx: 150 }

export const chapterDark: LevelDef = {
  index: 7,
  dark: true,
  map: [
    '########################################',
    '#...........#......v...........v.......#',
    '#.P.........#..........................#',
    '#...........#...o....o.....o.....o.....#',
    '#.....O................................#',
    '#..............1...o....2....o......3..#',
    '#......................................#',
    '#...........#...o....o.....o.....o.....#',
    '#...s.......#..........................#',
    '#...........#......u...........u.....C.#',
    '#..........*#..........................#',
    '#####################################..#',
    '#.X.#........#......................C..#',
    '#...#........#.........................#',
    '#YYY#........#...o.....o.....o.....o...#',
    '#............#.........................#',
    '#............G.........................#',
    '#.....I......G..W......*...............#',
    '#............G.........................#',
    '#............#.........y.....y.........#',
    '#............#...o.....o.....o.....o...#',
    '#..h.........#.....................h...#',
    '#............#.........................#',
    '########################################',
  ],
  legend: {
    s: { kind: 'prop', tex: 'sign', name: 'Предупреждение', read: ['ГЛАЗА АЛГОРИТМА', 'Жёлтый конус — зона внимания. Попадёшь в него — отправишься «в рекомендации» (назад к последней безопасной точке).', 'Колонны закрывают обзор. Глаза медленно водят взглядом туда-сюда. Жди момент.'] },
    O: {
      kind: 'npc', id: 'oleg', tex: 'oleg', name: 'Застрявший Олег', behavior: { type: 'bob' },
      barks: ['...ещё одно...', '*свайп*', '*свайп* *свайп*', 'Сейчас досмотрю и пойду. С 2017 года.'],
      talk: async (g) => {
        if (g.flag('olegAwake')) { await g.say('ОЛЕГ', ['Я вижу потолок! Он тёмный, но мой!', 'Слушай: Глаза не видят сквозь колонны. И у них слепые зоны по бокам. Удачи, бро.'], 'oleg'); return }
        await g.say('ОЛЕГ', ['*свайп*', 'А? Я тут... недолго. Лет девять.', 'Каждый раз думаю: досмотрю это — и пойду. Но следующее начинается само.'], 'oleg')
        const n = await g.ask('ОЛЕГ', 'Ты тоже за последним видео?', ['Могнуть его взглядом, чтобы очнулся (дуэль)', 'Оставить Олега в покое'], 'oleg')
        if (n !== 0) return
        const win = await g.duel({
          name: 'Застрявший Олег', tex: 'oleg', kinds: ['hold', 'observe'], hits: 3, lives: 3, speed: 0.9,
          rule: 'Выдержи взгляд (держи E, отпусти в зелёной зоне) и лови момент, когда он отрывает глаза от экрана ВНИЗ... то есть от экрана.',
          taunts: ['*свайп*', 'Ещё одно...', 'Не мешай, тут котик.'], hurt: ['Что это... было?', 'Я... моргнул?!', 'Мои пальцы... замёрзли...'],
          win: 'Я... я вижу! Сколько времени?! Почему я в пижаме 2017 года?!', lose: '*свайп* ...прости, отвлёкся.',
        })
        if (!win) return
        g.persistFlag('olegAwake')
        g.npc('oleg')!.spec.barks = ['Потолок!', 'Я свободен!', 'Надо позвонить маме. Она, наверное, в комментариях.']
        g.giveFragment(g.player.x, g.player.y - 30)
        g.heal(10)
      },
    },
    W: {
      kind: 'npc', id: 'warden', tex: 'warden', name: 'Надзиратель ленты', behavior: { type: 'pose' },
      barks: ['Пролистывай.', 'Не останавливайся.', 'Задержка на видео больше 3 секунд — нарушение.'],
      talk: async (g) => {
        if (g.flag('warden')) { await g.say('НАДЗИРАТЕЛЬ', 'Проходи. Я... пролистну этот момент.', 'warden'); return }
        await g.say('НАДЗИРАТЕЛЬ', ['Я слежу, чтобы никто не останавливался. Остановка — это начало мысли. Мысль — это конец сессии.', 'Ворота открою только тому, кто переглядит меня. E — если хватит духу.'], 'warden')
      },
      mog: async (g, npc) => {
        if (g.flag('warden')) return
        const win = await g.duel({
          name: 'Надзиратель ленты', tex: 'warden', kinds: ['hold', 'combo', 'observe', 'dodge'], hits: 5, lives: 3, speed: 1.15,
          rule: 'Надзиратель знает все стили: невозмутимость, комбо, взгляд вниз, уклон и контр-мог. Читай подсказку под ареной.',
          taunts: ['Пролистано.', 'Скучно. Следующий.', 'Удержание: ноль.'], hurt: ['Ты... остановил меня?', 'Моя лента... дёрнулась!', 'Это... интересно? Нет. Нельзя.'],
          win: 'Я... впервые за годы досмотрел что-то до конца. Это был ты. Проходи.', lose: 'Пролистываю тебя. Возвращайся, когда прогрузишься.',
        })
        if (!win) return
        g.persistFlag('warden')
        npc.mogEnabled = false
        g.openGate('g1')
        g.persistFlag('gate_g1')
        await g.say('НАДЗИРАТЕЛЬ', ['За воротами тебя ждут. Кто-то очень похожий на тебя. Только с лучшим светом.'], 'warden')
        objective(g)
      },
    },
    I: {
      kind: 'npc', id: 'double', tex: 'influencer', name: 'ТЫ (версия из ленты)', behavior: { type: 'pose' },
      barks: ['Свет падает идеально.', '14,8 млн подписчиков. И все — мои.', 'Хештег сам себя не поставит.'],
      talk: async (g, npc) => {
        if (g.flag('double')) { await g.say('ТЫ', 'Он исчез. Осталась только кольцевая лампа. И немного неловкости.'); return }
        await introDouble(g)
        npc.bark('Ну что? Могнёшь сам себя?')
      },
      mog: async (g, npc) => {
        if (g.flag('double')) return
        if (!g.flag('doubleMet')) await introDouble(g)
        const win = await g.duel({
          name: 'ТЫ (версия из ленты)', tex: 'influencer', kinds: ['timing', 'rhythm', 'sequence', 'dodge', 'observe', 'combo', 'hold'], hits: 7, lives: 3, speed: 1.2,
          rule: 'Он — это ты, только отредактированный. Он знает ВСЕ твои приёмы. Каждый раунд — любой стиль.',
          taunts: ['Я — лучшая версия тебя. С фильтром.', 'Даже твой промах я бы смонтировал красивее.', 'Удержание выше, чем у тебя. Всегда.'],
          hurt: ['Эй! Это мой ракурс!', 'Ты сбиваешь мне свет!', 'Подписчики... отписываются...'],
          win: '...Без меня тебя никто не посмотрит.', lose: 'Видишь? Ленте нужен я. Попробуй ещё.',
        })
        if (!win) return
        g.persistFlag('double')
        npc.mogEnabled = false
        g.setMode('cutscene')
        await g.say('ТЫ', ['Без тебя меня никто не посмотрит?', 'Отлично. Этого я и хочу.'])
        Sfx.play('vineBoom')
        g.tweens.add({ targets: npc.sprite, alpha: 0, scaleX: 0.1, scaleY: 0.8, duration: 900, onComplete: () => npc.remove() })
        g.fx.burst(npc.x, npc.y - 30, 0xffd23f, 40, 260, 900, 'spark')
        await g.wait(1000)
        g.openGate('g2')
        g.persistFlag('gate_g2')
        await g.banner('ТЫ — НЕ КОНТЕНТ', 'Последняя преграда перед сервером исчезла. Рекомендатор это почувствовал.', CSS.yellow, 2200)
        g.setMode('play')
        objective(g)
      },
    },
    G: { kind: 'gate', id: 'g1' },
    Y: { kind: 'gate', id: 'g2' },
    v: { kind: 'enemy', type: 'drone', dir: 90, sweep: 55 },
    u: { kind: 'enemy', type: 'drone', dir: -90, sweep: 55 },
    y: { kind: 'enemy', type: 'bot' },
    '1': { kind: 'mark', id: 'safe1' },
    '2': { kind: 'mark', id: 'safe2' },
    '3': { kind: 'mark', id: 'safe3' },
  },
  zones: [
    { ...CONVEYOR, type: 'wind' },
    { x: 13, y: 4, w: 1, h: 3, type: 'trigger', id: 'stealthIntro', run: (g) => g.toast('Глаза Алгоритма! Не попадай в жёлтые конусы. Прячься за колоннами.', CSS.yellow) },
    {
      x: 36, y: 9, w: 3, h: 3, type: 'trigger', id: 'stealthDone',
      run: async (g) => {
        objective(g)
        await g.say('ТЫ', ['Прошёл. Внизу пол сам едет назад. Бесконечный скролл.', 'Если стоять на месте — унесёт обратно. Значит, не стоять. Рывок поможет.'])
      },
    },
  ],
  intro: async (g) => {
    await g.say('ТЫ', ['Темно. Только экраны светятся.', 'Это та самая лента, которую листают в три часа ночи. Когда уже не помнишь, зачем открыл.'])
    await g.say('СИСТЕМА', ['Добро пожаловать в Тёмную ленту.', 'Здесь нет утра. Есть только «ещё одно».'], 'none')
  },
  setup: (g) => {
    // animated conveyor arrows
    for (let tx = CONVEYOR.x; tx < CONVEYOR.x + CONVEYOR.w; tx += 3) {
      for (let ty = CONVEYOR.y; ty < CONVEYOR.y + CONVEYOR.h; ty += 3) {
        const a = g.add.image(tx * TILE + 24, ty * TILE + 24, 'arrowDown').setAngle(-90).setDepth(-850).setAlpha(0.7)
        g.tweens.add({ targets: a, x: a.x + TILE, alpha: 0.2, duration: 900, repeat: -1 })
      }
    }
    const w = g.npc('warden')
    if (w && g.flag('warden')) w.mogEnabled = false
    const d = g.npc('double')
    if (d && g.flag('double')) d.remove()
    if (g.flag('olegAwake')) { const o = g.npc('oleg'); if (o) o.spec.barks = ['Потолок!', 'Я свободен!'] }
    objective(g)
  },
}

async function introDouble(g: GameScene): Promise<void> {
  g.setFlag('doubleMet')
  await g.say('ТЫ (ВЕРСИЯ ИЗ ЛЕНТЫ)', [
    'О. Оригинал. Привет, я — ты. Только смонтированный. С кольцевой лампой и правильным ракурсом.',
    'Рекомендатор собрал меня из всех твоих моментов в эфире. Я набрал 14,8 миллиона. Ты — ноль.',
    'Предложение: ты остаёшься в ленте навсегда, а домой иду я. Мама даже не заметит разницы. У меня свет лучше.',
  ], 'influencer')
  await g.say('ТЫ', ['Мама заметит. Ты не умеешь мыть посуду.'])
  await g.say('ТЫ (ВЕРСИЯ ИЗ ЛЕНТЫ)', 'Посуда — это не контент. Дуэль. Подойди и нажми E.', 'influencer')
}
