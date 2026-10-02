import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { STATUSES, STATUS_COPY } from './options'
import { arrowSelect } from './radio'
import type { StampStatus } from './types'

type StatusPickerProps = {
  value: StampStatus
  onChange: (status: StampStatus) => void
}

export function StatusPicker({ value, onChange }: StatusPickerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [thumb, setThumb] = useState<{ x: number; width: number } | null>(null)
  const [armed, setArmed] = useState(false)

  useLayoutEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>('[aria-checked="true"]')
    if (selected) setThumb({ x: selected.offsetLeft, width: selected.offsetWidth })
  }, [value])

  useEffect(() => {
    const timer = window.setTimeout(() => setArmed(true), 80)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div
      ref={ref}
      className="stp-seg"
      role="radiogroup"
      aria-label="Status"
      onKeyDown={(e) => arrowSelect(e, STATUSES, value, onChange)}
    >
      <span
        className={armed ? 'stp-seg-thumb is-armed' : 'stp-seg-thumb'}
        style={
          thumb ? { transform: `translateX(${thumb.x}px)`, width: thumb.width } : { opacity: 0 }
        }
      />
      {STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          role="radio"
          data-key={status}
          aria-checked={status === value}
          tabIndex={status === value ? 0 : -1}
          onClick={() => onChange(status)}
        >
          {STATUS_COPY[status].label}
        </button>
      ))}
    </div>
  )
}
