import type { Metadata } from 'next'
import { Inter, Noto_Serif_JP, Shippori_Mincho, Yuji_Mai } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const notoSerifJP = Noto_Serif_JP({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-noto-serif'
})
const shipporiMincho = Shippori_Mincho({ 
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-shippori'
})
const yujiMai = Yuji_Mai({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-yuji-mai'
})

export const metadata: Metadata = {
  title: '位置情報連動型・架空学校生成サイト',
  description: 'Google Maps上で指定した場所の特性を反映した、架空の学校ウェブサイトを自動生成します',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <body className={`${inter.className} ${notoSerifJP.variable} ${shipporiMincho.variable} ${yujiMai.variable}`}>{children}</body>
    </html>
  )
}
