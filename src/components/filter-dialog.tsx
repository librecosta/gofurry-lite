'use client'

import { useId, useRef, useState } from 'react'
import type { Locale } from '../lib/presentation'
import { t } from './elements'
import { Icon } from './icons'
import styles from './filter-dialog.module.scss'

export type FilterGroup = { name: string; options: { id: number; label: string }[] }

export function FilterDialog({ groups, selected, locale, onApply }: {
  groups: FilterGroup[]; selected: number[]; locale: Locale; onApply: (tags: number[]) => void
}) {
  const id = useId()
  const panel = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<number[]>([])
  const title = t(locale, '高级筛选', 'Advanced filters')
  const closeLabel = t(locale, '关闭', 'Close')
  const active = selected.filter(Boolean).length

  function open() {
    setDraft(selected)
    panel.current?.showModal()
    panel.current?.querySelector('select')?.focus()
  }

  return <>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={title} aria-haspopup="dialog" aria-controls={id}
      data-active={active > 0 || undefined} onClick={open}>
      <Icon name="filter" size={21} />
      <span className={styles.triggerLabel}>{title}</span>
      {active > 0 && <span className={styles.count} aria-hidden="true">{active}</span>}
    </button>
    <dialog ref={panel} id={id} className={styles.dialog} aria-labelledby={id + '-title'}
      onClose={() => trigger.current?.focus()}>
      <form onSubmit={(event) => {
        event.preventDefault()
        onApply(draft)
        panel.current?.close()
      }}>
        <header className={styles.heading}>
          <h2 id={id + '-title'}>{title}</h2>
          <button type="button" className={styles.close} aria-label={closeLabel} onClick={() => panel.current?.close()}>
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className={styles.fields}>
          {groups.map(({ name, options }, position) => <label key={name}>
            <span>{name}</span>
            <select value={draft[position] ?? 0} onChange={(event) => {
              const next = Number(event.currentTarget.value)
              setDraft((previous) => groups.map((_, i) => i === position ? next : previous[i] ?? 0))
            }}>
              <option value={0}>{t(locale, '全部', 'All')}</option>
              {options.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>)}
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.reset} onClick={() => setDraft([])}>{t(locale, '重置', 'Reset')}</button>
          <button type="submit" className={styles.apply}>{t(locale, '应用筛选', 'Apply filters')}</button>
        </div>
      </form>
    </dialog>
  </>
}
