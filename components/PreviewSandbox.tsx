'use client'
import { useState } from 'react'

interface Props {
  html: string
  projectId?: string
  onPublish?: () => void
  isPublished?: boolean
  publishedUrl?: string
}

export default function PreviewSandbox({
  html,
  onPublish,
  isPublished,
  publishedUrl,
}: Props) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const widths = { desktop: 'w-full', tablet: 'w-[768px]', mobile: 'w-[375px]' }

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-800 bg-neutral-900 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1 text-xs text-neutral-400 font-mono">
            {publishedUrl || 'anteprima locale'}
          </div>
        </div>
        {/* Device buttons */}
        <div className="flex items-center gap-1 bg-neutral-800 rounded-lg p-0.5">
          {(['desktop', 'tablet', 'mobile'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDeviceMode(d)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                deviceMode === d
                  ? 'bg-neutral-600 text-white'
                  : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {d === 'desktop' ? '🖥️' : d === 'tablet' ? '📱' : '📲'}
            </button>
          ))}
        </div>
        {onPublish && (
          <button
            onClick={onPublish}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isPublished
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black hover:opacity-90'
            }`}
          >
            {isPublished ? '✅ Pubblicato' : '🚀 Pubblica'}
          </button>
        )}
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto flex justify-center bg-neutral-950 p-4">
        {html ? (
          <div className={`${widths[deviceMode]} h-full transition-all duration-300`}>
            <iframe
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin allow-forms"
              className="w-full h-full border-0 rounded-lg"
              title="Preview"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-neutral-600 gap-3">
            <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-neutral-800 flex items-center justify-center">
              <svg
                className="w-7 h-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <p className="text-sm">L&apos;anteprima apparirà qui</p>
          </div>
        )}
      </div>
    </div>
  )
}
