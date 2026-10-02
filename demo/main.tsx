import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Stamp, type StampMotion } from '../src'
import './demo.css'

type Option<T> = { value: T; label: string }

const CAMERA: Option<StampMotion>[] = [
  { value: 'cinematic', label: 'Every stamp' },
  { value: 'auto', label: 'First stamp' },
  { value: 'quick', label: 'Never' },
]

const SOUND: Option<boolean>[] = [
  { value: true, label: 'Sound' },
  { value: false, label: 'Muted' },
]

type SegmentedProps<T> = {
  label: string
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
}

function Segmented<T>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div className="demo-seg" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Demo() {
  const [motion, setMotion] = useState<StampMotion>('cinematic')
  const [sound, setSound] = useState(true)

  return (
    <main className="demo">
      <header className="demo-head">
        <h1>Stamp</h1>
        <p>
          A date picker shaped like a desk stamp. Roll the date, press, and it prints on the
          invoice.
        </p>
      </header>
      <Stamp key={motion} motion={motion} sound={sound} />
      <div className="demo-options">
        <Segmented
          label="When the camera moves"
          options={CAMERA}
          value={motion}
          onChange={setMotion}
        />
        <Segmented label="Sound" options={SOUND} value={sound} onChange={setSound} />
      </div>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Demo />
  </StrictMode>,
)
