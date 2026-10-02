import type { StampTiming } from './types'

type Bezier = [number, number, number, number]

export const STAMP_TIMING: StampTiming = {
  tilt: 0.8,
  press: 0.15,
  bounce: 0.3,
  liftAway: 0.42,
  rise: 0.7,
}

export const WIND_UP = 1.33
export const LIFT_AWAY_AFTER_MS = 300
export const TOAST_AT_LIFT_AWAY = 0.62

export const SINE: Bezier = [0.37, 0, 0.63, 1]
export const OUT_SINE: Bezier = [0.61, 1, 0.88, 1]
export const IN_CUBIC: Bezier = [0.32, 0, 0.67, 0]
export const OUT: Bezier = [0.23, 1, 0.32, 1]

export const LABEL_SPRING = { stiffness: 260, damping: 28 }
