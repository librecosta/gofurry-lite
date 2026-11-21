import { flushSync } from 'react-dom'

export function revealTheme(button: HTMLButtonElement, update: () => void) {
  const root = document.documentElement
  if (root.hasAttribute('data-theme-reveal')) return

  if (!document.startViewTransition || !root.animate || document.hidden || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }

  const bounds = button.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 1

  root.dataset.themeReveal = ''
  const transition = document.startViewTransition(() => flushSync(update))
  const clear = () => { delete root.dataset.themeReveal }

  void transition.ready.then(() => {
    // Animate the snapshot directly so there is no inherited style update on each frame.
    root.animate({
      clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
    }, {
      duration: 420,
      easing: 'cubic-bezier(.22, 1, .36, 1)',
      pseudoElement: '::view-transition-new(root)',
    })
  }).catch(() => transition.skipTransition())
  void transition.finished.then(clear, clear)
}
