import { clamp01 } from './math'

type Sample = { buffer: AudioBuffer; peak: number }
type Filter = [BiquadFilterType, number]
type Graph = { ctx: AudioContext; master: GainNode; bus: GainNode }
type Wave = (t: number) => number

const TAU = 2 * Math.PI
const noise = () => Math.random() * 2 - 1
const fromDb = (db: number) => 10 ** (db / 20)

const pinkSwell = (length: number, fadeIn: number, fadeOut: number): Wave => {
  let b0 = 0
  let b1 = 0
  let b2 = 0
  return (t) => {
    const white = noise()
    b0 = 0.99765 * b0 + white * 0.099046
    b1 = 0.963 * b1 + white * 0.2965164
    b2 = 0.57 * b2 + white * 1.0526913
    const pink = b0 + b1 + b2 + white * 0.1848
    const envelope =
      t < fadeIn
        ? Math.sin((Math.PI / 2) * (t / fadeIn))
        : t > length - fadeOut
          ? Math.sin((Math.PI / 2) * clamp01((length - t) / fadeOut))
          : 1
    return pink * envelope
  }
}

const AIR: Record<
  'fall' | 'rise',
  { name: string; fadeIn: number; fadeOut: number; db: number; filters: Filter[] }
> = {
  fall: {
    name: 'air',
    fadeIn: 0.4,
    fadeOut: 0.4,
    db: -43,
    filters: [
      ['highpass', 500],
      ['lowpass', 3200],
    ],
  },
  rise: {
    name: 'air-rise',
    fadeIn: 0.35,
    fadeOut: 0.45,
    db: -47,
    filters: [
      ['highpass', 700],
      ['lowpass', 4000],
    ],
  },
}

class StampSound {
  private graph: Graph | null = null
  private samples = new Map<string, Sample>()
  private lastTick = 0

