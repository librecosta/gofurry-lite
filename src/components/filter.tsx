'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './icons'
import styles from './site.module.scss'

type Row = [id: number, text: string, ...tags: number[]]
type Group = { name: string; options: { id: number; label: string }[] }
type Props = {
  children: ReactNode; group?: Group[]; locale: 'zh' | 'en'; kind: 'sites' | 'games'; total: number; home?: boolean; results?: ReactNode; beforeResults?: ReactNode
}
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim()

export function Filter({ children, group = [], locale, kind, total, home = false, results, beforeResults }: Props) {
  const [query, setQuery] = useState('')
  const [tags, setTags] = useState<number[]>([])
  const [index, setIndex] = useState<Map<number, Row> | null>(null)
  const [count, setCount] = useState(total)
  const [error, setError] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const active = Boolean(query.trim() || tags.some(Boolean))
  const zh = locale === 'zh'
  const searchLabel = kind === 'sites'
    ? zh ? '搜索网站名称、关键词或简介' : 'Search by site name, keyword or description'
    : zh ? '搜索游戏名称、描述或标签' : 'Search by game name, description or tag'

  useEffect(() => {
    const controller = new AbortController()
    fetch('/indexes/' + kind + '-' + locale + '.json', { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Search index unavailable'); return response.json() as Promise<Row[]> })
      .then((entries) => setIndex(new Map(entries.map((entry) => [entry[0], entry]))))
      .catch((failure: unknown) => { if (!(failure instanceof DOMException && failure.name === 'AbortError')) setError(true) })
    return () => controller.abort()
  }, [kind, locale])

  useEffect(() => {
    const words = normalize(query).split(/\s+/).filter(Boolean)
    let matches = 0
    for (const node of root.current?.querySelectorAll<HTMLElement>('[data-search-id]') ?? []) {
      const entry = index?.get(Number(node.dataset.searchId))
      const match = !active || !!entry && words.every((word) => entry[1].includes(word))
        && tags.every((tag) => !tag || entry.slice(2).includes(tag))
      node.hidden = !match
      if (match) matches++
    }
    // The visibility and count represent the same filtered server-rendered list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCount(matches)
  }, [active, index, query, tags])

  return <div>
    <div className={styles.filters}>
      <label className={styles.search}>
        <Icon name="search" />
        <span className="sr-only">{searchLabel}</span>
        <input type="search" placeholder={searchLabel} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      {group.length > 0 && <div className={styles.selectors}>
        {group.map(({ name, options }, position) => <label key={name}>
          <span>{name}</span>
          <select value={tags[position] || 0} onChange={(event) => {
            const value = Number(event.target.value)
            setTags((previous) => Array.from({ length: group.length }, (_, i) => i === position ? value : previous[i] || 0))
          }}>
            <option value={0}>{zh ? '全部' : 'All'}</option>
            {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>)}
      </div>}
    </div>
    {active && !index && <p className={styles.notice} role="status">{error ? (zh ? '搜索暂不可用。' : 'Search is currently unavailable.') : (zh ? '正在加载索引…' : 'Loading the search index…')}</p>}
    {active && index && <p className={styles.notice} role="status">{zh ? '符合条件的结果 ' + count + ' 条' : count + (count === 1 ? ' result' : ' results')}</p>}
    {!active && beforeResults}
    {home && <div hidden={active} data-directory-content>{children}</div>}
    <div ref={root} hidden={home && !active} className={kind === 'games' ? styles.gameGrid : styles.siteGrid} data-results={kind}>{home ? results : children}</div>
  </div>
}

export function HomeSearch({ children, results, locale, total }: {
  children: ReactNode; results: ReactNode; locale: 'zh' | 'en'; total: number
}) {
  return <Filter kind="sites" locale={locale} total={total} home results={results}>{children}</Filter>
}
