import { useEffect, useRef, type Ref } from 'react'

type ToastProps = {
  open: boolean
  top: number
  text: string
  onUndo: () => void
  onDone: () => void
  onPressStart?: () => void
  ref?: Ref<HTMLDivElement>
}

export function Toast({ open, top, text, onUndo, onDone, onPressStart, ref }: ToastProps) {
  const doneRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) doneRef.current?.focus({ preventScroll: true })
  }, [open])

  return (
    <div
      ref={ref}
      className={open ? 'stp-toast is-in' : 'stp-toast'}
      style={{ top }}
      inert={!open}
      role="status"
    >
      <span className="stp-toast-dot" />
      <span className="stp-toast-text">{text}</span>
      <button
        type="button"
        className="stp-btn is-quiet"
        onPointerDown={onPressStart}
        onClick={onUndo}
      >
        Undo
      </button>
      <button
        ref={doneRef}
        type="button"
        className="stp-btn"
        onPointerDown={onPressStart}
        onClick={onDone}
      >
        Done
      </button>
    </div>
  )
}
