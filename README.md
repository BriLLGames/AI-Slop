# ЕЩЁ ОДНО ВИДЕО — автономная версия

## Запуск на Windows
1. Установите Node.js (LTS) с https://nodejs.org — один раз.
2. Дважды щёлкните `start.bat`. При первом запуске он скачает Phaser и Vite (интернет нужен только в этот момент).
3. Игра откроется в браузере. Дальше интернет не нужен.

## Запуск вручную (любая ОС)
```
npm install
npm run dev
```

## GitHub Pages
1. Залейте содержимое этой папки в КОРЕНЬ репозитория (рядом с package.json должна лежать папка .github).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. Сделайте любой push (или Actions → Deploy to GitHub Pages → Run workflow).
4. Через 1–2 минуты игра появится по адресу https://<логин>.github.io/<репозиторий>/

Код игры — в `src/game/`. Подробное описание — в `src/game/README.md`.
