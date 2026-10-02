import type { ReactNode } from 'react'

export type StampStatus = 'paid' | 'received' | 'approved' | 'due'

export type StampInk = 'red' | 'blue' | 'green' | 'violet' | 'graphite'

export type StampMotion = 'auto' | 'cinematic' | 'quick'

export type StampField = {
  label: string
  value: string
}

export type StampIssuer = {
  name: string
  logo?: ReactNode
  details: StampField[]
  payment: StampField[]
  website?: string
}

export type StampInvoiceLine = {
  description: string
  quantity: string
  unitPrice: string
  total: string
}

export type StampInvoice = {
  id: string
  client: string
  total: string
  issued: string
  due: string
  lines: StampInvoiceLine[]
}

export type StampResult = {
  invoiceId: string
  status: StampStatus | 'void'
  date: Date
  ink: StampInk
}

export type StampTiming = {
  tilt: number
  press: number
  bounce: number
  liftAway: number
  rise: number
}

export type StampProps = {
  invoices?: StampInvoice[]
  issuer?: StampIssuer
  motion?: StampMotion
  sound?: boolean
  timing?: Partial<StampTiming>
  defaultDate?: Date
  defaultStatus?: StampStatus
  defaultInk?: StampInk
  onStamp?: (result: StampResult) => void
  onUndo?: (result: StampResult) => void
  className?: string
}
