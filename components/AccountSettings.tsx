'use client'

interface Props {
  isOpen: boolean
  onClose: () => void
  credits: number
  username?: string
  email?: string
}

export default function AccountSettings({
  isOpen,
  onClose,
  credits,
  username = 'Utente',
  email = '',
}: Props) {
  if (!isOpen) return null

  const menuItems = [
    { icon: '🎁', label: 'Invita e Guadagna $200', color: 'text-teal-400', external: false },
    { icon: '👤', label: 'Impostazioni Account', color: 'text-neutral-300', external: false },
    { icon: '🌐', label: 'Lingua', color: 'text-neutral-300', external: false },
    { icon: '🐙', label: 'Connetti a Github', color: 'text-neutral-300', external: true },
    { icon: '💬', label: 'Comunità', color: 'text-neutral-300', external: true },
    { icon: 'ℹ️', label: 'Centro Assistenza', color: 'text-neutral-300', external: true },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative bg-neutral-900 rounded-t-2xl md:rounded-2xl w-full max-w-sm p-4 z-10 border border-neutral-800">
        {/* Email */}
        <p className="text-neutral-400 text-xs text-center mb-4">{email}</p>

        {/* Project */}
        <div className="bg-neutral-800 rounded-xl p-3 flex items-center justify-between mb-4">
          <div>
            <p className="text-white text-sm font-semibold">{username}&apos;s Project</p>
            <p className="text-neutral-500 text-xs">Proprietario • 1 membro</p>
          </div>
          <button className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-700 transition-colors">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </button>
        </div>

        {/* Credits */}
        <div className="bg-neutral-800 rounded-xl p-3 text-center mb-4">
          <p className="text-neutral-400 text-xs mb-1">Crediti</p>
          <p className="text-white text-2xl font-bold mb-3">🪙 {credits.toFixed(2)}</p>
          <button className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity">
            Aggiorna ✨
          </button>
        </div>

        {/* Menu items */}
        <div className="space-y-0.5 mb-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-neutral-800 transition-colors text-left"
            >
              <span className={`flex items-center gap-3 text-sm ${item.color}`}>
                <span>{item.icon}</span>
                {item.label}
              </span>
              {item.external && (
                <svg
                  className="w-3.5 h-3.5 text-neutral-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
          <button className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm transition-colors px-2 py-1.5 rounded-lg hover:bg-red-400/10">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Esci
          </button>
          <div className="flex items-center gap-1 bg-neutral-800 rounded-xl p-1">
            {['☀️', '🖥️', '🌙'].map((icon, i) => (
              <button
                key={i}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm hover:bg-neutral-700 transition-colors"
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
