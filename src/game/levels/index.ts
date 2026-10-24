import { level1 } from './level1'
import { level2 } from './level2'
import { chapterComments } from './chapterComments'
import { level3 } from './level3'
import { level4 } from './level4'
import { chapterArchive } from './chapterArchive'
import { chapterDark } from './chapterDark'
import { level5 } from './level5'
import type { LevelDef } from './types'

/** Ordered list of chapters. Add or reorder chapters here. */
export const LEVELS: LevelDef[] = [
  level1, // 1. Фор-Ю
  level2, // 2. Академия ауры
  chapterComments, // 3. Секция комментариев
  level3, // 4. NPC Live-арена
  level4, // 5. Brainrot-полигон
  chapterArchive, // 6. Архив мемов 2007
  chapterDark, // 7. Тёмная лента
  level5, // 8. Сервер Рекомендатора
]
