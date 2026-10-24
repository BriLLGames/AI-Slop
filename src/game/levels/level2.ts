import { CSS } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { Npc } from '../entities/npc'
import type { LevelDef } from './types'

// Level 2 — «Академия ауры»: sigma guards (sequence / rhythm / dodge duels), wind courtyard,
// the shop, an optional fan quest, a "do nothing" secret and the Dean's mixed exam.

function objective(g: GameScene): void {
  if (!g.flag('g1')) g.setObjective('Пройди мимо Стража Тишины')
  else if (!g.flag('g2')) g.setObjective('Пересеки двор с ветром и одолей Стража Ритма')
  else if (!g.flag('g3')) g.setObjective('Победи Мастера Аура-фу')
  else if (!g.flag('dean')) g.setObjective('Сдай финальный экзамен Декану Аурелию')
  else g.setObjective('Свайп-портал — за воротами Декана')
}

const silentTalk = (name: string) => async (g: GameScene): Promise<void> => {
  await g.say(name, ['*Смотрит в горизонт. Не моргает. Возможно, это скриншот.*', '(Стражи не разговаривают с теми, у кого меньше 9000 ауры. Попробуй E.)'], 'none')
}

function guardWin(g: GameScene, npc: Npc, flag: string, gate: string, dx: number, dy: number): void {
  g.persistFlag(flag)
  g.openGate(gate)
  g.persistFlag(`gate_${gate}`)
  npc.mogEnabled = false
  npc.spec.talk = async (gg) => { await gg.say(npc.spec.name.toUpperCase(), '...проходи. И никому не говори, что я проиграл.', npc.spec.tex) }
  void npc.moveTo(Math.floor(npc.x / 48) + dx, Math.floor(npc.y / 48) + dy, 600)
  objective(g)
}

let monkShown = 0