  private wake() {
    if (typeof window === 'undefined') return null
    if (!this.graph) {
      const Context =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Context) return null
      const ctx = new Context()
      const master = ctx.createGain()
      master.connect(ctx.destination)
      const bus = ctx.createGain()
      bus.connect(master)
      this.graph = { ctx, master, bus }
    }
    if (this.graph.ctx.state === 'suspended') void this.graph.ctx.resume()
    return this.graph
  }

  cancel() {
    if (!this.graph) return
    const { ctx, master, bus } = this.graph
    bus.disconnect()
    this.graph.bus = ctx.createGain()
    this.graph.bus.connect(master)
  }

  private sample(ctx: AudioContext, name: string, seconds: number, wave: Wave) {
    const cached = this.samples.get(name)
    if (cached) return cached
    const length = Math.ceil(seconds * ctx.sampleRate)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let peak = 0
    for (let i = 0; i < length; i++) {
      data[i] = wave(i / ctx.sampleRate)
      peak = Math.max(peak, Math.abs(data[i]))
    }
    const sample = { buffer, peak: peak || 1 }
    this.samples.set(name, sample)
    return sample
  }

  private route(
    { ctx }: Graph,
    sample: Sample,
    at: number,
    gain: number,
    filters: Filter[],
    out: AudioNode,
  ) {
    const source = ctx.createBufferSource()
    source.buffer = sample.buffer
    let node: AudioNode = source
    for (const [type, frequency] of filters) {
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.value = frequency
      node.connect(filter)
      node = filter
    }
    const level = ctx.createGain()
    level.gain.value = gain
    node.connect(level)
    level.connect(out)
    source.start(ctx.currentTime + Math.max(0, at))
  }

  private play(graph: Graph, sample: Sample, at: number, db: number, filters: Filter[]) {
    this.route(graph, sample, at, fromDb(db) / sample.peak, filters, graph.bus)
  }

  tick() {
    const graph = this.wake()
    if (!graph) return
    const now = performance.now()
    if (now - this.lastTick < 45) return
    this.lastTick = now
    const tick = this.sample(
      graph.ctx,
      'tick',
      0.035,
      (t) =>
        0.55 * Math.exp(-t * 1100) * noise() + 0.3 * Math.sin(TAU * 3900 * t) * Math.exp(-t * 320),
    )
    this.play(graph, tick, 0, -27, [
      ['highpass', 1400],
      ['lowpass', 11000],
    ])
  }

  tap(at = 0, db = -23) {
    const graph = this.wake()
    if (!graph) return
    const tap = this.sample(
      graph.ctx,
      'tap',
      0.07,
      (t) =>
        0.4 * Math.sin(TAU * 620 * t) * Math.exp(-t * 70) +
        0.18 * Math.sin(TAU * 1240 * t) * Math.exp(-t * 110) +
        0.25 * Math.exp(-t * 1500) * noise(),
    )
    this.play(graph, tap, at, db, [
      ['lowpass', 6000],
      ['highpass', 180],
    ])
  }

  air(at = 0, rising = false) {
    const graph = this.wake()
    if (!graph) return
    const { name, fadeIn, fadeOut, db, filters } = rising ? AIR.rise : AIR.fall
    const air = this.sample(graph.ctx, name, 0.8, pinkSwell(0.8, fadeIn, fadeOut))
    this.play(graph, air, at, db, filters)
  }

  impact(at = 0, db = -5) {
    const graph = this.wake()
    if (!graph) return
    const { ctx, bus } = graph
    const compressor = ctx.createDynamicsCompressor()
    compressor.threshold.value = -8
    compressor.knee.value = 0
    compressor.ratio.value = 2.5
    compressor.attack.value = 0.001
    compressor.release.value = 0.06
    const out = ctx.createGain()
    out.gain.value = fromDb(db) / 0.9
    compressor.connect(out)
    out.connect(bus)
    const thud = this.sample(
      ctx,
      'thud',
      0.22,
      (t) =>
        0.9 * Math.sin(TAU * (55 * t + (65 / 30) * (1 - Math.exp(-30 * t)))) * Math.exp(-t * 22),
    )
    const body = this.sample(
      ctx,
      'body',
      0.12,
      (t) => 0.45 * Math.sin(TAU * 260 * t) * Math.exp(-t * 45),
    )
    const paper = this.sample(
      ctx,
      'paper',
      0.06,
      (t) => noise() * Math.pow(clamp01(1 - t / 0.055), 3),
    )
    const click = this.sample(ctx, 'click', 0.012, (t) => 0.6 * Math.exp(-t * 2400) * noise())
    this.route(graph, thud, at, 1, [['lowpass', 220]], compressor)
    this.route(graph, body, at, 1, [], compressor)
    this.route(
      graph,
      paper,
      at,
      0.28,
      [
        ['highpass', 1600],
        ['lowpass', 7000],
      ],
      compressor,
    )
    this.route(graph, click, at, 1, [['highpass', 2500]], compressor)
  }

  peel(at = 0) {
    const graph = this.wake()
    if (!graph) return
    const peel = this.sample(
      graph.ctx,
      'peel',
      0.16,
      (t) =>
        noise() * Math.min(1, t / 0.008) * Math.exp(-t * 28) +
        0.35 * Math.sin(TAU * 150 * t) * Math.exp(-t * 40),
    )
    this.play(graph, peel, at, -31, [
      ['highpass', 300],
      ['lowpass', 2400],
    ])
  }

  chime(at = 0) {
    const graph = this.wake()
    if (!graph) return
    const low = this.sample(
      graph.ctx,
      'chime-low',
      0.45,
      (t) =>
        (Math.sin(TAU * 1318.5 * t) + 0.25 * Math.sin(TAU * 2637 * t)) *
        Math.exp(-t * 10) *
        Math.min(1, t * 300),
    )
    const high = this.sample(
      graph.ctx,
      'chime-high',
      0.55,
      (t) =>
        (Math.sin(TAU * 1975.5 * t) + 0.25 * Math.sin(TAU * 3951 * t)) *
        Math.exp(-t * 8) *
        Math.min(1, t * 300),
    )
    this.play(graph, low, at, -19, [['lowpass', 9000]])
    this.play(graph, high, at + 0.085, -19, [['lowpass', 9000]])
  }
}

let shared: StampSound | null = null

export const stampSound = () => (shared ??= new StampSound())

export const silenceStampSound = () => shared?.cancel()
