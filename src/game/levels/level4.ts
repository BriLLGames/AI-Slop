import * as Phaser from 'phaser'
import { COLORS, CSS } from '../config'
import { Sfx } from '../audio'
import type { GameScene } from '../scenes/GameScene'
import type { LevelDef } from './types'

// Level 4 — «Brainrot-полигон»: "rules of the day" rooms (inverted controls, scheduled lava,
// silence), a mirror-twin plate puzzle, two absurd duelists and the Skip betrayal twist.

let mirror: Phaser.Physics.Arcade.Sprite | null = null

function objective(g: GameScene): void {
  if (!g.flag('g1')) g.setObjective('Могни Пельменя Сигмаворонóвича')
  else if (!g.flag('trig_mirrorRoom')) g.setObjective('Пройди зал инверсии и лавовый пол (дорога вниз)')
  else if (!g.flag('g2')) g.setObjective('Двойник: встань на плиту «ТЫ», а его загони на плиту «ОН»')
  else if (!g.flag('fridge')) g.setObjective('Победи Холодильник Гигачад')
  else g.setObjective('Свайп-портал — в правом верхнем углу')
}

const ROOM_D = { x0: 28 * 48, x1: 39 * 48, y0: 12 * 48, y1: 23 * 48 }

export const level4: LevelDef = {
  index: 3,
  hazardCycle: true,
  map: [
    '########################################',
    '#..........#...............#........Y.X#',
    '#..s.......#..o...o...o....#....J...Y..#',
    '#..........#o...o...o...o..#........Y..#',
    '#.........N1...o...*...o...#........####',
    '#.P........1C.o...o...o....#...........#',
    '#..........1..z...o...z...o#...........#',
    '#..T.......#o...o...o...o..#...o...o...#',
    '#..........#..o...o...o....#...........#',
    '#....o.....#..............h#.....C.....#',
    '#..........#...............#...........#',
    '###################.############222#####',
    '#..*.......#.......C.......#..b....a...#',
    '#....A.....#~^~^~^~^~^~^~^~#...........#',
    '#..........#^~^~^~^~^~^~^~^#...........#',
    '#..........#~^~^~^~*~^~^~^~#...o.......#',
    '#..........%^~^~^~^~^~^~^~^#...........#',
    '#..........#~^~^~^~^~^~^~^~.C..........#',
    '#..........#^~^~^~^~^~^~^~^............#',
    '#..........#~^~^~^~^~^~^~^~#......o....#',
    '#..........#^~^~^~^~^~^~^~^#........m..#',
    '#..........#...............#...........#',
    '#..........#..*............#...........#',
    '########################################',
  ],
  legend: {
    s: { kind: 'prop', tex: 'sign', name: 'Правила полигона', read: ['ПРАВИЛА ПОЛИГОНА:', '1. Правил нет. 2. См. пункт 1. 3. Правила меняются каждые 5 секунд.', '4. Пункт 2 отменён пунктом 3. 5. Если вы это поняли — вы слишком долго здесь.'] },
    N: {
      kind: 'npc', id: 'dumpling', tex: 'dumpling', name: 'Пельмень Сигмаворонóвич', behavior: { type: 'dance' },
      barks: ['Пельмешини-сигмаччини!', 'Бр-бр-бульон!', 'Я сварен, но не сломлен.'],
      talk: async (g) => { await g.say('ПЕЛЬМЕНЬ', ['Пельмешини-сигмаччини! Бр-бр-бульон!', '(Перевод: «Проход закрыт. Могай, если смелый.»)'], 'dumpling') },
      mog: async (g, npc) => {
        await g.say('ПЕЛЬМЕНЬ', ['ТРАЛАЛЕЛО-ПЕЛЬМЕНЕЛО!', 'Мои ритмы варились восемь минут после всплытия. Ты не готов.'], 'dumpling')
        const win = await g.duel({
          name: 'Пельмень Сигмаворонóвич', tex: 'dumpling', kinds: ['rhythm', 'sequence'], hits: 4, lives: 3, speed: 1.15,
          rule: 'Брейнрот-дуэль: стиль меняется случайно. Ритм скачет, кольца летят. Сохраняй лицо.',
          taunts: ['Бр-бр-мимо!', 'Пельмешини-лузерини!', 'Ты недоварен.'],
          hurt: ['Ай, мой бульон!', 'Меня... разварили...', 'Сметана... в глазах...'],
          win: 'Ты... разварил мою ауру... Пельмешини-респектини.', lose: 'Бр-бр-победа! Приходи ещё, вкусный.',
        })
        if (!win) return
        g.persistFlag('g1')
        g.openGate('g1')
        g.persistFlag('gate_g1')
        npc.mogEnabled = false
        void npc.moveTo(9, 3, 600)
        objective(g)
      },
    },
    T: { kind: 'npc', id: 'merchant', tex: 'merchant', name: 'Стасян (филиал №2)', behavior: { type: 'bob' }, barks: ['Филиал №2! Цены те же, смысл тот же!', 'Брейнрот-скидки!'], talk: (g, n) => g.openShop(n) },
    A: {
      kind: 'npc', id: 'admin', tex: 'admin', name: 'Админ Алгоритма Витя', behavior: { type: 'bob' },
      talk: async (g) => {
        await g.say('АДМИН ВИТЯ', [
          'О! Ты нашёл серверную. Ну, комнату, где я прячусь от серверной.',
          'Я админ алгоритма. Технически. В 2019-м я нажал кнопку «Сделать интересно». Она до сих пор нажимается. Сама.',
          'Рекомендатор теперь не отличает хорошее видео от бесконечного повтора. Он просто... показывает. Всё. Всем.',
          'Хочешь секрет? Он боится только одного: когда пользователь просто закрывает приложение. Без лайка. Без коммента.',
          'Запомни это. Пригодится в самом конце. Ну, или нет. Я не знаю, как работает моя собственная система.',
        ], 'admin')
      },
    },
    J: {
      kind: 'npc', id: 'fridge', tex: 'fridge', name: 'Холодильник Гигачад', behavior: { type: 'pose' },
      barks: ['Я храню продукты и обиды.', 'Моя челюсть — морозилка.', '*гудит уверенно*'],
      talk: async (g) => { await g.say('ХОЛОДИЛЬНИК', ['*гудит*', 'Я — Холодильник Гигачад. Я не разговариваю с теплокровными.'], 'fridge') },
      mog: async (g, npc) => {
        await g.say('ХОЛОДИЛЬНИК', ['В этой комнате Могание запрещено.', '...Кроме моего. Правила пишет холодильник. ДУЭЛЬ.'], 'fridge')
        const win = await g.duel({
          name: 'Холодильник Гигачад', tex: 'fridge', kinds: ['dodge', 'observe', 'sequence'], hits: 5, lives: 3, speed: 1.2,
          rule: 'Всё сразу: уклоняйся (SPACE → E), следи за взглядом вниз, лови кольца. Он делает финты!',
          taunts: ['Холодно? Это твоя аура замёрзла.', '*гудит насмешливо*', 'Срок годности твоей ауры истёк.'],
          hurt: ['Моя морозилка... потекла!', 'Кто-то открыл мою дверцу без спроса!', '*гудение дрогнуло*'],
          win: 'Ты... разморозил меня... Мне нужно... в сервис...', lose: 'Заморожен. Приходи, когда оттаешь.',
        })
        if (!win) return
        g.persistFlag('fridge')
        npc.mogEnabled = false
        await skipReveal(g)
      },
    },
    Y: { kind: 'gate', id: 'g3' },
    '1': { kind: 'gate', id: 'g1' },
    '2': { kind: 'gate', id: 'g2' },
    a: { kind: 'plate', id: 'A', tex: 'plateA' },
    b: { kind: 'plate', id: 'B', tex: 'plateB' },
    m: { kind: 'mark', id: 'mirror' },
    z: { kind: 'enemy', type: 'scroller' },
  },
  zones: [
    { x: 12, y: 1, w: 15, h: 10, type: 'invert', label: 'ПРАВИЛО ДНЯ: управление инвертировано. Потому что так смешнее.' },
    { x: 28, y: 1, w: 8, h: 10, type: 'silence', label: 'ПРАВИЛО ДНЯ: тишина. Аура-волна запрещена. Могание — по согласованию с холодильником.' },
    { x: 12, y: 12, w: 15, h: 1, type: 'trigger', id: 'lava', run: (g) => g.toast('ПРАВИЛО ДНЯ: пол — это лава. Но только по расписанию. Мигает — скоро жжётся.', CSS.red) },
    {
      x: 28, y: 12, w: 11, h: 11, type: 'trigger', id: 'mirrorRoom',
      run: async (g) => {
        objective(g)
        await g.say('СКИП', ['Видишь полупрозрачного тебя? Это двойник. Он повторяет твои движения, но зеркально по горизонтали.', 'Ты идёшь влево — он вправо. Вверх-вниз — одинаково.', 'Встань на плиту «ТЫ», когда он стоит на плите «ОН». Обе плиты — у верхней стены.', 'Хитрость: упрись в стену — ты стоишь, а он продолжает идти. Так можно сдвинуть его куда нужно.'], 'skip')
      },
    },
  ],
  intro: async (g) => {
    await g.say('СКИП', [
      'Brainrot-полигон. Здесь логика окончательно покинула чат.',
      'Каждая комната живёт по своему «Правилу дня». Таблички врут, но не всегда. Иногда они врут, что врут.',
      'Если что — я рядом. Как всегда. Совершенно бескорыстно. Ага.',
    ], 'skip')
  },
  setup: (g) => {
    const mk = g.world.marks['mirror']
    mirror = null
    if (mk && !g.flag('g2')) {
      const m = g.physics.add.sprite(mk.x, mk.y, 'hero_0').setScale(0.5).setOrigin(0.5, 0.85).setTint(0x22e4ff).setAlpha(0.75)
      const body = m.body as Phaser.Physics.Arcade.Body
      body.setSize(40, 30, false)
      body.setOffset(28, 86)
      g.physics.add.collider(m, g.world.walls)
      g.physics.add.collider(m, g.world.gates)
      mirror = m
    }
    const n = g.npc('dumpling')
    if (n && g.flag('g1')) { n.mogEnabled = false; n.placeAt(9, 3) }
    const f = g.npc('fridge')
    if (f && g.flag('fridge')) { f.mogEnabled = false; if (!g.flag('gate_g3')) g.openGate('g3', true) }
    objective(g)
  },
  update: (g) => {
    const m = mirror
    if (!m || !m.active) return
    const p = g.player
    const pb = p.sprite.body as Phaser.Physics.Arcade.Body
    const mb = m.body as Phaser.Physics.Arcade.Body
    const inRoom = p.x > ROOM_D.x0 && p.x < ROOM_D.x1 && p.y > ROOM_D.y0 && p.y < ROOM_D.y1
    if (inRoom) mb.setVelocity(-pb.velocity.x, pb.velocity.y)
    else mb.setVelocity(0, 0)
    m.setFlipX(!p.sprite.flipX)
    m.setTexture(p.sprite.texture.key)
    m.setDepth(m.y)
    const A = g.world.plates['A']
    const B = g.world.plates['B']
    if (!A || !B) return
    const onA = Phaser.Math.Distance.Between(p.x, p.y - 8, A.x, A.y) < 28
    const onB = Phaser.Math.Distance.Between(m.x, m.y - 8, B.x, B.y) < 28
    if (onA !== A.on) { A.on = onA; A.img.setTexture(onA ? 'plateA_on' : 'plateA') }
    if (onB !== B.on) { B.on = onB; B.img.setTexture(onB ? 'plateB_on' : 'plateB') }
    if (onA && onB) {
      g.persistFlag('g2')
      g.openGate('g2')
      g.persistFlag('gate_g2')
      Sfx.play('win')
      g.fx.burst(m.x, m.y - 20, COLORS.cyan, 30, 220, 700, 'spark')
      g.tweens.add({ targets: m, alpha: 0, scale: 0.8, duration: 600, onComplete: () => m.destroy() })
      mirror = null
      g.toast('Двойник синхронизирован! Ворота наверх открыты.', CSS.cyan)
      objective(g)
    }
  },
  onPulse: (g) => {
    if (!g.inZone('silence')) return
    Sfx.play('error')
    g.toast('НАРУШЕНИЕ ТИШИНЫ! Высланы боты-модераторы.', CSS.red)
    for (const dx of [-90, 90]) g.spawnEnemy('bot', g.player.x + dx, g.player.y - 60)
  },
}

