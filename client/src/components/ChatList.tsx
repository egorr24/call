import { motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'

interface Chat {
  id: string
  name: string
  type: 'private' | 'group'
  participants: string[]
  lastMessage?: {
    content: string
    timestamp: Date
  }
  unreadCount: number
  avatar?: string
}

interface ChatListProps {
  chats: Chat[]
}

export default function ChatList({ chats }: ChatListProps) {
  const { activeChat, setActiveChat } = useChatStore()

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'сейчас'
    if (hours < 24) return `${hours}ч`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {chats.length === 0 ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          <p>Нет активных чатов</p>
        </div>
      ) : (
        <div className="space-y-1 p-2">
          {chats.map((chat) => (
            <motion.div
              key={chat.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveChat(chat)}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                activeChat?.id === chat.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {chat.name.charAt(0).toUpperCase()}
                  </div>
                  {chat.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white truncate">
                      {chat.name}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>
                  {chat.lastMessage && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {chat.lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}