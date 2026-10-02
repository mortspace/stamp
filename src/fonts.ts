import { useEffect } from 'react'

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Poppins:wght@400;500;600&display=swap'

const FACES = [
  '700 31px "Barlow Condensed"',
  '600 9px "Barlow Condensed"',
  '400 7px Poppins',
  '500 20px Poppins',
  '600 6px Poppins',
]

const warm = () => {
  if (!document.fonts?.load) return
  FACES.forEach((face) => void document.fonts.load(face).catch(() => {}))
}

export function useStampFonts() {
  useEffect(() => {
    if (document.querySelector('link[data-stamp-fonts]')) {
      warm()
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    link.dataset.stampFonts = ''
    link.addEventListener('load', warm, { once: true })
    document.head.appendChild(link)
  }, [])
}
