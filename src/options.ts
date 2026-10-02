import type { StampInk, StampStatus } from './types'

type StatusCopy = {
  label: string
  word: string
  button: string
  toast: string
  done: string
  prompt: string
}

export const STATUSES: StampStatus[] = ['paid', 'received', 'approved', 'due']

export const STATUS_COPY: Record<StampStatus | 'void', StatusCopy> = {
  paid: {
    label: 'Paid',
    word: 'PAID',
    button: 'Mark as paid',
    toast: 'Marked as paid',
    done: 'Marked as paid on',
    prompt: 'Choose the payment date.',
  },
  received: {
    label: 'Received',
    word: 'RECEIVED',
    button: 'Mark as received',
    toast: 'Marked as received',
    done: 'Marked as received on',
    prompt: 'Choose the date it arrived.',
  },
  approved: {
    label: 'Approved',
    word: 'APPROVED',
    button: 'Approve',
    toast: 'Approved',
    done: 'Approved on',
    prompt: 'Choose the approval date.',
  },
  due: {
    label: 'Due',
    word: 'DUE',
    button: 'Set due date',
    toast: 'Due date set',
    done: 'Due on',
    prompt: 'Choose the date it falls due.',
  },
  void: {
    label: 'Void',
    word: 'VOID',
    button: 'Void',
    toast: 'Voided',
    done: 'Voided on',
    prompt: '',
  },
}

export const INKS: Record<StampInk, { name: string; color: string }> = {
  red: { name: 'Red ink', color: '#d8342b' },
  blue: { name: 'Blue ink', color: '#2463d6' },
  green: { name: 'Green ink', color: '#1f8a4c' },
  violet: { name: 'Violet ink', color: '#7650dc' },
  graphite: { name: 'Graphite ink', color: '#3a3a3c' },
}

export const INK_KEYS = Object.keys(INKS) as StampInk[]
