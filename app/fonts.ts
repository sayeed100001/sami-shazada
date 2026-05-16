import localFont from 'next/font/local'

// Helvetica for Persian/Dari
export const helvetica = localFont({
  src: [
    {
      path: '../public/fonts/Helvetica.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Helvetica-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-helvetica',
  display: 'swap',
})

// Vazirmatn as alternative
export const vazirmatn = localFont({
  src: [
    {
      path: '../public/fonts/Vazirmatn-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Vazirmatn-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-vazirmatn',
  display: 'swap',
})

// Estedad for headings
export const estedad = localFont({
  src: [
    {
      path: '../public/fonts/Estedad-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../public/fonts/Estedad-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  variable: '--font-estedad',
  display: 'swap',
})
