import { useEffect, useRef } from 'react'
import type { Message } from '../App'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'

const CHIPS = [
  'Landing page per una startup tech con sfondo scuro e animazioni moderne',
  'Portfolio per un fotografo: galleria a griglia con effetti hover eleganti',
  'Sito e-commerce per una boutique con prodotti in vetrina e carrello',
  'Dashboard analytics con grafici, KPI e design professionale',
]

type Props = {
  messages: Message[]
  streaming: boolean
  onSend: (text: string) => void
}

export default function ChatPanel({ messages, streaming, onSend }: Props) {
  const endRef = useRef<HTMLDivElement>(null)
  const empty = messages.length === 0 && !streaming

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streaming])

  return (
    <div style={{
      width: '38%', minWidth: '320px',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid #101018',
      background: '#09090f',
    }}>
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '14px 18px', borderBottom: '1px solid #101018', flexShrink: 0,
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '8px',
          background: 'linear-gradient(135deg, #7c5cfc, #4f8bfc)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#d0d0ee', letterSpacing: '-0.01em' }}>
          Web Studio
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '10px', fontWeight: 500,
          padding: '2px 8px', borderRadius: '99px',
          background: '#0f0f1e', border: '1px solid #1e1e38',
          color: '#4a4a90', letterSpacing: '0.04em',
        }}>
          GEMINI
        </span>
      </div>

      {/* ── Messages / Empty state ── */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
        {empty ? (
          /* Empty state */
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '28px 20px',
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #0f0d1e, #0d1020)',
              border: '1px solid #1e1e38',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <defs>
                  <linearGradient id="g-icon" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7c5cfc" />
                    <stop offset="100%" stopColor="#4f8bfc" />
                  </linearGradient>
                </defs>
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="url(#g-icon)" />
              </svg>
            </div>
            <h2 style={{ fontWeight: 600, fontSize: '15px', color: '#b8b8dc', margin: '0 0 6px', letterSpacing: '-0.01em' }}>
              Cosa vuoi costruire?
            </h2>
            <p style={{ fontSize: '12px', color: '#404068', lineHeight: 1.65, textAlign: 'center', margin: '0 0 22px', maxWidth: '220px' }}>
              Descrivi il sito e l'AI lo genera live davanti a te.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px', width: '100%' }}>
              {CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => onSend(chip)}
                  style={{
                    textAlign: 'left', fontSize: '12px', lineHeight: 1.5,
                    padding: '10px 13px', borderRadius: '11px', cursor: 'pointer',
                    background: '#0e0e1a', border: '1px solid #191930',
                    color: '#60608a', fontFamily: 'inherit',
                    transition: 'background 0.12s, border-color 0.12s, color 0.12s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget
                    el.style.background = '#12121f'
                    el.style.borderColor = '#242445'
                    el.style.color = '#8888b8'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget
                    el.style.background = '#0e0e1a'
                    el.style.borderColor = '#191930'
                    el.style.color = '#60608a'
                  }}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Message list */
          <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {messages.map(m => <MessageBubble key={m.id} message={m} />)}
            {streaming && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>
                <span style={{ fontSize: '11px', color: '#383868' }}>Generando il sito…</span>
              </div>
            )}
            <div ref={endRef} style={{ height: '12px' }} />
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '12px 14px 10px', flexShrink: 0, borderTop: '1px solid #101018' }}>
        <ChatInput onSend={onSend} disabled={streaming} />
        <p style={{ textAlign: 'center', fontSize: '10px', color: '#232342', marginTop: '8px' }}>
          Powered by Gemini 2.5 Flash
        </p>
      </div>
    </div>
  )
}
