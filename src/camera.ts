import { lerp } from './math'
import { FACE_Z, PAPER, SPOT, STAMP, U } from './world'

export type Camera = {
  focal: number
  distance: number
  pitch: number
  tx: number
  ty: number
  tz: number
  cx: number
  cy: number
}

export type Slot = { cx: number; cy: number; k: number }

export type Layout = {
  kind: 'wide' | 'tall'
  width: number
  height: number
  face: Camera
  desk: Camera
  page: Camera
  set: {
    eyebrow: number
    title: number
    sub: number
    date: number
    controls: number
    button: number
    hint: number
  }
  done: { eyebrow: number; title: number; status: number; actions: number }
  toast: number
}

export const TALL_BELOW = 560

const faceCamera = ({ cx, cy, k }: Slot): Camera => ({
  focal: 8933,
  distance: 8933 / (k * U),
  pitch: 0,
  tx: SPOT.x,
  ty: SPOT.y,
  tz: FACE_Z,
  cx,
  cy,
})

const pageCamera = ({ cx, cy, k }: Slot): Camera => ({
  focal: 2967,
  distance: 2967 / (k * U),
  pitch: 0,
  tx: 0,
  ty: 0,
  tz: 0,
  cx,
  cy,
})

export const WIDE: Layout = {
  kind: 'wide',
  width: 960,
  height: 720,
  face: faceCamera({ cx: 480, cy: 329, k: 1 }),
  desk: { focal: 1067, distance: 48, pitch: 40, tx: 1.6 * U, ty: 3 * U, tz: 0, cx: 480, cy: 405 },
  page: pageCamera({ cx: 480, cy: 382, k: 0.348 }),
  set: { eyebrow: 83, title: 110, sub: 141, date: 497, controls: 546, button: 606, hint: 646 },
  done: { eyebrow: 44, title: 71, status: 101, actions: 670 },
  toast: 662,
}

export const tallLayout = (width: number, height: number, face: Slot, page: Slot): Layout => {
  const k = Math.min((width / PAPER.width) * 0.824, (height / 712) * 0.34)
  return {
    kind: 'tall',
    width,
    height,
    face: faceCamera(face),
    desk: {
      focal: k * 44 * U,
      distance: 44,
      pitch: 30,
      tx: 1.1 * U,
      ty: 0,
      tz: 0,
      cx: width / 2,
      cy: height * 0.45,
    },
    page: pageCamera(page),
    set: WIDE.set,
    done: WIDE.done,
    toast: height - 56,
  }
}

export const firstTallLayout = (width: number) =>
  tallLayout(
    width,
    720,
    { cx: width / 2, cy: 300, k: Math.min(355, width - 32) / STAMP.width },
    { cx: width / 2, cy: 380, k: Math.min(340, width - 56) / PAPER.width },
  )

const mix = (a: Camera, b: Camera, t: number): Camera => ({
  focal: lerp(a.focal, b.focal, t),
  distance: lerp(a.distance, b.distance, t),
  pitch: lerp(a.pitch, b.pitch, t),
  tx: lerp(a.tx, b.tx, t),
  ty: lerp(a.ty, b.ty, t),
  tz: lerp(a.tz, b.tz, t),
  cx: lerp(a.cx, b.cx, t),
  cy: lerp(a.cy, b.cy, t),
})

export const cameraAt = (layout: Layout, u: number) =>
  u <= 1 ? mix(layout.face, layout.desk, u) : mix(layout.desk, layout.page, Math.min(1, u - 1))

export const zoomOf = (camera: Camera) => camera.focal / (camera.distance * U)

export const cameraTransform = (c: Camera) =>
  `translate3d(${c.cx}px, ${c.cy}px, ${c.focal - c.distance * U}px) rotateX(${c.pitch}deg) translate3d(${-c.tx}px, ${-c.ty}px, ${-c.tz}px)`
