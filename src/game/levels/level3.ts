import { CSS, FONT_BIG, TILE } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { LevelDef } from './types'

// Level 3 — «NPC Live-арена»: memory show (Simon), gift distraction puzzle, chat turrets,
// an optional donation quest, observe-duel with the moderator and the "you are live" twist.

const simon = { round: 0, seq: [] as number[], input: 0, showing: false, active: false }
let mimiAway = false
const PITCH = [1, 1.26, 1.5, 1.68]

function objective(g: GameScene): void {
  if (!g.flag('simon')) g.setObjective('Пройди шоу «Повторяшки» у Ведущего Пик-Пик (студия слева)')
  else if (!g.flag('mimiPassed')) g.setObjective('Проберись мимо стримерши Ми-Ми наверху. Подарки её отвлекают.')
  else if (!g.flag('grisha')) g.setObjective('Одолей Модератора Гришу')
  else g.setObjective('Свайп-портал — за воротами Модератора')
}

function lamp(g: GameScene, k: number, ms = 420): void {
  const it = g.world.interactables.find((i) => i.id === `lamp${k}`)
  if (!it) return
  it.img.setTexture(`lamp${k}_on`)
  Sfx.play('lamp', PITCH[k] ?? 1)
  g.fx.burst(it.x, it.y - 20, [0xff4757, 0x5dff9b, 0x22e4ff, 0xffd23f][k] ?? 0xffffff, 8, 120, 400)
  g.time.delayedCall(ms, () => it.img.setTexture(`lamp${k}`))
}

async function playRound(g: GameScene): Promise<void> {
  simon.active = true
  simon.showing = true
  simon.input = 0
  const len = 3 + simon.round
  simon.seq = Array.from({ length: len }, () => Math.floor(Math.random() * 4))
  g.setMode('cutscene')
  g.toast(`Раунд ${simon.round + 1}/3 — смотри на лампы!`, CSS.yellow)
  await g.wait(900)
  for (const k of simon.seq) { lamp(g, k, 450); await g.wait(Math.max(420, 680 - simon.round * 80)) }
  simon.showing = false
  g.setMode('play')
  g.toast('Повтори! Подходи к лампам и жми F', CSS.cyan)
}

function showLiveScreen(g: GameScene): void {
  const x = 20 * TILE + TILE / 2
  const y = 1 * TILE + 4
  const t = g.add.text(x, y, '● LIVE  1 402 337\nСЕЙЧАС В ЭФИРЕ:\nТЫ', { fontFamily: FONT_BIG, fontSize: '13px', color: '#ffffff', align: 'center' }).setOrigin(0.5).setDepth(5000)
  g.tweens.add({ targets: t, alpha: 0.6, yoyo: true, repeat: -1, duration: 500 })
}

