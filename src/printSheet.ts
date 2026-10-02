import { SHEET } from './world'

const A4_WIDTH = 793.7

export async function printSheet(sheet: HTMLElement, title: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentDocument
  const win = frame.contentWindow
  if (!doc || !win) return frame.remove()

  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('')
  const clone = sheet.cloneNode(true) as HTMLElement
  clone.style.zoom = String(A4_WIDTH / SHEET.width)
  clone.querySelectorAll<SVGElement>('.stp-print').forEach((print) => (print.style.opacity = '1'))

  doc.open()
  doc.write(
    `<!doctype html><html><head>${styles}<style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}</style></head><body>${clone.outerHTML}</body></html>`,
  )
  doc.close()
  doc.title = title

  await Promise.race([doc.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1200))]).catch(
    () => {},
  )
  win.focus()
  win.print()
  window.setTimeout(() => frame.remove(), 60_000)
}
