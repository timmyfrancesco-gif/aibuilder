import { NextRequest, NextResponse } from 'next/server'
import { getGeminiModel, parseGeminiResponse } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  try {
    const { prompt, history = [] } = await req.json()
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

    const model = getGeminiModel()
    const chat = model.startChat({
      history: history.map((m: { role: string; content: string }) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
    })

    const result = await chat.sendMessage(prompt)
    const raw = result.response.text()
    const parsed = parseGeminiResponse(raw)

    if (!parsed) return NextResponse.json({ error: 'Parse failed', raw }, { status: 500 })
    return NextResponse.json(parsed)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