export const level2: LevelDef = {
  index: 1,
  map: [
    '########################################',
    '#############..o........o..#.o.......o.#',
    '#############..............Y...........#',
    '#############..X...........Y.....A.....#',
    '#############..............Y...........#',
    '#############....s.........#...o...o...#',
    '#############..............#...........#',
    '############################....C......#',
    '#...........#..z.......f...#...........#',
    '#.....M.....#......*.......#...........#',
    '#..........*%..z.........z.#...........#',
    '#...........#..............#...........#',
    '####################.###########UUU#####',
    '#...........#..C...........#.....R.....#',
    '#.T.....F...#..............#...........#',
    '#...........#......*.......#...h.......#',
    '#...o...o...#..............#..b.....b..#',
    '#...........1....z.........#...........#',
    '#..........Q1..............#......*....#',
    '#...........1..............2...........#',
    '#...........#.............W2....b......#',
    '#..P........#.....z........2...........#',
    '#...........#..h...........#........*..#',
    '########################################',
  ],
  legend: {
    s: { kind: 'prop', tex: 'sign', name: 'Доска почёта', read: ['ДОСКА ПОЧЁТА АКАДЕМИИ', '1. Декан Аурелий.  2. Декан Аурелий (в очках).  3. Декан Аурелий (в профиль).', '4. Свободное место. Говорят, его займёт тот, кто моганёт Декана. Говорят, такого не бывает.'] },
    T: { kind: 'npc', id: 'merchant', tex: 'merchant', name: 'Барыга бустов Стасян', behavior: { type: 'bob' }, barks: ['Апгрейды! Свежие! Почти не б/у!', 'Скулы острее — жизнь длиннее!', 'Скидка 0%! Только сегодня!'], talk: (g, n) => g.openShop(n) },
    F: {
      kind: 'npc', id: 'platon', tex: 'platon', name: 'Аура-фермер Платон', behavior: { type: 'pose' },
      barks: ['*стоит красиво*', 'Ветра нет... аура не фармится...', 'Я в позе уже 21 день.'],
      talk: async (g, npc) => {
        if (g.flag('fanDone')) { await g.say('ПЛАТОН', 'Ветер в волосах, взгляд в даль, аура в плюсе. Я наконец-то сделал контент.', 'platon'); return }
        if ((g.run.items['fan'] ?? 0) > 0) {
          g.run.items['fan'] = 0
          g.persistFlag('fanDone')
          npc.spec.behavior = { type: 'dance' }
          npc.spec.barks = ['ВЕТЕР! ДА!', 'АУРА ФАРМИТСЯ!', '+1000 к загадочности!']
          Sfx.play('mogWin')
          await g.say('ПЛАТОН', ['Это... ВЕНТИЛЯТОР?!', '*волосы эпично развеваются*', 'Да! ДА! Вот она — аура! Я чувствую, как растут мои просмотры!', 'Держи. Ты заслужил. Это было самое важное событие в моей жизни. За сегодня.'], 'platon')
          g.giveFragment(npc.x, npc.y - 30)
          g.addAura(30)
          return
        }
        await g.say('ПЛАТОН', ['Тсс. Я фармлю ауру. Стою в позе, жду ветер.', 'Без ветра волосы не развеваются, без волос нет загадочности, без загадочности нет ауры. Наука.', 'Ветра нет уже три недели. Если найдёшь вентилятор — принеси. Говорят, один валяется наверху, в зале скроллеров.'], 'platon')
      },
    },
    Q: {
      kind: 'npc', id: 'guard1', tex: 'guard1', name: 'Страж Тишины', behavior: { type: 'pose' },
      talk: silentTalk('СТРАЖ ТИШИНЫ'),
      mog: async (g, npc) => {
        const win = await g.duel({
          name: 'Страж Тишины', tex: 'guard1', kinds: ['sequence'], hits: 4, lives: 3, speed: 0.9, tutorial: true,
          rule: 'Серия взглядов: кольцо сжимается — жми E, когда оно совпадёт с белым кругом.',
          taunts: ['...', '*молчит осуждающе*', '*молчание стало громче*'],
          hurt: ['*молчание дрогнуло*', '*моргнул впервые за 6 лет*', '...!'],
          win: '...Проходи. (Это было моё первое слово за шесть лет.)', lose: '*молчит победно*',
        })
        if (win) guardWin(g, npc, 'g1', 'g1', 0, -2)
      },
    },
    W: {
      kind: 'npc', id: 'guard2', tex: 'guard2', name: 'Страж Ритма', behavior: { type: 'dance' },
      talk: silentTalk('СТРАЖ РИТМА'),
      barks: ['Тыц. Тыц. Тыц-тыц.', 'Мой ритм не для тебя.'],
      mog: async (g, npc) => {
        await g.say('СТРАЖ РИТМА', ['Тыц-тыц. Мой ритм — непредсказуем. Как курс крипты. Как настроение кота.'], 'guard2')
        const win = await g.duel({
          name: 'Страж Ритма', tex: 'guard2', kinds: ['rhythm'], hits: 3, lives: 3, speed: 1,
          rule: 'Он меняет ритм! Скорость бегунка скачет, зона может переехать. Не спеши.',
          taunts: ['Сбился? Это ты сбился.', 'Тыц-мимо-тыц.', 'Ритм — это не твоё. Твоё — это лагать.'],
          hurt: ['Эй! Это был мой бит!', 'Мой метроном... треснул.'],
          win: 'Мой ритм... сломан. Как и мой метроном за 30 тысяч.', lose: 'Тыц-тыц-победа.',
        })
        if (win) guardWin(g, npc, 'g2', 'g2', 0, -2)
      },
    },
    R: {
      kind: 'npc', id: 'guard3', tex: 'guard3', name: 'Мастер Аура-фу', behavior: { type: 'pose' },
      talk: silentTalk('МАСТЕР АУРА-ФУ'),
      barks: ['ХИЯ!', 'Аура — это кулак души.'],
      mog: async (g, npc) => {
        await g.say('МАСТЕР АУРА-ФУ', ['Я 12 лет медитировал в горах, чтобы научиться бить аурой.', 'Горы, кстати, я снимал на телефон. Для контента. ХИЯ!'], 'guard3')
        const win = await g.duel({
          name: 'Мастер Аура-фу', tex: 'guard3', kinds: ['dodge'], hits: 3, lives: 3, speed: 1, tutorial: true,
          rule: 'Он бьёт аурой! Жди «SPACE!» → увернись (SPACE) → сразу контр-мог (E). Рано нажатая E — промах.',
          taunts: ['ХИЯ! Прилетело?', 'Аура-кулак не прощает.', 'Ты моргнул. Я видел.'],
          hurt: ['Как ты уклонился?!', 'Мои горы... были напрасны...'],
          win: 'Ты уклонился от моей ауры... Я ухожу обратно в горы. Без телефона. Наверное.', lose: 'Возвращайся, когда научишься уклоняться от реальности.',
        })
        if (win) guardWin(g, npc, 'g3', 'g3', 2, 0)
      },
    },
    A: {
      kind: 'npc', id: 'dean', tex: 'dean', name: 'Декан Аурелий', behavior: { type: 'pose' },
      barks: ['Ощущаете? Это моя аура.', 'Не смотрите мне в глаза без записи на приём.'],
      talk: async (g) => {
        if (g.flag('dean')) { await g.say('ДЕКАН АУРЕЛИЙ', 'Диплом получен — уходи. И никаких сторис со мной на фоне.', 'dean'); return }
        await g.say('ДЕКАН АУРЕЛИЙ', ['Разговор? Со мной? Без 50 тысяч ауры?', 'Хочешь пройти — сдавай экзамен. Подойди и могни. Если осмелишься.'], 'dean')
      },
      mog: async (g, npc) => {
        await g.say('ДЕКАН АУРЕЛИЙ', [
          'Я — Декан Аурелий. Король ауры. Мой взгляд отменил три свадьбы и один ураган.',
          'Моя челюсть занесена в Красную книгу как опасное оружие.',
          'Финальный экзамен: я меняю стиль каждый раунд. Выживи — получишь диплом.',
        ], 'dean')
        const win = await g.duel({
          name: 'Декан Аурелий', tex: 'dean', kinds: ['timing', 'rhythm', 'sequence', 'dodge'], hits: 5, lives: 3, speed: 1.1,
          rule: 'Финальный экзамен: каждый раунд — новый стиль Могания. Смотри на подсказку под ареной.',
          taunts: ['Незачёт.', 'Пересдача через 4 года.', 'Твоя аура не прошла проверку. Как и твой реферат.'],
          hurt: ['Это... было неплохо. Для первокурсника.', 'Моя корона... съехала!', 'Кто разрешил тебе иметь скулы?!'],
          win: 'Невозможно... Мою ауру... моганули... Забирай диплом и уходи, пока студенты не увидели.', lose: 'Отчислен. Можешь подать апелляцию. Подходи ещё раз.',
        })
        if (!win) return
        g.persistFlag('dean')
        g.openGate('g4')
        g.persistFlag('gate_g4')
        npc.mogEnabled = false
        g.setMode('cutscene')
        npc.setTexBase('dean')
        await g.say('ДЕКАН АУРЕЛИЙ', ['*корона падает на пол со звуком «бум»*'], 'dean')
        Sfx.play('vineBoom')
        g.cameras.main.shake(300, 0.01)
        g.giveFragment(npc.x, npc.y - 30)
        await g.say('СКИП', ['Ты моганул ДЕКАНА! Это войдёт в учебники. Которые тут никто не читает.', 'Слушай... Дальше — секция комментариев. Там все умнее тебя. По их собственному мнению.'], 'skip')
        g.setMode('play')
        objective(g)
      },
    },
    M: {
      kind: 'npc', id: 'monk', tex: 'monk', name: 'Монах Пофиг', behavior: { type: 'bob' },
      talk: async (g) => {
        if (g.flag('monkDone')) { await g.say('МОНАХ ПОФИГ', 'Мне всё равно. Но мне приятно, что тебе было всё равно вместе со мной.', 'monk'); return }
        await g.say('МОНАХ ПОФИГ', ['Я достиг просветления: мне всё равно на лайки, просмотры и ауру.', 'Даже на то, что ты сломал мою стену. Мне всё равно. Немного жаль. Но всё равно.'], 'monk')
        const n = await g.ask('МОНАХ ПОФИГ', 'Хочешь понять пустоту? Постой рядом. Пять секунд. Ничего не делай. Совсем.', ['Давай.', 'Пять секунд без контента? Я не готов.'], 'monk')
        if (n === 0) { g.setFlag('monkTest'); g.toast('Стой рядом с монахом и не двигайся 5 секунд', CSS.yellow) }
      },
    },
    '1': { kind: 'gate', id: 'g1' },
    '2': { kind: 'gate', id: 'g2' },
    U: { kind: 'gate', id: 'g3' },
    Y: { kind: 'gate', id: 'g4' },
    z: { kind: 'enemy', type: 'scroller' },
    b: { kind: 'enemy', type: 'hater' },
    f: { kind: 'item', type: 'fan' },
  },
  zones: [
    { x: 13, y: 13, w: 14, h: 9, type: 'wind', dy: 125 },
    {
      x: 28, y: 8, w: 11, h: 4, type: 'trigger', id: 'deanHall',
      run: async (g) => {
        if (g.flag('dean')) return
        await g.say('ДЕКАН АУРЕЛИЙ', ['КТО ПОСМЕЛ ВОЙТИ В ЗАЛ БЕЗ ПОЗЫ?!', '...А, абитуриент. Подходи. Экзамен ждёт.'], 'dean')
      },
    },
  ],
  intro: async (g) => {
    await g.say('СКИП', [
      'Академия ауры! Здесь учат стоять красиво. Четыре года обучения, диплом — селфи.',
      'Стражи тут слишком сигма, чтобы разговаривать. Только Могание. И у каждого — свой стиль.',
      'Во дворе дует аура-ветер. Против ветра помогает рывок (SPACE).',
      'Кстати, за фрагменты внимания Стасян продаёт апгрейды. Сомнительные, но рабочие.',
    ], 'skip')
  },
  setup: (g) => {
    monkShown = 0
    const fix = (id: string, flag: string, dx: number, dy: number, tex: string): void => {
      const n = g.npc(id)
      if (!n || !g.flag(flag)) return
      n.mogEnabled = false
      n.placeAt(Math.floor(n.x / 48) + dx, Math.floor(n.y / 48) + dy)
      n.spec.talk = async (gg) => { await gg.say(n.spec.name.toUpperCase(), '...проходи. И никому не говори, что я проиграл.', tex) }
    }
    fix('guard1', 'g1', 0, -2, 'guard1')
    fix('guard2', 'g2', 0, -2, 'guard2')
    fix('guard3', 'g3', 2, 0, 'guard3')
    const dean = g.npc('dean')
    if (dean && g.flag('dean')) dean.mogEnabled = false
    const pl = g.npc('platon')
    if (pl && g.flag('fanDone')) { pl.spec.behavior = { type: 'dance' }; pl.spec.barks = ['ВЕТЕР! ДА!', 'АУРА ФАРМИТСЯ!'] }
    objective(g)
  },
  update: (g) => {
    if (!g.flag('monkTest') || g.flag('monkDone')) return
    const m = g.npc('monk')
    if (!m) return
    const near = Math.hypot(m.x - g.player.x, m.y - g.player.y) < 130
    const s = near ? Math.floor(g.player.stillTime) : 0
    if (s !== monkShown) {
      monkShown = s
      if (s > 0 && s < 5) g.fx.floatText(g.player.x, g.player.y - 60, `${s}...`, CSS.yellow, 20)
    }
    if (near && g.player.stillTime >= 5) {
      g.persistFlag('monkDone')
      void (async () => {
        await g.say('МОНАХ ПОФИГ', ['...', 'Ты постоял. Без контента. Без цели. Как в древние времена.', 'Держи. Мне всё равно, но тебе, может, пригодится.'], 'monk')
        g.giveFragment(m.x, m.y - 30)
        g.heal(5)
      })()
    }
  },
}
