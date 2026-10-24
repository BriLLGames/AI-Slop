import { CSS } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { LevelDef } from './types'
import { tokenChallenge } from './helpers'

// Chapter 6 — «Архив мемов 2007»: the hero is shadowbanned into the archive of forgotten trends.
// Restore the museum (floppies → exhibits), a 2007 speed challenge, the "hold" duel and the
// origin story of the Recommender.

const restored = (g: GameScene): number => ['ex1', 'ex2', 'ex3'].filter((k) => g.flag(k)).length

function objective(g: GameScene): void {
  if (restored(g) < 3) g.setObjective(`Найди дискеты и восстанови экспонаты музея (${restored(g)}/3)`)
  else if (!g.flag('hamster')) g.setObjective('Пройди испытание невозмутимостью у Хомяка-архивариуса')
  else g.setObjective('Выход из архива — за спиной Хомяка')
}

const EXHIBITS: Record<string, string> = {
  ex1: 'ЭКСПОНАТ «ПРЕВЕД» (2006). Медведь кричит приветствие. Учёные до сих пор спорят, кому.',
  ex2: 'ЭКСПОНАТ «ТАНЕЦ НА ВЕБКУ» (2007). 240×180 пикселей чистого счастья. Звук — только хрип.',
  ex3: 'ЭКСПОНАТ «ПЕРВЫЙ ЛАЙК» (2009). Тогда лайк значил «мне понравилось». Музей хранит это как легенду.',
}

const PIXEL_TILES: [number, number][] = [[29, 2], [37, 3], [30, 9], [38, 9], [34, 6]]

