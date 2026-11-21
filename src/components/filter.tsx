
'use client'

import { useMemo, useRef, useState, type ChangeEvent, type CompositionEvent, type ReactNode } from 'react'
import { FilterDialog, type FilterGroup } from './filter-dialog'
import { FloatingSearch } from './floating-search'
import { useStaticData } from './static-data'
import styles from './site.module.scss'

type Row = [id: number, text: string, ...tags: number[]]
type Entry = { id: number; card: ReactNode }
type Props = {
  entries: Entry[]
  group?: FilterGroup[]
  locale: 'zh' | 'en'
  kind: 'sites' | 'games'
  expanded: boolean
  searchLayout?: (search: ReactNode) => ReactNode
  beforeResults?: ReactNode
}
const normalize = (value: string) => value.normalize('NFKC').toLocaleLowerCase().trim()

export function Filter({ entries, group = [], locale, kind, expanded, searchLayout, beforeResults }: Props) {
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')
  const composing = useRef(false)
  const [tags, setTags] = useState<number[]>([])
  const available = new Set(group.flatMap(({ options }) => options.map(({ id }) => id)))
  const selected = tags.filter((id) => available.has(id))
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const active = Boolean(words.length || selected.length)
  const indexUrl = '/indexes/' + (expanded ? 'extended/' : '') + kind + '-' + locale + '.json'
  const source = useStaticData<Row[]>(active ? indexUrl : null)
  const rows = source?.value
  const index = useMemo(() => rows && new Map(rows.map((row) => [row[0], row])), [rows])
  const zh = locale === 'zh'
  const searchLabel = searchLayout ? (zh ? '搜索兽圈网站' : 'Search furry websites')
    : kind === 'sites' ? (zh ? '搜索网站' : 'Search websites')
    : (zh ? '搜索游戏' : 'Search games')
  const results = active
    ? entries.filter(({ id }) => {
      const row = index?.get(id)
      return row && words.every((word) => row[1].includes(word)) && selected.every((tag) => row.includes(tag, 2))
    })
    : entries

  const field = {
    type: 'search',
    value: text,
    onChange: (event: ChangeEvent<HTMLInputElement>) => {
      setText(event.currentTarget.value)
      if (!composing.current) setQuery(event.currentTarget.value)
    },
    onCompositionStart: () => { composing.current = true },
    onCompositionEnd: (event: CompositionEvent<HTMLInputElement>) => {
      composing.current = false
      setText(event.currentTarget.value)
      setQuery(event.currentTarget.value)
    },
  }

  const search = <FloatingSearch field={field} label={searchLabel}
    clearLabel={zh ? '清除搜索' : 'Clear search'} onClear={() => { setText(''); setQuery('') }} />

  return <div>
    {searchLayout ? searchLayout(search)
      : <div className={group.length ? styles.filters + ' ' + styles.filtersWithDialog : styles.filters}>
        {search}
        {group.length > 0 && <FilterDialog groups={group} selected={selected} locale={locale} onApply={setTags} />}
      </div>}
    {active && !index && <p className={styles.notice} role="status">{source?.failed ? (zh ? '搜索暂不可用。' : 'Search is currently unavailable.') : (zh ? '正在加载索引…' : 'Loading the search index…')}</p>}
    {active && index && <p className={styles.notice} role="status">{zh ? '符合条件的结果 ' + results.length + ' 条' : results.length + (results.length === 1 ? ' result' : ' results')}</p>}
    {!active && beforeResults}
    {(!searchLayout || active) && <div className={kind === 'games' ? styles.gameGrid : styles.siteGrid} data-results={kind}>
      {results.map(({ card }) => card)}
    </div>}
  </div>
}
