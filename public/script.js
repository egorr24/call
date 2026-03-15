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
        
        // Проверяем, находимся ли мы внутри модального окна
        const modal = e.target.closest('.modal');
        if (modal && modal.style.display === 'flex') {
            console.log('🔥 Клик внутри модального окна:', modal.id);
            
            // Обработка кликов внутри модальных окон
            if (target.classList.contains('close-btn') || target.closest('.close-btn')) {
                console.log('🔥 Закрываем модальное окно');
                modal.style.display = 'none';
                return;
            }
            
            // Статусы
            if (target.classList.contains('status-option') || target.closest('.status-option')) {
                const statusOption = target.closest('.status-option') || target;
                const status = statusOption.dataset.status;
                console.log('🔥 Выбираем статус:', status);
                this.selectStatus(status);
                return;
            }
            
            // Кнопка установить статус
            if (target.classList.contains('set-status-btn') || target.textContent.includes('Установить')) {
                console.log('🔥 Устанавливаем пользовательский статус');
                this.setCustomStatus();
                return;
            }
            
            // Кнопки настроек
            if (target.textContent.includes('Сохранить изменения') || target.classList.contains('btn-primary')) {
                console.log('🔥 Сохраняем настройки');
                this.saveSettings();
                return;
            }
            
            if (target.textContent.includes('Отмена') || target.classList.contains('btn-secondary')) {
                console.log('🔥 Отмена');
                modal.style.display = 'none';
                return;
            }
            
            // Кнопка "Написать" в списке пользователей
            if (target.textContent.includes('Написать') || target.classList.contains('btn-primary')) {
                console.log('🔥 Кнопка "Написать" нажата');
                console.log('🔥 Target element:', target);
                console.log('🔥 Target dataset:', target.dataset);
                
                // Ищем ID пользователя в data атрибуте кнопки
                let userId = target.dataset.userId;
                
                if (!userId) {
                    // Ищем в родительском элементе
                    const userItem = target.closest('.user-item');
                    console.log('🔥 User item:', userItem);
                    if (userItem) {
                        userId = userItem.dataset.userId;
                        console.log('🔥 User ID from parent:', userId);
                    }
                }
                
                if (userId) {
                    console.log('🔥 Создаем чат с пользователем:', userId);
                    this.startChat(userId);
                } else {
                    console.warn('🔥 ID пользователя не найден');
                    console.log('🔥 Available data attributes:', Object.keys(target.dataset));
                    this.showNotification('Ошибка: ID пользователя не найден', 'error');
                }
                return;
            }
            
            // Вкладки настроек
            if (target.classList.contains('settings-tab')) {
                console.log('🔥 Переключаем вкладку настроек:', target.dataset.tab);
                this.switchSettingsTab(target.dataset.tab);
                return;
            }
            
            // Выбор темы
            if (target.classList.contains('theme-card') || target.closest('.theme-card')) {
                const themeCard = target.closest('.theme-card') || target;
                const theme = themeCard.dataset.theme;
                console.log('🔥 Выбираем тему:', theme);
                this.selectTheme(theme);
                return;
            }
            
            // Тип чата
            if (target.classList.contains('chat-type-btn')) {
                console.log('🔥 Выбираем тип чата:', target.dataset.type);
                this.selectChatType(target.dataset.type);
                return;
            }
            
            // Игры
            if (target.classList.contains('game-card') || target.closest('.game-card')) {
                const gameCard = target.closest('.game-card') || target;
                const game = gameCard.dataset.game;
                console.log('🔥 Выбираем игру:', game);
                this.startGame(game);
                return;
            }
            
            // Если клик по фону модального окна (не по содержимому)
            if (target === modal) {
                console.log('🔥 Клик по фону модального окна');
                modal.style.display = 'none';
                return;
            }
            
            return; // Прекращаем обработку для кликов внутри модальных окон
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
        // Message sending
        else if (target.classList.contains('send-btn') || target.title === 'Отправить' || (button && button.title === 'Отправить')) {
            console.log('🔥 Отправляем сообщение');
            this.sendMessage();
        }
        // File attachment
        else if (target.title === 'Прикрепить файл' || (button && button.title === 'Прикрепить файл')) {
            console.log('🔥 Прикрепляем файл');
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.click();
            } else {
                console.error('🔥 Элемент file-input не найден');
                this.showNotification('Ошибка: элемент загрузки файлов не найден', 'error');
            }
        }
        // Photo attachment
        else if (target.title === 'Отправить фото' || (button && button.title === 'Отправить фото')) {
            console.log('🔥 Отправляем фото');
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.multiple = true;
            input.onchange = (e) => {
                console.log('🔥 Выбраны фото:', e.target.files.length);
                this.handleFileSelect(e);
            };
            input.click();
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
                console.log('🔥 Аутентифицируем пользователя через Socket.IO');
                this.socket.emit('user-online', this.currentUser.id);
                
                // Аутентификация через WebSocket
                const token = localStorage.getItem('token');
                if (token) {
                    this.socket.emit('authenticate', token);
                }
            }
        });

        this.socket.on('authenticated', (data) => {
            console.log('🔥 Socket.IO аутентификация успешна:', data);
        });

        this.socket.on('auth-error', (data) => {
            console.error('🔥 Ошибка Socket.IO аутентификации:', data);
        });

        this.socket.on('new-message', (message) => {
            console.log('🔥 Получено новое сообщение через Socket.IO:', message);
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
        const chatList = document.getElementById('chats-list');
        if (!chatList) {
            console.warn('🔥 Элемент chats-list не найден');
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
        const chatList = document.getElementById('chats-list');
        if (!chatList) {
            console.warn('🔥 Элемент chats-list не найден');
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
        console.log('🔥 Выбираем чат:', chat);
        this.currentChat = chat;
        
        // Update UI
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const chatItem = document.querySelector(`[data-chat-id="${chat.id}"]`);
        if (chatItem) {
            chatItem.classList.add('active');
        }
        
        // Update chat header
        const chatUsername = document.getElementById('chat-username');
        const chatStatus = document.getElementById('chat-status');
        const chatAvatar = document.getElementById('chat-avatar');
        
        if (chatUsername) {
            chatUsername.textContent = chat.name;
        } else {
            console.warn('🔥 Элемент chat-username не найден');
        }
        
        if (chatStatus) {
            chatStatus.textContent = chat.isOnline ? 'в сети' : 'не в сети';
        } else {
            console.warn('🔥 Элемент chat-status не найден');
        }
        
        if (chatAvatar) {
            chatAvatar.src = chat.avatar || '/default-avatar.png';
        } else {
            console.warn('🔥 Элемент chat-avatar не найден');
        }
        
        // Load messages
        this.loadMessages(chat.id);
        
        // Show chat area - исправляем отображение
        const noChatSelected = document.getElementById('no-chat-selected');
        const chatContainer = document.getElementById('chat-container');
        
        if (noChatSelected) {
            noChatSelected.style.display = 'none';
        }
        
        if (chatContainer) {
            chatContainer.style.display = 'flex';
            console.log('🔥 Контейнер чата показан');
        } else {
            console.warn('🔥 Элемент chat-container не найден');
        }
    }

    async loadMessages(chatId) {
        console.log('🔥 Загружаем сообщения для чата:', chatId);
        try {
            const response = await fetch(`/api/chats/${chatId}/messages`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            console.log('🔥 Ответ сервера сообщений:', response.status);
            const data = await response.json();
            console.log('🔥 Данные сообщений:', data);
            
            if (data.success) {
                this.renderMessages(data.messages);
            } else {
                console.error('🔥 Ошибка загрузки сообщений:', data.message);
                this.showNotification('Ошибка загрузки сообщений: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке сообщений:', error);
            this.showNotification('Ошибка загрузки сообщений', 'error');
        }
    }
    renderMessages(messages) {
        console.log('🔥 Отображаем сообщения:', messages.length);
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) {
            console.warn('🔥 Элемент messages-container не найден');
            return;
        }
        
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
        
        // Обработка файлов - исправленная версия
        if (message.fileData || message.file) {
            const fileInfo = message.fileData || message.file;
            console.log('🔥 Отображаем файл в сообщении:', fileInfo);
            
            const fileUrl = fileInfo.url || `/uploads/${fileInfo.filename}`;
            
            if (fileInfo.mimetype && fileInfo.mimetype.startsWith('image/')) {
                fileContent = `
                    <div class="message-file">
                        <img src="${fileUrl}" alt="Image" class="message-image" loading="lazy" 
                             onerror="console.error('🔥 Ошибка загрузки изображения:', this.src); this.style.display='none';">
                    </div>
                `;
            } else if (fileInfo.mimetype && fileInfo.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video" preload="metadata">
                            <source src="${fileUrl}" type="${fileInfo.mimetype}">
                            Ваш браузер не поддерживает видео.
                        </video>
                    </div>
                `;
            } else if (fileInfo.mimetype && fileInfo.mimetype.startsWith('audio/')) {
                // Голосовые сообщения и аудио файлы
                const isVoiceMessage = fileInfo.originalName === 'Голосовое сообщение' || fileInfo.filename.includes('voice');
                fileContent = `
                    <div class="message-file">
                        <div class="message-audio ${isVoiceMessage ? 'voice-message' : ''}">
                            <div class="audio-info">
                                <i class="fas fa-${isVoiceMessage ? 'microphone' : 'music'}"></i>
                                <span>${isVoiceMessage ? 'Голосовое сообщение' : (fileInfo.originalName || 'Аудио файл')}</span>
                            </div>
                            <audio controls preload="metadata">
                                <source src="${fileUrl}" type="${fileInfo.mimetype}">
                                Ваш браузер не поддерживает аудио.
                            </audio>
                        </div>
                    </div>
                `;
            } else {
                // Документы и другие файлы
                const fileName = fileInfo.originalName || fileInfo.filename || 'Файл';
                const fileSize = fileInfo.size ? this.formatFileSize(fileInfo.size) : '';
                
                fileContent = `
                    <div class="message-file">
                        <div class="message-document">
                            <i class="fas fa-file"></i>
                            <div class="document-info">
                                <div class="document-name">${this.escapeHtml(fileName)}</div>
                                ${fileSize ? `<div class="document-size">${fileSize}</div>` : ''}
                            </div>
                            <a href="${fileUrl}" download="${fileName}" class="download-btn">
                                <i class="fas fa-download"></i>
                            </a>
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
        if (!input) {
            console.error('🔥 Элемент message-input не найден');
            return;
        }
        
        const text = input.value.trim();
        
        if (!text || !this.currentChat) {
            console.log('🔥 Нет текста или чата для отправки');
            return;
        }
        
        console.log('🔥 Отправляем сообщение:', text, 'в чат:', this.currentChat.id);
        
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
            
            console.log('🔥 Ответ отправки сообщения:', response.status);
            const data = await response.json();
            console.log('🔥 Данные ответа:', data);
            
            if (data.success) {
                input.value = '';
                console.log('🔥 Сообщение отправлено успешно');
                // Message will be added via socket
            } else {
                console.error('🔥 Ошибка отправки:', data.message);
                this.showNotification('Ошибка отправки сообщения: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке сообщения:', error);
            this.showNotification('Ошибка отправки сообщения', 'error');
        }
    }
    handleNewMessage(message) {
        console.log('🔥 Получено новое сообщение:', message);
        
        if (this.currentChat && message.chatId === this.currentChat.id) {
            const messageElement = this.createMessageElement(message);
            const messagesContainer = document.getElementById('messages-container');
            if (messagesContainer) {
                messagesContainer.appendChild(messageElement);
                this.scrollToBottom();
                console.log('🔥 Сообщение добавлено в текущий чат');
            } else {
                console.warn('🔥 Контейнер сообщений не найден');
            }
        } else {
            console.log('🔥 Сообщение для другого чата или нет активного чата');
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
        console.log('🔥 Пытаемся открыть статус');
        const modal = document.getElementById('status-modal');
        console.log('🔥 Модальное окно статуса:', modal);
        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 99999 !important;
                justify-content: center !important;
                align-items: center !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            // Делаем содержимое модального окна кликабельным
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.cssText = `
                    pointer-events: auto !important;
                    position: relative !important;
                    z-index: 100000 !important;
                `;
            }
            
            console.log('🔥 Модальное окно статуса открыто');
        } else {
            console.warn('🔥 Модальное окно статуса не найдено');
        }
    }

    openUsersModal() {
        console.log('🔥 Пытаемся открыть поиск пользователей');
        const modal = document.getElementById('users-modal');
        console.log('🔥 Модальное окно пользователей:', modal);
        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 99999 !important;
                justify-content: center !important;
                align-items: center !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            // Делаем содержимое модального окна кликабельным
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.cssText = `
                    pointer-events: auto !important;
                    position: relative !important;
                    z-index: 100000 !important;
                `;
            }
            
            console.log('🔥 Модальное окно пользователей открыто');
            this.loadUsers();
        } else {
            console.warn('🔥 Модальное окно пользователей не найдено');
        }
    }

    openSettingsModal() {
        console.log('🔥 Пытаемся открыть настройки');
        const modal = document.getElementById('settings-modal');
        console.log('🔥 Модальное окно настроек:', modal);
        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 99999 !important;
                justify-content: center !important;
                align-items: center !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            
            // Делаем содержимое модального окна кликабельным
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.cssText = `
                    pointer-events: auto !important;
                    position: relative !important;
                    z-index: 100000 !important;
                `;
            }
            
            console.log('🔥 Модальное окно настроек открыто');
            this.loadUserSettings();
        } else {
            console.warn('🔥 Модальное окно настроек не найдено');
        }
    }

    openGamesModal() {
        console.log('🔥 Пытаемся открыть игры');
        const modal = document.getElementById('games-modal');
        console.log('🔥 Модальное окно игр:', modal);
        if (modal) {
            modal.style.cssText = `
                display: flex !important;
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 100% !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 99999 !important;
                justify-content: center !important;
                align-items: center !important;
                visibility: visible !important;
                opacity: 1 !important;
            `;
            console.log('🔥 Модальное окно игр открыто');
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
            console.log('🔥 Модальное окно закрыто:', modalId);
        } else {
            console.warn('🔥 Модальное окно не найдено:', modalId);
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
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
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
        console.log('🔥 Выбраны файлы:', e.target.files.length);
        const files = Array.from(e.target.files);
        
        if (files.length === 0) {
            console.warn('🔥 Файлы не выбраны');
            return;
        }
        
        files.forEach((file, index) => {
            console.log(`🔥 Обрабатываем файл ${index + 1}:`, file.name, file.type, file.size);
            this.sendFileMessage(file);
        });
    }

    async sendFileMessage(file) {
        if (!this.currentChat) {
            console.error('🔥 Нет активного чата для отправки файла');
            this.showNotification('Выберите чат для отправки файла', 'error');
            return;
        }
        
        console.log('🔥 Отправляем файл:', file.name, 'размер:', file.size, 'тип:', file.type);
        
        // Проверяем размер файла (50MB лимит)
        if (file.size > 50 * 1024 * 1024) {
            this.showNotification('Файл слишком большой (максимум 50MB)', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', this.currentChat.id);
        
        try {
            console.log('🔥 Отправляем запрос на загрузку файла...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            console.log('🔥 Ответ сервера загрузки файла:', response.status);
            const data = await response.json();
            console.log('🔥 Данные ответа загрузки:', data);
            
            if (data.success) {
                console.log('🔥 Файл загружен успешно, отправляем сообщение с файлом');
                // Отправляем сообщение с информацией о файле
                await this.sendMessageWithFile(data.file);
            } else {
                console.error('🔥 Ошибка загрузки файла:', data.error);
                this.showNotification('Ошибка загрузки файла: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке файла:', error);
            this.showNotification('Ошибка загрузки файла', 'error');
        }
    }

    async sendMessageWithFile(fileInfo) {
        if (!this.currentChat) return;
        
        console.log('🔥 Отправляем сообщение с файлом:', fileInfo);
        
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
            
            console.log('🔥 Ответ отправки сообщения с файлом:', response.status);
            const data = await response.json();
            console.log('🔥 Данные ответа сообщения с файлом:', data);
            
            if (data.success) {
                console.log('🔥 Сообщение с файлом отправлено успешно');
            } else {
                console.error('🔥 Ошибка отправки сообщения с файлом:', data.message);
                this.showNotification('Ошибка отправки файла: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке сообщения с файлом:', error);
            this.showNotification('Ошибка отправки файла', 'error');
        }
    }

    // Voice recording
    async startVoiceRecording() {
        try {
            console.log('🔥 Начинаем запись голосового сообщения');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.recordedChunks = [];
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                console.log('🔥 Запись голосового сообщения завершена');
                const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
                this.sendVoiceMessage(blob);
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            
            // Update UI
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                voiceBtn.classList.add('recording');
            }
            
            // Show recording indicator
            const recordingIndicator = document.getElementById('voice-recording');
            if (recordingIndicator) {
                recordingIndicator.style.display = 'flex';
            }
            
            this.showNotification('Запись голосового сообщения...', 'info');
            
        } catch (error) {
            console.error('🔥 Ошибка доступа к микрофону:', error);
            this.showNotification('Ошибка доступа к микрофону', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            console.log('🔥 Останавливаем запись голосового сообщения');
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            // Update UI
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceBtn.classList.remove('recording');
            }
            
            // Hide recording indicator
            const recordingIndicator = document.getElementById('voice-recording');
            if (recordingIndicator) {
                recordingIndicator.style.display = 'none';
            }
        }
    }

    async sendVoiceMessage(audioBlob) {
        if (!this.currentChat) {
            console.error('🔥 Нет активного чата для отправки голосового сообщения');
            this.showNotification('Выберите чат для отправки голосового сообщения', 'error');
            return;
        }
        
        console.log('🔥 Отправляем голосовое сообщение, размер:', audioBlob.size);
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-message.webm');
        formData.append('chatId', this.currentChat.id);
        
        try {
            console.log('🔥 Загружаем голосовое сообщение на сервер...');
            const response = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            console.log('🔥 Ответ сервера загрузки голосового сообщения:', response.status);
            const data = await response.json();
            console.log('🔥 Данные ответа загрузки голосового сообщения:', data);
            
            if (data.success) {
                console.log('🔥 Голосовое сообщение загружено, отправляем сообщение');
                // Отправляем сообщение с голосовым файлом
                await this.sendMessageWithFile({
                    ...data.file,
                    mimetype: 'audio/webm',
                    originalName: 'Голосовое сообщение'
                });
                this.showNotification('Голосовое сообщение отправлено', 'success');
            } else {
                console.error('🔥 Ошибка загрузки голосового сообщения:', data.error);
                this.showNotification('Ошибка отправки голосового сообщения: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке голосового сообщения:', error);
            this.showNotification('Ошибка отправки голосового сообщения', 'error');
        }
    }

    // Additional methods for new features
    async loadUsers() {
        console.log('🔥 Загружаем пользователей...');
        try {
            const response = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            
            console.log('🔥 Ответ сервера пользователей:', response.status);
            const data = await response.json();
            console.log('🔥 Данные пользователей:', data);
            
            if (data.success) {
                this.renderUsersList(data.users);
            } else {
                console.error('🔥 Ошибка загрузки пользователей:', data.message);
                this.showNotification('Ошибка загрузки пользователей: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при загрузке пользователей:', error);
            this.showNotification('Ошибка загрузки пользователей', 'error');
        }
    }

    renderUsersList(users) {
        console.log('🔥 Отображаем пользователей:', users.length);
        const usersList = document.getElementById('users-list');
        if (!usersList) {
            console.warn('🔥 Элемент users-list не найден');
            return;
        }
        
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'user-item';
            userItem.dataset.userId = user.id; // Добавляем ID в data атрибут
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
        
        console.log('🔥 Пользователи отображены');
    }

    async startChat(userId) {
        console.log('🔥 Создаем чат с пользователем:', userId);
        try {
            const response = await fetch('/api/chats/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ userId })
            });
            
            console.log('🔥 Ответ создания чата:', response.status);
            const data = await response.json();
            console.log('🔥 Данные создания чата:', data);
            
            if (data.success) {
                this.closeModal('users-modal');
                this.selectChat(data.chat);
                this.loadChats(); // Refresh chat list
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
        const themeCard = document.querySelector(`[data-theme="${theme}"]`);
        if (themeCard) {
            themeCard.classList.add('active');
        }
        
        // Apply theme
        document.body.className = `theme-${theme}`;
        localStorage.setItem('theme', theme);
    }

    selectChatType(type) {
        document.querySelectorAll('.chat-type-btn').forEach(btn => btn.classList.remove('active'));
        const chatTypeBtn = document.querySelector(`[data-type="${type}"]`);
        if (chatTypeBtn) {
            chatTypeBtn.classList.add('active');
        }
        
        // Show/hide group options
        const groupCreation = document.getElementById('group-creation');
        const groupActions = document.getElementById('group-actions');
        if (type === 'group') {
            if (groupCreation) groupCreation.style.display = 'block';
            if (groupActions) groupActions.style.display = 'block';
        } else {
            if (groupCreation) groupCreation.style.display = 'none';
            if (groupActions) groupActions.style.display = 'none';
        }
    }

    selectStatus(status) {
        console.log('🔥 Выбираем статус:', status);
        document.querySelectorAll('.status-option').forEach(option => option.classList.remove('active'));
        const selectedOption = document.querySelector(`[data-status="${status}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }
        
        // Update user status
        this.updateUserStatus(this.currentUser.id, status);
        this.showNotification(`Статус изменен на: ${status}`, 'success');
    }

    setCustomStatus() {
        const customStatusInput = document.getElementById('custom-status-text');
        if (customStatusInput) {
            const customStatus = customStatusInput.value.trim();
            if (customStatus) {
                this.showNotification(`Пользовательский статус: ${customStatus}`, 'success');
                customStatusInput.value = '';
            } else {
                this.showNotification('Введите текст статуса', 'error');
            }
        }
    }

    saveSettings() {
        this.showNotification('Настройки сохранены!', 'success');
        this.closeModal('settings-modal');
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
        const drawTool = document.querySelector(`[data-tool="${tool}"]`);
        if (drawTool) {
            drawTool.classList.add('active');
        }
        
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
        console.log('🔥 Глобальный обработчик: отправка сообщения');
        if (app && app.sendMessage) {
            app.sendMessage();
        }
    }
    
    // Handle file attachment
    if (e.target.title === 'Прикрепить файл' || e.target.closest('[title="Прикрепить файл"]')) {
        console.log('🔥 Глобальный обработчик: прикрепить файл');
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.click();
        } else {
            console.error('🔥 Элемент file-input не найден');
        }
    }
    
    // Handle photo attachment
    if (e.target.title === 'Отправить фото' || e.target.closest('[title="Отправить фото"]')) {
        console.log('🔥 Глобальный обработчик: отправить фото');
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;
        input.onchange = (e) => {
            console.log('🔥 Выбраны фото через глобальный обработчик:', e.target.files.length);
            if (app && app.handleFileSelect) {
                app.handleFileSelect(e);
            }
        };
        input.click();
    }
    
    // Handle voice recording
    if (e.target.title === 'Голосовое сообщение' || e.target.closest('#voice-btn')) {
        console.log('🔥 Глобальный обработчик: голосовое сообщение');
        if (app) {
            if (app.isRecording) {
                app.stopVoiceRecording();
            } else {
                app.startVoiceRecording();
            }
        }
    }
    
    // Handle stickers panel
    if (e.target.title === 'Стикеры и GIF' || e.target.closest('#sticker-btn')) {
        console.log('🔥 Глобальный обработчик: стикеры');
        const panel = document.getElementById('sticker-panel');
        if (panel) {
            panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
        }
    }
    
    // Handle poll creation
    if (e.target.title === 'Создать опрос' || e.target.closest('#poll-btn')) {
        console.log('🔥 Глобальный обработчик: создать опрос');
        const panel = document.getElementById('poll-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
    
    // Handle drawing
    if (e.target.title === 'Совместное рисование' || e.target.closest('#draw-btn')) {
        console.log('🔥 Глобальный обработчик: рисование');
        const panel = document.getElementById('draw-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
});

// Дополнительные функции для новых возможностей
function switchStickerTab(tab) {
    document.querySelectorAll('.sticker-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.stickers-grid, .gifs-grid').forEach(grid => grid.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-grid`).classList.add('active');
    
    if (tab === 'stickers') {
        loadStickers();
    } else if (tab === 'gifs') {
        loadGifs();
    }
}

function loadStickers() {
        const stickersGrid = document.getElementById('stickers-grid');
        if (!stickersGrid) return;
        
        // Популярные эмодзи стикеры
        const stickers = [
            '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
            '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
            '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
            '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
            '😔', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢',
            '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱',
            '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
            '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱',
            '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷'
        ];
        
        stickersGrid.innerHTML = '';
        stickers.forEach(sticker => {
            const stickerItem = document.createElement('div');
            stickerItem.className = 'sticker-item';
            stickerItem.textContent = sticker;
            stickerItem.addEventListener('click', () => {
                sendStickerMessage(sticker);
            });
            stickersGrid.appendChild(stickerItem);
        });
    }

function loadGifs() {
        const gifsContainer = document.querySelector('.gifs-container');
        if (!gifsContainer) return;
        
        // Заглушка для GIF - в реальном приложении здесь был бы API Giphy
        gifsContainer.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-secondary);">
                <i class="fas fa-images" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                GIF поиск будет доступен после интеграции с Giphy API
            </div>
        `;
    }

async function sendStickerMessage(sticker) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки стикера', 'error');
            return;
        }
        
        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: sticker,
                    type: 'sticker'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                // Hide sticker panel
                document.getElementById('sticker-panel').style.display = 'none';
                this.showNotification('Стикер отправлен!', 'success');
            } else {
                this.showNotification('Ошибка отправки стикера', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка отправки стикера:', error);
            this.showNotification('Ошибка отправки стикера', 'error');
        }
    }

    selectDrawTool(tool) {
        document.querySelectorAll('.draw-tool').forEach(btn => btn.classList.remove('active'));
        const toolBtn = document.querySelector(`[data-tool="${tool}"]`);
        if (toolBtn) {
            toolBtn.classList.add('active');
        }
        
        // Set drawing mode
        this.currentDrawTool = tool;
        const canvas = document.getElementById('draw-canvas');
        if (canvas) {
            canvas.style.cursor = tool === 'eraser' ? 'crosshair' : 'crosshair';
        }
    }

    startGame(game) {
        console.log('🔥 Запускаем игру:', game);
        this.closeModal('games-modal');
        
        switch (game) {
            case 'tic-tac-toe':
                this.startTicTacToe();
                break;
            case 'quiz':
                this.startQuiz();
                break;
            case 'word-game':
                this.startWordGame();
                break;
            default:
                this.showNotification('Игра пока не реализована', 'info');
        }
    }

    startTicTacToe() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для игры', 'error');
            return;
        }
        
        this.showNotification('🎮 Крестики-нолики запущены!', 'success');
        // Здесь была бы логика игры
    }

    startQuiz() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для викторины', 'error');
            return;
        }
        
        this.showNotification('🧠 Викторина запущена!', 'success');
        // Здесь была бы логика викторины
    }

    startWordGame() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для игры в слова', 'error');
            return;
        }
        
        this.showNotification('📝 Игра в слова запущена!', 'success');
        // Здесь была бы логика игры в слова
    }

    // Обработка аватара
    handleAvatarSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Выберите изображение для аватара', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Размер файла не должен превышать 5MB', 'error');
            return;
        }
        
        // Preview avatar
        const reader = new FileReader();
        reader.onload = (e) => {
            const settingsAvatar = document.getElementById('settings-avatar');
            if (settingsAvatar) {
                settingsAvatar.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
        
        this.selectedAvatarFile = file;
    }

    async saveSettings() {
        console.log('🔥 Сохраняем настройки');
        
        const username = document.getElementById('settings-username').value.trim();
        const password = document.getElementById('settings-password').value;
        
        if (!username) {
            this.showNotification('Введите имя пользователя', 'error');
            return;
        }
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            if (password) {
                formData.append('password', password);
            }
            if (this.selectedAvatarFile) {
                formData.append('avatar', this.selectedAvatarFile);
            }
            
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const data = await response.json();
            if (data.success) {
                this.currentUser = { ...this.currentUser, ...data.user };
                this.updateUserProfile();
                this.closeModal('settings-modal');
                this.showNotification('Настройки сохранены!', 'success');
            } else {
                this.showNotification('Ошибка сохранения настроек: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка сохранения настроек:', error);
            this.showNotification('Ошибка сохранения настроек', 'error');
        }
    }

    // Звуковые эффекты
    playNotificationSound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Игнорируем ошибки автовоспроизведения
        } catch (error) {
            // Звук не критичен, игнорируем ошибки
        }
    }

    // Улучшенные уведомления со звуком
    showNotification(message, type = 'info') {
        console.log(`🔥 Уведомление [${type}]:`, message);
        
        // Воспроизводим звук для важных уведомлений
        if (type === 'success' || type === 'error') {
            this.playNotificationSound();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Анимация появления
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Автоматическое скрытие
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    // Инициализация дополнительных обработчиков
    initializeAdditionalFeatures() {
        // Обработчик для панели стикеров
        document.getElementById('sticker-btn')?.addEventListener('click', () => {
            const panel = document.getElementById('sticker-panel');
            if (panel) {
                const isVisible = panel.style.display === 'block';
                panel.style.display = isVisible ? 'none' : 'block';
                if (!isVisible) {
                    this.loadStickers();
                }
            }
        });

        // Обработчик для кнопки голосового сообщения
        document.getElementById('voice-btn')?.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopVoiceRecording();
            } else {
                this.startVoiceRecording();
            }
        });

        // Закрытие панелей при клике вне их
        document.addEventListener('click', (e) => {
            const panels = ['sticker-panel', 'poll-panel', 'draw-panel'];
            panels.forEach(panelId => {
                const panel = document.getElementById(panelId);
                if (panel && panel.style.display === 'block') {
                    if (!panel.contains(e.target) && !e.target.closest(`#${panelId.replace('-panel', '-btn')}`)) {
                        panel.style.display = 'none';
                    }
                }
            });
        });

        // Инициализация темы из localStorage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            this.selectTheme(savedTheme);
        }
    }
}

// Инициализация приложения
const app = new MessengerApp();

// Дополнительная инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    app.initializeAdditionalFeatures();
    
    // Добавляем обработчики для новых элементов
    const avatarInput = document.getElementById('avatar-input');
    const avatarBtn = document.querySelector('.btn-secondary');
    
    if (avatarBtn && avatarInput) {
        avatarBtn.addEventListener('click', () => {
            avatarInput.click();
        });
    }
    
    console.log('🔥 Flux Messenger полностью загружен и готов к работе!');
});

// Глобальные обработчики для дополнительных функций
document.addEventListener('click', (e) => {
    // Handle poll creation
    if (e.target.title === 'Создать опрос' || e.target.closest('#poll-btn')) {
        console.log('🔥 Глобальный обработчик: создать опрос');
        const panel = document.getElementById('poll-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
    
    // Handle drawing
    if (e.target.title === 'Совместное рисование' || e.target.closest('#draw-btn')) {
        console.log('🔥 Глобальный обработчик: рисование');
        const panel = document.getElementById('draw-panel');
        if (panel) {
            panel.style.display = 'block';
        }
    }
});