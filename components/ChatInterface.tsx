'use client'
import { useState, useRef, useEffect } from 'react'
import PreviewSandbox from './PreviewSandbox'
import AdvancedSettingsModal from './AdvancedSettingsModal'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  fileChanges?: { path: string; action: 'created' | 'edited' }[]
}

interface Props {
  projectId: string
  initialHtml?: string
  projectName?: string
  credits: number
  onSpendCredit: () => boolean
}

export default function ChatInterface({
  projectId,
  initialHtml = '',
  projectName = 'Nuovo Progetto',
  credits,
  onSpendCredit,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [html, setHtml] = useState(initialHtml)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [isPublished, setIsPublished] = useState(false)
  const [showBanner, setShowBanner] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [view, setView] = useState<'chat' | 'preview'>('chat')
  const [budget, setBudget] = useState(25)
  const [model, setModel] = useState('gemini-2.5-flash')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading) return
    if (credits <= 0) {
      alert('Crediti esauriti! Acquista altri crediti per continuare.')
      return
    }
    if (!onSpendCredit()) return

    const userMsg: Message = {
      id: Math.random().toString(36).slice(2),
      role: 'user',
      content: input,
    }
    setMessages((p) => [...p, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: input, history }),
      })
      const data = await res.json()

      if (data.html) {
        setHtml(data.html)
        const fileChanges =
          data.files?.map((f: { path: string }) => ({
            path: f.path,
            action: 'edited' as const,
          })) || [{ path: '/index.html', action: 'edited' as const }]
        const aiMsg: Message = {
          id: Math.random().toString(36).slice(2),
          role: 'assistant',
          content: data.description || 'Sito aggiornato con successo!',
          fileChanges,
        }
        setMessages((p) => [...p, aiMsg])
      } else {
        setMessages((p) => [
          ...p,
          {
            id: Math.random().toString(36).slice(2),
            role: 'assistant',
            content: data.error || 'Errore nella generazione.',
          },
        ])
      }
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: Math.random().toString(36).slice(2),
          role: 'assistant',
          content: 'Errore di connessione. Riprova.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {/* Chat panel */}
      <div
        className={`flex flex-col ${
          view === 'chat' ? 'flex' : 'hidden'
        } w-full md:flex md:w-[42%] md:border-r md:border-neutral-800`}
      >
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800 bg-neutral-900 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{projectName}</p>
            <p className="text-neutral-500 text-xs">ID: {projectId.slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setView(view === 'chat' ? 'preview' : 'chat')}
              className="text-xs bg-neutral-800 px-3 py-1.5 rounded-lg text-neutral-300"
            >
              {view === 'chat' ? '👁️ Preview' : '💬 Chat'}
            </button>
          </div>
          <span className="text-xs text-amber-400 font-medium hidden md:block">
            🪙 {credits.toFixed(2)}
          </span>
        </div>

        {/* Upgrade banner */}
        {showBanner && (
          <div className="flex items-center gap-2 mx-3 mt-2 px-3 py-2 bg-amber-50 rounded-xl text-amber-800 text-xs flex-shrink-0">
            <span>⚡ Il tuo upgrade gratuito è pronto.</span>
            <button className="text-amber-600 underline font-medium">Richiedilo →</button>
            <button
              onClick={() => setShowBanner(false)}
              className="ml-auto text-amber-500 hover:text-amber-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-neutral-600 text-sm gap-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-500/20 border border-violet-500/20 flex items-center justify-center text-2xl">
                ⚡
              </div>
              <p className="font-medium text-neutral-400">Pronto a costruire</p>
              <p className="text-center max-w-xs">
                Descrivi cosa vuoi creare e l&apos;AI genererà il tuo sito in tempo reale.
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  AI
                </div>
              )}
              <div className="max-w-[85%] space-y-2">
                <div
                  className={`rounded-2xl px-3 py-2.5 text-sm ${
                    m.role === 'user'
                      ? 'bg-neutral-700 text-white rounded-tr-sm'
                      : 'text-neutral-200'
                  }`}
                >
                  {m.content}
                </div>
                {m.fileChanges &&
                  m.fileChanges.map((f, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-2 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-xs font-mono text-neutral-300 w-full text-left hover:bg-neutral-700 hover:border-neutral-600 transition-colors"
                    >
                      <span>✏️</span>
                      <span className="truncate">Edited {f.path}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                AI
              </div>
              <div className="bg-neutral-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Floating preview badge */}
        {html && (
          <div className="absolute bottom-20 left-1/4 -translate-x-1/2 z-10 pointer-events-none md:pointer-events-auto">
            <button
              onClick={() => setShowPreview(true)}
              className="pointer-events-auto bg-white text-black text-sm font-medium rounded-full px-4 py-2 shadow-xl flex items-center gap-2 hover:bg-neutral-100 transition-colors whitespace-nowrap"
            >
              👁️ Your Preview is ready
            </button>
          </div>
        )}

        {/* Input */}
        <div className="p-3 border-t border-neutral-800 flex-shrink-0">
          {credits <= 0 && (
            <div className="mb-2 bg-red-900/40 border border-red-800 rounded-xl p-3 text-sm text-red-300 text-center">
              ⚠️ Crediti esauriti.{' '}
              <button className="underline font-medium">Acquista crediti →</button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-neutral-800 border border-neutral-700 rounded-2xl px-3 py-2.5 focus-within:border-violet-500 transition-colors">
            <button className="text-neutral-500 hover:text-neutral-300 p-1 flex-shrink-0">
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              disabled={loading || credits <= 0}
              placeholder="Message Agent..."
              rows={1}
              className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-neutral-500 max-h-32"
              style={{ minHeight: '20px' }}
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setShowAdvanced(true)}
                className="text-neutral-500 hover:text-neutral-300 p-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </button>
              <button className="text-neutral-500 hover:text-neutral-300 p-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </button>
              <button
                onClick={send}
                disabled={!input.trim() || loading || credits <= 0}
                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-neutral-200 transition-colors flex-shrink-0"
              >
                <svg
                  className="w-3.5 h-3.5 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 10l7-7m0 0l7 7m-7-7v18"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Preview panel (desktop always visible, mobile toggleable) */}
      <div
        className={`flex-1 ${
          view === 'preview' ? 'flex' : 'hidden'
        } md:flex flex-col`}
      >
        <PreviewSandbox
          html={html}
          projectId={projectId}
          onPublish={() => setIsPublished(true)}
          isPublished={isPublished}
        />
      </div>

      {/* Fullscreen preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <span className="text-white font-medium text-sm">Preview</span>
            <button
              onClick={() => setShowPreview(false)}
              className="text-neutral-400 hover:text-white"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="flex-1">
            <iframe
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="w-full h-full border-0"
              title="Full Preview"
            />
          </div>
        </div>
      )}

      {/* Advanced settings modal */}
      <AdvancedSettingsModal
        isOpen={showAdvanced}
        onClose={() => setShowAdvanced(false)}
        budget={budget}
        onBudgetChange={setBudget}
        selectedModel={model}
        onModelChange={setModel}
      />
    </div>
  )
}
