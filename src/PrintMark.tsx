import type { Ref } from 'react'
import { printedDate, type Ymd } from './date'
import { INKS, STATUS_COPY } from './options'
import type { StampInk, StampStatus } from './types'
import { PRINT_AT } from './world'

export type PrintData = {
  status: StampStatus | 'void'
  date: Ymd
  ink: StampInk
  seed: number
  rotate: number
  dx: number
  dy: number
}

type PrintMarkProps = {
  print: PrintData
  variant: string
  ref?: Ref<SVGSVGElement>
}

export function PrintMark({ print, variant, ref }: PrintMarkProps) {
  const filter = `stp-ink-${print.seed}-${variant}`
  const isVoid = print.status === 'void'
  const caption = isVoid ? printedDate(print.date) : STATUS_COPY[print.status].word
  const headline = isVoid ? 'VOID' : printedDate(print.date)

  return (
    <svg
      ref={ref}
      className="stp-print"
      width="172"
      height="82"
      viewBox="0 0 172 82"
      aria-hidden="true"
      style={{
        left: PRINT_AT.x + print.dx,
        top: PRINT_AT.y + print.dy,
        rotate: `${print.rotate}deg`,
        color: INKS[print.ink].color,
        opacity: 0,
      }}
    >
      <defs>
        <filter id={filter} x="-4%" y="-8%" width="108%" height="116%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves="2"
            seed={print.seed}
            result="grain"
          />
          <feColorMatrix
            in="grain"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -7 0 0 0 5.15"
            result="speck"
          />
          <feComposite in="SourceGraphic" in2="speck" operator="in" result="inked" />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.045"
            numOctaves="2"
            seed={print.seed + 11}
            result="wander"
          />
          <feDisplacementMap
            in="inked"
            in2="wander"
            scale="2.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <g filter={`url(#${filter})`} opacity="0.9">
        <rect
          x="3"
          y="3"
          width="166"
          height="76"
          rx="9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
        />
        <rect
          x="8.5"
          y="8.5"
          width="155"
          height="65"
          rx="5.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.1"
        />
        <text
          x="86"
          y="24.5"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="'Barlow Condensed', Inter, sans-serif"
          fontWeight="600"
          fontSize="8.5"
          letterSpacing="3.2"
        >
          {caption}
        </text>
        <text
          x="86"
          y="60.5"
          textAnchor="middle"
          fill="currentColor"
          fontFamily="'Barlow Condensed', Inter, sans-serif"
          fontWeight="700"
          fontSize={isVoid ? 36 : 31}
          letterSpacing={isVoid ? 4 : 0.6}
        >
          {headline}
        </text>
      </g>
    </svg>
  )
}
