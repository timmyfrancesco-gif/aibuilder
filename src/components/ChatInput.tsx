import { useState, useRef, KeyboardEvent } from 'react'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isDisabled: boolean
}

export default function ChatInput({ onSendMessage, isDisabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed || isDisabled) return
    onSendMessage(trimmed)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleInput = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }

  const placeholders = [
    'Crea una landing page per una pizzeria con tema scuro...',
    'Fai un portfolio per un fotografo minimalista...',
    'Crea un sito e-commerce per prodotti artigianali...',
    'Aggiungi un modulo di contatto con validazione...',
  ]

  return (
    <div className="p-4 border-t border-gray-800 bg-gray-900">
      <div className="flex gap-2 items-end bg-gray-800 rounded-2xl border border-gray-700 focus-within:border-violet-500 transition-colors p-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={isDisabled}
          rows={1}
          placeholder={placeholders[0]}
          className="flex-1 bg-transparent text-gray-100 placeholder-gray-500 text-sm resize-none outline-none px-2 py-1.5 max-h-40"
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled || !input.trim()}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white transition-all hover:from-violet-400 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed shadow"
          title="Invia (Enter)"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-600 mt-2 text-center">
        Premi <kbd className="font-mono bg-gray-800 px-1 rounded">Enter</kbd> per inviare ·{' '}
        <kbd className="font-mono bg-gray-800 px-1 rounded">Shift+Enter</kbd> per nuova riga
      </p>
    </div>
  )
}
