// Packs the game's source code + a standalone project scaffold into a ZIP in the
// browser and downloads it. Sources are pulled in lazily via Vite's import.meta.glob.
// (Written without template literals on purpose: the file is easy to embed elsewhere.)

import { strToU8, zipSync, type Zippable } from 'fflate'
import SELF_SRC from './export.ts?raw'

// import.meta.glob never includes the importing file itself, so export.ts is added via SELF_SRC
const SOURCES = import.meta.glob('./**/*.{ts,md}', { query: '?raw', import: 'default' }) as Record<string, () => Promise<string>>

const L = (...lines: string[]): string => lines.join('\n') + '\n'
const BT = String.fromCharCode(96) // backtick
const DOLLAR = String.fromCharCode(36)

const PACKAGE_JSON = L(
  '{',
  '  "name": "eshche-odno-video",',
  '  "private": true,',
  '  "type": "module",',
  '  "scripts": {',
  '    "dev": "vite --open",',
  '    "build": "vite build",',
  '    "preview": "vite preview --open"',
  '  },',
  '  "dependencies": {',
  '    "fflate": "0.8.2",',
  '    "phaser": "4.0.0"',
  '  },',
  '  "devDependencies": {',
  '    "typescript": "^5.6.0",',
  '    "vite": "^6.0.0"',
  '  }',
  '}',
)

const INDEX_HTML = L(
  '<!doctype html>',
  '<html lang="ru">',
  '  <head>',
  '    <meta charset="UTF-8" />',
  '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
  '    <title>ЕЩЁ ОДНО ВИДЕО — brainrot-одиссея</title>',
  '    <link rel="stylesheet" href="./styles.css" />',
  '  </head>',
  '  <body>',
  '    <div id="game"></div>',
  '    <script type="module" src="./src/main.ts"></script>',
  '  </body>',
  '</html>',
)

const STYLES = L(
  'html, body { margin: 0; height: 100%; overflow: hidden; background: radial-gradient(circle at 50% 40%, #241a3d 0%, #0b0812 70%); }',
  '#game { width: 100vw; height: 100vh; }',
  'canvas { display: block; }',
)

const MAIN_TS = L(
  "import { createGame } from './game/main'",
  '',
  "const el = document.getElementById('game')",
  'if (el) createGame(el)',
)

// Relative base so the built site works from any sub-path (e.g. GitHub Pages /repo-name/)
const VITE_CONFIG = L(
  "import { defineConfig } from 'vite'",
  '',
  'export default defineConfig({',
  "  base: './',",
  '})',
)

const PAGES_WORKFLOW = L(
  'name: Deploy to GitHub Pages',
  '',
  'on:',
  '  push:',
  '    branches: [main, master]',
  '  workflow_dispatch:',
  '',
  'permissions:',
  '  contents: read',
  '  pages: write',
  '  id-token: write',
  '',
  'concurrency:',
  '  group: pages',
  '  cancel-in-progress: true',
  '',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - uses: actions/setup-node@v4',
  '        with:',
  '          node-version: 20',
  '      - run: npm install',
  '      - run: npm run build',
  '      - uses: actions/upload-pages-artifact@v3',
  '        with:',
  '          path: dist',
  '',
  '  deploy:',
  '    needs: build',
  '    runs-on: ubuntu-latest',
  '    environment:',
  '      name: github-pages',
  '      url: ' + DOLLAR + '{{ steps.deployment.outputs.page_url }}',
  '    steps:',
  '      - id: deployment',
  '        uses: actions/deploy-pages@v4',
)

const TSCONFIG = L(
  '{',
  '  "compilerOptions": {',
  '    "target": "ES2022",',
  '    "module": "ESNext",',
  '    "moduleResolution": "bundler",',
  '    "strict": true,',
  '    "skipLibCheck": true,',
  '    "noEmit": true,',
  '    "types": ["vite/client"]',
  '  },',
  '  "include": ["src"]',
  '}',
)

// Windows launcher (ASCII only: cmd.exe and Cyrillic don't mix well)
const START_BAT = [
  '@echo off',
  'cd /d "%~dp0"',
  'where node >nul 2>nul',
  'if errorlevel 1 (',
  '  echo Node.js not found. Install the LTS version from https://nodejs.org and run this file again.',
  '  pause',
  '  exit /b 1',
  ')',
  'if not exist node_modules (',
  '  echo Installing dependencies, first run only...',
  '  call npm install',
  ')',
  'echo Starting the game in your browser...',
  'call npx vite --open',
  '',
].join('\r\n')

const STANDALONE_README = L(
  '# ЕЩЁ ОДНО ВИДЕО — автономная версия',
  '',
  '## Запуск на Windows',
  '1. Установите Node.js (LTS) с https://nodejs.org — один раз.',
  '2. Дважды щёлкните ' + BT + 'start.bat' + BT + '. При первом запуске он скачает Phaser и Vite (интернет нужен только в этот момент).',
  '3. Игра откроется в браузере. Дальше интернет не нужен.',
  '',
  '## Запуск вручную (любая ОС)',
  BT + BT + BT,
  'npm install',
  'npm run dev',
  BT + BT + BT,
  '',
  '## GitHub Pages',
  '1. Залейте содержимое этой папки в КОРЕНЬ репозитория (рядом с package.json должна лежать папка .github).',
  '2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.',
  '3. Сделайте любой push (или Actions → Deploy to GitHub Pages → Run workflow).',
  '4. Через 1–2 минуты игра появится по адресу https://<логин>.github.io/<репозиторий>/',
  '',
  'Код игры — в ' + BT + 'src/game/' + BT + '. Подробное описание — в ' + BT + 'src/game/README.md' + BT + '.',
)

/** Every file of the standalone project, path → text. */
export async function collectProjectFiles(): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  const entries = Object.entries(SOURCES)
  const texts = await Promise.all(entries.map(([, load]) => load()))
  entries.forEach(([path], i) => {
    out['src/game/' + path.replace(/^\.\//, '')] = texts[i] ?? ''
  })
  out['src/game/export.ts'] = SELF_SRC
  out['package.json'] = PACKAGE_JSON
  out['index.html'] = INDEX_HTML
  out['styles.css'] = STYLES
  out['tsconfig.json'] = TSCONFIG
  out['vite.config.js'] = VITE_CONFIG
  out['.github/workflows/deploy.yml'] = PAGES_WORKFLOW
  out['start.bat'] = START_BAT
  out['README.md'] = STANDALONE_README
  out['src/main.ts'] = MAIN_TS
  return out
}

export async function downloadGameZip(): Promise<number> {
  const all = await collectProjectFiles()
  const files: Zippable = {}
  for (const [path, text] of Object.entries(all)) files['eshche-odno-video/' + path] = strToU8(text)
  const data = zipSync(files, { level: 6 })
  const blob = new Blob([data.buffer as ArrayBuffer], { type: 'application/zip' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'eshche-odno-video.zip'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return Object.keys(all).length
}
