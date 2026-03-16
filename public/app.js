const socket = io();

const createRoomBtn = document.getElementById('createRoomBtn');
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdInput = document.getElementById('roomIdInput');
const roomLink = document.getElementById('roomLink');
const linkInput = document.getElementById('linkInput');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const enterRoomBtn = document.getElementById('enterRoomBtn');

let currentRoomId = null;

// Create room
createRoomBtn.addEventListener('click', () => {
    socket.emit('create-room');
});

// Join room
joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value.trim();
    if (roomId) {
        window.location.href = `/room/${roomId}`;
    }
});

// Enter key for join room
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomBtn.click();
    }
});

// Copy link
copyLinkBtn.addEventListener('click', async () => {
    try {
        await navigator.clipboard.writeText(linkInput.value);
        copyLinkBtn.textContent = 'Скопировано!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Копировать';
        }, 2000);
    } catch (err) {
        // Fallback for older browsers
        linkInput.select();
        document.execCommand('copy');
        copyLinkBtn.textContent = 'Скопировано!';
        setTimeout(() => {
            copyLinkBtn.textContent = 'Копировать';
        }, 2000);
    }
});

// Enter room
enterRoomBtn.addEventListener('click', () => {
    if (currentRoomId) {
        window.location.href = `/room/${currentRoomId}`;
    }
});

// Socket events
socket.on('room-created', (roomId) => {
    currentRoomId = roomId;
    const roomUrl = `${window.location.origin}/room/${roomId}`;
    linkInput.value = roomUrl;
    roomLink.style.display = 'block';
});

socket.on('room-not-found', () => {
    alert('Комната не найдена. Проверьте ID комнаты.');
});