'use client'

import { useId, useRef, useState } from 'react'
import type { Locale } from '../lib/presentation'
import { t } from './elements'
import { Icon } from './icons'
import styles from './filter-dialog.module.scss'

export type FilterGroup = { key: string; name: string; options: { id: number; label: string; count: number }[] }

const visibleTagCount = 16

export function FilterDialog({ groups, selected, locale, onApply }: {
  groups: FilterGroup[]; selected: number[]; locale: Locale; onApply: (tagIds: number[]) => void
}) {
  const id = useId()
  const panel = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  const [draft, setDraft] = useState<number[]>([])
  const [expanded, setExpanded] = useState<string[]>([])
  const title = t(locale, '高级筛选', 'Advanced filters')

  function open() {
    setDraft(selected)
    setExpanded([])
    panel.current?.showModal()
    scrollArea.current?.scrollTo(0, 0)
    scrollArea.current?.focus({ preventScroll: true })
  }

  function toggleTag(tagId: number) {
    setDraft((previous) => previous.includes(tagId) ? previous.filter((id) => id !== tagId) : [...previous, tagId])
  }

  return <>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={title} aria-haspopup="dialog" aria-controls={id}
      data-active={selected.length > 0 || undefined} onClick={open}>
      <Icon name="filter" size={21} />
      <span className={styles.triggerLabel}>{title}</span>
      {selected.length > 0 && <span className={styles.count} aria-hidden="true">{selected.length}</span>}
    </button>
    <dialog ref={panel} id={id} className={styles.dialog} aria-labelledby={id + '-title'}
      onClose={() => trigger.current?.focus()}>
      <form className={styles.form} onSubmit={(event) => {
        event.preventDefault()
        onApply(draft)
        panel.current?.close()
      }}>
        <header className={styles.heading}>
          <h2 id={id + '-title'}>{title}</h2>
        </header>
        <div ref={scrollArea} role="region" aria-label={t(locale, '游戏标签', 'Game tags')} tabIndex={0} className={styles.scrollArea}>
          {groups.map(({ key, name, options }) => {
            const allVisible = expanded.includes(key)
            const visible = allVisible ? options : options.filter(({ id }, i) => i < visibleTagCount || draft.includes(id))
            const tagsId = id + '-' + key
            return <fieldset key={key} className={styles.tagGroup}>
              <legend>{name}</legend>
              <div id={tagsId} className={styles.tags}>
                {visible.map(({ id, label, count }) => <button key={id} type="button" className={styles.chip}
                  aria-pressed={draft.includes(id)} onClick={() => toggleTag(id)}>
                  {label} <span className={styles.tagCount}>{count}</span>
                </button>)}
              </div>
              {options.length > visibleTagCount && <button type="button" className={styles.expand} aria-expanded={allVisible}
                aria-controls={tagsId} onClick={() => setExpanded((previous) => allVisible ? previous.filter((value) => value !== key) : [...previous, key])}>
                {allVisible ? t(locale, '收起', 'Show less') : t(locale, '展开全部', 'Show all')}
                <Icon name="chevron" size={12} />
              </button>}
            </fieldset>
          })}
        </div>
        <footer className={styles.actions}>
          <button type="button" className={styles.reset} disabled={!draft.length} onClick={() => setDraft([])}>
            {t(locale, '重置筛选', 'Reset filters')}
          </button>
          <button type="button" className={styles.cancel} onClick={() => panel.current?.close()}>{t(locale, '取消', 'Cancel')}</button>
          <button type="submit" className={styles.apply}>{t(locale, '查询', 'Search')}</button>
        </footer>
      </form>
    </dialog>
  </>
}
