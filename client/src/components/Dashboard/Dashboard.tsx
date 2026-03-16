import React, { useState } from 'react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import VideoCall from './VideoCall';
import IncomingCall from './IncomingCall';
import { useCall } from '../../contexts/CallContext';

export default function Dashboard() {
  const [selectedChat, setSelectedChat] = useState<number | null>(null);
  const { isInCall, incomingCall } = useCall();

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-flux-darker">
      {/* Боковая панель */}
      <Sidebar 
        selectedChat={selectedChat}
        onSelectChat={setSelectedChat}
      />
      
      {/* Основная область чата */}
      <div className="flex-1 flex flex-col">
        {isInCall ? (
          <VideoCall />
        ) : (
          <ChatArea selectedChat={selectedChat} />
        )}
      </div>

      {/* Входящий звонок */}
      {incomingCall && !isInCall && (
        <IncomingCall />
      )}
    </div>
  );
}