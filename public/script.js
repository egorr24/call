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
        // Placeholder for chat selection
        console.log('🔥 Выбран чат:', chat.name);
    }

    handleNewMessage(message) {
        // Placeholder for new message handling
        console.log('🔥 Новое сообщение:', message);
    }

    sendMessage() {
        const messageInput = document.getElementById('message-input');
        if (!messageInput) return;

        const text = messageInput.value.trim();
        if (!text) return;

        console.log('🔥 Отправляем сообщение:', text);

        if (this.socket && this.currentChat) {
            this.socket.emit('send-message', {
                chatId: this.currentChat.id,
                text: text,
                type: 'text'
            });

            messageInput.value = '';
            this.showNotification('Сообщение отправлено', 'success');
        } else {
            this.showNotification('Выберите чат для отправки сообщения', 'error');
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
        this.showNotification('Панель стикеров и GIF', 'info');
    }

    showPollModal() {
        console.log('🔥 Показываем модал опроса');
        if (this.currentChat && this.currentChat.type === 'group') {
            this.showNotification('Создание опроса для группы', 'info');
        } else {
            this.showNotification('Опросы доступны только в групповых чатах', 'error');
        }
    }

    openFileDialog() {
        console.log('🔥 Открываем диалог выбора файла');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
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
        this.showNotification('Настройки приложения', 'info');
    }

    showUserSearch() {
        console.log('🔥 Показываем поиск пользователей');
        this.showNotification('Поиск новых пользователей', 'info');
    }

    toggleStatus() {
        console.log('🔥 Переключение статуса');
        this.showNotification('Изменение статуса', 'info');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Flux Messenger загружен и готов к работе!');
    window.app = new MessengerApp();
});