export const level3: LevelDef = {
  index: 2,
  map: [
    '########################################',
    '#....#..............V..................#',
    '#....Z.................................#',
    '#.X..Z.G..............................*#',
    '#....Z.................................#',
    '#....#.............C...................#',
    '#....#....o.......................o....#',
    '###################M####################',
    '#....#########............##############',
    '#.Q..#########.g..........##############',
    '#...*#########..........*.##############',
    '#....#########............##############',
    '##%###########..f......f..##############',
    '#............#............#..t.....*...#',
    '#.q..w..e..r.#####1111#####............#',
    '#............#............#.........@..#',
    '#......H.....#............#............#',
    '#...................................t..#',
    '#..................P...................#',
    '#................................@.....#',
    '#....*.......#..D.........#............#',
    '#............#........h...#...t........#',
    '#............#............#...........@#',
    '########################################',
  ],
  legend: {
    V: { kind: 'prop', tex: 'screen', big: true, name: 'Гигантский экран', read: ['На экране — прямой эфир. Счётчик зрителей растёт.', 'Внизу бегущая строка: «чат, он заметил экран», «ахахах», «лайк если смотришь с дивана».'] },
    Z: { kind: 'gate', id: 'g2' },
    '1': { kind: 'gate', id: 'g1' },
    G: {
      kind: 'npc', id: 'grisha', tex: 'grisha', name: 'Модератор Гриша', behavior: { type: 'idle' },
      barks: ['Я всё вижу.', 'Нарушение правил сообщества... зафиксировано.', '*листает жалобы*'],
      talk: async (g) => {
        if (g.flag('grisha')) { await g.say('МОДЕРАТОР ГРИША', 'Проходи. Я отмечу это как «ложное срабатывание».', 'grisha'); return }
        await g.say('МОДЕРАТОР ГРИША', ['Я модератор. Я смотрю. Всегда смотрю.', 'Кроме моментов, когда смотрю в телефон. Но таких моментов нет. Почти.', 'Выход — только через Могание. Правила сообщества, пункт 404.'], 'grisha')
      },
      mog: async (g, npc) => {
        const win = await g.duel({
          name: 'Модератор Гриша', tex: 'grisha', kinds: ['observe'], hits: 3, lives: 3, speed: 1, tutorial: true,
          rule: 'Модератор следит за тобой. Могай ТОЛЬКО когда он отводит взгляд ВНИЗ — в телефон. Остальное — фейки.',
          taunts: ['Попался. Я смотрел.', 'Предупреждение 1/3.', 'Ты нарушил правило «не моргать на модератора».'],
          hurt: ['Эй! Я просто проверял уведомления!', 'Это... не по правилам!', 'Жалоба отклонена... мной же...'],
          win: 'Ладно. Помечу это как «ложное срабатывание». Проходи.', lose: 'Бан на 5 секунд. Подходи снова.',
        })
        if (!win) return
        g.persistFlag('grisha')
        g.openGate('g2')
        g.persistFlag('gate_g2')
        npc.mogEnabled = false
        await npc.moveTo(8, 5, 600)
        objective(g)
      },
    },
    M: {
      kind: 'npc', id: 'mimi', tex: 'mimi', name: 'Стримерша Ми-Ми', behavior: { type: 'dance' },
      barks: ['Спасибо за розу, Ксюша!', 'Чат, ставьте плюсики!', 'Танцую, пока не наберём 10к!', 'Спасибо за розу, Ксюша!'],
      barkEvery: 2.5,
      talk: async (g) => { await g.say('МИ-МИ', ['Не сейчас, у меня эфир! Спасибо за розу, Ксюша!', '...Что? Пройти? Через мой кадр? Только если отвлечёшь меня подарком. Автомат — слева.'], 'mimi') },
      mog: async (g) => {
        Sfx.play('error')
        await g.say('СИСТЕМА', ['Могать стримершу во время эфира — нарушение правил сообщества.', 'Выдано предупреждение 1/3. (Попробуй подарок.)'], 'none')
      },
    },
    Q: {
      kind: 'npc', id: 'banned', tex: 'banned', name: 'Забаненный стример', behavior: { type: 'bob' },
      talk: async (g) => {
        await g.say('ЗАБАНЕННЫЙ', [
          'Меня забанили за стрим, где я четыре часа молча читал книгу.',
          'Лучшая трансляция в моей жизни. Три зрителя. Все трое — я, с разных аккаунтов.',
          'Знаешь, что я понял? Рекомендатор не умеет показывать тишину. Она ломает ему метрики.',
        ], 'banned')
      },
    },
    H: {
      kind: 'npc', id: 'host', tex: 'host', name: 'Ведущий Пик-Пик', behavior: { type: 'dance' },
      barks: ['ПИК-ПИК В ЭФИРЕ!', 'Повторяшки! Повторяшки!', 'Не переключайтесь! (Переключиться нельзя)'],
      talk: async (g) => {
        if (g.flag('simon')) { await g.say('ПИК-ПИК', 'Ты — чемпион «Повторяшек»! Рейтинг шоу вырос на 0,0003%! Рекорд!', 'host'); return }
        if (simon.active) { await g.say('ПИК-ПИК', 'Эфир идёт! Повторяй последовательность ламп!', 'host'); return }
        await g.say('ПИК-ПИК', [
          'ПИК-ПИК В ЭФИРЕ! Сегодня у нас — шоу «Повторяшки»!',
          'Я зажигаю лампы, ты повторяешь: подходишь к лампе и жмёшь F. Три раунда, каждый длиннее.',
          'Ошибёшься — эфир сорван, раунд заново. Победишь — открою ворота в коридор звёзд!',
        ], 'host')
        simon.round = 0
        await playRound(g)
      },
    },
    D: {
      kind: 'npc', id: 'donat', tex: 'donat', name: 'Стример Донатыч', behavior: { type: 'bob' },
      barks: ['Спасибо за донат!', 'Чат, это надо монетизировать!', 'Ставлю цель сбора: на новую цель сбора!'],
      talk: async (g, npc) => {
        if (g.flag('donatDone')) { await g.say('ДОНАТЫЧ', 'VIP-статус активен! Он ничего не даёт, но звучит дорого.', 'donat'); return }
        const roses = g.run.items['rose'] ?? 0
        if (roses >= 3) {
          g.run.items['rose'] = 0
          g.persistFlag('donatDone')
          Sfx.play('gift')
          await g.say('ДОНАТЫЧ', ['ТРИ РОЗЫ! ЧАТ, ВЫ ВИДЕЛИ?! Лучший донатер стрима!', 'Держи награду: фрагмент внимания, полное здоровье и VIP-статус.', 'VIP-статус ничего не даёт. Но звучит дорого.'], 'donat')
          g.heal(10)
          g.giveFragment(npc.x, npc.y - 30)
          return
        }
        await g.say('ДОНАТЫЧ', [
          'Йо! Донатыч в эфире! Я монетизирую всё. Твоё дыхание — уже контент.',
          `Квест для чата: принеси мне 3 виртуальные розы. Они валяются у Чата, справа. У тебя: ${roses}/3.`,
          'Осторожно, Чат стреляет комментариями. «КРИНЖ» больно, «RATIO» — очень больно.',
        ], 'donat')
      },
    },
    g: { kind: 'switch', id: 'gift', tex: 'giftbox', name: 'Отправить подарок стримерше' },
    q: { kind: 'switch', id: 'lamp0', tex: 'lamp0', name: 'Красная лампа' },
    w: { kind: 'switch', id: 'lamp1', tex: 'lamp1', name: 'Зелёная лампа' },
    e: { kind: 'switch', id: 'lamp2', tex: 'lamp2', name: 'Голубая лампа' },
    r: { kind: 'switch', id: 'lamp3', tex: 'lamp3', name: 'Жёлтая лампа' },
    f: { kind: 'npc', id: 'fan', tex: 'fan', name: 'Фанат', behavior: { type: 'dance' }, barks: ['ЛЕГЕНДА!', 'ЛЕГЕНДА! ЛЕГЕНДА!', 'Ми-Ми, посмотри на меня!'] },
    t: { kind: 'enemy', type: 'turret' },
    '@': { kind: 'item', type: 'rose' },
  },
  zones: [
    {
      x: 6, y: 1, w: 33, h: 6, type: 'trigger', id: 'liveTwist',
      run: async (g) => {
        g.persistFlag('mimiPassed')
        objective(g)
        g.setMode('cutscene')
        showLiveScreen(g)
        Sfx.play('vineBoom')
        await g.panTo(20 * TILE + 24, 2 * TILE, 700)
        await g.say('СКИП', ['Эм... там, на экране...', 'Это ты. Ты в прямом эфире.', 'Судя по счётчику — с самого начала. С дивана.'], 'skip')
        await g.say('ТЫ', ['С САМОГО НАЧАЛА?!', 'Я же на первом уровне три минуты читал объявление про кота!'])
        await g.say('СКИП', ['Это был самый залайканный момент сезона. Чат требует продолжения.', 'Ладно, неважно! Выход — за Модератором Гришей. Он следит за всеми... но иногда отвлекается.'], 'skip')
        await g.panBack()
        g.setMode('play')
      },
    },
  ],
  intro: async (g) => {
    await g.say('СКИП', [
      'NPC Live-арена! Тут все стримят всё. Даже стены. Особенно стены.',
      'Видишь коробки с надписью «ЧАТ»? Они стреляют комментариями. Уклоняйся рывком — во время рывка ты неуязвим.',
      'Если стример повторяет одно и то же весь день — это не баг. Это контент.',
    ], 'skip')
  },
  setup: (g) => {
    simon.active = false
    simon.showing = false
    simon.round = 0
    mimiAway = false
    if (g.flag('simon') && !g.flag('gate_g1')) g.openGate('g1', true)
    const mimi = g.npc('mimi')
    if (mimi && g.flag('mimiPassed')) mimi.placeAt(21, 9)
    if (g.flag('trig_liveTwist')) showLiveScreen(g)
    const gr = g.npc('grisha')
    if (gr && g.flag('grisha')) { gr.mogEnabled = false; gr.placeAt(8, 5) }
    objective(g)
  },
  onSwitch: async (g, id) => {
    if (id === 'gift') {
      const mimi = g.npc('mimi')
      if (!mimi || g.flag('mimiPassed')) { g.toast('Ми-Ми уже ушла на перерыв. Навсегда. Это тоже контент.', CSS.dim); return }
      if (mimiAway) { g.toast('Она ещё благодарит за прошлый подарок', CSS.dim); return }
      mimiAway = true
      Sfx.play('gift')
      const it = g.world.interactables.find((i) => i.id === 'gift')
      if (it) g.fx.burst(it.x, it.y - 20, 0xff8cc3, 20, 200, 600, 'spark')
      mimi.bark('ОЙ! ПОДАРОК! СПАСИБО, ЗАЙКИ! *танец благодарности*', 3000)
      for (const n of g.npcs) if (n.spec.id === 'fan') n.bark('ЛЕГЕНДА!!!', 2000)
      await mimi.moveTo(22, 10, 500)
      await g.wait(5200)
      if (g.flag('mimiPassed')) return
      mimi.bark('Так, на чём я остановилась? Спасибо за розу, Ксюша!')
      await mimi.moveTo(19, 7, 500)
      mimiAway = false
      return
    }
    if (id.startsWith('lamp')) {
      const k = Number(id.slice(4))
      if (g.flag('simon')) { lamp(g, k); return }
      if (!simon.active || simon.showing) { lamp(g, k); g.toast('Сначала поговори с Ведущим Пик-Пик', CSS.dim); return }
      lamp(g, k)
      if (simon.seq[simon.input] === k) {
        simon.input++
        if (simon.input >= simon.seq.length) {
          simon.round++
          simon.active = false
          if (simon.round >= 3) {
            g.persistFlag('simon')
            Sfx.play('win')
            g.npc('host')?.bark('ЧЕМПИОН! ЧЕМПИОН!')
            await g.say('ПИК-ПИК', ['НЕВЕРОЯТНО! Три раунда без ошибок! Наши зрители (двое) в восторге!', 'Ворота в коридор звёзд открыты! Только осторожно: там Ми-Ми. Она не выходит из кадра. Никогда.'], 'host')
            g.openGate('g1')
            g.persistFlag('gate_g1')
            objective(g)
          } else {
            Sfx.play('confirm')
            g.npc('host')?.bark('ВЕРНО! Следующий раунд!')
            await g.wait(900)
            await playRound(g)
          }
        }
      } else {
        simon.active = false
        Sfx.play('error')
        await g.say('ПИК-ПИК', ['ЭФИР СОРВАН! Зрители ушли смотреть котиков!', 'Ничего, это прямой эфир — тут можно всё. Ещё раз этот раунд!'], 'host')
        await playRound(g)
      }
    }
  },
  onPickup: (g) => {
    const d = g.npc('donat')
    if (d) { d.bark('СПАСИБО ЗА ДОНАТ!', 1800); g.fx.floatText(d.x, d.y - 80, '+донат', CSS.yellow, 16) }
  },
  onHurt: (g) => {
    const d = g.npc('donat')
    if (d && Math.random() < 0.5) d.bark('ЧАТ, ДОНАТ НА ЛЕЧЕНИЕ!', 1800)
  },
}
