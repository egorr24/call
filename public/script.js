class AwesomeMessenger {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.token = localStorage.getItem('messenger_token');
        this.chats = new Map();
        this.users = new Map();
        this.selectedFiles = [];
        
        // Видеозвонки
        this.localVideo = document.getElementById('local-video');
        this.remoteVideo = document.getElementById('remote-video');
        this.localStream = null;
        this.peerConnection = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        this.callStartTime = null;
        this.callTimer = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        
        if (this.token) {
            this.verifyToken();
        } else {
            this.showScreen('auth-screen');
        }
    }

    setupEventListeners() {
        // Переключение вкладок авторизации
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchAuthTab(tab);
            });
        });

        // Enter для отправки сообщений
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        // Поиск чатов
        document.getElementById('chat-search').addEventListener('input', (e) => {
            this.searchChats(e.target.value);
        });

        // Поиск пользователей
        document.getElementById('user-search').addEventListener('input', (e) => {
            this.searchUsers(e.target.value);
        });

        // Обработка выбора файлов
        document.getElementById('file-input').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files);
        });

        // Мобильная навигация - кнопка назад
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chat-header') && window.innerWidth <= 768) {
                const rect = e.target.closest('.chat-header').getBoundingClientRect();
                if (e.clientX < 50) { // Клик в левой части заголовка (кнопка назад)
                    this.goBackToChats();
                }
            }
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                // Возвращаем десктопный вид
                document.querySelector('.sidebar').classList.remove('hidden');
                document.querySelector('.chat-area').classList.remove('active');
            }
        });
    }

    goBackToChats() {
        document.querySelector('.sidebar').classList.remove('hidden');
        document.querySelector('.chat-area').classList.remove('active');
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    async verifyToken() {
        try {
            const response = await fetch('/api/me', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();
                this.currentUser = userData.user;
                this.initMessenger();
            } else {
                localStorage.removeItem('messenger_token');
                this.showScreen('auth-screen');
            }
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            localStorage.removeItem('messenger_token');
            this.showScreen('auth-screen');
        }
    }

    async register() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!username || !email || !password) {
            alert('Заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('messenger_token', this.token);
                this.initMessenger();
            } else {
                alert(data.error || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            alert('Ошибка сервера');
        }
    }

    async login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            alert('Заполните все поля');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('messenger_token', this.token);
                this.initMessenger();
            } else {
                alert(data.error || 'Ошибка входа');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            alert('Ошибка сервера');
        }
    }

    initMessenger() {
        this.showScreen('messenger-screen');
        this.setupSocket();
        this.loadUserInfo();
        this.loadChats();
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Подключено к серверу');
            this.socket.emit('authenticate', this.token);
        });

        this.socket.on('authenticated', () => {
            console.log('Аутентификация успешна');
        });

        this.socket.on('auth-error', (data) => {
            console.error('Ошибка аутентификации:', data.error);
            this.logout();
        });

        this.socket.on('new-message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('chat-created', (data) => {
            this.openChat(data.chatId);
        });

        this.socket.on('user-online', (userId) => {
            this.updateUserStatus(userId, true);
        });

        this.socket.on('user-offline', (userId) => {
            this.updateUserStatus(userId, false);
        });

        // Видеозвонки
        this.socket.on('room-created', (data) => {
            console.log('Комната создана:', data);
        });

        this.socket.on('room-joined', (data) => {
            console.log('Присоединился к комнате:', data);
            if (data.users.length > 1) {
                this.createOffer();
            }
        });

        this.socket.on('user-joined', (userId) => {
            console.log('Пользователь присоединился к звонку:', userId);
        });

        this.socket.on('signal', async (data) => {
            await this.handleSignal(data.signal, data.from);
        });

        // Обработка входящих звонков
        this.socket.on('incoming-call', (data) => {
            this.handleIncomingCall(data);
        });

        this.socket.on('call-accepted', (data) => {
            this.handleCallAccepted(data);
        });

        this.socket.on('call-rejected', (data) => {
            this.handleCallRejected(data);
        });

        this.socket.on('call-ended', (data) => {
            this.handleCallEnded(data);
        });
    }

    loadUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-avatar').src = this.currentUser.avatar;
            document.getElementById('user-name').textContent = this.currentUser.username;
        }
    }

    async loadChats() {
        try {
            const response = await fetch('/api/chats', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const chats = await response.json();
                this.renderChats(chats);
            }
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
        }
    }

    renderChats(chats) {
        const chatsList = document.getElementById('chats-list');
        chatsList.innerHTML = '';

        chats.forEach(chat => {
            this.chats.set(chat.id, chat);
            
            const chatElement = document.createElement('div');
            chatElement.className = 'chat-item';
            chatElement.dataset.chatId = chat.id;
            chatElement.onclick = () => this.selectChat(chat.id);

            const lastMessageTime = chat.lastMessage ? 
                this.formatTime(new Date(chat.lastMessage.timestamp)) : '';
            
            const lastMessageText = chat.lastMessage ? 
                (chat.lastMessage.sender === this.currentUser.id ? 'Вы: ' : '') + chat.lastMessage.text : 
                'Нет сообщений';

            chatElement.innerHTML = `
                <img src="${chat.user.avatar}" alt="Avatar" class="avatar">
                <div class="chat-item-info">
                    <div class="chat-item-header">
                        <span class="chat-item-name">${chat.user.username}</span>
                        <span class="chat-item-time">${lastMessageTime}</span>
                    </div>
                    <div class="chat-item-message">${lastMessageText}</div>
                </div>
                ${chat.unreadCount > 0 ? `<div class="unread-badge">${chat.unreadCount}</div>` : ''}
            `;

            chatsList.appendChild(chatElement);
        });
    }

    async selectChat(chatId) {
        // Убираем активный класс с предыдущего чата
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });

        // Добавляем активный класс к выбранному чату
        document.querySelector(`[data-chat-id="${chatId}"]`).classList.add('active');

        this.currentChat = chatId;
        this.socket.emit('join-chat', chatId);

        // Показываем контейнер чата
        document.getElementById('no-chat-selected').style.display = 'none';
        document.getElementById('chat-container').style.display = 'flex';

        // Мобильная навигация
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar').classList.add('hidden');
            document.querySelector('.chat-area').classList.add('active');
        }

        // Загружаем информацию о чате
        const chat = this.chats.get(chatId);
        if (chat) {
            document.getElementById('chat-avatar').src = chat.user.avatar;
            document.getElementById('chat-username').textContent = chat.user.username;
            document.getElementById('chat-status').textContent = chat.user.online ? 'В сети' : 'Не в сети';
            document.getElementById('chat-status').className = `status ${chat.user.online ? 'online' : 'offline'}`;
        }

        // Загружаем сообщения
        await this.loadMessages(chatId);
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const messages = await response.json();
                this.renderMessages(messages);
            }
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        container.innerHTML = '';

        messages.forEach(message => {
            const messageElement = this.createMessageElement(message);
            container.appendChild(messageElement);
        });

        // Прокручиваем к последнему сообщению
        container.scrollTop = container.scrollHeight;
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.currentUser.id ? 'own' : ''}`;

        const time = this.formatTime(new Date(message.timestamp));
        let fileContent = '';

        // Обработка файлов
        if (message.fileData) {
            const file = message.fileData;
            if (file.mimetype.startsWith('image/')) {
                fileContent = `
                    <div class="message-file">
                        <img src="${file.url}" alt="${file.originalName}" class="message-image" onclick="openImageModal('${file.url}')">
                    </div>
                `;
            } else if (file.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video">
                            <source src="${file.url}" type="${file.mimetype}">
                        </video>
                    </div>
                `;
            } else {
                fileContent = `
                    <div class="message-file">
                        <div class="message-document" onclick="downloadFile('${file.url}', '${file.originalName}')">
                            <i class="fas fa-file"></i>
                            <div class="document-info">
                                <div class="document-name">${file.originalName}</div>
                                <div class="document-size">${this.formatFileSize(file.size)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                ${fileContent}
                <div class="message-time">${time}</div>
            </div>
        `;

        return messageDiv;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();

        if (!text && this.selectedFiles.length === 0) return;
        if (!this.currentChat) return;

        // Если есть файлы, отправляем их
        if (this.selectedFiles.length > 0) {
            for (const file of this.selectedFiles) {
                await this.sendFileMessage(file, text);
            }
            this.clearSelectedFiles();
        } else if (text) {
            // Отправляем текстовое сообщение
            this.socket.emit('send-message', {
                chatId: this.currentChat,
                text: text,
                type: 'text'
            });
        }

        input.value = '';
    }

    async sendFileMessage(file, text = '') {
        try {
            // Загружаем файл на сервер
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData
            });

            if (response.ok) {
                const result = await response.json();
                
                // Отправляем сообщение с файлом
                this.socket.emit('send-message', {
                    chatId: this.currentChat,
                    text: text,
                    type: 'file',
                    fileData: result.file
                });
            } else {
                alert('Ошибка загрузки файла');
            }
        } catch (error) {
            console.error('Ошибка отправки файла:', error);
            alert('Ошибка отправки файла');
        }
    }

    selectFile() {
        document.getElementById('file-input').click();
    }

    selectImage() {
        const input = document.getElementById('file-input');
        input.accept = 'image/*';
        input.click();
    }

    handleFileSelect(files) {
        for (const file of files) {
            if (file.size > 50 * 1024 * 1024) { // 50MB лимит
                alert(`Файл ${file.name} слишком большой (максимум 50MB)`);
                continue;
            }
            this.selectedFiles.push(file);
        }
        this.updateFilePreview();
    }

    updateFilePreview() {
        const preview = document.getElementById('file-preview');
        
        if (this.selectedFiles.length === 0) {
            preview.style.display = 'none';
            return;
        }

        preview.style.display = 'flex';
        preview.innerHTML = '';

        this.selectedFiles.forEach((file, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'file-preview-item';

            let content = '';
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);
                content = `<img src="${url}" alt="${file.name}">`;
            } else {
                content = `<i class="fas fa-file" style="font-size: 40px; color: #667eea;"></i>`;
            }

            previewItem.innerHTML = `
                ${content}
                <div class="file-info">
                    <div>${file.name}</div>
                    <div>${this.formatFileSize(file.size)}</div>
                </div>
                <button class="remove-file" onclick="app.removeFile(${index})">×</button>
            `;

            preview.appendChild(previewItem);
        });
    }

    removeFile(index) {
        this.selectedFiles.splice(index, 1);
        this.updateFilePreview();
    }

    handleIncomingCall(data) {
        const { fromUserId, callType, chatId, fromUsername } = data;
        
        // Показываем уведомление о входящем звонке
        if (confirm(`Входящий ${callType === 'video' ? 'видео' : 'аудио'}звонок от ${fromUsername}. Принять?`)) {
            this.acceptCall(data);
        } else {
            this.rejectCall(data);
        }
    }

    async acceptCall(callData) {
        this.currentChat = callData.chatId;
        
        await this.initializeMedia();
        this.setupPeerConnection();
        this.showScreen('video-call-screen');
        
        if (callData.callType === 'audio') {
            this.toggleVideo(); // Отключаем видео для аудиозвонка
        }
        
        this.socket.emit('accept-call', {
            callId: callData.callId,
            targetUserId: callData.fromUserId
        });
        
        document.getElementById('call-status').textContent = 'Подключение...';
        this.startCallTimer();
    }

    rejectCall(callData) {
        this.socket.emit('reject-call', {
            callId: callData.callId,
            targetUserId: callData.fromUserId
        });
    }

    handleCallAccepted(data) {
        document.getElementById('call-status').textContent = 'Подключение...';
        // Создаем offer для начала соединения
        this.createOffer();
    }

    handleCallRejected(data) {
        alert('Звонок отклонен');
        this.endCall();
    }

    handleCallEnded(data) {
        this.endCall();
    }

    handleNewMessage(data) {
        if (data.chatId === this.currentChat) {
            // Добавляем сообщение в текущий чат
            const messageElement = this.createMessageElement(data.message);
            document.getElementById('messages-container').appendChild(messageElement);
            
            // Прокручиваем к новому сообщению
            const container = document.getElementById('messages-container');
            container.scrollTop = container.scrollHeight;
        }

        // Обновляем список чатов
        this.loadChats();
    }

    async showUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const users = await response.json();
                this.renderUsers(users);
                document.getElementById('users-modal').classList.add('active');
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
        }
    }

    renderUsers(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';

        users.forEach(user => {
            this.users.set(user.id, user);
            
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.onclick = () => this.createChat(user.id);

            const lastSeen = user.online ? 'В сети' : 
                `Был(а) в сети ${this.formatTime(new Date(user.lastSeen))}`;

            userElement.innerHTML = `
                <img src="${user.avatar}" alt="Avatar" class="avatar">
                <div class="user-item-info">
                    <div class="user-item-name">${user.username}</div>
                    <div class="user-item-status ${user.online ? 'online' : 'offline'}">${lastSeen}</div>
                </div>
            `;

            usersList.appendChild(userElement);
        });
    }

    createChat(otherUserId) {
        this.socket.emit('create-chat', otherUserId);
        this.closeUsersModal();
    }

    closeUsersModal() {
        document.getElementById('users-modal').classList.remove('active');
    }

    async openChat(chatId) {
        await this.loadChats();
        this.selectChat(chatId);
    }

    updateUserStatus(userId, online) {
        // Обновляем статус в списке пользователей
        const user = this.users.get(userId);
        if (user) {
            user.online = online;
        }

        // Обновляем статус в чатах
        this.chats.forEach(chat => {
            if (chat.user.id === userId) {
                chat.user.online = online;
            }
        });

        // Обновляем интерфейс если это текущий чат
        if (this.currentChat) {
            const currentChatData = this.chats.get(this.currentChat);
            if (currentChatData && currentChatData.user.id === userId) {
                document.getElementById('chat-status').textContent = online ? 'В сети' : 'Не в сети';
                document.getElementById('chat-status').className = `status ${online ? 'online' : 'offline'}`;
            }
        }
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => {
            const name = item.querySelector('.chat-item-name').textContent.toLowerCase();
            if (name.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    searchUsers(query) {
        const userItems = document.querySelectorAll('.user-item');
        userItems.forEach(item => {
            const name = item.querySelector('.user-item-name').textContent.toLowerCase();
            if (name.includes(query.toLowerCase())) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Видеозвонки
    async startVideoCall() {
        if (!this.currentChat) return;
        
        const chat = this.chats.get(this.currentChat);
        if (!chat) return;
        
        // Уведомляем собеседника о входящем звонке
        this.socket.emit('initiate-call', {
            targetUserId: chat.user.id,
            callType: 'video',
            chatId: this.currentChat
        });
        
        await this.initializeMedia();
        this.setupPeerConnection();
        this.showScreen('video-call-screen');
        
        document.getElementById('call-status').textContent = 'Вызов...';
        this.startCallTimer();
    }

    async startAudioCall() {
        if (!this.currentChat) return;
        
        const chat = this.chats.get(this.currentChat);
        if (!chat) return;
        
        // Уведомляем собеседника о входящем звонке
        this.socket.emit('initiate-call', {
            targetUserId: chat.user.id,
            callType: 'audio',
            chatId: this.currentChat
        });
        
        await this.initializeMedia();
        this.setupPeerConnection();
        this.showScreen('video-call-screen');
        
        document.getElementById('call-status').textContent = 'Вызов...';
        this.toggleVideo(); // Отключаем видео для аудиозвонка
        this.startCallTimer();
    }

    async initializeMedia() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            this.localVideo.srcObject = this.localStream;
        } catch (error) {
            console.error('Ошибка доступа к камере/микрофону:', error);
            alert('Не удалось получить доступ к камере или микрофону');
        }
    }

    setupPeerConnection() {
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        this.peerConnection.ontrack = (event) => {
            this.remoteVideo.srcObject = event.streams[0];
            document.getElementById('call-status').textContent = 'Подключено';
        };

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('signal', {
                    roomId: this.currentChat,
                    signal: {
                        type: 'ice-candidate',
                        candidate: event.candidate
                    }
                });
            }
        };
    }

    async createOffer() {
        try {
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            this.socket.emit('signal', {
                roomId: this.currentChat,
                signal: {
                    type: 'offer',
                    offer: offer
                }
            });
        } catch (error) {
            console.error('Ошибка создания offer:', error);
        }
    }

    async handleSignal(signal, from) {
        switch (signal.type) {
            case 'offer':
                await this.handleOffer(signal.offer, from);
                break;
            case 'answer':
                await this.handleAnswer(signal.answer);
                break;
            case 'ice-candidate':
                await this.handleIceCandidate(signal.candidate);
                break;
        }
    }

    async handleOffer(offer, from) {
        try {
            await this.peerConnection.setRemoteDescription(offer);
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            
            this.socket.emit('signal', {
                roomId: this.currentChat,
                signal: {
                    type: 'answer',
                    answer: answer
                },
                to: from
            });
        } catch (error) {
            console.error('Ошибка обработки offer:', error);
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(answer);
        } catch (error) {
            console.error('Ошибка обработки answer:', error);
        }
    }

    async handleIceCandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Ошибка добавления ICE candidate:', error);
        }
    }

    toggleVideo() {
        this.isVideoEnabled = !this.isVideoEnabled;
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = this.isVideoEnabled;
        }
        
        const btn = document.getElementById('toggle-video-btn');
        btn.classList.toggle('disabled', !this.isVideoEnabled);
    }

    toggleAudio() {
        this.isAudioEnabled = !this.isAudioEnabled;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = this.isAudioEnabled;
        }
        
        const btn = document.getElementById('toggle-audio-btn');
        btn.classList.toggle('disabled', !this.isAudioEnabled);
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
            
            this.localVideo.srcObject = screenStream;
            
            videoTrack.onended = () => {
                this.localVideo.srcObject = this.localStream;
                if (sender && this.localStream) {
                    const cameraTrack = this.localStream.getVideoTracks()[0];
                    sender.replaceTrack(cameraTrack);
                }
            };
            
        } catch (error) {
            console.error('Ошибка демонстрации экрана:', error);
        }
    }

    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Уведомляем сервер о завершении звонка
        this.socket.emit('end-call', {
            chatId: this.currentChat
        });
        
        this.stopCallTimer();
        this.showScreen('messenger-screen');
    }

    clearSelectedFiles() {
        this.selectedFiles = [];
        this.updateFilePreview();
    }

    startCallTimer() {
        this.callStartTime = Date.now();
        this.callTimer = setInterval(() => {
            const elapsed = Date.now() - this.callStartTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('call-duration').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopCallTimer() {
        if (this.callTimer) {
            clearInterval(this.callTimer);
            this.callTimer = null;
        }
    }

    logout() {
        localStorage.removeItem('messenger_token');
        if (this.socket) {
            this.socket.disconnect();
        }
        this.showScreen('auth-screen');
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) { // меньше минуты
            return 'сейчас';
        } else if (diff < 3600000) { // меньше часа
            return `${Math.floor(diff / 60000)} мин назад`;
        } else if (diff < 86400000) { // меньше дня
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальные функции для HTML
function register() {
    app.register();
}

function login() {
    app.login();
}

function logout() {
    app.logout();
}

function sendMessage() {
    app.sendMessage();
}

function showUsers() {
    app.showUsers();
}

function closeUsersModal() {
    app.closeUsersModal();
}

function startVideoCall() {
    app.startVideoCall();
}

function startAudioCall() {
    app.startAudioCall();
}

function toggleVideo() {
    app.toggleVideo();
}

function toggleAudio() {
    app.toggleAudio();
}

function shareScreen() {
    app.shareScreen();
}

function endCall() {
    app.endCall();
}

function selectFile() {
    app.selectFile();
}

function selectImage() {
    app.selectImage();
}

function openImageModal(url) {
    window.open(url, '_blank');
}

function downloadFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AwesomeMessenger();
});