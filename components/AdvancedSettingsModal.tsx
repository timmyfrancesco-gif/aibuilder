'use client'
import { useState } from 'react'

interface Props {
  isOpen: boolean
  onClose: () => void
  budget: number
  onBudgetChange: (v: number) => void
  selectedModel: string
  onModelChange: (v: string) => void
}

const MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-pro',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
]

export default function AdvancedSettingsModal({
  isOpen,
  onClose,
  budget,
  onBudgetChange,
  selectedModel,
  onModelChange,
}: Props) {
  const [maxxEnabled, setMaxxEnabled] = useState(false)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-neutral-900 rounded-t-2xl w-full max-w-lg border border-neutral-800 p-5 z-10">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-base">Controlli Avanzati</h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
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
        <div className="space-y-4">
          {/* Maxx toggle */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-xs">
                M
              </div>
              <span className="text-white text-sm font-medium">Maxx ✨</span>
            </div>
            <button
              onClick={() => setMaxxEnabled(!maxxEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                maxxEnabled ? 'bg-violet-600' : 'bg-neutral-700'
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  maxxEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Model select */}
          <div>
            <label className="text-neutral-400 text-xs mb-1.5 block">
              Seleziona Modello
            </label>
            <select
              value={selectedModel}
              onChange={(e) => onModelChange(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 text-white text-sm rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 transition-colors"
            >
              {MODELS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* MCP Tools */}
          <button className="w-full flex items-center justify-between bg-neutral-800 rounded-xl px-3 py-2.5 hover:bg-neutral-700 transition-colors">
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-neutral-400"
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
              <span className="text-neutral-300 text-sm">Seleziona Strumenti MCP</span>
            </div>
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Nuovo
            </span>
          </button>

          {/* GitHub */}
          <button className="w-full flex items-center gap-2 bg-neutral-800 rounded-xl px-3 py-2.5 text-neutral-300 text-sm hover:bg-neutral-700 transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            Connetti a GitHub
          </button>

          {/* Template */}
          <div>
            <label className="text-neutral-400 text-xs mb-1.5 block">
              Seleziona Template
            </label>
            <input
              type="text"
              defaultValue="us-central1-docker.pkg.dev/emergent-defa..."
              className="w-full bg-neutral-800 border border-neutral-700 text-neutral-400 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-violet-500 font-mono"
            />
          </div>

          {/* Budget */}
          <div>
            <label className="text-neutral-400 text-xs mb-2 block">
              Budget (Crediti per generazione)
            </label>
            <div className="flex items-center justify-center gap-4 bg-neutral-800 rounded-xl py-3">
              <button
                onClick={() => onBudgetChange(Math.max(1, budget - 1))}
                className="w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-lg font-bold flex items-center justify-center transition-colors"
              >
                −
              </button>
              <div className="flex items-center gap-1.5">
                <span className="text-white text-xl font-bold w-10 text-center">
                  {budget}
                </span>
                <span className="text-amber-400">🪙</span>
              </div>
              <button
                onClick={() => onBudgetChange(budget + 1)}
                className="w-8 h-8 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white text-lg font-bold flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
