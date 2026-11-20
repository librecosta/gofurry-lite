
'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { AnimatePresence, motion, useIsPresent, useReducedMotion, type MotionStyle, type Target } from 'motion/react'
import { github } from '../lib/links'
import { href, type Locale } from '../lib/presentation'
import { Icon, type Glyph } from './icons'
import { immediate, interaction } from './motion'
import { ContentModeSwitch, toggleContentMode, toggleTheme, useContentMode, useTheme } from './preferences'
import { revealTheme } from './theme-reveal'
import styles from './navigation.module.scss'

const dockId = 'mobile-navigation'
const hoverInk = { '--nav-hover': 1 } as Target
const hoverTheme = { ...hoverInk, '--nav-button-fill': 1 } as Target
const destinations = [
  { key: 'discover', path: '/', icon: 'discover', zh: '导航', en: 'Discover' },
  { key: 'games', path: '/games', icon: 'game', zh: '游戏', en: 'Games' },
  { key: 'collections', path: '/games/collections', icon: 'layers', zh: '合集', en: 'Collections' },
] as const satisfies { key: string; path: string; icon: Glyph; zh: string; en: string }[]

function currentLocation(target: string, path: string) {
  if (target === path) return 'page'
  if (target === '/games/collections' && path.startsWith('/games/collections/')) return 'location'
  if (target === '/games' && path.startsWith('/games/') && !path.startsWith('/games/collections')) return 'location'
  if (target === '/' && /^\/(?:categories|site|site-groups)(?:\/|$)/.test(path)) return 'location'
}

function NavigationLabel({ icon, children, expanded, reduced }: {
  icon: Glyph; children: string; expanded: boolean; reduced: boolean | null
}) {
  const transition = reduced ? immediate : interaction
  return <>
    <motion.span className={styles.dockHighlight} aria-hidden="true" initial={false}
      animate={{ x: expanded ? '0%' : '100%' }} transition={transition} />
    <span className={styles.dockIcon}><Icon name={icon} size={20} /></span>
    <motion.span className={styles.dockLabel} aria-hidden="true" initial={false}
      animate={{ opacity: expanded ? 1 : 0, x: expanded ? 0 : 8 }} transition={transition}>{children}</motion.span>
  </>
}

function dockKey(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('[data-dock-item]')?.dataset.dockItem : undefined
}

function MobileDock({ locale, path, languageUrl, dockRef, close }: {
  locale: Locale
  path: string
  languageUrl: string
  dockRef: Ref<HTMLElement>
  close: () => void
}) {
  const [highlighted, setHighlighted] = useState<string>()
  const present = useIsPresent()
  const reduced = useReducedMotion()
  const transition = reduced ? immediate : interaction
  const dark = useTheme() === 'dark'
  const mode = useContentMode()
  const zh = locale === 'zh'
  const language = zh ? 'EN' : '中文'

  function props(key: string, active = false) {
    const expanded = highlighted === key
    return {
      className: styles.dockItem, 'data-dock-item': key, 'data-expanded': expanded || undefined,
      style: { '--dock-expansion': 0 } as MotionStyle,
      initial: false as const,
      animate: {
        '--dock-expansion': expanded ? 1 : 0,
        '--nav-emphasis': active || expanded ? 1 : 0,
        '--dock-active': active ? 1 : 0,
      } as Target,
      transition,
    }
  }

  const label = (key: string, icon: Glyph, text: string) =>
    <NavigationLabel icon={icon} expanded={highlighted === key} reduced={reduced}>{text}</NavigationLabel>

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      setHighlighted(undefined)
      close()
      return
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[data-dock-item]')]
    const position = items.findIndex((item) => item.dataset.dockItem === dockKey(event.target))
    if (position < 0) return
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
      : event.key === 'ArrowRight' ? Math.min(position + 1, items.length - 1) : Math.max(position - 1, 0)
    event.preventDefault()
    items[next].focus()
  }

  const hidden = { opacity: 0, y: reduced ? 0 : 12 }
  return <motion.nav id={dockId} ref={dockRef} aria-label={zh ? '底部导航' : 'Bottom navigation'}
    className={styles.dock} inert={!present} initial={hidden} animate={{ opacity: 1, y: 0 }}
    exit={hidden} transition={transition}
    onPointerOver={(event) => {
      const item = dockKey(event.target)
      if (item && event.pointerType !== 'touch') setHighlighted(item)
    }}
    onPointerLeave={(event) => {
      if (event.pointerType !== 'touch') {
        const focused = document.activeElement
        setHighlighted(focused?.matches(':focus-visible') && event.currentTarget.contains(focused) ? dockKey(focused) : undefined)
      }
    }}
    onFocus={(event) => setHighlighted(dockKey(event.target))}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setHighlighted(undefined)
    }}
    onClickCapture={(event) => setHighlighted(dockKey(event.target))}
    onKeyDown={onKeyDown}>
    {destinations.map((item) => {
      const current = currentLocation(item.path, path)
      return <motion.a {...props(item.key, Boolean(current))} key={item.key} href={href(locale, item.path)}
        aria-label={item[locale]} aria-current={current}>
        {label(item.key, item.icon, item[locale])}
      </motion.a>
    })}
    <motion.button {...props('mode', mode === 'nsfw')} type="button" role="switch" aria-checked={mode === 'nsfw'}
      aria-label={zh ? 'NSFW 内容' : 'NSFW content'} onClick={toggleContentMode}>
      {label('mode', mode === 'nsfw' ? 'adult' : 'safe', mode.toUpperCase())}
    </motion.button>
    <motion.button {...props('theme', dark)} type="button" aria-pressed={dark}
      aria-label={zh ? '切换亮暗主题' : 'Toggle light or dark theme'} onClick={(event) => revealTheme(event.currentTarget, toggleTheme)}>
      {label('theme', dark ? 'sun' : 'moon', dark ? (zh ? '亮色' : 'Light') : (zh ? '暗色' : 'Dark'))}
    </motion.button>
    <motion.a {...props('language')} href={languageUrl} lang={zh ? 'en' : 'zh-CN'} aria-label={language}>
      {label('language', 'language', language)}
    </motion.a>
    <motion.a {...props('github')} href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
      {label('github', 'github', 'GitHub')}
    </motion.a>
  </motion.nav>
}

