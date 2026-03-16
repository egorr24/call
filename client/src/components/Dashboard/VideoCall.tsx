import React, { useRef, useEffect } from 'react';
import { 
  PhoneXMarkIcon, 
  MicrophoneIcon, 
  VideoCameraIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { 
  MicrophoneIcon as MicrophoneOffIcon,
  VideoCameraSlashIcon
} from '@heroicons/react/24/outline';
import { useCall } from '../../contexts/CallContext';

export default function VideoCall() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const {
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    endCall,
    toggleMute,
    toggleVideo
  } = useCall();

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="flex-1 bg-black relative">
      {/* Удаленное видео (основное) */}
      <div className="w-full h-full relative">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="video-element"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center text-white">
              <div className="w-24 h-24 bg-gray-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold">А</span>
              </div>
              <p className="text-lg">Алексей Петров</p>
              <p className="text-sm text-gray-300">Подключение...</p>
            </div>
          </div>
        )}
      </div>

      {/* Локальное видео (мини) */}
      <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
        {localStream && !isVideoOff ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="video-element transform scale-x-[-1]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-700">
            <div className="text-center text-white">
              <div className="w-12 h-12 bg-gray-600 rounded-full mx-auto mb-2 flex items-center justify-center">
                <span className="text-sm font-bold">Я</span>
              </div>
              <p className="text-xs">Видео выключено</p>
            </div>
          </div>
        )}
      </div>

      {/* Элементы управления */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleMute}
            className={`video-control-btn ${isMuted ? 'unmute' : 'mute'}`}
          >
            {isMuted ? (
              <MicrophoneOffIcon className="w-6 h-6" />
            ) : (
              <MicrophoneIcon className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={toggleVideo}
            className={`video-control-btn ${isVideoOff ? 'unmute' : 'mute'}`}
          >
            {isVideoOff ? (
              <VideoCameraSlashIcon className="w-6 h-6" />
            ) : (
              <VideoCameraIcon className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={endCall}
            className="video-control-btn end-call"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Информация о звонке */}
      <div className="absolute top-4 left-4 text-white">
        <p className="text-lg font-semibold">Алексей Петров</p>
        <p className="text-sm text-gray-300">Видеозвонок • 00:45</p>
      </div>
    </div>
  );
}