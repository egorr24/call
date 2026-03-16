import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import Sidebar from '../components/Sidebar'
import ChatArea from '../components/ChatArea'
import CallModal from '../components/CallModal'

export default function Dashboard() {
  const { token } = useAuthStore()
  const { initSocket } = useChatStore()

  useEffect(() => {
    if (token) {
      initSocket(token)
    }
  }, [token, initSocket])

  return (
    <div className="h-screen flex bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <ChatArea />
      <CallModal />
    </div>
  )
}