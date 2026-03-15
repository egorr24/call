class MessengerApp {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleEnterKey(e);
            }
        });

        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
    }

    handleGlobalClick(e) {
        const target = e.target.closest('button') || e.target.closest('[data-action]') || e.target;
        
        console.log('🔥 Клик по элементу:', target.tagName, 'ID:', target.id, 'Title:', target.title);
        
        const modal = e.target.closest('.modal');
        if (modal && modal.style.display === 'flex') {
            if (target.classList.contains('close-btn') || target.closest('.close-btn')) {
                modal.style.display = 'none';
                return;
            }
            
            if (target.textContent.includes('Написать') || target.classList.contains('btn-primary')) {
                let userId = target.dataset.userId;
                if (!userId) {
                    const userItem = target.closest('.user-item');
                    if (userItem) {
                        userId = userItem.dataset.userId;
                    }
                }
                
                if (userId) {
                    this.startChat(userId);
                }
                return;
            }
            
            if (target.classList.contains('settings-tab')) {
                this.switchSettingsTab(target.dataset.tab);
                return;
            }
            
            if (target.classList.contains('theme-card') || target.closest('.theme-card')) {
                const themeCard = target.closest('.theme-card') || target;
                const theme = themeCard.dataset.theme;
                this.selectTheme(theme);
                return;
            }
            
            return;
        }
        
        // Auth buttons
        if (target.classList.contains('tab-btn')) {
            this.switchAuthTab(target.dataset.tab);
        } else if (target.classList.contains('auth-btn')) {
            const form = target.closest('.auth-form');
            if (form && form.id === 'login-form') {
                this.handleLogin();
            } else if (form && form.id === 'register-form') {
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
        // Chat actions
        else if (target.title === 'Игры') {
            this.openGamesModal();
        } else if (target.title === 'Видеозвонок') {
            this.startVideoCall();
        } else if (target.title === 'Аудиозвонок') {
            this.startAudioCall();
        }
        // Message sending
        else if (target.classList.contains('send-btn') || target.title === 'Отправить') {
            this.sendMessage();
        }
        // File attachment
        else if (target.title === 'Прикрепить файл') {
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.click();
            }
        }
        // Photo attachment
        else if (target.title === 'Отправить фото') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                this.handleFileSelect(e);
            };
            input.click();
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
            this.showNotification('Ошибка: элементы формы не найдены', 'error');
            return;
        }
        
        const email = emailEl.value.trim();
        const password = passwordEl.value;

        if (!email || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        try {
            const response = await fetch('/api/login', {
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
            this.showNotification('Ошибка: элементы формы не найдены', 'error');
            return;
        }
        
        const email = emailEl.value.trim();
        const username = usernameEl.value.trim();
        const password = passwordEl.value;

        if (!email || !username || !password) {
            this.showNotification('Заполните все поля', 'error');
            return;
        }

        if (password.length < 6) {
            this.showNotification('Пароль должен содержать минимум 6 символов', 'error');
            return;
        }

        try {
            const response = await fetch('/api/register', {
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
            console.error('🔥 Ошибка при регистрации:', error);
            this.showNotification('Ошибка подключения', 'error');
        }
    }

    checkAuthStatus() {
        const token = localStorage.getItem('token');
        
        if (token) {
            fetch('/api/me', {
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
            .catch((error) => {
                localStorage.removeItem('token');
                this.showAuthScreen();
            });
        } else {
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
        
        this.socket = io();
        
        this.socket.on('connect', () => {
            if (this.currentUser) {
                this.socket.emit('user-online', this.currentUser.id);
                
                const token = localStorage.getItem('token');
                if (token) {
                    this.socket.emit('authenticate', token);
                }
            }
        });

        this.socket.on('new-message', (message) => {
            this.handleNewMessage(message);
        });

        this.socket.on('user-status', (data) => {
            this.updateUserStatus(data.userId, data.status);
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
        console.log(`🔥 Уведомление [${type}]:`, message);
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
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
                if (data.chats && data.chats.length > 0) {
                    this.renderChatList(data.chats);
                } else {
                    this.renderEmptyChatList();
                }
            } else {
                this.showNotification('Ошибка загрузки чатов: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке чатов:', error);
            this.showNotification('Ошибка загрузки чатов', 'error');
        }
    }

    renderChatList(chats) {
        const chatList = document.getElementById('chats-list');
        if (!chatList) return;
        
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
        const chatList = document.getElementById('chats-list');
        if (!chatList) return;
        
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
        
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const chatItem = document.querySelector(`[data-chat-id="${chat.id}"]`);
        if (chatItem) {
            chatItem.classList.add('active');
        }
        
        const chatUsername = document.getElementById('chat-username');
        const chatStatus = document.getElementById('chat-status');
        const chatAvatar = document.getElementById('chat-avatar');
        
        if (chatUsername) chatUsername.textContent = chat.name;
        if (chatStatus) chatStatus.textContent = chat.isOnline ? 'в сети' : 'не в сети';
        if (chatAvatar) chatAvatar.src = chat.avatar || '/default-avatar.png';
        
        this.loadMessages(chat.id);
        
        const noChatSelected = document.getElementById('no-chat-selected');
        const chatContainer = document.getElementById('chat-container');
        
        if (noChatSelected) noChatSelected.style.display = 'none';
        if (chatContainer) chatContainer.style.display = 'flex';
    }

    async loadMessages(chatId) {
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderMessages(data.messages);
            } else {
                this.showNotification('Ошибка загрузки сообщений: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке сообщений:', error);
            this.showNotification('Ошибка загрузки сообщений', 'error');
        }
    }

    renderMessages(messages) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
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
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;
        
        return messageDiv;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;
        
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
            } else {
                this.showNotification('Ошибка отправки сообщения: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке сообщения:', error);
            this.showNotification('Ошибка отправки сообщения', 'error');
        }
    }

    handleNewMessage(message) {
        if (this.currentChat && message.chatId === this.currentChat.id) {
            const messageElement = this.createMessageElement(message);
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.appendChild(messageElement);
                this.scrollToBottom();
            }
        }
        
        this.updateChatInList(message);
    }

    updateChatInList(message) {
        const chatItem = document.querySelector(`[data-chat-id="${message.chatId}"]`);
        if (chatItem) {
            const lastMessageEl = chatItem.querySelector('.chat-last-message');
            const timeEl = chatItem.querySelector('.chat-time');
            
            if (lastMessageEl) lastMessageEl.textContent = message.text || 'Файл';
            if (timeEl) timeEl.textContent = this.formatTime(message.timestamp);
            
            chatItem.parentNode.insertBefore(chatItem, chatItem.parentNode.firstChild);
        }
    }

    // Modal functions
    openStatusModal() {
        const modal = document.getElementById('status-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    openUsersModal() {
        const modal = document.getElementById('users-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadUsers();
        }
    }

    openSettingsModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadUserSettings();
        }
    }

    openGamesModal() {
        const modal = document.getElementById('games-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    startVideoCall() {
        if (this.currentChat) {
            this.showNotification('Запуск видеозвонка...', 'info');
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    startAudioCall() {
        if (this.currentChat) {
            this.showNotification('Запуск аудиозвонка...', 'info');
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    async loadUsers() {
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderUsersList(data.users);
            } else {
                this.showNotification('Ошибка загрузки пользователей: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке пользователей:', error);
            this.showNotification('Ошибка загрузки пользователей', 'error');
        }
    }

    renderUsersList(users) {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.dataset.userId = user.id;
            userItem.innerHTML = `
                <div class="user-avatar">
                    <img src="${user.avatar || '/default-avatar.png'}" alt="${user.username}">
                    <div class="status-indicator ${user.isOnline ? 'online' : 'offline'}"></div>
                </div>
                <div class="user-info">
                    <div class="user-name">${this.escapeHtml(user.username)}</div>
                    <div class="user-status">${user.isOnline ? 'в сети' : 'не в сети'}</div>
                </div>
                <button class="btn-primary" data-user-id="${user.id}">Написать</button>
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
                this.loadChats();
                this.showNotification('Чат создан!', 'success');
            } else {
                this.showNotification('Ошибка создания чата: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при создании чата:', error);
            this.showNotification('Ошибка создания чата', 'error');
        }
    }

    loadUserSettings() {
        if (this.currentUser) {
            const usernameEl = document.getElementById('settings-username');
            const emailEl = document.getElementById('settings-email');
            const avatarEl = document.getElementById('settings-avatar');
            
            if (usernameEl) usernameEl.value = this.currentUser.username;
            if (emailEl) emailEl.value = this.currentUser.email;
            if (avatarEl) avatarEl.src = this.currentUser.avatar || '/default-avatar.png';
        }
    }

    updateUserProfile() {
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
    }

    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
        
        const tabBtn = document.querySelector(`[data-tab="${tab}"]`);
        const content = document.getElementById(`${tab}-settings`);
        
        if (tabBtn) tabBtn.classList.add('active');
        if (content) content.classList.add('active');
    }

    selectTheme(theme) {
        document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('active'));
        const themeCard = document.querySelector(`[data-theme="${theme}"]`);
        if (themeCard) {
            themeCard.classList.add('active');
        }
        
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
    }

    updateUserStatus(userId, status) {
        const statusIndicators = document.querySelectorAll(`[data-user-id="${userId}"] .status-indicator`);
        statusIndicators.forEach(indicator => {
            indicator.className = `status-indicator ${status}`;
        });
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        if (files.length === 0) return;
        
        files.forEach(file => {
            this.sendFileMessage(file);
        });
    }

    async sendFileMessage(file) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки файла', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) {
            this.showNotification('Файл слишком большой (максимум 50MB)', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', this.currentChat.id);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                await this.sendMessageWithFile(data.file);
            } else {
                this.showNotification('Ошибка загрузки файла: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке файла:', error);
            this.showNotification('Ошибка загрузки файла', 'error');
        }
    }

    async sendMessageWithFile(fileInfo) {
        if (!this.currentChat) return;
        
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: fileInfo.mimetype.startsWith('image/') ? '' : fileInfo.originalName,
                    type: 'file',
                    fileData: fileInfo
                })
            });
            
            const data = await response.json();
            
            if (!data.success) {
                this.showNotification('Ошибка отправки файла: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке сообщения с файлом:', error);
            this.showNotification('Ошибка отправки файла', 'error');
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

    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
}

// Инициализация приложения
const app = new MessengerApp();

console.log('🔥 Flux Messenger загружен и готов к работе!');