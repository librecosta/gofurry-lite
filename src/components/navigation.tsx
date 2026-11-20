
'use client'

import { useEffect, useRef, useState, type KeyboardEvent, type Ref } from 'react'
import { href, type Locale } from '../lib/presentation'
import { Icon, type Glyph } from './icons'
import { ContentModeSwitch, toggleContentMode, toggleTheme, useContentMode, useTheme } from './preferences'
import styles from './navigation.module.scss'

const dockId = 'mobile-navigation'
const github = 'https://github.com/librecosta/gofurry-lite'
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

function NavigationLabel({ icon, children }: { icon: Glyph; children: string }) {
  return <>
    <span className={styles.dockIcon}><Icon name={icon} size={20} /></span>
    <span className={styles.dockLabel} aria-hidden="true">{children}</span>
  </>
}

function dockKey(target: EventTarget | null) {
  return target instanceof Element ? target.closest<HTMLElement>('[data-dock-item]')?.dataset.dockItem : undefined
}

function MobileDock({ locale, path, languageUrl, visible, dockRef, close }: {
  locale: Locale
  path: string
  languageUrl: string
  visible: boolean
  dockRef: Ref<HTMLElement>
  close: () => void
}) {
  const [highlighted, setHighlighted] = useState<string>()
  const dark = useTheme() === 'dark'
  const mode = useContentMode()
  const zh = locale === 'zh'
  const language = zh ? 'EN' : '中文'

  function props(key: string) {
    return { className: styles.dockItem, 'data-dock-item': key, 'data-expanded': highlighted === key || undefined }
  }

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

  return <nav id={dockId} ref={dockRef} aria-label={zh ? '底部导航' : 'Bottom navigation'}
    className={styles.dock} data-visible={visible || undefined} inert={!visible}
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
    {destinations.map((item) => <a {...props(item.key)} key={item.key} href={href(locale, item.path)}
      aria-label={item[locale]} aria-current={currentLocation(item.path, path)}>
      <NavigationLabel icon={item.icon}>{item[locale]}</NavigationLabel>
    </a>)}
    <button {...props('mode')} type="button" role="switch" aria-checked={mode === 'nsfw'}
      aria-label={zh ? 'NSFW 内容' : 'NSFW content'} onClick={toggleContentMode}>
      <NavigationLabel icon={mode === 'nsfw' ? 'adult' : 'safe'}>{mode.toUpperCase()}</NavigationLabel>
    </button>
    <button {...props('theme')} type="button" aria-pressed={dark}
      aria-label={zh ? '切换亮暗主题' : 'Toggle light or dark theme'} onClick={toggleTheme}>
      <NavigationLabel icon={dark ? 'sun' : 'moon'}>{dark ? (zh ? '亮色' : 'Light') : (zh ? '暗色' : 'Dark')}</NavigationLabel>
    </button>
    <a {...props('language')} href={languageUrl} lang={zh ? 'en' : 'zh-CN'} aria-label={language}>
      <NavigationLabel icon="language">{language}</NavigationLabel>
    </a>
    <a {...props('github')} href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
      <NavigationLabel icon="github">GitHub</NavigationLabel>
    </a>
  </nav>
}

export function SiteNavigation({ locale, path }: { locale: Locale; path: string }) {
  const header = useRef<HTMLElement>(null)
  const dock = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [pastHeader, setPastHeader] = useState(false)
  const [opened, setOpened] = useState(false)
  const visible = pastHeader || opened
  const dark = useTheme() === 'dark'
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
    return () => observer.disconnect()
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
          <ContentModeSwitch locale={locale} />
          {destinations.map((item) => <a key={item.key} className={styles.headerAction} href={href(locale, item.path)}
            aria-current={currentLocation(item.path, path)}>{item[locale]}</a>)}
          <button className={styles.headerAction} type="button" aria-pressed={dark}
            aria-label={zh ? '切换亮暗主题' : 'Toggle light or dark theme'} onClick={toggleTheme}>
            <Icon name={dark ? 'sun' : 'moon'} />
          </button>
          <a className={styles.headerAction} href={languageUrl} lang={zh ? 'en' : 'zh-CN'}>{zh ? 'EN' : '中文'}</a>
        </nav>
        <button ref={trigger} type="button" className={styles.menuTrigger} aria-controls={dockId}
          aria-label={zh ? '导航菜单' : 'Navigation menu'} aria-expanded={visible} onClick={() => setOpened(!opened)}>
          <Icon name={visible ? 'close' : 'menu'} size={22} />
        </button>
      </div>
    </header>
    <MobileDock locale={locale} path={path} languageUrl={languageUrl} visible={visible} dockRef={dock} close={closeDock} />
  </>
}
