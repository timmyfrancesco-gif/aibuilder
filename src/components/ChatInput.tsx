import { useState, useRef } from 'react'

export default function ChatInput({ onSend, disabled }: { onSend: (t: string) => void; disabled: boolean }) {
  const [text, setText] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  const submit = () => {
    const t = text.trim()
    if (!t || disabled) return
    onSend(t)
    setText('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  const canSend = text.trim().length > 0 && !disabled

  return (
    <div
      className="input-box"
      style={{
        display: 'flex', alignItems: 'flex-end', gap: '8px',
        background: '#0d0d1a', border: '1px solid #181830',
        borderRadius: '13px', padding: '10px 10px 10px 14px',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <textarea
        ref={ref}
        value={text}
        disabled={disabled}
        rows={1}
        placeholder="Descrivi il sito che vuoi creare…"
        onChange={e => {
          setText(e.target.value)
          e.currentTarget.style.height = 'auto'
          e.currentTarget.style.height = Math.min(e.currentTarget.scrollHeight, 148) + 'px'
        }}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
        }}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          resize: 'none', fontSize: '13px', lineHeight: 1.55,
          color: '#a8a8d0', fontFamily: 'inherit',
          maxHeight: '148px', minHeight: '20px',
        }}
      />
      <button
        onClick={submit}
        disabled={!canSend}
        style={{
          flexShrink: 0, width: '30px', height: '30px',
          borderRadius: '9px', border: 'none', cursor: canSend ? 'pointer' : 'default',
          background: canSend ? 'linear-gradient(135deg, #7c5cfc, #4f8bfc)' : '#131325',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: canSend ? 1 : 0.4, transition: 'all 0.15s',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  )
}
