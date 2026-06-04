'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function SiteContent() {
  const searchParams = useSearchParams()
  const slug = searchParams.get('slug') || ''
  const html = searchParams.get('html') ? decodeURIComponent(searchParams.get('html')!) : ''

  if (!html) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center text-neutral-500">
          <p className="text-lg font-medium text-neutral-300 mb-1">Sito non trovato</p>
          <p className="text-sm">/{slug}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen">
      <iframe srcDoc={html} sandbox="allow-scripts allow-same-origin allow-forms" className="w-full h-full border-0" title={slug} />
    </div>
  )
}

export default function SitePage() {
  return (
    <Suspense fallback={<div className="h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Caricamento...</div>}>
      <SiteContent />
    </Suspense>
  )
}
