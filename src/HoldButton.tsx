import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { TextMorph } from 'torph/react'
import { LABEL_SPRING } from './timing'

const ARM_MS = 250
const HOLD_MS = 1500

type HoldButtonProps = {
  label: string
  holdingLabel: string
  onPress: (fromKeyboard: boolean) => void
  onHold: () => void
  onPressStart?: () => void
}

type Hold = { arm: number; fire: number; held: boolean }

export function HoldButton({
  label,
  holdingLabel,
  onPress,
  onHold,
  onPressStart,
}: HoldButtonProps) {
  const [holding, setHolding] = useState(false)
  const hold = useRef<Hold | null>(null)
  const latest = useRef(onHold)
  latest.current = onHold

  const clearTimers = () => {
    if (!hold.current) return
    window.clearTimeout(hold.current.arm)
    window.clearTimeout(hold.current.fire)
  }

  useEffect(() => clearTimers, [])

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return
    onPressStart?.()
    const next: Hold = { arm: 0, fire: 0, held: false }
    next.arm = window.setTimeout(() => {
      next.held = true
      setHolding(true)
    }, ARM_MS)
    next.fire = window.setTimeout(() => {
      setHolding(false)
      latest.current()
    }, HOLD_MS)
    hold.current = next
  }

  const release = () => {
    clearTimers()
    setHolding(false)
  }

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    const wasHeld = hold.current?.held
    hold.current = null
    if (!wasHeld) onPress(e.detail === 0)
  }

  return (
    <button
      type="button"
      className={holding ? 'stp-btn is-holding' : 'stp-btn'}
      onPointerDown={onPointerDown}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span className="stp-btn-fill" />
      <TextMorph as="span" className="stp-btn-label" ease={LABEL_SPRING} numbers={false}>
        {holding ? holdingLabel : label}
      </TextMorph>
    </button>
  )
}