async function skipReveal(g: GameScene): Promise<void> {
  g.setMode('cutscene')
  await g.wait(400)
  const skip = g.add.image(g.player.x + 70, g.player.y - 10, 'skip_0').setScale(0).setOrigin(0.5, 0.85).setDepth(9000)
  g.tweens.add({ targets: skip, scale: 0.5, duration: 400, ease: 'Back.easeOut' })
  await g.wait(450)
  await g.say('СКИП', ['Слушай... мне нужно кое в чём признаться.', 'Я не просто кнопка «Пропустить». Я... *спонсорская интеграция*.', 'Рекомендатор нанял меня, чтобы я довёл тебя до сервера. Ты — его новый тренд. Самый вирусный юзер сезона.'], 'skip')
  await g.say('ТЫ', ['То есть ты всё это время был РЕКЛАМОЙ?!'])
  await g.say('СКИП', ['Рекламой, которую ты ни разу не пропустил. Это, кстати, рекорд.', 'Прости. У меня контракт до конца сезона.', '...Эй! Нет! Я ещё не дочитал дисклеймер!'], 'skip')
  Sfx.play('swipe')
  g.cameras.main.shake(300, 0.01)
  g.tweens.add({ targets: skip, y: skip.y - 600, angle: 720, alpha: 0, duration: 900, ease: 'Cubic.easeIn', onComplete: () => skip.destroy() })
  await g.wait(1000)
  g.openGate('g3')
  g.persistFlag('gate_g3')
  await g.banner('ВОРОТА ОТКРЫЛИСЬ', 'Сами. Это не к добру. Это к контенту.', CSS.pink, 1600)
  await g.say('ТЫ', ['...Ладно. Значит, дальше сам.', 'Портал наверняка ведёт к серверу. Даже вероятность 50 на 50 — это уже больше, чем у алгоритма.'])
  g.setMode('play')
  objective(g)
}
