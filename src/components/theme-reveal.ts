import { animate } from 'motion/react'
import { flushSync } from 'react-dom'
import { reveal } from './motion'

let active: ViewTransition | undefined

export function revealTheme(button: HTMLButtonElement, update: () => void) {
  if (active) {
    active.skipTransition()
    void active.updateCallbackDone.then(update, update)
    return
  }

  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update()
    return
  }

  const root = document.documentElement
  const bounds = button.getBoundingClientRect()
  const x = bounds.left + bounds.width / 2
  const y = bounds.top + bounds.height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) + 1
  const clip = (value: number) => root.style.setProperty('--theme-reveal-clip', `circle(${value}px at ${x}px ${y}px)`)

  clip(0)
  root.dataset.themeReveal = ''
  const transition = document.startViewTransition(() => flushSync(update))
  active = transition

  const clear = () => {
    delete root.dataset.themeReveal
    root.style.removeProperty('--theme-reveal-clip')
    active = undefined
  }

  void transition.ready.then(() => {
    // Keep the native snapshots alive while Motion drives the mask radius.
    const hold = root.animate([{ opacity: 1 }, { opacity: 1 }], {
      duration: 1000, iterations: Infinity, pseudoElement: '::view-transition-group(root)',
    })
    const animation = animate(0, radius, { ...reveal, onUpdate: clip, onComplete: () => hold.cancel() })
    const stop = () => { animation.stop(); hold.cancel() }
    void transition.finished.then(stop, stop)
  }).catch(() => transition.skipTransition())
  void transition.finished.then(clear, clear)
}