export function SiteNavigation({ locale, path }: { locale: Locale; path: string }) {
  const header = useRef<HTMLElement>(null)
  const dock = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [pastHeader, setPastHeader] = useState(false)
  const [opened, setOpened] = useState(false)
  const visible = pastHeader || opened
  const theme = useTheme()
  const dark = theme === 'dark'
  const ready = theme !== null
  const reduced = useReducedMotion()
  const transition = reduced ? immediate : interaction
  const zh = locale === 'zh'
  const languageUrl = href(zh ? 'en' : 'zh', path.startsWith('/status/') ? '/' : path)

  useEffect(() => {
    if (!header.current || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(([entry]) => {
      const aboveViewport = !entry.isIntersecting && entry.boundingClientRect.bottom <= 0
      setPastHeader(aboveViewport)
      if (aboveViewport) setOpened(false)
      else if (dock.current?.contains(document.activeElement)) trigger.current?.focus({ preventScroll: true })
    })
    observer.observe(header.current)
    const desktop = matchMedia('(min-width: 768px)')
    const reset = () => { if (desktop.matches) setOpened(false) }
    desktop.addEventListener('change', reset)
    return () => {
      observer.disconnect()
      desktop.removeEventListener('change', reset)
    }
  }, [])

  function closeDock() {
    if (!opened || pastHeader) return
    trigger.current?.focus({ preventScroll: true })
    setOpened(false)
  }

  return <>
    <header className={styles.header} ref={header}>
      <div className={styles.headerInner}>
        <a href={href(locale)} className={styles.wordmark} aria-label="GoFurry Lite">
          <span className={styles.wordmarkArtwork} aria-hidden="true" />
          <small>Lite</small>
        </a>
        <nav aria-label={zh ? '主导航' : 'Primary navigation'} className={styles.desktopNav}>
          <ContentModeSwitch locale={locale} disabled={!ready} />
          {destinations.map((item) => {
            const current = currentLocation(item.path, path)
            return <motion.a key={item.key} className={styles.headerAction} href={href(locale, item.path)}
              aria-current={current} initial={false} whileHover={hoverInk} whileFocus={hoverInk}
              transition={transition}>{item[locale]}</motion.a>
          })}
          <motion.button className={styles.headerAction + ' ' + styles.themeAction} type="button" aria-pressed={dark} disabled={!ready}
            aria-label={zh ? '切换亮暗主题' : 'Toggle light or dark theme'} onClick={(event) => revealTheme(event.currentTarget, toggleTheme)}
            initial={false} whileHover={hoverTheme} whileFocus={hoverTheme} transition={transition}>
            <Icon name={dark ? 'sun' : 'moon'} />
          </motion.button>
          <motion.a className={styles.headerAction} href={languageUrl} lang={zh ? 'en' : 'zh-CN'}
            initial={false} whileHover={hoverInk} whileFocus={hoverInk} transition={transition}>{zh ? 'EN' : '中文'}</motion.a>
        </nav>
        <motion.button ref={trigger} type="button" className={styles.menuTrigger} aria-controls={visible ? dockId : undefined} disabled={!ready}
          aria-label={zh ? '导航菜单' : 'Navigation menu'} aria-expanded={visible} onClick={() => setOpened(!opened)}
          initial={false} whileHover={hoverInk} whileFocus={hoverInk} transition={transition}>
          <Icon name={visible ? 'close' : 'menu'} size={22} />
        </motion.button>
      </div>
    </header>
    <AnimatePresence initial={false}>
      {visible && <MobileDock locale={locale} path={path} languageUrl={languageUrl} dockRef={dock} close={closeDock} />}
    </AnimatePresence>
  </>
}
