import { useState, useCallback } from 'react'

interface PreviewPanelProps {
  html: string
  isStreaming: boolean
}

export default function PreviewPanel({ html, isStreaming }: PreviewPanelProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview')
  const [copySuccess, setCopySuccess] = useState(false)

  const handleCopy = useCallback(async () => {
    if (!html) return
    try {
      await navigator.clipboard.writeText(html)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = html
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    }
  }, [html])

  const handleDownload = useCallback(() => {
    if (!html) return
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'website.html'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [html])

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          <span className="text-sm font-medium text-gray-300">Preview</span>
          {isStreaming && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse"></span>
              Generando...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          {html && (
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'preview'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setViewMode('code')}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === 'code'
                    ? 'bg-violet-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                Codice
              </button>
            </div>
          )}

          {/* Copy button */}
          {html && (
            <button
              onClick={handleCopy}
              title="Copia HTML"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              {copySuccess ? (
                <>
                  <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-green-400">Copiato!</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copia
                </>
              )}
            </button>
          )}

          {/* Download button */}
          {html && (
            <button
              onClick={handleDownload}
              title="Scarica HTML"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Scarica
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 relative overflow-hidden">
        {!html ? (
          // Empty state
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-400 mb-2">Nessuna preview</h3>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
              Descrivi il sito che vuoi creare nella chat e la preview apparirà qui in tempo reale.
            </p>
            <div className="mt-6 flex items-center gap-2 text-xs text-gray-600">
              <div className="flex gap-1">
                <div className="w-3 h-3 rounded-sm bg-gray-700"></div>
                <div className="w-3 h-3 rounded-sm bg-gray-700"></div>
                <div className="w-3 h-3 rounded-sm bg-gray-700"></div>
              </div>
              <span>La tua pagina apparirà qui</span>
            </div>
          </div>
        ) : viewMode === 'preview' ? (
          // Live preview iframe
          <iframe
            srcDoc={html}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 bg-white"
            title="Website Preview"
          />
        ) : (
          // Code view
          <div className="h-full overflow-auto bg-gray-950 p-4">
            <pre className="text-xs text-gray-300 font-mono leading-relaxed">
              <code>{html}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
