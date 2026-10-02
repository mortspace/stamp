import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react'
import { TextMorph } from 'torph/react'
import { zoomOf } from './camera'
import {
  DAYS,
  MONTHS,
  MONTH_NAMES,
  daysIn,
  longDate,
  shortDate,
  toDate,
  toYmd,
  type Ymd,
} from './date'
import { useStampFonts } from './fonts'
import { HoldButton } from './HoldButton'
import { InkPicker } from './InkPicker'
import { Invoice } from './Invoice'
import { INKS, STATUS_COPY } from './options'
import { printSheet } from './printSheet'
import type { PrintData } from './PrintMark'
import { SAMPLE_INVOICES, SAMPLE_ISSUER } from './samples'
import { stampSound } from './sound'
import { StampBlock } from './StampBlock'
import { StatusPicker } from './StatusPicker'
import {
  IN_CUBIC,
  LABEL_SPRING,
  LIFT_AWAY_AFTER_MS,
  OUT,
  OUT_SINE,
  SINE,
  STAMP_TIMING,
  TOAST_AT_LIFT_AWAY,
  WIND_UP,
} from './timing'
import { Toast } from './Toast'
import type { StampInk, StampProps, StampResult, StampStatus } from './types'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'
import { useScene } from './useScene'
import { isCancelled, useSequence, type Run } from './useSequence'
import { useStageLayout } from './useStageLayout'
import { Wheel } from './Wheel'
import { PAPER, STAMP, U } from './world'
import './stamp.css'

type Phase = 'set' | 'tilt' | 'pov' | 'rise' | 'quick' | 'done' | 'undo'

const FOOTPRINT: CSSProperties = {
  width: STAMP.width,
  height: STAMP.depth,
  borderRadius: STAMP.radius,
}

const PAPER_STYLE: CSSProperties = {
  width: PAPER.width,
  height: PAPER.height,
  transform: `translate3d(${-PAPER.width / 2}px, ${-PAPER.height / 2}px, 0)`,
}

let lastSeed = Math.floor(Math.random() * 900) + 7
const nextSeed = () => (lastSeed = (lastSeed * 7 + 13) % 997)

const rethrow = (error: unknown) => {
  if (!isCancelled(error)) throw error
}

