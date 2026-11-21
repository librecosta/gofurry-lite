'use client'

import { useId, useRef, type ComponentProps, type CSSProperties } from 'react'
import { Icon } from './icons'
import styles from './floating-search.module.scss'

// Floating label, outline notch and character stagger adapted from Bencho (MIT).
export function FloatingSearch({ field, label, clearLabel, onClear }: {
  field: ComponentProps<'input'>
  label: string
  clearLabel: string
  onClear: () => void
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)

  function clear() {
    onClear()
    input.current?.focus()
  }

  return <div className={styles.floatingSearch} data-filled={Boolean(field.value) || undefined}>
    <fieldset className={styles.searchOutline} aria-hidden="true"><legend>{label}</legend></fieldset>
    <Icon name="search" size={21} />
    <label className={styles.floatingLabel} htmlFor={id}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true">
        {Array.from(label, (character, index) =>
          <span key={index} style={{ '--character': index } as CSSProperties}>{character}</span>)}
      </span>
    </label>
    <input {...field} id={id} ref={input} autoComplete="off" inputMode="search"
      onKeyDown={(event) => {
        if (event.key === 'Escape' && field.value && !event.nativeEvent.isComposing) {
          event.preventDefault()
          clear()
        }
      }} />
    {field.value && <button type="button" className={styles.clearSearch} aria-label={clearLabel} onClick={clear}>
      <Icon name="close" size={17} />
    </button>}
  </div>
}
