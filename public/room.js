const socket = io();

// Get room ID from URL
const roomId = window.location.pathname.split('/')[2];
const roomIdDisplay = document.getElementById('roomIdDisplay');
const copyRoomLink = document.getElementById('copyRoomLink');
const waitingMessage = document.getElementById('waitingMessage');

// Video elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

// Control buttons
const toggleVideo = document.getElementById('toggleVideo');
const toggleAudio = document.getElementById('toggleAudio');
const shareScreen = document.getElementById('shareScreen');
const endCall = document.getElementById('endCall');

// WebRTC configuration
const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

let localStream = null;
let remoteStream = null;
let peerConnection = null;
let isVideoEnabled = true;
let isAudioEnabled = true;

// Initialize
roomIdDisplay.textContent = roomId;

// Get user media
async function initializeMedia() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        
        // Join room after getting media
        socket.emit('join-room', roomId);
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Не удалось получить доступ к камере и микрофону');
    }
}

// Create peer connection
function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);
    
    // Add local stream tracks
    if (localStream) {
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });
    }
    
    // Handle remote stream
    peerConnection.ontrack = (event) => {
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
        waitingMessage.style.display = 'none';
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice-candidate', {
                roomId: roomId,
                candidate: event.candidate
            });
        }
    };
    
    return peerConnection;
}

// Create offer
async function createOffer() {
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    socket.emit('offer', {
        roomId: roomId,
        offer: offer
    });
}

// Create answer
async function createAnswer(offer) {
    const pc = createPeerConnection();
    await pc.setRemoteDescription(offer);
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socket.emit('answer', {
        roomId: roomId,
        answer: answer
    });
}

// Control functions
toggleVideo.addEventListener('click', () => {
    if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            isVideoEnabled = videoTrack.enabled;
            toggleVideo.classList.toggle('video-on', isVideoEnabled);
            toggleVideo.classList.toggle('video-off', !isVideoEnabled);
        }
    }
});

toggleAudio.addEventListener('click', () => {
    if (localStream) {
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            isAudioEnabled = audioTrack.enabled;
            toggleAudio.classList.toggle('audio-on', isAudioEnabled);
            toggleAudio.classList.toggle('audio-off', !isAudioEnabled);
        }
    }
});

shareScreen.addEventListener('click', async () => {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        });
        
        // Replace video track
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
        );
        
        if (sender) {
            await sender.replaceTrack(videoTrack);
        }
        
        localVideo.srcObject = screenStream;
        
        // Handle screen share end
        videoTrack.onended = async () => {
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            const cameraVideoTrack = cameraStream.getVideoTracks()[0];
            if (sender) {
                await sender.replaceTrack(cameraVideoTrack);
            }
            
            localVideo.srcObject = cameraStream;
            localStream = cameraStream;
        };
        
    } catch (error) {
        console.error('Error sharing screen:', error);
    }
});

endCall.addEventListener('click', () => {
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    window.location.href = '/';
});

copyRoomLink.addEventListener('click', async () => {
    const roomUrl = window.location.href;
    try {
        await navigator.clipboard.writeText(roomUrl);
        copyRoomLink.textContent = 'Скопировано!';
        setTimeout(() => {
            copyRoomLink.textContent = 'Копировать ссылку';
        }, 2000);
    } catch (err) {
        console.error('Error copying link:', err);
    }
});

// Socket events
socket.on('room-joined', () => {
    console.log('Joined room successfully');
});

socket.on('user-joined', () => {
    console.log('Another user joined');
    createOffer();
});

socket.on('offer', async (data) => {
    console.log('Received offer');
    await createAnswer(data.offer);
});

socket.on('answer', async (data) => {
    console.log('Received answer');
    await peerConnection.setRemoteDescription(data.answer);
});

socket.on('ice-candidate', async (data) => {
    console.log('Received ICE candidate');
    if (peerConnection) {
        await peerConnection.addIceCandidate(data.candidate);
    }
});

socket.on('user-left', () => {
    console.log('User left');
    remoteVideo.srcObject = null;
    waitingMessage.style.display = 'block';
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
});

socket.on('room-not-found', () => {
    alert('Комната не найдена');
    window.location.href = '/';
});

// Initialize when page loads
initializeMedia();