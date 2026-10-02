import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { animate, useMotionValue, type AnimationPlaybackControls } from 'motion/react'

const ROW = 34

type WheelProps = {
  items: string[]
  index: number
  enabledCount: number
  label: string
  valueText: string
  left: number
  width: number
  onChange: (index: number) => void
  onTick: () => void
}

type Drag = {
  pointer: number
  originY: number
  originPos: number
  lastY: number
  lastTime: number
  velocity: number
  scale: number
  moved: boolean
}

const rubberBand = (pos: number, max: number, give: number) =>
  pos < 0 ? pos * give : pos > max ? max + (pos - max) * give : pos

export function Wheel({
  items,
  index,
  enabledCount,
  label,
  valueText,
  left,
  width,
  onChange,
  onTick,
}: WheelProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const rows = useRef<(HTMLDivElement | null)[]>([])
  const pos = useMotionValue(index * ROW)
  const spring = useRef<AnimationPlaybackControls | null>(null)
  const drag = useRef<Drag | null>(null)
  const shown = useRef(index)
  const aim = useRef(index)
  const wheelIdle = useRef(0)
  const latest = useRef({ index, enabledCount, onChange, onTick })
  latest.current = { index, enabledCount, onChange, onTick }

  const maxPos = (items.length - 1) * ROW

  const paint = useCallback((p: number) => {
    if (stripRef.current) stripRef.current.style.transform = `translateY(${-p}px)`
    rows.current.forEach((row, i) => {
      const distance = Math.abs(i * ROW - p) / ROW
      if (!row || distance > 3.2) return
      const blur = Math.min(2.6, Math.max(0, distance - 0.55) * 1.05)
      row.style.opacity = String(Math.max(0.2, 1 - distance * 0.13))
      row.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none'
    })
    const nearest = Math.round(p / ROW)
    if (nearest !== shown.current) {
      shown.current = nearest
      latest.current.onTick()
    }
  }, [])

  useLayoutEffect(() => {
    paint(pos.get())
    return pos.on('change', paint)
  }, [paint, pos])

  const settleTo = useCallback(
    (row: number, velocity = 0) => {
      const target = Math.max(0, Math.min(items.length - 1, row))
      aim.current = target
      spring.current?.stop()
      spring.current = animate(pos, target * ROW, {
        type: 'spring',
        stiffness: 260,
        damping: 30,
        velocity,
        onComplete: () => {
          spring.current = null
          const { index: current, enabledCount: enabled, onChange: report } = latest.current
          if (target > enabled - 1) settleTo(enabled - 1)
          else if (target !== current) report(target)
        },
      })
    },
    [items.length, pos],
  )

  useEffect(() => {
    if (drag.current || spring.current) return
    const at = Math.round(pos.get() / ROW)
    if (at === index) return
    if (Math.abs(at - index) > 6) {
      shown.current = index
      pos.set(index * ROW)
    } else {
      settleTo(index)
    }
  }, [index, pos, settleTo])

  useEffect(
    () => () => {
      spring.current?.stop()
      window.clearTimeout(wheelIdle.current)
    },
    [],
  )

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const px = e.deltaMode === 1 ? e.deltaY * ROW : e.deltaY
      window.clearTimeout(wheelIdle.current)
      if (Math.abs(px) >= 50 && Number.isInteger(px)) {
        const from = spring.current ? aim.current : Math.round(pos.get() / ROW)
        settleTo(from + Math.sign(px))
        return
      }
      spring.current?.stop()
      spring.current = null
      pos.set(rubberBand(pos.get() + px * 0.7, maxPos, 0.5))
      wheelIdle.current = window.setTimeout(() => settleTo(Math.round(pos.get() / ROW)), 90)
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [maxPos, pos, settleTo])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const box = boxRef.current
    if (!box || (e.pointerType === 'mouse' && e.button !== 0)) return
    box.setPointerCapture(e.pointerId)
    spring.current?.stop()
    spring.current = null
    drag.current = {
      pointer: e.pointerId,
      originY: e.clientY,
      originPos: pos.get(),
      lastY: e.clientY,
      lastTime: performance.now(),
      velocity: 0,
      scale: box.getBoundingClientRect().height / box.offsetHeight || 1,
      moved: false,
    }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current
    if (!g || g.pointer !== e.pointerId) return
    const dy = (e.clientY - g.originY) / g.scale
    if (Math.abs(dy) > 3) g.moved = true
    const now = performance.now()
    const dt = Math.max(1, now - g.lastTime)
    g.velocity = 0.75 * ((-(e.clientY - g.lastY) / g.scale / dt) * 1000) + 0.25 * g.velocity
    g.lastY = e.clientY
    g.lastTime = now
    pos.set(rubberBand(g.originPos - dy, maxPos, 0.4))
  }

  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const g = drag.current
    const box = boxRef.current
    if (!g || g.pointer !== e.pointerId || !box) return
    drag.current = null
    if (!g.moved) {
      const top = box.getBoundingClientRect().top
      const offset = ((e.clientY - top) / g.scale - box.offsetHeight / 2) / ROW
      settleTo(Math.round(pos.get() / ROW + offset))
      return
    }
    const velocity = performance.now() - g.lastTime > 80 ? 0 : g.velocity
    settleTo(Math.round((pos.get() + velocity * 0.18) / ROW), velocity)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const at = Math.round(pos.get() / ROW)
    const targets: Record<string, number> = {
      ArrowUp: at - 1,
      ArrowDown: at + 1,
      PageUp: at - 5,
      PageDown: at + 5,
      Home: 0,
      End: enabledCount - 1,
    }
    if (!(e.key in targets)) return
    e.preventDefault()
    settleTo(Math.max(0, Math.min(enabledCount - 1, targets[e.key])))
  }

  return (
    <>
      <div className="stp-wheel" style={{ left, width }}>
        <div className="stp-lens" />
        <div
          ref={boxRef}
          className="stp-scroll"
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuemin={1}
          aria-valuemax={enabledCount}
          aria-valuenow={index + 1}
          aria-valuetext={valueText}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div ref={stripRef} className="stp-strip">
            {items.map((item, i) => (
              <div
                key={item}
                ref={(node) => {
                  rows.current[i] = node
                }}
                className={i < enabledCount ? 'stp-row' : 'stp-row is-off'}
                aria-hidden="true"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="stp-cap" style={{ left, width }} aria-hidden="true">
        {label.toUpperCase()}
      </div>
    </>
  )
}