export function Stamp({
  invoices = SAMPLE_INVOICES,
  issuer = SAMPLE_ISSUER,
  motion = 'auto',
  sound = false,
  timing,
  defaultDate,
  defaultStatus = 'paid',
  defaultInk = 'red',
  onStamp,
  onUndo,
  className,
}: StampProps) {
  const timingRef = useRef(STAMP_TIMING)
  timingRef.current = { ...STAMP_TIMING, ...timing }
  const soundRef = useRef(sound)
  soundRef.current = sound
  const callbacks = useRef({ onStamp, onUndo })
  callbacks.current = { onStamp, onUndo }
  useStampFonts()
  const reduced = usePrefersReducedMotion()

  const startTime = defaultDate?.getTime()
  const start = useMemo(
    () => toYmd(startTime === undefined ? new Date() : new Date(startTime)),
    [startTime],
  )
  const years = useMemo(
    () => Array.from({ length: 11 }, (_, i) => String(start.y - 5 + i)),
    [start.y],
  )

  const [date, setDate] = useState<Ymd>(start)
  const [status, setStatus] = useState<StampStatus>(defaultStatus)
  const [ink, setInk] = useState<StampInk>(defaultInk)
  const [invoiceIndex, setInvoiceIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('set')
  const [toast, setToast] = useState(false)
  const [print, setPrint] = useState<PrintData | null>(null)

  const { layout, scale, refs: frame } = useStageLayout()
  const scene = useScene(layout)
  const sequence = useSequence()
  const { camera, height, squash, exit, dip, fade } = scene.values
  const toastRef = useRef<HTMLDivElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const firstStamp = useRef(true)
  const stamped = useRef<StampResult | null>(null)
  const pending = useRef<PrintData | null>(null)

  const invoice = invoices[invoiceIndex % invoices.length]
  const audio = useCallback(() => (soundRef.current ? stampSound() : null), [])

  const commit = useCallback(
    (data: PrintData) => {
      const result: StampResult = {
        invoiceId: invoice.id,
        status: data.status,
        date: toDate(data.date),
        ink: data.ink,
      }
      stamped.current = result
      callbacks.current.onStamp?.(result)
    },
    [invoice.id],
  )

  const skipToEnd = useCallback(() => {
    sequence.stop()
    scene.snap(2)
    fade.set(1)
    setToast(false)
    setPhase('done')
    if (!pending.current) return
    if (!stamped.current) commit(pending.current)
    requestAnimationFrame(() => scene.revealPrint('instant'))
  }, [commit, fade, scene, sequence])

  const rise = useCallback(async () => {
    const keepFocus = !!toastRef.current?.contains(document.activeElement)
    const run = sequence.takeOver()
    setToast(false)
    setPhase('rise')
    audio()?.air(0, true)
    try {
      run.play(exit, 1, { duration: 0.4, ease: IN_CUBIC })
      await run.tween(camera, 2, { duration: timingRef.current.rise, ease: SINE })
      setPhase('done')
      if (keepFocus) requestAnimationFrame(() => nextRef.current?.focus({ preventScroll: true }))
    } catch (error) {
      rethrow(error)
    }
  }, [audio, camera, exit, sequence])

  const playQuick = useCallback(
    async (run: Run, data: PrintData) => {
      setPhase('quick')
      if (!reduced) await run.tween(dip, 1, { duration: 0.08, ease: 'easeOut' })
      await run.tween(fade, 0, { duration: reduced ? 0.12 : 0.14, ease: 'easeIn' })
      scene.snap(2)
      setPhase('done')
      await run.tween(fade, 1, { duration: 0.22, ease: OUT })
      if (reduced) {
        scene.revealPrint('fade')
      } else {
        audio()?.impact(0.13, -9)
        scene.revealPrint('thump')
      }
      commit(data)
    },
    [audio, commit, dip, fade, reduced, scene],
  )

  const playCinematic = useCallback(
    async (run: Run, data: PrintData) => {
      setPhase('tilt')
      audio()?.air(0)
      await run.tween(camera, 1, { duration: timingRef.current.tilt, ease: SINE })
      setPhase('pov')
      await run.wait(60)

      const { press } = timingRef.current
      await run.tween(height, STAMP.hover + 0.8 * U, { duration: press * WIND_UP, ease: OUT_SINE })
      audio()?.impact(press - 1 / 60)
      await run.tween(height, 0, { duration: press, ease: IN_CUBIC })
      scene.revealPrint('instant')
      commit(data)
      await run.tween(squash, 1, { duration: 0.06, ease: 'easeOut' })
      await run.wait(90)

      const { bounce, liftAway } = timingRef.current
      audio()?.peel(0)
      run.play(squash, 0, { type: 'spring', bounce, duration: 0.4 })
      run.play(height, STAMP.hover, { type: 'spring', bounce, duration: 0.55 })
      await run.wait(LIFT_AWAY_AFTER_MS)
      audio()?.air(0, true)
      run.play(exit, 1, { duration: liftAway, ease: IN_CUBIC })
      await run.wait(liftAway * 1000 * TOAST_AT_LIFT_AWAY)
      setToast(true)
      audio()?.chime(0.02)
    },
    [audio, camera, commit, exit, height, scene, squash],
  )

  const stamp = useCallback(
    async ({ quick, voided = false }: { quick: boolean; voided?: boolean }) => {
      if (phase !== 'set') return
      const run = sequence.start()
      const data: PrintData = {
        status: voided ? 'void' : status,
        date,
        ink,
        seed: nextSeed(),
        rotate: -4 + (Math.random() * 2.4 - 1.2),
        dx: Math.random() * 6 - 3,
        dy: Math.random() * 6 - 3,
      }
      pending.current = data
      stamped.current = null
      setPrint(data)

      const stage = frame.stage.current
      const box = stage?.getBoundingClientRect()
      const fits = !box || box.height <= window.innerHeight * 1.04
      const cinematic =
        !reduced &&
        fits &&
        !quick &&
        (motion === 'cinematic' || (motion === 'auto' && firstStamp.current))
      if (cinematic && box && (box.top < -4 || box.bottom > window.innerHeight + 4)) {
        stage?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      firstStamp.current = false

      try {
        await (cinematic ? playCinematic(run, data) : playQuick(run, data))
      } catch (error) {
        rethrow(error)
      }
    },
    [date, frame, ink, motion, phase, playCinematic, playQuick, reduced, sequence, status],
  )

  const reset = useCallback(
    async (next: boolean) => {
      const run = sequence.start()
      const undone = stamped.current
      const fromDesk = phase === 'pov' || phase === 'tilt'
      try {
        setToast(false)
        setPhase('undo')
        if (!next && undone) callbacks.current.onUndo?.(undone)
        stamped.current = null
        if (fromDesk) {
          scene.liftPrint()
          run.play(height, STAMP.hover, { duration: 0.3, ease: OUT })
          run.play(squash, 0, { duration: 0.2 })
          run.play(exit, 0, { duration: 0.55, ease: OUT })
          await run.tween(camera, 0, { duration: timingRef.current.tilt * 0.875, ease: SINE })
        } else {
          await run.tween(fade, 0, { duration: 0.14, ease: 'easeIn' })
          scene.snap(0)
          if (next) {
            setInvoiceIndex((i) => i + 1)
            setDate(start)
          }
        }
        setPrint(null)
        pending.current = null
        setPhase('set')
        if (!fromDesk) await run.tween(fade, 1, { duration: 0.22, ease: OUT })
      } catch (error) {
        rethrow(error)
      }
    },
    [camera, exit, fade, height, phase, scene, sequence, squash, start],
  )

  const moving = phase === 'tilt' || phase === 'pov' || phase === 'rise'
  const waiting = phase === 'pov' && toast

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && phase === 'set' && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault()
      void stamp({ quick: true })
    } else if (e.key === 'Escape' && waiting) {
      e.preventDefault()
      void rise()
    } else if (e.key === 'Escape' && moving) {
      e.preventDefault()
      skipToEnd()
    }
  }

  const onScenePointerDown = () => {
    if (waiting) void rise()
    else if (moving) skipToEnd()
  }

  const changeDate = (part: keyof Ymd, index: number) =>
    setDate((current) => {
      const next = { ...current }
      if (part === 'd') next.d = index + 1
      if (part === 'm') next.m = index
      if (part === 'y') next.y = Number(years[index])
      next.d = Math.min(next.d, daysIn(next.y, next.m))
      return next
    })

  const live = phase === 'set'
  const tall = layout.kind === 'tall'
  const copy = STATUS_COPY[print?.status ?? status]
  const pageZoom = zoomOf(layout.page)
  const flatPaper: CSSProperties = {
    left: layout.page.cx - (PAPER.width * pageZoom) / 2,
    top: layout.page.cy - (PAPER.height * pageZoom) / 2,
    width: PAPER.width * pageZoom,
    height: PAPER.height * pageZoom,
  }
  const stageStyle = {
    width: layout.width,
    height: layout.height,
    transform: scale === 1 ? undefined : `scale(${scale})`,
    '--ink': INKS[print?.ink ?? ink].color,
    '--hit': `${(44 / scale).toFixed(1)}px`,
  } as CSSProperties
  const row = (top: number, delay?: string) =>
    ({ ...(tall ? null : { top }), ...(delay ? { '--d': delay } : null) }) as CSSProperties
  const doneText = print
    ? `${copy.done} ${tall ? shortDate(print.date) : longDate(print.date)}`
    : ''
  const toastText = print ? (tall ? copy.toast : `${copy.toast} · ${shortDate(print.date)}`) : ''
  const announcement = phase === 'done' && print ? `${copy.done} ${longDate(print.date)}` : ''
  const rootClass = ['stp', tall && 'is-tall', phase === 'done' && 'is-done', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div ref={frame.root} className={rootClass} style={{ height: layout.height * scale }}>
      <div ref={frame.stage} className="stp-stage" style={stageStyle} onKeyDown={onKeyDown}>
        <div
          ref={scene.refs.halo}
          className="stp-halo"
          style={{ left: layout.face.cx, top: layout.face.cy + 40 }}
        />
        <div ref={scene.refs.desk} className="stp-desk" />

        <div ref={scene.refs.scene} className="stp-scene" onPointerDown={onScenePointerDown}>
          <div ref={scene.refs.view} className="stp-view">
            <div ref={scene.refs.camera} className="stp-cam">
              <div ref={scene.refs.paper} className="stp-paper" style={PAPER_STYLE}>
                <Invoice
                  ref={sheetRef}
                  printRef={scene.refs.print}
                  invoice={invoice}
                  issuer={issuer}
                  print={print}
                  zoom={PAPER.zoom}
                  variant="3d"
                />
              </div>
              <div ref={scene.refs.shadowWide} className="stp-shadow is-wide" style={FOOTPRINT} />
              <div ref={scene.refs.shadowSoft} className="stp-shadow is-soft" style={FOOTPRINT} />
              <div
                ref={scene.refs.shadowContact}
                className="stp-shadow is-contact"
                style={FOOTPRINT}
              />
              <StampBlock ref={scene.refs.stamp} glowRef={scene.refs.glow} live={live}>
                <div className="stp-engraved" aria-hidden="true">
                  <TextMorph as="span" ease={LABEL_SPRING} numbers={false}>
                    {STATUS_COPY[status].word}
                  </TextMorph>
                </div>
                <div
                  className="stp-inkdot"
                  aria-hidden="true"
                  style={{ '--ink': INKS[ink].color } as CSSProperties}
                />
                <Wheel
                  items={DAYS}
                  index={date.d - 1}
                  enabledCount={daysIn(date.y, date.m)}
                  label="Day"
                  valueText={String(date.d)}
                  left={27}
                  width={104}
                  onChange={(i) => changeDate('d', i)}
                  onTick={() => audio()?.tick()}
                />
                <Wheel
                  items={MONTHS}
                  index={date.m}
                  enabledCount={12}
                  label="Month"
                  valueText={MONTH_NAMES[date.m]}
                  left={139}
                  width={135}
                  onChange={(i) => changeDate('m', i)}
                  onTick={() => audio()?.tick()}
                />
                <Wheel
                  items={years}
                  index={Math.max(0, years.indexOf(String(date.y)))}
                  enabledCount={years.length}
                  label="Year"
                  valueText={String(date.y)}
                  left={282}
                  width={104}
                  onChange={(i) => changeDate('y', i)}
                  onTick={() => audio()?.tick()}
                />
              </StampBlock>
            </div>
          </div>

          <div className="stp-flatpaper" aria-hidden="true" style={flatPaper}>
            <Invoice
              printRef={scene.refs.flatPrint}
              invoice={invoice}
              issuer={issuer}
              print={print}
              zoom={PAPER.zoom * pageZoom}
              variant="flat"
            />
          </div>
        </div>

        <div ref={scene.refs.chrome} className="stp-ui stp-set" inert={!live}>
          <div ref={frame.setColumn} className="stp-col">
            <div className="stp-eyebrow" style={row(layout.set.eyebrow)}>
              {invoice.client} · {invoice.total}
            </div>
            <h3 className="stp-title" style={row(layout.set.title)}>
              Invoice {invoice.id}
            </h3>
            <p className="stp-sub" style={row(layout.set.sub)}>
              {STATUS_COPY[status].prompt} It's printed on the invoice and saved to its history.
            </p>
            <div ref={frame.faceSlot} className="stp-slot stp-face-slot" aria-hidden="true" />
            <div className="stp-date" style={row(layout.set.date)}>
              {longDate(date)}
            </div>
            <div className="stp-controls" style={row(layout.set.controls)}>
              <StatusPicker value={status} onChange={setStatus} />
              <span className="stp-divider" />
              <InkPicker value={ink} onChange={setInk} />
            </div>
            <div className="stp-btnrow" style={row(layout.set.button)}>
              <HoldButton
                label={STATUS_COPY[status].button}
                holdingLabel="Keep holding to void"
                onPressStart={() => audio()?.tap(0)}
                onPress={(fromKeyboard) => void stamp({ quick: fromKeyboard })}
                onHold={() => void stamp({ quick: true, voided: true })}
              />
            </div>
            <div className="stp-hint" style={row(layout.set.hint)}>
              or press Enter · hold to void
            </div>
          </div>
        </div>

        <div className="stp-ui stp-end" inert={phase !== 'done'}>
          <div ref={frame.doneColumn} className="stp-col">
            <div className="stp-eyebrow" style={row(layout.done.eyebrow, '0.2s')}>
              {invoice.client} · {invoice.total}
            </div>
            <h3 className="stp-title" style={row(layout.done.title, '0.04s')}>
              Invoice {invoice.id}
            </h3>
            <div className="stp-status" style={row(layout.done.status, '0.13s')}>
              <i />
              <span>{doneText}</span>
              <span aria-hidden="true">·</span>
              <button type="button" className="stp-link" onClick={() => void reset(false)}>
                Undo
              </button>
            </div>
            <div ref={frame.paperSlot} className="stp-slot stp-paper-slot" aria-hidden="true" />
            <div className="stp-btnrow" style={row(layout.done.actions, '0.3s')}>
              <button
                type="button"
                className="stp-btn is-quiet"
                onClick={() => sheetRef.current && void printSheet(sheetRef.current, invoice.id)}
              >
                Download PDF
              </button>
              <button
                ref={nextRef}
                type="button"
                className="stp-btn"
                onClick={() => void reset(true)}
              >
                Next invoice
              </button>
            </div>
          </div>
        </div>

        <Toast
          ref={toastRef}
          open={toast}
          top={layout.toast}
          text={toastText}
          onPressStart={() => audio()?.tap(0, -25)}
          onUndo={() => void reset(false)}
          onDone={() => void rise()}
        />

        <p className="stp-sr" aria-live="polite">
          {announcement}
        </p>
      </div>
    </div>
  )
}
