import { useState, useCallback } from 'react'
import { GoogleGenerativeAI } from '@google/generative-ai'
import ChatPanel from './components/ChatPanel'
import PreviewPanel from './components/PreviewPanel'

export type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  display: string
}

const SYSTEM = `Sei un esperto web designer e sviluppatore. Crea siti web professionali, moderni e accattivanti.

REGOLE:
1. Rispondi SEMPRE con una pagina HTML completa in un blocco \`\`\`html ... \`\`\`
2. L'HTML deve essere autosufficiente: CSS in <style>, JS in <script>
3. Usa Tailwind CDN, Google Fonts, Font Awesome, Alpine.js liberamente
4. Rendi i siti visivamente stupendi: animazioni, hover effects, gradients
5. Assicurati che siano responsive e funzionino su mobile
6. Dopo il blocco HTML scrivi 1-2 frasi in italiano che descrivono cosa hai creato
7. Quando modifichi, restituisci SEMPRE l'HTML completo aggiornato`

function parse(raw: string) {
  const m = raw.match(/```html\s*([\s\S]*?)```/)
  if (!m) return { html: null, text: raw.trim() }
  return { html: m[1].trim(), text: raw.replace(/```html[\s\S]*?```/g, '').trim() }
}

const uid = () => Math.random().toString(36).slice(2, 9)
const KEY = import.meta.env.VITE_GEMINI_API_KEY as string

export default function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [html, setHtml] = useState('')
  const [streaming, setStreaming] = useState(false)

  const send = useCallback(async (input: string) => {
    if (streaming) return
    const user: Message = { id: uid(), role: 'user', content: input, display: input }
    setMessages(p => [...p, user])
    setStreaming(true)
    let full = ''
    try {
      const genAI = new GoogleGenerativeAI(KEY)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM })
      const history = [...messages, user].slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }))
      const result = await model.startChat({ history }).sendMessageStream(input)
      for await (const chunk of result.stream) {
        full += chunk.text()
        const { html } = parse(full)
        if (html) setHtml(html)
      }
      const { html: h, text } = parse(full)
      if (h) setHtml(h)
      setMessages(p => [...p, {
        id: uid(), role: 'assistant', content: full,
        display: text || 'Sito creato con successo! Puoi vederlo nella preview.',
      }])
    } catch (e) {
      setMessages(p => [...p, {
        id: uid(), role: 'assistant', content: '',
        display: `Errore: ${e instanceof Error ? e.message : 'Qualcosa è andato storto. Riprova.'}`,
      }])
    } finally {
      setStreaming(false)
    }
  }, [messages, streaming])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#08080d' }}>
      <ChatPanel messages={messages} streaming={streaming} onSend={send} />
      <PreviewPanel html={html} streaming={streaming} />
    </div>
  )
}
