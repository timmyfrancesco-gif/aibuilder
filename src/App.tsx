import { useState, useCallback } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import ChatPanel from './components/ChatPanel'
import PreviewPanel from './components/PreviewPanel'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  displayContent?: string
}

const SYSTEM_PROMPT = `Sei un esperto web designer e sviluppatore. Il tuo compito è creare siti web professionali e moderni.

REGOLE FONDAMENTALI:
1. Rispondi SEMPRE con una pagina HTML completa e autosufficiente all'interno di un blocco di codice \`\`\`html ... \`\`\`
2. L'HTML deve includere tutti gli stili CSS inline o in tag <style> e tutto il JavaScript in tag <script>
3. Puoi usare CDN esterni come Tailwind CSS CDN, Google Fonts, Font Awesome, Alpine.js, ecc.
4. Dopo il blocco di codice, aggiungi una breve descrizione in italiano di 1-2 frasi di cosa hai creato
5. Usa Tailwind CSS via CDN per gli stili quando appropriato: <script src="https://cdn.tailwindcss.com"></script>
6. Rendi i siti visivamente accattivanti, moderni e professionali
7. Quando modifichi un sito, restituisci SEMPRE l'HTML completo aggiornato (non solo le differenze)
8. Includi animazioni CSS, hover effects e transizioni per rendere il sito interattivo
9. Assicurati che il sito sia responsive e funzioni bene su mobile

Esempio di risposta corretta:
\`\`\`html
<!DOCTYPE html>
<html lang="it">
...pagina completa...
</html>
\`\`\`

Ecco il tuo nuovo sito web professionale! Ho creato una landing page moderna con...`

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

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  const handleSendMessage = useCallback(async (userInput: string) => {
    if (!apiKey || isStreaming) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: userInput,
    }

    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingText('')

    const anthropic = new Anthropic({
      apiKey,
      dangerouslyAllowBrowser: true,
    })

    const conversationHistory = [...messages, userMessage].map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    let fullResponse = ''

    try {
      const stream = await anthropic.messages.stream({
        model: 'claude-sonnet-4-6',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: conversationHistory,
      })

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          fullResponse += chunk.delta.text
          setStreamingText(fullResponse)

          // Update HTML preview live as it streams
          const { html } = extractHtmlAndText(fullResponse)
          if (html) {
            setGeneratedHtml(html)
          }
        }
      }

      // Final processing after stream completes
      const { html, text } = extractHtmlAndText(fullResponse)

      if (html) {
        setGeneratedHtml(html)
      }

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
  }, [messages, apiKey, isStreaming])

  if (!apiKey) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
        <div className="max-w-md text-center p-8 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold mb-3 text-white">API Key Mancante</h1>
          <p className="text-gray-400 mb-6 leading-relaxed">
            Per usare l'AI Website Builder hai bisogno di una API key di Anthropic.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-left font-mono text-sm text-green-400 mb-6">
            <p className="text-gray-500 mb-1"># Crea un file .env nella root:</p>
            <p>VITE_ANTHROPIC_API_KEY=sk-ant-...</p>
          </div>
          <p className="text-gray-500 text-sm">
            Ottieni la tua API key su{' '}
            <a
              href="https://console.anthropic.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:text-violet-300 underline"
            >
              console.anthropic.com
            </a>
          </p>
        </div>
      </div>
    )
  }

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
