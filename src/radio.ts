import type { KeyboardEvent } from 'react'

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function arrowSelect<T extends string>(
  event: KeyboardEvent<HTMLElement>,
  options: T[],
  value: T,
  onChange: (next: T) => void,
) {
  const step = STEPS[event.key]
  if (!step) return
  event.preventDefault()
  const next = options[(options.indexOf(value) + step + options.length) % options.length]
  onChange(next)
  event.currentTarget.querySelector<HTMLElement>(`[data-key="${next}"]`)?.focus()
}
