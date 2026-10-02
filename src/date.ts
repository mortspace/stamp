export type Ymd = { y: number; m: number; d: number }

export const MONTHS = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
]

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1))

export const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate()

export const toYmd = (date: Date): Ymd => ({
  y: date.getFullYear(),
  m: date.getMonth(),
  d: date.getDate(),
})

export const toDate = ({ y, m, d }: Ymd) => new Date(y, m, d)

export const longDate = (v: Ymd) =>
  `${WEEKDAYS[toDate(v).getDay()]}, ${v.d} ${MONTH_NAMES[v.m]} ${v.y}`

export const shortDate = (v: Ymd) => `${v.d} ${MONTH_NAMES[v.m].slice(0, 3)} ${v.y}`

export const printedDate = (v: Ymd) => `${v.d} ${MONTHS[v.m]} ${v.y}`
