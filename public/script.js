class MessengerApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isDrawing = false;
        this.drawingContext = null;
        this.lastDrawPoint = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Global click handler for all buttons
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        // Form submissions
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleEnterKey(e);
            }
        });

        // File input changes
        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });

        document.getElementById('avatar-input')?.addEventListener('change', (e) => {
            this.handleAvatarSelect(e);
        });
    }

    handleGlobalClick(e) {
        const target = e.target.closest('button') || e.target;
        
        // Auth buttons
        if (target.classList.contains('tab-btn')) {
            this.switchAuthTab(target.dataset.tab);
        } else if (target.classList.contains('auth-btn')) {
            const form = target.closest('.auth-form');
            if (form.id === 'login-form') {
                this.handleLogin();
            } else if (form.id === 'register-form') {
                this.handleRegister();
            }
        }
        // Header buttons
        else if (target.title === 'Статус') {
            this.openStatusModal();
        } else if (target.title === 'Найти пользователей') {
            this.openUsersModal();
        } else if (target.title === 'Настройки') {
            this.openSettingsModal();
        } else if (target.title === 'Выйти') {
            this.logout();
        }
        // Settings tabs
        else if (target.classList.contains('settings-tab')) {
            this.switchSettingsTab(target.dataset.tab);
        }
        // Theme selection
        else if (target.classList.contains('theme-card')) {
            this.selectTheme(target.dataset.theme);
        }
        // Chat type selection
        else if (target.classList.contains('chat-type-btn')) {
            this.selectChatType(target.dataset.type);
        }
        // Status selection
        else if (target.classList.contains('status-option')) {
            this.selectStatus(target.dataset.status);
        }
        // Game selection
        else if (target.classList.contains('game-card')) {
            this.startGame(target.dataset.game);
        }
        // Sticker tabs
        else if (target.classList.contains('sticker-tab')) {
            this.switchStickerTab(target.dataset.tab);
        }
        // Drawing tools
        else if (target.classList.contains('draw-tool')) {
            this.selectDrawTool(target.dataset.tool);
        }
    }
    handleEnterKey(e) {
        if (e.target.id === 'message-input') {
            e.preventDefault();
            this.sendMessage();
        } else if (e.target.id === 'login-email' || e.target.id === 'login-password') {
            e.preventDefault();
            this.handleLogin();
        } else if (e.target.id === 'register-email' || e.target.id === 'register-username' || e.target.id === 'register-password') {
            e.preventDefault();
            this.handleRegister();
        }
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
    }

    async handleLogin() {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('token', data.token);
                this.showMainScreen();
                this.connectSocket();
            } else {
                this.showNotification(data.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка подключения', 'error');
        }
    }

    async handleRegister() {
        const email = document.getElementById('register-email').value.trim();
        const username = document.getElementById('register-username').value.trim();
        const password = document.getElementById('register-password').value;

        if (!email || !username || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });

            const data = await response.json();
            
            if (data.success) {
                this.showNotification('Регистрация успешна! Войдите в систему', 'success');
                this.switchAuthTab('login');
            } else {
                this.showNotification(data.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка подключения', 'error');
        }
    }
    checkAuthStatus() {
        const token = localStorage.getItem('token');
        if (token) {
            // Verify token with server
            fetch('/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    this.currentUser = data.user;
                    this.showMainScreen();
                    this.connectSocket();
                } else {
                    localStorage.removeItem('token');
                    this.showAuthScreen();
                }
            })
            .catch(() => {
                localStorage.removeItem('token');
                this.showAuthScreen();
            });
        } else {
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('main-screen').classList.remove('active');
    }

    showMainScreen() {
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('main-screen').classList.add('active');
        this.loadChats();
    }

    connectSocket() {
        this.socket = io();
        
        this.socket.on('connect', () => {
            this.socket.emit('user-online', this.currentUser.id);
        });

        this.socket.on('new-message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('user-status', (data) => {
            this.updateUserStatus(data.userId, data.status);
        });

        this.socket.on('typing', (data) => {
            this.showTypingIndicator(data.userId, data.chatId);
        });

        this.socket.on('stop-typing', (data) => {
            this.hideTypingIndicator(data.userId, data.chatId);
        });
    }

    logout() {
        localStorage.removeItem('token');
        if (this.socket) {
            this.socket.disconnect();
        }
        this.currentUser = null;
        this.currentChat = null;
        this.showAuthScreen();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    async loadChats() {
        try {
            const response = await fetch('/api/chats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderChatList(data.chats);
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки чатов', 'error');
        }
    }

    renderChatList(chats) {
        const chatList = document.getElementById('chat-list');
        chatList.innerHTML = '';
        
        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.dataset.chatId = chat.id;
            
            chatItem.innerHTML = `
                <div class="chat-avatar">
                    <img src="${chat.avatar || '/default-avatar.png'}" alt="${chat.name}">
                    <div class="status-indicator ${chat.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="chat-info">
                    <div class="chat-name">${this.escapeHtml(chat.name)}</div>
                    <div class="chat-last-message">${this.escapeHtml(chat.lastMessage || 'Нет сообщений')}</div>
                </div>
                <div class="chat-meta">
                    <div class="chat-time">${this.formatTime(chat.lastMessageTime)}</div>
                    ${chat.unreadCount ? `<div class="unread-count">${chat.unreadCount}</div>` : ''}
                </div>
            `;
            
            chatItem.addEventListener('click', () => {
                this.selectChat(chat);
            });
            
            chatList.appendChild(chatItem);
        });
    }

    selectChat(chat) {
        this.currentChat = chat;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-chat-id="${chat.id}"]`).classList.add('active');
        
        // Update chat header
        document.querySelector('.chat-name').textContent = chat.name;
        document.querySelector('.chat-status').textContent = chat.isOnline ? 'в сети' : 'не в сети';
        document.querySelector('.chat-avatar img').src = chat.avatar || '/default-avatar.png';
        
        // Load messages
        this.loadMessages(chat.id);
        
        // Show chat area
        document.querySelector('.chat-area').style.display = 'flex';
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderMessages(data.messages);
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки сообщений', 'error');
        }
    }
    renderMessages(messages) {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.innerHTML = '';
        
        messages.forEach(message => {
            const messageDiv = this.createMessageElement(message);
            messagesContainer.appendChild(messageDiv);
        });
        
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.senderId === this.currentUser.id ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;
        
        let fileContent = '';
        if (message.file) {
            const fileUrl = `/uploads/${message.file.filename}`;
            
            if (message.file.mimetype.startsWith('image/')) {
                fileContent = `
                    <div class="message-file">
                        <img src="${fileUrl}" alt="Image" class="message-image" loading="lazy">
                    </div>
                `;
            } else if (message.file.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video" preload="metadata">
                            <source src="${fileUrl}" type="${message.file.mimetype}">
                        </video>
                    </div>
                `;
            } else {
                fileContent = `
                    <div class="message-file">
                        <div class="message-document">
                            <i class="fas fa-file"></i>
                            <div class="document-info">
                                <div class="document-name">${this.escapeHtml(message.file.originalName)}</div>
                                <div class="document-size">${this.formatFileSize(message.file.size)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        let reactionsContent = '';
        if (message.reactions && Object.keys(message.reactions).length > 0) {
            reactionsContent = `
                <div class="message-reactions">
                    ${Object.entries(message.reactions).map(([emoji, users]) => `
                        <div class="reaction ${users.includes(this.currentUser.id) ? 'own' : ''}" data-emoji="${emoji}">
                            <span class="reaction-emoji">${emoji}</span>
                            <span class="reaction-count">${users.length}</span>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                ${fileContent}
                ${reactionsContent}
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;
        
        return messageDiv;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        const text = input.value.trim();
        
        if (!text || !this.currentChat) return;
        
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: text
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                input.value = '';
                // Message will be added via socket
            } else {
                this.showNotification('Ошибка отправки сообщения', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка отправки сообщения', 'error');
        }
    }
    handleNewMessage(message) {
        if (this.currentChat && message.chatId === this.currentChat.id) {
            const messageElement = this.createMessageElement(message);
            document.getElementById('messages').appendChild(messageElement);
            this.scrollToBottom();
        }
        
        // Update chat list
        this.updateChatInList(message);
    }

    updateChatInList(message) {
        const chatItem = document.querySelector(`[data-chat-id="${message.chatId}"]`);
        if (chatItem) {
            const lastMessageEl = chatItem.querySelector('.chat-last-message');
            const timeEl = chatItem.querySelector('.chat-time');
            
            lastMessageEl.textContent = message.text || 'Файл';
            timeEl.textContent = this.formatTime(message.timestamp);
            
            // Move to top
            chatItem.parentNode.insertBefore(chatItem, chatItem.parentNode.firstChild);
        }
    }

    // Modal functions
    openStatusModal() {
        document.getElementById('status-modal').style.display = 'flex';
    }

    openUsersModal() {
        document.getElementById('users-modal').style.display = 'flex';
        this.loadUsers();
    }

    openSettingsModal() {
        document.getElementById('settings-modal').style.display = 'flex';
        this.loadUserSettings();
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages');
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    updateUserStatus(userId, status) {
        // Update status indicators in chat list and current chat
        const statusIndicators = document.querySelectorAll(`[data-user-id="${userId}"] .status-indicator`);
        statusIndicators.forEach(indicator => {
            indicator.className = `status-indicator ${status}`;
        });
    }

    showTypingIndicator(userId, chatId) {
        if (this.currentChat && chatId === this.currentChat.id) {
            // Show typing indicator
        }
    }

    hideTypingIndicator(userId, chatId) {
        if (this.currentChat && chatId === this.currentChat.id) {
            // Hide typing indicator
        }
    }

    // File handling
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        files.forEach(file => {
            this.sendFileMessage(file);
        });
    }

    async sendFileMessage(file) {
        if (!this.currentChat) return;
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', this.currentChat.id);
        
        try {
            const response = await fetch('/api/messages/file', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showNotification('Ошибка отправки файла', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка отправки файла', 'error');
        }
    }

    // Voice recording
    async startVoiceRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.sendVoiceMessage(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            const voiceBtn = document.getElementById('voice-btn');
            voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
            voiceBtn.classList.add('recording');
            
        } catch (error) {
            this.showNotification('Ошибка доступа к микрофону', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Update UI
            const voiceBtn = document.getElementById('voice-btn');
            voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            voiceBtn.classList.remove('recording');
        }
    }

    async sendVoiceMessage(audioBlob) {
        if (!this.currentChat) return;
        
        const formData = new FormData();
        formData.append('voice', audioBlob, 'voice.webm');
        formData.append('chatId', this.currentChat.id);
        
        try {
            const response = await fetch('/api/messages/voice', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showNotification('Ошибка отправки голосового сообщения', 'error');
            }
        } catch (error) {
            this.showNotification('Ошибка отправки голосового сообщения', 'error');
        }
    }

    // Additional methods for new features
    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await response.json();
            
            if (data.success) {
                this.renderUsersList(data.users);
            }
        } catch (error) {
            this.showNotification('Ошибка загрузки пользователей', 'error');
        }
    }

    renderUsersList(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.avatar || '/default-avatar.png'}" alt="${user.username}">
                    <div class="status-indicator ${user.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="user-info">
                    <div class="user-name">${this.escapeHtml(user.username)}</div>
                    <div class="user-status">${user.isOnline ? 'в сети' : 'не в сети'}</div>
                </div>
                <button class="btn-primary" onclick="app.startChat('${user.id}')">Написать</button>
            `;
            usersList.appendChild(userItem);
        });
    }

    async startChat(userId) {
        try {
            const response = await fetch('/api/chats/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.closeModal('users-modal');
                this.selectChat(data.chat);
                this.loadChats(); // Refresh chat list
            }
        } catch (error) {
            this.showNotification('Ошибка создания чата', 'error');
        }
    }

    loadUserSettings() {
        if (this.currentUser) {
            document.getElementById('settings-username').value = this.currentUser.username;
            document.getElementById('settings-email').value = this.currentUser.email;
            document.getElementById('settings-avatar').src = this.currentUser.avatar || '/default-avatar.png';
        }
    }

    // Additional UI handlers
    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-settings`).classList.add('active');
    }

    selectTheme(theme) {
        document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('active'));
        event.target.closest('.theme-card').classList.add('active');
        
        // Apply theme
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
    }

    selectChatType(type) {
        document.querySelectorAll('.chat-type-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.chat-type-btn').classList.add('active');
        
        // Show/hide group options
        const groupActions = document.getElementById('group-actions');
        if (type === 'group') {
            groupActions.style.display = 'block';
        } else {
            groupActions.style.display = 'none';
        }
    }

    selectStatus(status) {
        document.querySelectorAll('.status-option').forEach(option => option.classList.remove('active'));
        event.target.closest('.status-option').classList.add('active');
        
        // Update user status
        this.updateUserStatus(this.currentUser.id, status);
    }

    startGame(game) {
        this.closeModal('games-modal');
        this.showNotification(`Запуск игры: ${game}`, 'info');
        // Game logic would go here
    }

    switchStickerTab(tab) {
        document.querySelectorAll('.sticker-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.sticker-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-content`).classList.add('active');
    }

    selectDrawTool(tool) {
        document.querySelectorAll('.draw-tool').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.draw-tool').classList.add('active');
        
        // Update drawing tool
        this.currentDrawTool = tool;
    }

    // Initialize app when DOM is loaded
    static init() {
        return new MessengerApp();
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = MessengerApp.init();
});

