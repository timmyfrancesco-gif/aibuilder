import { Message } from '../App'

interface MessageBubbleProps {
  message: Message
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const displayText = message.displayContent ?? message.content

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xs lg:max-w-sm">
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-lg">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-4">
      <div className="flex gap-2 max-w-xs lg:max-w-sm">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow">
          AI
        </div>
        <div className="bg-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
        </div>
      </div>
    </div>
  )
}
