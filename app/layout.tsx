import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Web Studio',
  description: 'AI-powered app builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={`${inter.className} bg-neutral-950 text-white min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
