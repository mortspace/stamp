import {
  createRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { cancelFrame, frame, useMotionValue } from 'motion/react'
import { cameraAt, cameraTransform, type Layout } from './camera'
import { clamp01, smoothstep } from './math'
import { SPOT, STAMP, U } from './world'

type Shadow = { ox: number; oy: number; grow: number }

const createSceneRefs = () => ({
  view: createRef<HTMLDivElement>(),
  camera: createRef<HTMLDivElement>(),
  scene: createRef<HTMLDivElement>(),
  desk: createRef<HTMLDivElement>(),
  halo: createRef<HTMLDivElement>(),
  chrome: createRef<HTMLDivElement>(),
  paper: createRef<HTMLDivElement>(),
  stamp: createRef<HTMLDivElement>(),
  glow: createRef<HTMLDivElement>(),
  shadowSoft: createRef<HTMLDivElement>(),
  shadowWide: createRef<HTMLDivElement>(),
  shadowContact: createRef<HTMLDivElement>(),
  print: createRef<SVGSVGElement>(),
  flatPrint: createRef<SVGSVGElement>(),
})

const setOpacity = (el: HTMLElement | null, opacity: number) => {
  if (el) el.style.opacity = String(opacity)
}

const placeShadow = (
  el: HTMLElement | null,
  { ox, oy, grow }: Shadow,
  opacity: number,
  z: number,
) => {
  if (!el) return
  const sx = (STAMP.width + 2 * grow * U) / STAMP.width
  const sy = (STAMP.depth + 2 * grow * U) / STAMP.depth
  const x = SPOT.x - STAMP.width / 2 + ox * U
  const y = SPOT.y - STAMP.depth / 2 + oy * U
  el.style.transform = `translate3d(${x}px, ${y}px, ${z}px) scale(${sx}, ${sy})`
  el.style.opacity = String(Math.max(0, opacity))
}

export function useScene(layout: Layout) {
  const [refs] = useState(createSceneRefs)
  const camera = useMotionValue(0)
  const height = useMotionValue(STAMP.hover)
  const squash = useMotionValue(0)
  const exit = useMotionValue(0)
  const dip = useMotionValue(0)
  const fade = useMotionValue(1)
  const values = useMemo(
    () => ({ camera, height, squash, exit, dip, fade }),
    [camera, height, squash, exit, dip, fade],
  )
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const scheduled = useRef(false)

  const paint = useCallback(() => {
    scheduled.current = false
    const view = refs.view.current
    const cam = refs.camera.current
    if (!view || !cam) return

    const u = camera.get()
    const c = cameraAt(layoutRef.current, u)
    view.style.perspective = `${c.focal}px`
    view.style.perspectiveOrigin = `${c.cx}px ${c.cy}px`
    cam.style.transform = cameraTransform(c)

    const opacity = fade.get()
    const chrome = u <= 1 ? 1 - smoothstep(0, 0.22, u) : 0
    const paper = u <= 1 ? smoothstep(0.02, 0.38, u) : 1
    setOpacity(refs.scene.current, opacity)
    setOpacity(refs.chrome.current, chrome * opacity)
    setOpacity(refs.halo.current, chrome * opacity)
    setOpacity(refs.desk.current, u <= 1 ? smoothstep(0.05, 0.6, u) : 1 - smoothstep(1.15, 1.85, u))
    setOpacity(refs.paper.current, paper)
    setOpacity(refs.glow.current, u <= 1 ? 1 - smoothstep(0, 0.25, u) : 0)

    const h = height.get()
    const s = squash.get()
    const e = exit.get()
    const xy = 1 + 0.045 * s - 0.035 * dip.get()
    const stamp = refs.stamp.current
    if (stamp) {
      stamp.style.transform = `translate3d(${SPOT.x}px, ${SPOT.y - e * 30 * U}px, ${h + e * 14 * U}px) scale3d(${xy}, ${xy}, ${1 - 0.075 * s})`
      stamp.style.visibility = e > 0.98 ? 'hidden' : 'visible'
    }

    const cm = Math.max(0, h / U)
    const shadowFade = paper * (1 - e) * (1 - e)
    const blur = 0.22 + cm * 0.3
    const spread = clamp01((blur - 0.3) / 2.3)
    const penumbra = { ox: cm * 0.04, oy: cm * 0.2, grow: cm * 0.1 }
    const penumbraOpacity = 0.2 / (1 + cm * 0.16)
    const contact = { ox: cm * 0.01, oy: cm * 0.05, grow: -0.12 + cm * 0.05 }
    placeShadow(refs.shadowSoft.current, penumbra, penumbraOpacity * (1 - spread) * shadowFade, 0.3)
    placeShadow(refs.shadowWide.current, penumbra, penumbraOpacity * spread * shadowFade, 0.35)
    placeShadow(refs.shadowContact.current, contact, 0.5 * Math.exp(-cm / 1.6) * shadowFade, 0.4)
  }, [camera, dip, exit, fade, height, refs, squash])

  useEffect(() => {
    const schedule = () => {
      if (scheduled.current) return
      scheduled.current = true
      frame.render(paint)
    }
    const unsubscribe = Object.values(values).map((value) => value.on('change', schedule))
    return () => {
      unsubscribe.forEach((off) => off())
      cancelFrame(paint)
    }
  }, [paint, values])

  useLayoutEffect(() => {
    paint()
  }, [paint, layout])

  const snap = useCallback(
    (u: 0 | 2) => {
      camera.set(u)
      exit.set(u === 2 ? 1 : 0)
      height.set(STAMP.hover)
      squash.set(0)
      dip.set(0)
    },
    [camera, dip, exit, height, squash],
  )

  const revealPrint = useCallback(
    (style: 'instant' | 'thump' | 'fade') => {
      for (const print of [refs.print.current, refs.flatPrint.current]) {
        if (!print) continue
        print.getAnimations().forEach((animation) => animation.cancel())
        print.style.opacity = '1'
        if (style === 'thump') {
          print.animate(
            [
              { opacity: 0, scale: '1.16' },
              { opacity: 1, scale: '1' },
            ],
            {
              duration: 150,
              easing: 'cubic-bezier(0.32, 0, 0.67, 0)',
            },
          )
        } else if (style === 'fade') {
          print.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' })
        }
      }
    },
    [refs],
  )

  const liftPrint = useCallback(() => {
    refs.print.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 180,
      fill: 'forwards',
    })
  }, [refs])

  return useMemo(
    () => ({ refs, values, snap, revealPrint, liftPrint }),
    [liftPrint, refs, revealPrint, snap, values],
  )
}
