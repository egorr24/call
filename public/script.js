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
        // Находим ближайшую кнопку или элемент с обработчиком
        const target = e.target.closest('button') || e.target.closest('[data-action]') || e.target;
        
        console.log('🔥 Клик по элементу:', target.tagName, 'Классы:', target.className, 'Title:', target.title, 'ID:', target.id);
        
        // Проверяем иконки внутри кнопок
        const button = e.target.closest('button');
        if (button) {
            console.log('🔥 Найдена кнопка:', button.className, 'Title:', button.title);
        }
        
        // Auth buttons
        if (target.classList.contains('tab-btn')) {
            this.switchAuthTab(target.dataset.tab);
        } else if (target.classList.contains('auth-btn')) {
            const form = target.closest('.auth-form');
            if (form && form.id === 'login-form') {
                console.log('🔥 Нажата кнопка входа');
                this.handleLogin();
            } else if (form && form.id === 'register-form') {
                console.log('🔥 Нажата кнопка регистрации');
                this.handleRegister();
            }
        }
        // Header buttons - проверяем и кнопку и её родителя
        else if (target.title === 'Статус' || (button && button.title === 'Статус')) {
            console.log('🔥 Открываем статус');
            this.openStatusModal();
        } else if (target.title === 'Найти пользователей' || (button && button.title === 'Найти пользователей')) {
            console.log('🔥 Открываем поиск пользователей');
            this.openUsersModal();
        } else if (target.title === 'Настройки' || (button && button.title === 'Настройки')) {
            console.log('🔥 Открываем настройки');
            this.openSettingsModal();
        } else if (target.title === 'Выйти' || (button && button.title === 'Выйти')) {
            console.log('🔥 Выходим');
            this.logout();
        }
        // Chat actions
        else if (target.title === 'Игры' || (button && button.title === 'Игры')) {
            console.log('🔥 Открываем игры');
            this.openGamesModal();
        } else if (target.title === 'Видеозвонок' || (button && button.title === 'Видеозвонок')) {
            console.log('🔥 Видеозвонок');
            this.startVideoCall();
        } else if (target.title === 'Аудиозвонок' || (button && button.title === 'Аудиозвонок')) {
            console.log('🔥 Аудиозвонок');
            this.startAudioCall();
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
        console.log('🔥 Переключаем вкладку на:', tab);
        
        const tabButtons = document.querySelectorAll('.tab-btn');
        const authForms = document.querySelectorAll('.auth-form');
        
        tabButtons.forEach(btn => btn.classList.remove('active'));
        authForms.forEach(form => form.classList.remove('active'));
        
        const targetTab = document.querySelector(`[data-tab="${tab}"]`);
        const targetForm = document.getElementById(`${tab}-form`);
        
        if (targetTab) targetTab.classList.add('active');
        if (targetForm) targetForm.classList.add('active');
    }

    async handleLogin() {
        const emailEl = document.getElementById('login-email');
        const passwordEl = document.getElementById('login-password');
        
        if (!emailEl || !passwordEl) {
            console.error('🔥 Элементы формы входа не найдены');
            this.showNotification('Ошибка: элементы формы не найдены', 'error');
            return;
        }
        
        const email = emailEl.value.trim();
        const password = passwordEl.value;

        console.log('🔥 Попытка входа:', { email, password: '***' });

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            console.log('🔥 Отправляем запрос на /api/login');
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('🔥 Ответ сервера:', response.status, response.statusText);
            const data = await response.json();
            console.log('🔥 Данные ответа:', data);
            
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('token', data.token);
                this.showMainScreen();
                this.connectSocket();
                this.showNotification('Вход выполнен успешно!', 'success');
            } else {
                this.showNotification(data.message || 'Ошибка входа', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при входе:', error);
            this.showNotification('Ошибка подключения', 'error');
        }
    }

    async handleRegister() {
        const emailEl = document.getElementById('register-email');
        const usernameEl = document.getElementById('register-username');
        const passwordEl = document.getElementById('register-password');
        
        if (!emailEl || !usernameEl || !passwordEl) {
            console.error('🔥 Элементы формы регистрации не найдены');
            this.showNotification('Ошибка: элементы формы не найдены', 'error');
            return;
        }
        
        const email = emailEl.value.trim();
        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        console.log('🔥 Попытка регистрации:', { email, username, password: '***' });

        if (!email || !username || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            console.log('🔥 Отправляем запрос на /api/register');
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password })
            });

            console.log('🔥 Ответ сервера:', response.status, response.statusText);
            const data = await response.json();
            console.log('🔥 Данные ответа:', data);
            
            if (data.success) {
                this.showNotification('Регистрация успешна! Войдите в систему', 'success');
                this.switchAuthTab('login');
            } else {
                this.showNotification(data.message || 'Ошибка регистрации', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при регистрации:', error);
            this.showNotification('Ошибка подключения', 'error');
        }
    }
    checkAuthStatus() {
        console.log('🔥 Проверяем статус авторизации');
        const token = localStorage.getItem('token');
        
        if (token) {
            console.log('🔥 Токен найден, проверяем на сервере');
            // Verify token with server
            fetch('/api/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(response => response.json())
            .then(data => {
                console.log('🔥 Ответ проверки токена:', data);
                if (data.success) {
                    this.currentUser = data.user;
                    this.showMainScreen();
                    this.connectSocket();
                } else {
                    localStorage.removeItem('token');
                    this.showAuthScreen();
                }
            })
            .catch((error) => {
                console.error('🔥 Ошибка проверки токена:', error);
                localStorage.removeItem('token');
                this.showAuthScreen();
            });
        } else {
            console.log('🔥 Токен не найден, показываем экран авторизации');
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        const authScreen = document.getElementById('auth-screen');
        const messengerScreen = document.getElementById('messenger-screen');
        
        if (authScreen) authScreen.classList.add('active');
        if (messengerScreen) messengerScreen.classList.remove('active');
    }

    showMainScreen() {
        const authScreen = document.getElementById('auth-screen');
        const messengerScreen = document.getElementById('messenger-screen');
        
        if (authScreen) authScreen.classList.remove('active');
        if (messengerScreen) messengerScreen.classList.add('active');
        
        this.updateUserProfile();
        this.loadChats();
    }

    connectSocket() {
        if (typeof io === 'undefined') {
            console.error('🔥 Socket.IO не загружен');
            return;
        }
        
        console.log('🔥 Подключаемся к Socket.IO');
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('🔥 Socket.IO подключен');
            if (this.currentUser) {
                this.socket.emit('user-online', this.currentUser.id);
            }
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
        console.log('🔥 Загружаем чаты...');
        try {
            const response = await fetch('/api/chats', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            console.log('🔥 Ответ сервера чатов:', response.status);
            const data = await response.json();
            console.log('🔥 Данные чатов:', data);
            
            if (data.success) {
                if (data.chats && data.chats.length > 0) {
                    this.renderChatList(data.chats);
                } else {
                    console.log('🔥 Чатов нет, показываем пустой список');
                    this.renderEmptyChatList();
                }
            } else {
                console.error('🔥 Ошибка загрузки чатов:', data.message);
                this.showNotification('Ошибка загрузки чатов: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке чатов:', error);
            this.showNotification('Ошибка загрузки чатов', 'error');
        }
    }

    renderChatList(chats) {
        const chatList = document.getElementById('chat-list');
        if (!chatList) {
            console.warn('🔥 Элемент chat-list не найден');
            return;
        }
        
        console.log('🔥 Отображаем чаты:', chats.length);
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

    renderEmptyChatList() {
        const chatList = document.getElementById('chat-list');
        if (!chatList) {
            console.warn('🔥 Элемент chat-list не найден');
            return;
        }
        
        chatList.innerHTML = `
            <div class="empty-chats">
                <div class="empty-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <h3>Нет чатов</h3>
                <p>Найдите пользователей и начните общение!</p>
                <button class="btn-primary" onclick="app.openUsersModal()">
                    <i class="fas fa-user-plus"></i> Найти пользователей
                </button>
            </div>
        `;
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
        const modal = document.getElementById('status-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.warn('🔥 Модальное окно статуса не найдено');
        }
    }

    openUsersModal() {
        const modal = document.getElementById('users-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadUsers();
        } else {
            console.warn('🔥 Модальное окно пользователей не найдено');
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadUserSettings();
        } else {
            console.warn('🔥 Модальное окно настроек не найдено');
        }
    }

    openGamesModal() {
        const modal = document.getElementById('games-modal');
        if (modal) {
            modal.style.display = 'flex';
        } else {
            console.warn('🔥 Модальное окно игр не найдено');
        }
    }

    startVideoCall() {
        if (this.currentChat) {
            this.showNotification('Запуск видеозвонка...', 'info');
            // Video call logic would go here
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    startAudioCall() {
        if (this.currentChat) {
            this.showNotification('Запуск аудиозвонка...', 'info');
            // Audio call logic would go here
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
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

    updateUserProfile() {
        console.log('🔥 Обновляем профиль пользователя:', this.currentUser);
        
        if (!this.currentUser) return;
        
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        
        if (userAvatar) {
            userAvatar.src = this.currentUser.avatar || '/default-avatar.png';
            userAvatar.alt = this.currentUser.username;
        }
        
        if (userName) {
            userName.textContent = this.currentUser.username;
        }
        
        console.log('🔥 Профиль обновлен');
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
    console.log('🔥 DOM загружен, инициализируем приложение');
    app = MessengerApp.init();
    console.log('🔥 Приложение инициализировано:', app);
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