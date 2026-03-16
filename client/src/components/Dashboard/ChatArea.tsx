import React, { useState, useRef, useEffect } from 'react';
import { 
  PaperAirplaneIcon, 
  PhoneIcon, 
  VideoCameraIcon,
  UserCircleIcon,
  PaperClipIcon,
  FaceSmileIcon
} from '@heroicons/react/24/outline';
import { useSocket } from '../../contexts/SocketContext';
import { useCall } from '../../contexts/CallContext';
import { useAuth } from '../../contexts/AuthContext';

interface ChatAreaProps {
  selectedChat: number | null;
}

export default function ChatArea({ selectedChat }: ChatAreaProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, joinChat } = useSocket();
  const { startCall } = useCall();
  const { user } = useAuth();

  // Моковые данные сообщений
  const mockMessages = [
    {
      id: 1,
      sender_id: 2,
      content: 'Привет! Как дела?',
      created_at: '2024-01-15T10:30:00Z',
      sender: { username: 'Алексей', avatar_url: null }
    },
    {
      id: 2,
      sender_id: user?.id,
      content: 'Привет! Все отлично, работаю над новым проектом',
      created_at: '2024-01-15T10:32:00Z',
      sender: { username: user?.username, avatar_url: null }
    },
    {
      id: 3,
      sender_id: 2,
      content: 'Звучит интересно! Можешь рассказать подробнее?',
      created_at: '2024-01-15T10:35:00Z',
      sender: { username: 'Алексей', avatar_url: null }
    }
  ];

  useEffect(() => {
    if (selectedChat) {
      joinChat(selectedChat);
      setMessages(mockMessages);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !selectedChat) return;

    const newMessage = {
      id: Date.now(),
      sender_id: user?.id,
      content: message,
      created_at: new Date().toISOString(),
      sender: { username: user?.username, avatar_url: null }
    };

    setMessages(prev => [...prev, newMessage]);
    sendMessage(selectedChat, message);
    setMessage('');
  };

  const handleStartCall = (isVideo: boolean) => {
    if (selectedChat) {
      startCall(selectedChat);
    }
  };

  if (!selectedChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-flux-darker">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 text-gray-300 dark:text-gray-600">
            <svg fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Выберите чат
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Выберите чат из списка, чтобы начать общение
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-flux-dark">
      {/* Заголовок чата */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-flux-dark">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <UserCircleIcon className="w-10 h-10 text-gray-400" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Алексей Петров
              </h2>
              <p className="text-sm text-green-500">онлайн</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleStartCall(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <PhoneIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => handleStartCall(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <VideoCameraIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.sender_id === user?.id
                ? 'bg-flux-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
            }`}>
              <p className="text-sm">{msg.content}</p>
              <p className={`text-xs mt-1 ${
                msg.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {new Date(msg.created_at).toLocaleTimeString('ru-RU', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-flux-dark">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <button
            type="button"
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <PaperClipIcon className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Введите сообщение..."
              className="w-full px-4 py-2 pr-12 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-flux-primary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <FaceSmileIcon className="w-5 h-5" />
            </button>
          </div>
          
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-flux-primary text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}