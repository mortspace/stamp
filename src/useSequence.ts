import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  animate,
  type AnimationPlaybackControls,
  type MotionValue,
  type ValueAnimationTransition,
} from 'motion/react'
import { silenceStampSound } from './sound'

type Options = ValueAnimationTransition<number>

class Cancelled extends Error {}

export const isCancelled = (error: unknown) => error instanceof Cancelled

export type Run = {
  play: (value: MotionValue<number>, to: number, options: Options) => AnimationPlaybackControls
  tween: (value: MotionValue<number>, to: number, options: Options) => Promise<void>
  wait: (ms: number) => Promise<void>
}

export function useSequence() {
  const token = useRef(0)
  const active = useRef<AnimationPlaybackControls[]>([])
  const timers = useRef<number[]>([])

  const stop = useCallback(() => {
    token.current += 1
    active.current.forEach((controls) => controls.stop())
    active.current = []
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = []
    silenceStampSound()
  }, [])

  const runFor = useCallback((id: number): Run => {
    const play: Run['play'] = (value, to, options) => {
      const controls = animate(value, to, options)
      active.current.push(controls)
      return controls
    }
    return {
      play,
      tween: async (value, to, options) => {
        await play(value, to, options)
        if (id !== token.current) throw new Cancelled()
      },
      wait: (ms) =>
        new Promise((resolve, reject) => {
          const timer = window.setTimeout(
            () => (id === token.current ? resolve() : reject(new Cancelled())),
            ms,
          )
          timers.current.push(timer)
        }),
    }
  }, [])

  const start = useCallback(() => {
    stop()
    return runFor(token.current)
  }, [runFor, stop])

  const takeOver = useCallback(() => runFor(++token.current), [runFor])

  useEffect(() => stop, [stop])

  return useMemo(() => ({ start, takeOver, stop }), [start, stop, takeOver])
}
