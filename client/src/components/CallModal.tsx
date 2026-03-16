import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'

interface CallModalProps {
  isOpen?: boolean
  onClose?: () => void
  caller?: string
  isIncoming?: boolean
}

export default function CallModal({ 
  isOpen = false, 
  onClose, 
  caller = "Пользователь",
  isIncoming = false 
}: CallModalProps) {
  const [isCallActive, setIsCallActive] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isCallActive])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleAcceptCall = () => {
    setIsCallActive(true)
    // Здесь будет логика WebRTC
  }

  const handleEndCall = () => {
    setIsCallActive(false)
    setCallDuration(0)
    onClose?.()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="w-full max-w-4xl h-full max-h-screen bg-gray-900 rounded-lg overflow-hidden relative"
        >
          {/* Video Area */}
          <div className="relative h-full">
            {/* Remote Video */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
            />
            
            {/* Local Video */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
            </div>

            {/* Call Info */}
            <div className="absolute top-4 left-4 text-white">
              <h3 className="text-xl font-semibold">{caller}</h3>
              {isCallActive ? (
                <p className="text-green-400">{formatDuration(callDuration)}</p>
              ) : isIncoming ? (
                <p className="text-blue-400">Входящий звонок...</p>
              ) : (
                <p className="text-yellow-400">Соединение...</p>
              )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div className="flex items-center space-x-4">
                {/* Mute */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-4 rounded-full transition-colors ${
                    isMuted 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6 text-white" />
                  ) : (
                    <Mic className="h-6 w-6 text-white" />
                  )}
                </button>

                {/* Video Toggle */}
                <button
                  onClick={() => setIsVideoOff(!isVideoOff)}
                  className={`p-4 rounded-full transition-colors ${
                    isVideoOff 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {isVideoOff ? (
                    <VideoOff className="h-6 w-6 text-white" />
                  ) : (
                    <Video className="h-6 w-6 text-white" />
                  )}
                </button>

                {/* Accept Call (only for incoming) */}
                {isIncoming && !isCallActive && (
                  <button
                    onClick={handleAcceptCall}
                    className="p-4 rounded-full bg-green-600 hover:bg-green-700 transition-colors"
                  >
                    <Phone className="h-6 w-6 text-white" />
                  </button>
                )}

                {/* End Call */}
                <button
                  onClick={handleEndCall}
                  className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <PhoneOff className="h-6 w-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}