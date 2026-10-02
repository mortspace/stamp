import { createRef, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  firstTallLayout,
  tallLayout,
  TALL_BELOW,
  WIDE,
  zoomOf,
  type Layout,
  type Slot,
} from './camera'
import { PAPER, STAMP } from './world'

const createFrameRefs = () => ({
  root: createRef<HTMLDivElement>(),
  stage: createRef<HTMLDivElement>(),
  faceSlot: createRef<HTMLDivElement>(),
  paperSlot: createRef<HTMLDivElement>(),
  setColumn: createRef<HTMLDivElement>(),
  doneColumn: createRef<HTMLDivElement>(),
})

const near = (a: number, b: number) => Math.abs(a - b) < 0.5

export function useStageLayout() {
  const [refs] = useState(createFrameRefs)
  const [layout, setLayout] = useState<Layout>(WIDE)
  const [scale, setScale] = useState(1)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useLayoutEffect(() => {
    const root = refs.root.current
    if (!root) return
    const fit = () => {
      const width = Math.floor(root.clientWidth)
      if (!width) return
      if (width >= TALL_BELOW) {
        setLayout(WIDE)
        setScale(Math.min(1, width / WIDE.width))
        return
      }
      setScale(1)
      setLayout((prev) =>
        prev.kind === 'tall' && prev.width === width ? prev : firstTallLayout(width),
      )
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(root)
    return () => observer.disconnect()
  }, [refs])

  const measure = useCallback(() => {
    const current = layoutRef.current
    const stage = refs.stage.current
    const faceSlot = refs.faceSlot.current
    const paperSlot = refs.paperSlot.current
    const setColumn = refs.setColumn.current
    const doneColumn = refs.doneColumn.current
    if (current.kind !== 'tall' || !stage || !faceSlot || !paperSlot || !setColumn || !doneColumn) {
      return
    }
    const box = stage.getBoundingClientRect()
    const slotOf = (el: HTMLElement, worldWidth: number): Slot => {
      const r = el.getBoundingClientRect()
      return {
        cx: r.left - box.left + r.width / 2,
        cy: r.top - box.top + r.height / 2,
        k: r.width / worldWidth,
      }
    }
    const height = Math.ceil(Math.max(setColumn.offsetHeight, doneColumn.offsetHeight))
    const face = slotOf(faceSlot, STAMP.width)
    const page = slotOf(paperSlot, PAPER.width)
    const unchanged =
      near(current.height, height) &&
      near(current.face.cx, face.cx) &&
      near(current.face.cy, face.cy) &&
      near(current.page.cx, page.cx) &&
      near(current.page.cy, page.cy) &&
      Math.abs(zoomOf(current.face) - face.k) < 0.002 &&
      Math.abs(zoomOf(current.page) - page.k) < 0.002
    if (!unchanged) setLayout(tallLayout(current.width, height, face, page))
  }, [refs])

  useLayoutEffect(() => {
    measure()
  }, [layout, measure])

  useEffect(() => {
    const observer = new ResizeObserver(measure)
    for (const column of [refs.setColumn.current, refs.doneColumn.current]) {
      if (column) observer.observe(column)
    }
    return () => observer.disconnect()
  }, [measure, refs])

  return { layout, scale, refs }
}
