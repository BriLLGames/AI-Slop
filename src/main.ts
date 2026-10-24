import { createGame } from './game/main'

const boot = document.getElementById('boot')
const showError = (msg: string): void => {
  if (!boot) return
  boot.style.color = '#ff4757'
  boot.textContent = 'Ошибка запуска игры:\n' + msg
}
window.addEventListener('error', (e) => showError(e.message || String(e.error)))
window.addEventListener('unhandledrejection', (e) => showError(String(e.reason)))

try {
  const el = document.getElementById('game')
  if (el) createGame(el)
  const check = window.setInterval(() => {
    if (document.querySelector('#game canvas')) { boot?.remove(); window.clearInterval(check) }
  }, 200)
} catch (e) {
  showError(e instanceof Error ? e.message : String(e))
}
