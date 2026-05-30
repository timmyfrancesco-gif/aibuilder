import { useState, useCallback } from 'react'

type Props = { html: string; streaming: boolean }

const btn = (active = false, accent = false): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: '5px',
  padding: '5px 12px', borderRadius: '8px',
  fontSize: '11px', fontWeight: 500, cursor: 'pointer',
  border: 'none', fontFamily: 'inherit', transition: 'all 0.13s',
  ...(accent ? {
    background: active ? '#13132a' : 'transparent',
    color: active ? '#a0a0d8' : '#383868',
    boxShadow: active ? 'inset 0 0 0 1px #22223c' : 'none',
  } : {
    background: '#0e0e1c',
    border: '1px solid #181830',
    color: '#484878',
  }),
})

export default function PreviewPanel({ html, streaming }: Props) {
  const [tab, setTab] = useState<'preview' | 'code'>('preview')
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async () => {
    if (!html) return
    try { await navigator.clipboard.writeText(html) } catch { /* fallback below */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [html])

  const download = useCallback(() => {
    if (!html) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }))
    a.download = 'sito.html'
    a.click()
  }, [html])

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#06060b', overflow: 'hidden' }}>

      {/* ── Top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        height: '50px', padding: '0 14px',
        borderBottom: '1px solid #101018', background: '#08080d', flexShrink: 0,
      }}>
        {/* Tab buttons */}
        <div style={{ display: 'flex', gap: '2px' }}>
          <button style={btn(tab === 'preview', true)} onClick={() => setTab('preview')}>
            Anteprima
          </button>
          <button style={btn(tab === 'code', true)} onClick={() => setTab('code')}>
            Codice
          </button>
        </div>

        {/* Streaming pill */}
        {streaming && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '4px' }}>
            <div className="glow-dot" style={{ width: '6px', height: '6px', borderRadius: '99px', background: '#7c5cfc' }} />
            <span style={{ fontSize: '11px', color: '#5050a0' }}>Generando…</span>
          </div>
        )}

        {/* Actions */}
        {html && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
            <button style={{ ...btn(), color: copied ? '#7c5cfc' : '#484878' }} onClick={copy}>
              {copied ? (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
              {copied ? 'Copiato' : 'Copia'}
            </button>
            <button style={btn()} onClick={download}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Scarica
            </button>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!html ? (
          /* Empty state */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{
              width: '58px', height: '58px', borderRadius: '16px',
              background: '#0c0c14', border: '2px dashed #16162a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e1e38" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <p style={{ fontSize: '12px', color: '#28285a' }}>L'anteprima apparirà qui</p>
          </div>
        ) : tab === 'preview' ? (
          <>
            {/* Browser chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              height: '36px', padding: '0 14px', flexShrink: 0,
              background: '#09090e', borderBottom: '1px solid #101018',
            }}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '99px', background: '#ff5f57' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '99px', background: '#febc2e' }} />
                <div style={{ width: '10px', height: '10px', borderRadius: '99px', background: '#28c840' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 11px', borderRadius: '6px',
                  background: '#0d0d1a', border: '1px solid #18182c',
                  fontSize: '11px', color: '#2e2e58',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                  </svg>
                  anteprima.html
                </div>
              </div>
            </div>

            {/* Loading bar */}
            {streaming && (
              <div style={{ height: '2px', background: '#0c0c18', flexShrink: 0, overflow: 'hidden', position: 'relative' }}>
                <div className="loading-bar" style={{
                  position: 'absolute', top: 0, bottom: 0, width: '30%',
                  background: 'linear-gradient(90deg, transparent, #7c5cfc 50%, transparent)',
                }} />
              </div>
            )}

            <iframe
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin"
              title="Anteprima sito"
              style={{ flex: 1, border: 'none', display: 'block', background: 'white' }}
            />
          </>
        ) : (
          /* Code view */
          <pre style={{
            flex: 1, margin: 0, padding: '20px',
            fontSize: '11px', lineHeight: 1.75, color: '#6868a0',
            fontFamily: 'ui-monospace, Menlo, "Courier New", monospace',
            background: 'transparent', overflow: 'auto',
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
          }}>
            {html}
          </pre>
        )}
      </div>
    </div>
  )
}
