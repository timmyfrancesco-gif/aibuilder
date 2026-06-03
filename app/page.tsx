'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AccountSettings from '@/components/AccountSettings'
import AdvancedSettingsModal from '@/components/AdvancedSettingsModal'

const TAGS = ['App Full Stack', 'App Mobile', 'Landing Page'] as const
type Tag = (typeof TAGS)[number]

export default function HomePage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [input, setInput] = useState('')
  const [showBanner, setShowBanner] = useState(true)
  const [credits] = useState(10)
  const [budget, setBudget] = useState(25)
  const [model, setModel] = useState('gemini-2.5-flash')

  const handleSend = () => {
    if (!input.trim()) return
    const id = Math.random().toString(36).slice(2, 9)
    router.push(`/workspace/${id}?prompt=${encodeURIComponent(input)}&model=${model}`)
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* TopBar */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-xl hover:bg-neutral-800 transition-colors text-neutral-400 hover:text-white">
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
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </button>
          <button className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-sm font-bold px-4 py-2 rounded-full hover:opacity-90 transition-opacity">
            Acquista Crediti
          </button>
        </div>
      </div>

      {/* Promo banner */}
      {showBanner && (
        <div className="mx-4 mb-3 bg-amber-50 rounded-2xl px-4 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-amber-900 text-sm font-medium">
            🎁 Here&apos;s 50 bonus credits on us
          </span>
          <div className="flex items-center gap-2">
            <button className="bg-neutral-900 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              Claim
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-amber-700 text-xs border border-amber-300 px-3 py-1.5 rounded-full hover:bg-amber-100"
            >
              No
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center pb-40">
        <p className="text-green-400 font-mono text-xs tracking-[0.3em] uppercase mb-3">
          BENVENUTO, TIMMY
        </p>
        <h1 className="text-4xl md:text-5xl font-bold text-cyan-300 leading-tight mb-3 max-w-2xl">
          Dove le idee diventano realtà
        </h1>
        <p className="text-neutral-400 text-base max-w-md mb-8">
          Crea app e siti web completamente funzionali attraverso semplici conversazioni
        </p>

        {/* Tags */}
        <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                selectedTag === tag
                  ? 'bg-neutral-700 border-neutral-500 text-white'
                  : 'border-neutral-700 text-neutral-400 hover:border-neutral-500 hover:text-neutral-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Input bar — fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-transparent">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-end gap-2 bg-neutral-800 border border-neutral-700 rounded-2xl px-4 py-3 focus-within:border-violet-500/60 transition-colors shadow-2xl">
            <button className="text-neutral-500 hover:text-neutral-300 p-1 flex-shrink-0 pb-0.5">
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
                  handleSend()
                }
              }}
              placeholder={`Costruiscimi un clone di Netflix${selectedTag ? ` (${selectedTag})` : ''}...`}
              rows={1}
              className="flex-1 bg-transparent text-white text-sm resize-none outline-none placeholder-neutral-500 max-h-40"
              style={{ minHeight: '24px' }}
            />
            <div className="flex items-center gap-1 flex-shrink-0 pb-0.5">
              <button className="text-neutral-500 hover:text-neutral-300 p-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                </svg>
              </button>
              <button
                onClick={() => setAdvancedOpen(true)}
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
                onClick={handleSend}
                disabled={!input.trim()}
                className="w-8 h-8 rounded-xl bg-white flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed hover:bg-neutral-100 transition-all ml-1"
              >
                <svg
                  className="w-4 h-4 text-black"
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

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onOpenAccount={() => {
          setSidebarOpen(false)
          setAccountOpen(true)
        }}
        credits={credits}
        username="timmy"
        email="fratimmy10@gmail.com"
      />
      <AccountSettings
        isOpen={accountOpen}
        onClose={() => setAccountOpen(false)}
        credits={credits}
        username="timmy"
        email="fratimmy10@gmail.com"
      />
      <AdvancedSettingsModal
        isOpen={advancedOpen}
        onClose={() => setAdvancedOpen(false)}
        budget={budget}
        onBudgetChange={setBudget}
        selectedModel={model}
        onModelChange={setModel}
      />
    </div>
  )
}