// Add global event handlers for modal close buttons
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-btn') || e.target.classList.contains('close-poll-btn') || e.target.classList.contains('close-draw-btn')) {
        const modal = e.target.closest('.modal, .poll-panel, .draw-panel');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // Handle send button
    if (e.target.classList.contains('send-btn') || e.target.closest('.send-btn')) {
        app.sendMessage();
    }
    
    // Handle file attachment
    if (e.target.title === 'Прикрепить файл') {
        document.getElementById('file-input').click();
    }
    
    // Handle photo attachment
    if (e.target.title === 'Отправить фото') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => app.handleFileSelect(e);
        input.click();
    }
    
    // Handle voice recording
    if (e.target.title === 'Голосовое сообщение' || e.target.closest('#voice-btn')) {
        if (app.isRecording) {
            app.stopVoiceRecording();
        } else {
            app.startVoiceRecording();
        }
    }
    
    // Handle stickers panel
    if (e.target.title === 'Стикеры и GIF' || e.target.closest('#sticker-btn')) {
        const panel = document.getElementById('sticker-panel');
        panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
    }
    
    // Handle poll creation
    if (e.target.title === 'Создать опрос' || e.target.closest('#poll-btn')) {
        document.getElementById('poll-panel').style.display = 'block';
    }
    
    // Handle drawing
    if (e.target.title === 'Совместное рисование' || e.target.closest('#draw-btn')) {
        document.getElementById('draw-panel').style.display = 'block';
    }
});