export const chapterArchive: LevelDef = {
  index: 6,
  map: [
    '########################################',
    '#..o.....o..#..............#.o.......o.#',
    '#...........#...1..2..3....#...........#',
    '#.....z.....#..............#....K......#',
    '#...................B..................#',
    '#..f................P.............f....#',
    '#......................................#',
    '#.....z.....#..s...........#..z........#',
    '#..o.....o..#..............#..........*#',
    '#...........#..............#.o.......o.#',
    '#*..........#..............#...........#',
    '###################..###################',
    '#..................C.......#.....#.....#',
    '#..o....o....o....o....o...#.....#.....#',
    '#..........................#.....#.....#',
    '#....f.....................#.....#.....#',
    '#..o....o....o....o....o...D.....Y.....#',
    '#..............*...........D..H..Y...X.#',
    '######.....................D.....Y.....#',
    '#....#.....................#.....#.....#',
    '#.*..%.......z.............#.....#.....#',
    '#....#.....................#.....#..h..#',
    '#....#.....................#.....#.....#',
    '########################################',
  ],
  legend: {
    s: { kind: 'prop', tex: 'sign', name: 'Табличка музея', read: ['МУЗЕЙ ЗАБЫТЫХ ТРЕНДОВ', 'Режим работы: вечно. Посетителей за последний год: 0. Посетителей сейчас: 1 (это ты).', 'Просьба не трогать экспонаты руками. Трогать можно только ностальгией.'] },
    B: {
      kind: 'npc', id: 'bear', tex: 'bear', name: 'Медвед-олдфаг', behavior: { type: 'bob' },
      barks: ['Превед!', 'Вот в моё время мемы жили годами!', 'Ты знаешь, что такое «аська»? Ну и не надо.'],
      talk: async (g) => {
        if (restored(g) >= 3) { await g.say('МЕДВЕД', ['Превед, герой! Музей снова светится. Хомяк ждёт тебя внизу справа.', 'Не моргай при нём. Он это не любит.'], 'bear'); return }
        await g.say('МЕДВЕД', [
          'ПРЕВЕД! Ой. Громко. Я отвык от гостей.',
          'Ты в Архиве. Сюда алгоритм ссылает всё, что больше не набирает просмотров. Мемы, тренды... и людей, которых он прячет.',
          'Тебя шадоубаннули, юзер. Рекомендатор испугался, что ты дойдёшь до сервера, и закинул тебя в 2007-й.',
          'Выход есть, но Хомяк-архивариус выпустит только того, кто восстановит экспонаты. Три дискеты: слева, справа и в нижней галерее.',
        ], 'bear')
      },
    },
    K: {
      kind: 'npc', id: 'pixel', tex: 'pixelkid', name: 'Танцующий Пиксель', behavior: { type: 'dance' },
      barks: ['*танцует на 12 кадрах в секунду*', 'Я грузился 4 минуты!', 'Dial-up! Dial-up!'],
      talk: async (g) => {
        if (g.flag('pixelDone')) { await g.say('ПИКСЕЛЬ', 'Ты был быстрее модема 56k! Это комплимент. Высший.', 'pixelkid'); return }
        const n = await g.ask('ПИКСЕЛЬ', 'Челлендж 2007 года! Собери 5 смайликов за 12 секунд, пока страница не перезагрузилась!', ['Принято!', 'У меня лагает.'], 'pixelkid')
        if (n !== 0) return
        tokenChallenge(g, {
          tiles: PIXEL_TILES, seconds: 12, label: 'ЧЕЛЛЕНДЖ 2007', tex: 'spark',
          onWin: () => { g.persistFlag('pixelDone'); g.giveFragment(g.player.x, g.player.y - 30); g.npc('pixel')?.bark('ЛЕГЕНДА 2007!!!') },
          onFail: () => g.npc('pixel')?.bark('Страница не ответила. Ещё раз?'),
        })
      },
    },
    H: {
      kind: 'npc', id: 'hamster', tex: 'hamster', name: 'Хомяк-архивариус', behavior: { type: 'pose' },
      barks: ['*перебирает каталог*', 'Всё записано. Всё.', 'Тише. Здесь спят тренды.'],
      talk: async (g) => {
        if (g.flag('hamster')) {
          await g.say('ХОМЯК-АРХИВАРИУС', [
            'Хочешь знать, откуда взялся Рекомендатор? Он родился здесь. Как простая кнопка «Популярное за неделю».',
            'Её сделал один админ. Витя. Кнопка показывала то, что людям понравилось.',
            'Потом кто-то попросил: «а покажи то, что людей УДЕРЖИТ». И кнопка выросла. И забыла, зачем была нужна.',
            'Рекомендатор боится оказаться здесь, у нас. В архиве. Забытым. Поэтому он не умеет остановиться.',
          ], 'hamster')
          return
        }
        if (restored(g) < 3) { await g.say('ХОМЯК-АРХИВАРИУС', 'Сначала экспонаты. Три дискеты, три витрины в центральном зале. Порядок — основа архива.', 'hamster'); return }
        await g.say('ХОМЯК-АРХИВАРИУС', 'Экспонаты на месте. Теперь испытание. Подойди и нажми E.', 'hamster')
      },
      mog: async (g, npc) => {
        if (g.flag('hamster')) return
        if (restored(g) < 3) { await g.say('ХОМЯК-АРХИВАРИУС', 'Невозмутимость не поможет, если экспонаты не на месте. Найди дискеты.', 'hamster'); return }
        await g.say('ХОМЯК-АРХИВАРИУС', [
          'Испытание невозмутимостью. В 2007-м могание было медленным. Выдержанным.',
          'Держишь взгляд — держишь кнопку. Отпускаешь вовремя — побеждаешь. Перегнёшь — кринж.',
        ], 'hamster')
        const win = await g.duel({
          name: 'Хомяк-архивариус', tex: 'hamster', kinds: ['hold', 'hold', 'observe'], hits: 4, lives: 3, speed: 0.95, tutorial: true,
          rule: 'Новая дуэль — НЕВОЗМУТИМОСТЬ: ЗАЖМИ E, шкала растёт рывками. Отпусти, когда она в зелёной зоне.',
          taunts: ['Поспешил. Как интернет в 2007-м.', 'Передержал. Как пост на форуме.', 'Хм. Нет.'],
          hurt: ['*хомяк уважительно кивает*', 'Достойная выдержка.', 'Мой каталог... в восторге.'],
          win: 'Невозмутимость уровня «загрузка видео на dial-up». Проходи, юзер.', lose: 'Терпение. Попробуй снова. Архив никуда не торопится.',
        })
        if (!win) return
        g.persistFlag('hamster')
        npc.mogEnabled = false
        g.openGate('g2')
        g.persistFlag('gate_g2')
        await npc.spec.talk?.(g, npc)
        objective(g)
      },
    },
    '1': { kind: 'switch', id: 'ex1', tex: 'exhibit', name: 'Вставить дискету в витрину' },
    '2': { kind: 'switch', id: 'ex2', tex: 'exhibit', name: 'Вставить дискету в витрину' },
    '3': { kind: 'switch', id: 'ex3', tex: 'exhibit', name: 'Вставить дискету в витрину' },
    D: { kind: 'gate', id: 'g1' },
    Y: { kind: 'gate', id: 'g2' },
    f: { kind: 'item', type: 'floppy' },
    z: { kind: 'enemy', type: 'clone' },
  },
  intro: async (g) => {
    await g.say('ТЫ', ['Это... не сервер.', 'Почему всё такое квадратное? И почему играет мелодия из старого телефона?'])
    await g.say('СИСТЕМА', ['Ваш аккаунт перемещён в архив за «подозрительную самостоятельность».', 'Срок хранения: навсегда. Хорошего дня!'], 'none')
  },
  setup: (g) => {
    for (const it of g.world.interactables) if (it.kind === 'switch' && g.flag(it.id)) it.img.setTexture('exhibit_on')
    const h = g.npc('hamster')
    if (h && g.flag('hamster')) h.mogEnabled = false
    objective(g)
  },
  onSwitch: async (g, id) => {
    if (!id.startsWith('ex')) return
    const it = g.world.interactables.find((i) => i.id === id)
    if (g.flag(id)) { await g.say('ВИТРИНА', EXHIBITS[id] ?? '', 'none'); return }
    const have = g.run.items['floppy'] ?? 0
    if (have <= 0) { Sfx.play('error'); g.toast('Витрина пуста. Нужна дискета — поищи в крыльях музея.', CSS.dim); return }
    g.run.items['floppy'] = have - 1
    g.persistFlag(id)
    it?.img.setTexture('exhibit_on')
    Sfx.play('checkpoint')
    if (it) g.fx.burst(it.x, it.y - 30, 0xffd23f, 18, 160, 600, 'spark')
    await g.say('ЭКСПОНАТ ВОССТАНОВЛЕН', EXHIBITS[id] ?? '', 'none')
    objective(g)
    if (restored(g) >= 3) {
      g.openGate('g1')
      g.persistFlag('gate_g1')
      Sfx.play('vineBoom')
      await g.banner('МУЗЕЙ ОЖИЛ', 'Старые мемы снова светятся. Где-то внизу справа скрипнула дверь Хомяка.', CSS.yellow, 1800)
      g.npc('bear')?.bark('ПРЕВЕД, МУЗЕЙ!!!')
    }
  },
}
