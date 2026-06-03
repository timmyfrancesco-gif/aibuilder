'use client'
import { useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import ChatInterface from '@/components/ChatInterface'

function WorkspaceContent({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams()
  const [credits, setCredits] = useState(10)
  const initialPrompt = searchParams.get('prompt') || ''

  const spend = () => {
    if (credits <= 0) return false
    setCredits((c) => Math.max(0, parseFloat((c - 0.5).toFixed(2))))
    return true
  }

  return (
    <ChatInterface
      projectId={params.id}
      projectName={initialPrompt ? initialPrompt.slice(0, 40) : 'Nuovo Progetto'}
      credits={credits}
      onSpendCredit={spend}
    />
  )
}

export default function WorkspacePage({ params }: { params: { id: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-neutral-950 text-neutral-400">
          Caricamento...
        </div>
      }
    >
      <WorkspaceContent params={params} />
    </Suspense>
  )
}
