import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  MagnifyingGlassIcon, 
  Cog6ToothIcon, 
  PlusIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  selectedChat: number | null;
  onSelectChat: (chatId: number) => void;
}

export default function Sidebar({ selectedChat, onSelectChat }: SidebarProps) {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Моковые данные чатов (в реальном приложении будут загружаться с сервера)
  const chats = [
    {
      id: 1,
      name: 'Алексей Петров',
      lastMessage: 'Привет! Как дела?',
      timestamp: '14:30',
      unread: 2,
      avatar: null,
      isOnline: true
    },
    {
      id: 2,
      name: 'Команда разработки',
      lastMessage: 'Встреча в 15:00',
      timestamp: '13:45',
      unread: 0,
      avatar: null,
      isOnline: false
    },
    {
      id: 3,
      name: 'Мария Иванова',
      lastMessage: 'Отправила файл',
      timestamp: 'Вчера',
      unread: 1,
      avatar: null,
      isOnline: true
    }
  ];

  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-80 bg-white dark:bg-flux-dark border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Заголовок */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Flux
          </h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
              <PlusIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Поиск */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск чатов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg focus:ring-2 focus:ring-flux-primary text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>
      </div>

      {/* Список чатов */}
      <div className="flex-1 overflow-y-auto">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
              selectedChat === chat.id ? 'bg-flux-primary/10 border-r-2 border-r-flux-primary' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="relative">
                {chat.avatar ? (
                  <img
                    src={chat.avatar}
                    alt={chat.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <UserCircleIcon className="w-12 h-12 text-gray-400" />
                )}
                {chat.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-flux-dark"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {chat.name}
                  </h3>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {chat.timestamp}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {chat.lastMessage}
                  </p>
                  {chat.unread > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-flux-primary rounded-full">
                      {chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Настройки пользователя */}
      {showSettings && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-flux-dark border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <UserCircleIcon className="w-10 h-10 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.username}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {user?.email}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full text-left text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
}