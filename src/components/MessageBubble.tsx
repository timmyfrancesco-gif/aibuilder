import type { Message } from '../App'

function BoltIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" style={{ flexShrink: 0, marginTop: '2px' }}>
      <defs>
        <linearGradient id="g-bolt" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c5cfc" />
          <stop offset="100%" stopColor="#4f8bfc" />
        </linearGradient>
      </defs>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="url(#g-bolt)" />
    </svg>
  )
}

export default function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div
      className="msg-in"
      style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-start' }}
    >
      {!isUser && <BoltIcon />}
      <div style={{
        maxWidth: '85%',
        fontSize: '13px',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        ...(isUser ? {
          background: '#101022',
          border: '1px solid #1c1c38',
          borderRadius: '13px 13px 3px 13px',
          padding: '10px 14px',
          color: '#b8b8e0',
        } : {
          color: '#7878a8',
        }),
      }}>
        {message.display}
      </div>
    </div>
  )
}
