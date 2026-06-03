'use client'

interface Project {
  id: string
  name: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onOpenAccount: () => void
  credits: number
  projects?: Project[]
  username?: string
  email?: string
}

export default function Sidebar({
  isOpen,
  onClose,
  onOpenAccount,
  credits,
  projects = [],
  username = 'Utente',
  email = '',
}: Props) {
  const demoProjects: Project[] =
    projects.length > 0
      ? projects
      : [
          { id: '1', name: 'cesare-checkout-live' },
          { id: '2', name: 'bot-preview-lab' },
          { id: '3', name: 'discord-bot-hub-35' },
          { id: '4', name: 'netflix-clone-v2' },
        ]

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        className={`fixed left-0 top-0 h-full w-4/5 max-w-xs bg-neutral-900/95 backdrop-blur-md z-50 flex flex-col transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            </div>
            <span className="font-semibold text-white text-sm">Web Studio</span>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition-colors"
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

        {/* Nav */}
        <nav className="p-3 space-y-1 border-b border-neutral-800">
          <a
            href="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-green-400 font-medium text-sm hover:bg-neutral-800 transition-colors cursor-pointer"
          >
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
                d="M12 4v16m8-8H4"
              />
            </svg>
            Nuova Attività
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-300 text-sm hover:bg-neutral-800 transition-colors cursor-pointer">
            🌐 App Distribuite
          </a>
          <a className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-neutral-300 text-sm hover:bg-neutral-800 transition-colors cursor-pointer">
            🔖 Vetrina
          </a>
        </nav>

        {/* Recent projects */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-neutral-500 font-medium px-3 mb-2 uppercase tracking-wider">
            Attività Recenti
          </p>
          <div className="space-y-0.5">
            {demoProjects.map((p) => (
              <a
                key={p.id}
                href={`/workspace/${p.id}`}
                className="block px-3 py-2 rounded-lg text-neutral-400 text-sm hover:bg-neutral-800 hover:text-neutral-200 transition-colors truncate cursor-pointer"
              >
                {p.name}
              </a>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-800 space-y-3">
          {/* Credits */}
          <div className="bg-neutral-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-neutral-300 text-sm font-medium">
              🪙 {credits.toFixed(2)}
            </span>
            <button className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity">
              Acquista +
            </button>
          </div>
          {/* User */}
          <button
            onClick={onOpenAccount}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-neutral-800 transition-colors text-left group"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{username}</p>
              <p className="text-neutral-500 text-xs truncate">{email}</p>
            </div>
            <svg
              className="w-4 h-4 text-neutral-500 group-hover:text-neutral-300 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 15l7-7 7 7"
              />
            </svg>
          </button>
        </div>
      </div>
    </>
  )
}
