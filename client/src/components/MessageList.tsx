import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useChatStore } from '../store/chatStore'
import { useAuthStore } from '../store/authStore'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'file'
}

export default function MessageList() {
  const { messages } = useChatStore()
  const { user } = useAuthStore()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500 dark:text-gray-400">
            Начните разговор
          </p>
        </div>
      ) : (
        messages.map((message, index) => {
          const isOwn = message.senderId === user?.id
          const showAvatar = index === 0 || messages[index - 1].senderId !== message.senderId
          
          return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-xs lg:max-w-md ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isOwn && showAvatar && (
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-2">
                    U
                  </div>
                )}
                {!isOwn && !showAvatar && (
                  <div className="w-8 mr-2" />
                )}
                
                <div
                  className={`px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwn ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </motion.div>
          )
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  )
}