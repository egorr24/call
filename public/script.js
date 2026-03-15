class MessengerApp {
    constructor() {
        console.log('🔥 MessengerApp конструктор вызван');
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        
        this.init();
    }

    init() {
        console.log('🔥 MessengerApp инициализация');
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        console.log('🔥 Настраиваем обработчики событий');
        
        document.addEventListener('click', (e) => {
            console.log('🔥 Клик зарегистрирован на:', e.target.tagName, e.target.className);
            this.handleGlobalClick(e);
            
            // Закрытие модальных окон при клике по фону
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
                e.target.classList.remove('active');
                console.log('🔥 Модальное окно закрыто кликом по фону');
            }
        });

        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleEnterKey(e);
            }
        });
    }

    handleGlobalClick(e) {
            const target = e.target.closest('button') || e.target.closest('[data-action]') || e.target;

            console.log('🔥 Обработка клика:', {
                tagName: target.tagName,
                className: target.className,
                id: target.id,
                title: target.title,
                textContent: target.textContent?.substring(0, 50)
            });

            // Auth buttons
            if (target.classList.contains('tab-btn')) {
                console.log('🔥 Клик по tab-btn:', target.dataset.tab);
                this.switchAuthTab(target.dataset.tab);
            } else if (target.classList.contains('auth-btn')) {
                console.log('🔥 Клик по auth-btn');
                const form = target.closest('.auth-form');
                if (form && form.id === 'login-form') {
                    console.log('🔥 Вызываем handleLogin');
                    this.handleLogin();
                } else if (form && form.id === 'register-form') {
                    console.log('🔥 Вызываем handleRegister');
                    this.handleRegister();
                }
            }

            // Main interface buttons
            else if (target.classList.contains('send-btn')) {
                console.log('🔥 Клик по send-btn');
                this.sendMessage();
            }
            else if (target.id === 'voice-btn' || target.classList.contains('voice-btn')) {
                console.log('🔥 Клик по voice-btn');
                this.toggleVoiceRecording();
            }
            else if (target.id === 'sticker-btn' || target.classList.contains('sticker-btn')) {
                console.log('🔥 Клик по sticker-btn');
                this.toggleStickerPanel();
            }
            else if (target.id === 'poll-btn' || target.classList.contains('poll-btn')) {
                console.log('🔥 Клик по poll-btn');
                this.showPollModal();
            }
            else if (target.title === 'Прикрепить файл') {
                console.log('🔥 Клик по attach file');
                this.openFileDialog();
            }
            else if (target.title === 'Отправить фото') {
                console.log('🔥 Клик по camera');
                this.openCameraDialog();
            }
            else if (target.title === 'Видеозвонок') {
                console.log('🔥 Клик по video call');
                this.startVideoCall();
            }
            else if (target.title === 'Аудиозвонок') {
                console.log('🔥 Клик по audio call');
                this.startAudioCall();
            }
            else if (target.title === 'Игры') {
                console.log('🔥 Клик по games');
                this.showGamesModal();
            }
            else if (target.title === 'Настройки') {
                console.log('🔥 Клик по settings');
                this.showSettings();
            }
            else if (target.title === 'Найти пользователей') {
                console.log('🔥 Клик по find users');
                this.showUserSearch();
            }
            else if (target.title === 'Выйти') {
                console.log('🔥 Клик по logout');
                this.logout();
            }
            else if (target.title === 'Статус') {
                console.log('🔥 Клик по status');
                this.toggleStatus();
            }
            
            // Close buttons for modals
            else if (target.classList.contains('close-btn')) {
                console.log('🔥 Клик по close-btn');
                this.closeModal(target);
            }
            else if (target.classList.contains('back-btn')) {
                console.log('🔥 Клик по back-btn');
                this.handleBackButton(target);
            }
            
            // Settings items
            else if (target.closest('.setting-item')) {
                const settingItem = target.closest('.setting-item');
                const settingType = settingItem.dataset.setting;
                console.log('🔥 Клик по setting-item:', settingType);
                this.openSettingSubscreen(settingType);
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

        console.log('🔥 Попытка входа для:', email);

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('🔥 Ответ сервера на вход:', response.status);
            const data = await response.json();
            console.log('🔥 Данные ответа:', data);
            
            if (data.success) {
                this.currentUser = data.user;
                localStorage.setItem('token', data.token);
                console.log('🔥 Токен сохранен:', data.token);
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
        console.log('🔥 Проверяем авторизацию, токен:', token ? 'есть' : 'нет');
        
        if (token) {
            console.log('🔥 Отправляем запрос на /api/me');
            fetch('/api/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            .then(response => {
                console.log('🔥 Ответ от /api/me:', response.status);
                return response.json();
            })
            .then(data => {
                console.log('🔥 Данные от /api/me:', data);
                if (data.success) {
                    this.currentUser = data.user;
                    console.log('🔥 Пользователь найден, показываем главный экран');
                    this.showMainScreen();
                    this.connectSocket();
                } else {
                    console.log('🔥 Токен недействителен, удаляем');
                    localStorage.removeItem('token');
                    this.showAuthScreen();
                }
            })
            .catch((error) => {
                console.error('🔥 Ошибка при проверке токена:', error);
                localStorage.removeItem('token');
                this.showAuthScreen();
            });
        } else {
            console.log('🔥 Токена нет, показываем экран авторизации');
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
        this.setupChatSearch();
    }
    
    setupChatSearch() {
        const chatSearchInput = document.getElementById('chat-search');
        if (chatSearchInput) {
            chatSearchInput.removeEventListener('input', this.handleChatSearch);
            
            this.handleChatSearch = this.debounce((e) => {
                const query = e.target.value.trim().toLowerCase();
                this.filterChats(query);
            }, 300);
            
            chatSearchInput.addEventListener('input', this.handleChatSearch);
        }
    }
    
    filterChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name')?.textContent.toLowerCase() || '';
            const lastMessage = item.querySelector('.chat-last-message')?.textContent.toLowerCase() || '';
            
            const matches = chatName.includes(query) || lastMessage.includes(query);
            item.style.display = matches ? 'flex' : 'none';
        });
        
        // Показываем сообщение если ничего не найдено
        const visibleChats = document.querySelectorAll('.chat-item[style*="flex"]');
        const chatsList = document.getElementById('chats-list');
        
        if (visibleChats.length === 0 && query) {
            if (!document.querySelector('.no-search-results')) {
                const noResults = document.createElement('div');
                noResults.className = 'no-search-results';
                noResults.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <p>Чаты не найдены</p>
                `;
                chatsList.appendChild(noResults);
            }
        } else {
            const noResults = document.querySelector('.no-search-results');
            if (noResults) {
                noResults.remove();
            }
        }
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
            </div>
        `;
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

    // Utility functions
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatTime(timestamp) {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        }
    }

    selectChat(chat) {
        console.log('🔥 Выбираем чат:', chat.name);
        this.currentChat = chat;
        
        // Обновляем активный чат в списке
        const chatItems = document.querySelectorAll('.chat-item');
        chatItems.forEach(item => item.classList.remove('active'));
        
        const selectedItem = document.querySelector(`[data-chat-id="${chat.id}"]`);
        if (selectedItem) {
            selectedItem.classList.add('active');
        }
        
        // Показываем область чата
        this.showChatArea(chat);
        
        // Загружаем сообщения чата
        this.loadChatMessages(chat.id);
        
        this.showNotification(`Открыт чат с ${chat.name}`, 'success');
    }
    
    showChatArea(chat) {
        const chatHeader = document.querySelector('.chat-header');
        const chatName = document.getElementById('chat-name');
        const chatStatus = document.getElementById('chat-status');
        const chatAvatar = document.querySelector('.chat-header .chat-avatar img');
        const messagesArea = document.getElementById('messages-area');
        
        if (chatName) chatName.textContent = chat.name;
        if (chatStatus) chatStatus.textContent = chat.isOnline ? 'в сети' : 'не в сети';
        if (chatAvatar) chatAvatar.src = chat.avatar || '/default-avatar.png';
        
        // Показываем область сообщений
        if (messagesArea) {
            messagesArea.innerHTML = '<div class="loading-messages">Загрузка сообщений...</div>';
        }
        
        // Показываем панель ввода
        const messageInputContainer = document.querySelector('.message-input-container');
        if (messageInputContainer) {
            messageInputContainer.style.display = 'flex';
        }
    }
    
    async loadChatMessages(chatId) {
        try {
            const response = await fetch(`/api/messages/${chatId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderMessages(data.messages || []);
            } else {
                this.showNotification('Ошибка загрузки сообщений: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке сообщений:', error);
            this.showNotification('Ошибка загрузки сообщений', 'error');
        }
    }
    
    renderMessages(messages) {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;
        
        if (messages.length === 0) {
            messagesArea.innerHTML = `
                <div class="empty-messages">
                    <div class="empty-icon">💬</div>
                    <p>Нет сообщений. Начните общение!</p>
                </div>
            `;
            return;
        }
        
        messagesArea.innerHTML = '';
        
        messages.forEach(message => {
            const messageEl = this.createMessageElement(message);
            messagesArea.appendChild(messageEl);
        });
        
        // Прокручиваем к последнему сообщению
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
    
    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        const isOwn = message.senderId === this.currentUser.id;
        
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${!isOwn ? `<div class="message-sender">${this.escapeHtml(message.senderName || 'Пользователь')}</div>` : ''}
                <div class="message-text">${this.escapeHtml(message.text)}</div>
                <div class="message-time">${this.formatTime(message.createdAt)}</div>
            </div>
        `;
        
        return messageDiv;
    }

    handleNewMessage(message) {
        console.log('🔥 Новое сообщение:', message);
        
        // Если сообщение для текущего чата, добавляем его
        if (this.currentChat && message.chatId === this.currentChat.id) {
            this.addMessageToChat(message);
        }
        
        // Обновляем список чатов (последнее сообщение)
        this.updateChatInList(message);
        
        // Показываем уведомление если чат не активен
        if (!this.currentChat || message.chatId !== this.currentChat.id) {
            this.showNotification(`Новое сообщение от ${message.senderName}`, 'info');
        }
    }
    
    updateChatInList(message) {
        const chatItem = document.querySelector(`[data-chat-id="${message.chatId}"]`);
        if (chatItem) {
            const lastMessageEl = chatItem.querySelector('.chat-last-message');
            const timeEl = chatItem.querySelector('.chat-time');
            
            if (lastMessageEl) {
                lastMessageEl.textContent = message.text.substring(0, 50) + (message.text.length > 50 ? '...' : '');
            }
            
            if (timeEl) {
                timeEl.textContent = this.formatTime(message.createdAt);
            }
            
            // Перемещаем чат в начало списка
            const chatsList = document.getElementById('chats-list');
            if (chatsList) {
                chatsList.insertBefore(chatItem, chatsList.firstChild);
            }
        }
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        const text = messageInput.value.trim();
        if (!text) return;

        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки сообщения', 'error');
            return;
        }

        console.log('🔥 Отправляем сообщение:', text);

        // Создаем временное сообщение для отображения
        const tempMessage = {
            id: 'temp-' + Date.now(),
            text: text,
            senderId: this.currentUser.id,
            senderName: this.currentUser.username,
            createdAt: new Date().toISOString(),
            isTemp: true
        };
        
        // Добавляем сообщение в интерфейс
        this.addMessageToChat(tempMessage);
        messageInput.value = '';

        // Отправляем на сервер
        if (this.socket) {
            this.socket.emit('send-message', {
                chatId: this.currentChat.id,
                text: text,
                type: 'text'
            });
        } else {
            // Fallback через HTTP API
            this.sendMessageHTTP(text);
        }
    }
    
    async sendMessageHTTP(text, type = 'text', fileData = null) {
        try {
            const messageData = {
                chatId: this.currentChat.id,
                text: text,
                type: type
            };
            
            if (fileData) {
                messageData.fileData = fileData;
            }
            
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(messageData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.replaceTemporaryMessage(data.message);
                this.showNotification('Сообщение отправлено', 'success');
            } else {
                this.showNotification('Ошибка отправки: ' + (data.message || 'Неизвестная ошибка'), 'error');
                this.removeTemporaryMessage();
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке сообщения:', error);
            this.showNotification('Ошибка отправки сообщения', 'error');
            this.removeTemporaryMessage();
        }
    }
    
    addMessageToChat(message) {
        const messagesArea = document.getElementById('messages-area');
        if (!messagesArea) return;
        
        // Удаляем пустое состояние если есть
        const emptyMessages = messagesArea.querySelector('.empty-messages');
        if (emptyMessages) {
            emptyMessages.remove();
        }
        
        const messageEl = this.createMessageElement(message);
        if (message.isTemp) {
            messageEl.classList.add('temp-message');
        }
        
        messagesArea.appendChild(messageEl);
        messagesArea.scrollTop = messagesArea.scrollHeight;
    }
    
    replaceTemporaryMessage(realMessage) {
        const tempMessage = document.querySelector('.temp-message');
        if (tempMessage) {
            const realMessageEl = this.createMessageElement(realMessage);
            tempMessage.replaceWith(realMessageEl);
        }
    }
    
    removeTemporaryMessage() {
        const tempMessage = document.querySelector('.temp-message');
        if (tempMessage) {
            tempMessage.remove();
        }
    }

    // === МЕТОДЫ ДЛЯ ОСНОВНОГО ИНТЕРФЕЙСА ===

    toggleVoiceRecording() {
        console.log('🔥 Переключение записи голоса');
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

    startVoiceRecording() {
        console.log('🔥 Начинаем запись голоса');
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
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
                };

                this.mediaRecorder.start();
                this.isRecording = true;

                const voiceBtn = document.getElementById('voice-btn');
                if (voiceBtn) {
                    voiceBtn.classList.add('recording');
                    voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                }

                this.showNotification('Запись голосового сообщения...', 'info');
            })
            .catch(error => {
                console.error('🔥 Ошибка доступа к микрофону:', error);
                this.showNotification('Ошибка доступа к микрофону', 'error');
            });
    }

    stopVoiceRecording() {
        console.log('🔥 Останавливаем запись голоса');
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;

            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.classList.remove('recording');
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            }
        }
    }

    sendVoiceMessage(blob) {
        console.log('🔥 Отправляем голосовое сообщение');
        // Здесь будет логика отправки голосового сообщения
        this.showNotification('Голосовое сообщение записано', 'success');
    }

    toggleStickerPanel() {
        console.log('🔥 Переключение панели стикеров');
        const stickerPanel = document.getElementById('sticker-panel');
        if (stickerPanel) {
            const isVisible = stickerPanel.style.display !== 'none';
            stickerPanel.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible) {
                this.showNotification('Панель стикеров открыта', 'info');
            }
        } else {
            this.showNotification('Панель стикеров не найдена', 'error');
        }
    }

    showPollModal() {
        console.log('🔥 Показываем модал опроса');
        if (this.currentChat && this.currentChat.type === 'group') {
            const pollPanel = document.getElementById('poll-panel');
            if (pollPanel) {
                pollPanel.style.display = 'block';
                this.showNotification('Создание опроса для группы', 'info');
            } else {
                this.showNotification('Панель опросов не найдена', 'error');
            }
        } else {
            this.showNotification('Опросы доступны только в групповых чатах', 'error');
        }
    }

    openFileDialog() {
        console.log('🔥 Открываем диалог выбора файла');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.removeEventListener('change', this.handleFileSelect);
            this.handleFileSelect = (e) => this.handleFileUpload(e);
            fileInput.addEventListener('change', this.handleFileSelect);
            fileInput.click();
        }
    }
    
    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;
        
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки файла', 'error');
            return;
        }
        
        for (let file of files) {
            await this.uploadAndSendFile(file);
        }
        
        // Очищаем input
        event.target.value = '';
    }
    
    async uploadAndSendFile(file) {
        // Проверяем размер файла (максимум 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
            this.showNotification('Файл слишком большой (максимум 10MB)', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', this.currentChat.id);
        
        try {
            this.showNotification('Загрузка файла...', 'info');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
                body: formData
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Отправляем сообщение с файлом
                const fileMessage = {
                    chatId: this.currentChat.id,
                    text: `📎 ${file.name}`,
                    type: 'file',
                    fileData: {
                        name: file.name,
                        size: file.size,
                        url: data.fileUrl,
                        type: file.type
                    }
                };
                
                if (this.socket) {
                    this.socket.emit('send-message', fileMessage);
                } else {
                    await this.sendMessageHTTP(fileMessage.text, fileMessage.type, fileMessage.fileData);
                }
                
                this.showNotification('Файл отправлен!', 'success');
            } else {
                this.showNotification('Ошибка загрузки файла: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке файла:', error);
            this.showNotification('Ошибка загрузки файла', 'error');
        }
    }

    openCameraDialog() {
        console.log('🔥 Открываем камеру');
        this.showNotification('Функция камеры', 'info');
    }

    startVideoCall() {
        console.log('🔥 Начинаем видеозвонок');
        if (this.currentChat) {
            this.showNotification('Начинаем видеозвонок...', 'info');
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    startAudioCall() {
        console.log('🔥 Начинаем аудиозвонок');
        if (this.currentChat) {
            this.showNotification('Начинаем аудиозвонок...', 'info');
        } else {
            this.showNotification('Выберите чат для звонка', 'error');
        }
    }

    showGamesModal() {
        console.log('🔥 Показываем модал игр');
        this.showNotification('Игры и развлечения', 'info');
    }

    showSettings() {
        console.log('🔥 Показываем настройки');
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
            settingsModal.classList.add('active');
            this.updateSettingsProfile();
        } else {
            this.showNotification('Модальное окно настроек не найдено', 'error');
        }
    }

    showUserSearch() {
        console.log('🔥 Показываем поиск пользователей');
        const usersModal = document.getElementById('users-modal');
        if (usersModal) {
            usersModal.style.display = 'flex';
            usersModal.classList.add('active');
            this.setupUserSearch();
        } else {
            this.showNotification('Модальное окно поиска не найдено', 'error');
        }
    }
    
    setupUserSearch() {
        const userSearchInput = document.getElementById('user-search');
        const usersList = document.getElementById('users-list');
        
        if (userSearchInput) {
            // Удаляем предыдущие обработчики
            userSearchInput.removeEventListener('input', this.handleUserSearch);
            
            // Добавляем новый обработчик
            this.handleUserSearch = this.debounce((e) => {
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    this.searchUsers(query);
                } else {
                    this.clearUserSearchResults();
                }
            }, 300);
            
            userSearchInput.addEventListener('input', this.handleUserSearch);
        }
        
        // Загружаем рекомендуемых пользователей
        this.loadRecommendedUsers();
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    async searchUsers(query) {
        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderUserSearchResults(data.users || []);
            } else {
                this.showNotification('Ошибка поиска: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при поиске пользователей:', error);
            this.showNotification('Ошибка поиска пользователей', 'error');
        }
    }
    
    async loadRecommendedUsers() {
        try {
            const response = await fetch('/api/users/recommended', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.renderUserSearchResults(data.users || [], 'Рекомендуемые пользователи');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке рекомендаций:', error);
        }
    }
    
    renderUserSearchResults(users, title = 'Результаты поиска') {
        const usersList = document.getElementById('users-list');
        if (!usersList) return;
        
        if (users.length === 0) {
            usersList.innerHTML = `
                <div class="empty-users">
                    <div class="empty-icon">👥</div>
                    <p>Пользователи не найдены</p>
                </div>
            `;
            return;
        }
        
        usersList.innerHTML = `<h4>${title}</h4>`;
        
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
                <div class="user-actions">
                    <button class="btn-primary start-chat-btn" data-user-id="${user.id}">
                        💬 Написать
                    </button>
                </div>
            `;
            
            usersList.appendChild(userItem);
        });
        
        // Добавляем обработчики для кнопок "Написать"
        const startChatBtns = usersList.querySelectorAll('.start-chat-btn');
        startChatBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.dataset.userId;
                this.startChatWithUser(userId);
            });
        });
    }
    
    clearUserSearchResults() {
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '<p>Введите имя пользователя для поиска...</p>';
        }
    }
    
    async startChatWithUser(userId) {
        try {
            const response = await fetch('/api/chats/create', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ userId: userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Закрываем модальное окно поиска
                const usersModal = document.getElementById('users-modal');
                if (usersModal) {
                    usersModal.style.display = 'none';
                    usersModal.classList.remove('active');
                }
                
                // Обновляем список чатов
                this.loadChats();
                
                // Открываем новый чат
                setTimeout(() => {
                    this.selectChat(data.chat);
                }, 500);
                
                this.showNotification('Чат создан!', 'success');
            } else {
                this.showNotification('Ошибка создания чата: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при создании чата:', error);
            this.showNotification('Ошибка создания чата', 'error');
        }
    }

    toggleStatus() {
        console.log('🔥 Переключение статуса');
        this.showNotification('Изменение статуса', 'info');
    }
    
    updateSettingsProfile() {
        if (!this.currentUser) return;
        
        const settingsAvatar = document.getElementById('settings-avatar');
        const settingsUsername = document.getElementById('settings-username');
        const settingsEmail = document.getElementById('settings-email');
        
        if (settingsAvatar) {
            settingsAvatar.src = this.currentUser.avatar || '/default-avatar.png';
        }
        
        if (settingsUsername) {
            settingsUsername.value = this.currentUser.username || '';
        }
        
        if (settingsEmail) {
            settingsEmail.value = this.currentUser.email || '';
        }
    }
    
    closeModal(target) {
        const modal = target.closest('.modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            console.log('🔥 Модальное окно закрыто');
        }
    }
    
    handleBackButton(target) {
        // Если это кнопка назад в настройках
        const settingsSubscreen = target.closest('.settings-subscreen');
        if (settingsSubscreen) {
            settingsSubscreen.style.display = 'none';
            console.log('🔥 Подэкран настроек закрыт');
            return;
        }
        
        // Если это основная кнопка назад в настройках
        const settingsModal = target.closest('#settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
            settingsModal.classList.remove('active');
            console.log('🔥 Настройки закрыты');
            return;
        }
    }
    
    openSettingSubscreen(settingType) {
        console.log('🔥 Открываем подэкран настроек:', settingType);
        
        // Скрываем все подэкраны
        const subscreens = document.querySelectorAll('.settings-subscreen');
        subscreens.forEach(screen => screen.style.display = 'none');
        
        // Показываем нужный подэкран
        let targetScreen = null;
        switch(settingType) {
            case 'profile':
                targetScreen = document.getElementById('profile-settings');
                this.setupProfileSettings();
                break;
            case 'themes':
                targetScreen = document.getElementById('themes-settings');
                this.setupThemeSettings();
                break;
            default:
                this.showNotification(`Настройка "${settingType}" пока не реализована`, 'info');
                return;
        }
        
        if (targetScreen) {
            targetScreen.style.display = 'block';
            console.log('🔥 Подэкран открыт:', settingType);
        }
    }
    
    setupProfileSettings() {
        // Заполняем поля текущими данными
        this.updateSettingsProfile();
        
        // Добавляем обработчик для кнопки сохранения
        const saveBtn = document.querySelector('.save-btn');
        if (saveBtn) {
            saveBtn.removeEventListener('click', this.handleSaveProfile);
            this.handleSaveProfile = () => this.saveProfileSettings();
            saveBtn.addEventListener('click', this.handleSaveProfile);
        }
    }
    
    async saveProfileSettings() {
        const usernameInput = document.getElementById('settings-username');
        const passwordInput = document.getElementById('settings-password');
        
        if (!usernameInput) {
            this.showNotification('Поля формы не найдены', 'error');
            return;
        }
        
        const username = usernameInput.value.trim();
        const password = passwordInput ? passwordInput.value : '';
        
        if (!username) {
            this.showNotification('Имя пользователя не может быть пустым', 'error');
            return;
        }
        
        try {
            const updateData = { username };
            if (password) {
                updateData.password = password;
            }
            
            const response = await fetch('/api/profile/update', {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify(updateData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Обновляем данные пользователя
                this.currentUser.username = username;
                this.updateUserProfile();
                
                // Очищаем поле пароля
                if (passwordInput) {
                    passwordInput.value = '';
                }
                
                this.showNotification('Профиль обновлен!', 'success');
            } else {
                this.showNotification('Ошибка обновления: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при обновлении профиля:', error);
            this.showNotification('Ошибка обновления профиля', 'error');
        }
    }
    
    setupThemeSettings() {
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Убираем активный класс у всех тем
                themeOptions.forEach(opt => opt.classList.remove('active'));
                
                // Добавляем активный класс к выбранной теме
                option.classList.add('active');
                
                const theme = option.dataset.theme;
                this.applyTheme(theme);
                
                this.showNotification(`Тема "${theme}" применена`, 'success');
            });
        });
    }
    
    applyTheme(theme) {
        // Сохраняем выбранную тему
        localStorage.setItem('selectedTheme', theme);
        
        // Применяем тему (пока просто логируем)
        console.log('🔥 Применяем тему:', theme);
        
        // Здесь можно добавить логику смены CSS классов или переменных
        document.body.className = `theme-${theme}`;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Flux Messenger загружен и готов к работе!');
    window.app = new MessengerApp();
});