import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import Peer from 'simple-peer';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

interface CallContextType {
  isInCall: boolean;
  incomingCall: any;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  startCall: (targetUserId: number) => void;
  answerCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export function useCall() {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
}

interface CallProviderProps {
  children: ReactNode;
}

export function CallProvider({ children }: CallProviderProps) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerRef = useRef<Peer.Instance | null>(null);
  const callId = useRef<string>('');

  // Обработчики Socket.io событий для звонков
  React.useEffect(() => {
    if (!socket) return;

    socket.on('incoming-call', handleIncomingCall);
    socket.on('call-answered', handleCallAnswered);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('call-ended', handleCallEnded);

    return () => {
      socket.off('incoming-call');
      socket.off('call-answered');
      socket.off('ice-candidate');
      socket.off('call-ended');
    };
  }, [socket]);

  const handleIncomingCall = (data: any) => {
    setIncomingCall(data);
  };

  const handleCallAnswered = (data: any) => {
    if (peerRef.current && data.callId === callId.current) {
      peerRef.current.signal(data.signal);
    }
  };
  const handleIceCandidate = (data: any) => {
    if (peerRef.current && data.callId === callId.current) {
      peerRef.current.signal(data.candidate);
    }
  };

  const handleCallEnded = () => {
    endCall();
  };

  const startCall = async (targetUserId: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      callId.current = Date.now().toString();

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (signal) => {
        socket?.emit('call-user', {
          targetUserId,
          signal,
          callId: callId.current
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      peerRef.current = peer;
    } catch (error) {
      console.error('Error starting call:', error);
    }
  };

  const answerCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      setIsInCall(true);
      callId.current = incomingCall.callId;

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: stream
      });

      peer.on('signal', (signal) => {
        socket?.emit('answer-call', {
          targetUserId: incomingCall.from,
          signal,
          callId: callId.current
        });
      });

      peer.on('stream', (remoteStream) => {
        setRemoteStream(remoteStream);
      });

      peer.signal(incomingCall.signal);
      peerRef.current = peer;
      setIncomingCall(null);
    } catch (error) {
      console.error('Error answering call:', error);
    }
  };

  const endCall = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    setRemoteStream(null);
    setIsInCall(false);
    setIncomingCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    callId.current = '';

    socket?.emit('end-call', { targetUserId: incomingCall?.from });
  };

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const value = {
    isInCall,
    incomingCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo
  };

  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
}