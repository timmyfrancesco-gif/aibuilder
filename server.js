import express from 'express'
import cors from 'cors'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

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

app.post('/api/stream', async (req, res) => {
  const { messages } = req.body
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY non configurata sul server.' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    })

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }))
    const lastMessage = messages[messages.length - 1]

    const chat = model.startChat({ history })
    const result = await chat.sendMessageStream(lastMessage.content)

    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

// Serve static frontend
const distPath = join(__dirname, 'dist')
if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get('/{*path}', (req, res) => {
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`)
})
