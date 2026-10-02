export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))

export const smoothstep = (from: number, to: number, x: number) => {
  const t = clamp01((x - from) / (to - from))
  return t * t * (3 - 2 * t)
}
