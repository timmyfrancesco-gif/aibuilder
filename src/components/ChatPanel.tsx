import { useEffect, useRef } from 'react'
import { Message } from '../App'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

interface ChatPanelProps {
  messages: Message[]
  isStreaming: boolean
  streamingText: string
  onSendMessage: (message: string) => void
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-4">
      <div className="flex gap-2 items-end">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow">
          AI
        </div>
        <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow">
          <div className="flex gap-1 items-center h-5">
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
            <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
          </div>
        </div>
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg">
        AI
      </div>
      <h2 className="text-xl font-bold text-white mb-2">AI Website Builder</h2>
      <p className="text-gray-400 text-sm mb-6 max-w-xs leading-relaxed">
        Descrivi il sito che vuoi creare e l'AI lo genererà per te in tempo reale.
      </p>
      <div className="grid gap-2 w-full max-w-xs">
        {[
          '🍕 Landing page per pizzeria dark theme',
          '📸 Portfolio fotografo minimalista',
          '🛍️ Negozio online prodotti artigianali',
          '💼 CV/Resume professionale',
        ].map((example, i) => (
          <div
            key={i}
            className="text-left text-xs text-gray-400 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700"
          >
            {example}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ChatPanel({
  messages,
  isStreaming,
  onSendMessage,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Chat</span>
        </div>
        <span className="text-xs text-gray-600">
          {messages.length > 0 ? `${Math.ceil(messages.length / 2)} conversazioni` : 'Nuova sessione'}
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {messages.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <>
            {messages.map(message => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isStreaming && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <ChatInput onSendMessage={onSendMessage} isDisabled={isStreaming} />
    </div>
  )
}
