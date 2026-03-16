import React from 'react';
import { PhoneIcon, PhoneXMarkIcon, UserCircleIcon } from '@heroicons/react/24/solid';
import { useCall } from '../../contexts/CallContext';

export default function IncomingCall() {
  const { incomingCall, answerCall, endCall } = useCall();

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-flux-dark rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="mb-6">
          <div className="w-24 h-24 mx-auto mb-4">
            <UserCircleIcon className="w-full h-full text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {incomingCall.fromUsername}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Входящий видеозвонок
          </p>
        </div>

        <div className="flex justify-center space-x-8">
          <button
            onClick={endCall}
            className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition-colors"
          >
            <PhoneXMarkIcon className="w-8 h-8" />
          </button>
          
          <button
            onClick={answerCall}
            className="w-16 h-16 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center text-white transition-colors animate-pulse-slow"
          >
            <PhoneIcon className="w-8 h-8" />
          </button>
        </div>

        <div className="mt-6 flex justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Отклонить</span>
          <span>Ответить</span>
        </div>
      </div>
    </div>
  );
}