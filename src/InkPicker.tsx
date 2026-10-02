import type { CSSProperties } from 'react'
import { INKS, INK_KEYS } from './options'
import { arrowSelect } from './radio'
import type { StampInk } from './types'

type InkPickerProps = {
  value: StampInk
  onChange: (ink: StampInk) => void
}

export function InkPicker({ value, onChange }: InkPickerProps) {
  return (
    <div
      className="stp-swatches"
      role="radiogroup"
      aria-label="Ink"
      onKeyDown={(e) => arrowSelect(e, INK_KEYS, value, onChange)}
    >
      {INK_KEYS.map((ink) => (
        <button
          key={ink}
          type="button"
          role="radio"
          data-key={ink}
          aria-checked={ink === value}
          aria-label={INKS[ink].name}
          tabIndex={ink === value ? 0 : -1}
          className="stp-sw"
          style={{ '--c': INKS[ink].color } as CSSProperties}
          onClick={() => onChange(ink)}
        >
          <span />
        </button>
      ))}
    </div>
  )
}
