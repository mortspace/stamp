import { memo, type CSSProperties, type ReactNode, type Ref } from 'react'
import { STAMP } from './world'

type Segment = { x: number; y: number; length: number; angle: number; light: number }

type Wall = {
  from: number
  to: number
  overlap: number
  shade: (light: number) => [number, number]
}

const LIGHT = { x: -0.34, y: 0.94 }

const ringSegments = (width: number, depth: number, radius: number, perCorner: number) => {
  const points: [number, number][] = []
  const corner = (cx: number, cy: number, from: number, to: number) => {
    for (let i = 0; i <= perCorner; i++) {
      const a = ((from + ((to - from) * i) / perCorner) * Math.PI) / 180
      points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)])
    }
  }
  const hx = width / 2
  const hy = depth / 2
  corner(hx - radius, hy - radius, 90, 0)
  corner(hx - radius, -hy + radius, 0, -90)
  corner(-hx + radius, -hy + radius, -90, -180)
  corner(-hx + radius, hy - radius, 180, 90)

  const segments: Segment[] = []
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length]
    const length = Math.hypot(x2 - x1, y2 - y1)
    if (length < 0.5) return
    const bearing = Math.atan2(y2 - y1, x2 - x1)
    const nx = -Math.sin(bearing)
    const ny = Math.cos(bearing)
    segments.push({
      x: x1,
      y: y1,
      length,
      angle: (bearing * 180) / Math.PI,
      light: nx * LIGHT.x + ny * LIGHT.y,
    })
  })
  return segments
}

const SEGMENTS = ringSegments(STAMP.width, STAMP.depth, STAMP.radius, 6)

const WALLS: Wall[] = [
  { from: 0, to: STAMP.base, overlap: 0, shade: (l) => [24 + 6 * l, 12 + 3 * l] },
  { from: STAMP.base, to: STAMP.height, overlap: 1, shade: (l) => [93 + 4 * l, 80 + 7 * l] },
]

const face = (z: number): CSSProperties => ({
  width: STAMP.width,
  height: STAMP.depth,
  borderRadius: STAMP.radius,
  transform: `translate3d(${-STAMP.width / 2}px, ${-STAMP.depth / 2}px, ${z}px)`,
})

const Walls = memo(function Walls() {
  return WALLS.flatMap(({ from, to, overlap, shade }, w) =>
    SEGMENTS.map((s, i) => {
      const [top, bottom] = shade(s.light)
      return (
        <div
          key={`${w}-${i}`}
          className="stp-f"
          style={{
            width: s.length + 1,
            height: to - from + overlap,
            transform: `translate3d(${s.x}px, ${s.y}px, ${to}px) rotateZ(${s.angle}deg) translateX(-0.5px) rotateX(-90deg)`,
            background: `linear-gradient(180deg, hsl(240 5% ${top}%), hsl(240 5% ${bottom}%))`,
          }}
        />
      )
    }),
  )
})

type StampBlockProps = {
  live: boolean
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  glowRef?: Ref<HTMLDivElement>
}

export function StampBlock({ live, children, ref, glowRef }: StampBlockProps) {
  return (
    <div ref={ref} className="stp-stamp">
      <div ref={glowRef} className="stp-f stp-glow" style={face(STAMP.height - 2)} />
      <Walls />
      <div
        className={live ? 'stp-f stp-top is-live' : 'stp-f stp-top'}
        style={face(STAMP.height)}
        inert={!live}
      >
        {children}
      </div>
    </div>
  )
}
