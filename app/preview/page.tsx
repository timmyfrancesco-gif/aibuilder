'use client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import PreviewSandbox from '@/components/PreviewSandbox'

function PreviewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const html = searchParams.get('html') ? decodeURIComponent(searchParams.get('html')!) : ''
  const id = searchParams.get('id') || ''

  return (
    <div className="h-screen flex flex-col bg-neutral-950">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 flex-shrink-0">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Torna al workspace
        </button>
        <span className="text-neutral-500 text-xs font-mono">preview/{id.slice(0, 8)}</span>
      </div>
      <div className="flex-1">
        <PreviewSandbox html={html} projectId={id} />
      </div>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-neutral-950 flex items-center justify-center text-neutral-400">Caricamento preview...</div>}>
      <PreviewContent />
    </Suspense>
  )
}
