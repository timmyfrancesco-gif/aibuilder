import { useState, useCallback } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
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
9. Assicurati che il sito sia responsive e funzioni bene su mobile`

function extractHtmlAndText(content: string): { html: string | null; text: string } {
  const htmlMatch = content.match(/```html\s*([\s\S]*?)```/)
  if (!htmlMatch) return { html: null, text: content }
  const html = htmlMatch[1].trim()
  const text = content.replace(/```html\s*[\s\S]*?```/, '').trim()
  return { html, text }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11)
}

function ApiKeyScreen({ onSave }: { onSave: (key: string) => void }) {
  const [input, setInput] = useState('')
  return (
    <div className="flex items-center justify-center h-screen bg-gray-950 text-white">
      <div className="max-w-md w-full mx-4 text-center p-8 bg-gray-900 rounded-2xl border border-gray-700 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-5">
          AI
        </div>
        <h1 className="text-2xl font-bold mb-2">AI Website Builder</h1>
        <p className="text-gray-400 mb-6 text-sm leading-relaxed">
          Inserisci la tua Gemini API Key per iniziare.<br />
          La chiave viene salvata solo nel browser.
        </p>
        <input
          type="password"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && input.trim() && onSave(input.trim())}
          placeholder="AIzaSy..."
          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm mb-4 focus:outline-none focus:border-violet-500"
        />
        <button
          onClick={() => input.trim() && onSave(input.trim())}
          disabled={!input.trim()}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-all"
        >
          Inizia a costruire
        </button>
        <p className="text-gray-600 text-xs mt-4">
          Ottieni la tua chiave su{' '}
          <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300">
            aistudio.google.com
          </a>
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '')
  const [messages, setMessages] = useState<Message[]>([])
  const [generatedHtml, setGeneratedHtml] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')

  const handleSaveKey = useCallback((key: string) => {
    localStorage.setItem('gemini_api_key', key)
    setApiKey(key)
  }, [])

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

    let fullResponse = ''

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction: SYSTEM_PROMPT,
      })

      const history = [...messages, userMessage].slice(0, -1).map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessageStream(userInput)

      for await (const chunk of result.stream) {
        const text = chunk.text()
        if (text) {
          fullResponse += text
          setStreamingText(fullResponse)
          const { html } = extractHtmlAndText(fullResponse)
          if (html) setGeneratedHtml(html)
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
      const isAuthError = error instanceof Error && error.message.includes('API_KEY')
      if (isAuthError) {
        localStorage.removeItem('gemini_api_key')
        setApiKey('')
      }
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: 'Errore',
        displayContent: error instanceof Error
          ? `Errore: ${error.message}`
          : 'Errore sconosciuto. Riprova.',
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [messages, apiKey, isStreaming])

  if (!apiKey) return <ApiKeyScreen onSave={handleSaveKey} />

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
        <div className="ml-auto">
          <button
            onClick={() => { localStorage.removeItem('gemini_api_key'); setApiKey('') }}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1 rounded"
          >
            Cambia chiave
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex w-full mt-14">
        <div className="w-2/5 flex flex-col border-r border-gray-800 bg-gray-900">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSendMessage={handleSendMessage}
          />
        </div>
        <div className="w-3/5 flex flex-col bg-gray-950">
          <PreviewPanel html={generatedHtml} isStreaming={isStreaming} />
        </div>
      </div>
    </div>
  )
}
