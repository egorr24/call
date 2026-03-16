import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface Message {
  id: number;
  chat_id: number;
  sender_id: number;
  content: string;
  message_type: string;
  created_at: string;
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: Map<number, any>;
  messages: Message[];
  sendMessage: (chatId: number, content: string, messageType?: string) => void;
  joinChat: (chatId: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Map<number, any>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (user && token) {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || window.location.origin, {
        auth: {
          token: token
        }
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
      });

      newSocket.on('new-message', (message: Message) => {
        setMessages(prev => [...prev, message]);
      });

      newSocket.on('user-online', (userData) => {
        setOnlineUsers(prev => new Map(prev.set(userData.userId, userData)));
      });

      newSocket.on('user-offline', (userId) => {
        setOnlineUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(userId);
          return newMap;
        });
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user, token]);

  const sendMessage = (chatId: number, content: string, messageType: string = 'text') => {
    if (socket && user) {
      socket.emit('send-message', {
        chatId,
        senderId: user.id,
        content,
        messageType
      });
    }
  };

  const joinChat = (chatId: number) => {
    if (socket) {
      socket.emit('join-chat', chatId);
    }
  };

  const value = {
    socket,
    onlineUsers,
    messages,
    sendMessage,
    joinChat
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}