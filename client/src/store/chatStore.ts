import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface Message {
  id: string
  chatId: string
  senderId: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'file'
}

interface Chat {
  id: string
  name: string
  type: 'private' | 'group'
  participants: string[]
  lastMessage?: Message
  unreadCount: number
  avatar?: string
}

interface ChatState {
  socket: Socket | null
  chats: Chat[]
  activeChat: Chat | null
  messages: Message[]
  isConnected: boolean
  initSocket: (token: string) => void
  setActiveChat: (chat: Chat) => void
  sendMessage: (content: string, type?: 'text' | 'image' | 'file') => void
  loadChats: () => void
  loadMessages: (chatId: string) => void
}

export const useChatStore = create<ChatState>((set, get) => ({
  socket: null,
  chats: [],
  activeChat: null,
  messages: [],
  isConnected: false,

  initSocket: (token: string) => {
    const socket = io('http://localhost:5000', {
      auth: { token }
    })

    socket.on('connect', () => {
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    socket.on('newMessage', (message: Message) => {
      const { activeChat, messages } = get()
      if (activeChat && message.chatId === activeChat.id) {
        set({ messages: [...messages, message] })
      }
    })

    set({ socket })
  },

  setActiveChat: (chat: Chat) => {
    set({ activeChat: chat, messages: [] })
    get().loadMessages(chat.id)
  },

  sendMessage: (content: string, type = 'text') => {
    const { socket, activeChat } = get()
    if (socket && activeChat) {
      socket.emit('sendMessage', {
        chatId: activeChat.id,
        content,
        type
      })
    }
  },

  loadChats: async () => {
    // Загрузка чатов с сервера
  },

  loadMessages: async (chatId: string) => {
    // Загрузка сообщений с сервера
  }
}))