'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import ChatInterface from '@/components/ChatInterface'

function WorkspaceContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') || Math.random().toString(36).slice(2, 9)
  const prompt = searchParams.get('prompt') || ''
  const [credits, setCredits] = useState(10)

  const spend = () => {
    if (credits <= 0) return false
    setCredits(c => Math.max(0, parseFloat((c - 0.5).toFixed(2))))
    return true
  }

  return (
    <ChatInterface
      projectId={id}
      projectName={prompt ? prompt.slice(0, 40) : 'Nuovo Progetto'}
      credits={credits}
      onSpendCredit={spend}
    />
  )
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-neutral-950 text-neutral-400">
        Caricamento...
      </div>
    }>
      <WorkspaceContent />
    </Suspense>
  )
}
