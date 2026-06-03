import { GoogleGenerativeAI } from '@google/generative-ai'

const SYSTEM = `Sei un esperto web developer. Genera app web complete.
REGOLE ASSOLUTE:
1. Rispondi SOLO con JSON valido, NESSUN testo extra
2. Formato: {"html":"...pagina HTML completa...","description":"...breve descrizione...","files":[{"path":"/index.html","content":"..."}]}
3. L'HTML deve essere autosufficiente: CSS in <style>, JS in <script>
4. Usa Tailwind CDN, Google Fonts, Font Awesome se servono
5. Design professionale, moderno, dark by default, responsive
6. Includi animazioni e hover effects`

export function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return genAI.getGenerativeModel({ model: 'gemini-2.5-flash', systemInstruction: SYSTEM })
}

export function parseGeminiResponse(
  raw: string
): { html: string; description: string; files: { path: string; content: string }[] } | null {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    return JSON.parse(cleaned)
  } catch {
    // fallback: extract html from markdown
    const m = raw.match(/```html\s*([\s\S]*?)```/)
    if (m) return { html: m[1].trim(), description: 'Sito generato', files: [] }
    return null
  }
}
