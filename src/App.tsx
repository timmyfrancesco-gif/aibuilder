import { useState, useCallback } from 'react'
import ChatPanel from './components/ChatPanel'
import PreviewPanel from './components/PreviewPanel'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent?: string
}

function extractHtmlAndText(content: string): { html: string | null; text: string } {
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/)
  if (!htmlMatch) {
    return { html: null, text: content }
  }

  const html = htmlMatch[1].trim()
  const text = content.replace(/```html\s*[\s\S]*?```/, '').trim()

  return { html, text }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [generatedHtml, setGeneratedHtml] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (isStreaming) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userInput,
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingText('')

    const conversationHistory = [...messages, userMessage].map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    let fullResponse = ''

    try {
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversationHistory }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Errore sconosciuto' }))
        throw new Error(err.error || `HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              fullResponse += parsed.text
              setStreamingText(fullResponse)
              const { html } = extractHtmlAndText(fullResponse)
              if (html) setGeneratedHtml(html)
            }
          } catch (e) {
            if (e instanceof SyntaxError) continue
            throw e
          }
        }
      }

      const { html, text } = extractHtmlAndText(fullResponse)
      if (html) setGeneratedHtml(html)

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: fullResponse,
        displayContent: text || 'Ho creato il tuo sito! Puoi vederlo nella preview →',
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Si è verificato un errore.',
        displayContent:
          error instanceof Error
            ? `Errore: ${error.message}`
            : 'Si è verificato un errore sconosciuto. Riprova.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [messages, isStreaming])

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 h-14 bg-gray-900 border-b border-gray-800 flex items-center px-6 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">
            AI
          </div>
          <span className="text-white font-semibold text-lg">Website Builder</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
        </div>
      </div>

      {/* Main content below header */}
      <div className="flex w-full mt-14">
        {/* Left panel - Chat (40%) */}
        <div className="w-2/5 flex flex-col border-r border-gray-800 bg-gray-900">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSendMessage={handleSendMessage}
          />
        </div>

        {/* Right panel - Preview (60%) */}
        <div className="w-3/5 flex flex-col bg-gray-950">
          <PreviewPanel html={generatedHtml} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  )
}
