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
        this.setupSearchListeners();
        this.checkAuthStatus();
        
        // Initialize drawing canvas when draw panel is opened
        document.addEventListener('click', (e) => {
            if (e.target.title === 'Совместное рисование' || e.target.id === 'draw-btn') {
                setTimeout(() => {
                    this.initializeDrawingCanvas();
                }, 100);
            }
        });
        
        // Initialize GIF search
        document.addEventListener('input', (e) => {
            if (e.target.id === 'gif-search') {
                this.loadGifs(e.target.value);
            }
        });
        
        // Initialize sticker tab switching
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('sticker-tab')) {
                document.querySelectorAll('.sticker-tab').forEach(tab => tab.classList.remove('active'));
                document.querySelectorAll('.stickers-grid, .gifs-grid').forEach(grid => grid.classList.remove('active'));
                
                e.target.classList.add('active');
                const tabType = e.target.dataset.tab;
                
                if (tabType === 'gifs') {
                    document.getElementById('gifs-grid').classList.add('active');
                    this.loadGifs();
                } else {
                    document.getElementById('stickers-grid').classList.add('active');
                }
            }
        });
        
        // Initialize game clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.game-card')) {
                const gameCard = e.target.closest('.game-card');
                const gameType = gameCard.dataset.game;
                if (gameType) {
                    this.startGame(gameType);
                }
            }
        });
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

        document.getElementById('avatar-input')?.addEventListener('change', (e) => {
            this.handleAvatarSelect(e);
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
            
            // Обработка современных настроек
            if (modal.id === 'settings-modal') {
                // Кнопка назад в подэкране
                if (target.classList.contains('back-btn') || target.closest('.back-btn')) {
                    this.closeSettingsSubscreen();
                    return;
                }
                
                // Клик по элементу настроек
                const settingItem = target.closest('.setting-item');
                if (settingItem) {
                    const setting = settingItem.dataset.setting;
                    if (setting) {
                        this.openSettingsSubscreen(setting);
                        return;
                    }
                }
                
                // Изменение аватара
                if (target.classList.contains('avatar-edit-btn') || target.closest('.avatar-edit-btn') || 
                    target.classList.contains('large-avatar') || target.closest('.large-avatar')) {
                    const avatarInput = document.getElementById('avatar-input');
                    if (avatarInput) {
                        avatarInput.click();
                    }
                    return;
                }
                
                // Кнопка сохранить
                if (target.classList.contains('save-btn') || target.closest('.save-btn')) {
                    this.saveSettings();
                    return;
                }
                
                // Выбор темы
                const themeOption = target.closest('.theme-option');
                if (themeOption) {
                    document.querySelectorAll('.theme-option').forEach(o => o.classList.remove('active'));
                    themeOption.classList.add('active');
                    const theme = themeOption.dataset.theme;
                    if (theme) {
                        this.selectTheme(theme);
                    }
                    return;
                }
                
                return; // Не обрабатываем другие клики в настройках
            }
            
            // Старые обработчики для других модалов
            if (target.textContent.includes('Изменить аватар') || target.classList.contains('btn-secondary')) {
                const avatarInput = document.getElementById('avatar-input');
                if (avatarInput) {
                    avatarInput.click();
                }
                return;
            }
            
            if (target.textContent.includes('Сохранить изменения') || (target.classList.contains('btn-primary') && modal.id === 'settings-modal')) {
                this.saveSettings();
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
        // Message input buttons
        else if (target.title === 'Голосовое сообщение' || target.id === 'voice-btn') {
            this.toggleVoiceRecording();
        } else if (target.title === 'Стикеры и GIF' || target.id === 'sticker-btn') {
            this.toggleStickerPanel();
        } else if (target.title === 'Создать опрос' || target.id === 'poll-btn') {
            this.togglePollPanel();
        } else if (target.title === 'Совместное рисование' || target.id === 'draw-btn') {
            this.toggleDrawPanel();
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

        this.socket.on('game-updated', (data) => {
            this.handleGameUpdate(data);
        });

        // Настраиваем обработчики звонков
        this.setupWebRTCHandlers();
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
        // Fix sender identification - use senderId instead of sender
        const isOwnMessage = message.senderId === this.currentUser.id || message.sender === this.currentUser.id;
        messageDiv.className = `message ${isOwnMessage ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;
        
        let fileContent = '';
        
        // Handle GIF messages
        if (message.type === 'gif' && message.fileData?.url) {
            fileContent = `
                <div class="message-file">
                    <img src="${message.fileData.url}" alt="GIF" class="message-gif" loading="lazy" 
                         style="max-width: 300px; max-height: 300px; border-radius: 12px; cursor: pointer;"
                         onclick="app.openMediaViewer('${message.fileData.url}', 'image')">
                </div>
            `;
        }
        // Handle game messages
        else if (message.type === 'game' && message.fileData) {
            fileContent = this.createGameElement(message.fileData, message.id);
        }
        // Обработка файлов
        else if (message.fileData || message.file) {
            const fileInfo = message.fileData || message.file;
            const fileUrl = fileInfo.url || `/uploads/${fileInfo.filename}`;
            
            if (fileInfo.mimetype && fileInfo.mimetype.startsWith('image/')) {
                fileContent = `
                    <div class="message-file">
                        <img src="${fileUrl}" alt="Image" class="message-image" loading="lazy" 
                             onclick="app.openMediaViewer('${fileUrl}', 'image')"
                             style="max-width: 300px; max-height: 300px; border-radius: 12px; cursor: pointer;">
                    </div>
                `;
            } else if (fileInfo.mimetype && fileInfo.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video" preload="metadata" 
                               style="max-width: 400px; max-height: 300px; border-radius: 12px;">
                            <source src="${fileUrl}" type="${fileInfo.mimetype}">
                            Ваш браузер не поддерживает видео.
                        </video>
                    </div>
                `;
            } else if (fileInfo.mimetype && fileInfo.mimetype.startsWith('audio/')) {
                const isVoiceMessage = fileInfo.originalName === 'Голосовое сообщение' || fileInfo.filename.includes('voice');
                fileContent = `
                    <div class="message-file">
                        <div class="message-audio ${isVoiceMessage ? 'voice-message' : ''}" 
                             style="display: flex; align-items: center; gap: 10px; padding: 10px; background: var(--bg-tertiary); border-radius: 12px;">
                            <i class="fas fa-${isVoiceMessage ? 'microphone' : 'music'}" style="color: var(--neon-green);"></i>
                            <span>${isVoiceMessage ? 'Голосовое сообщение' : (fileInfo.originalName || 'Аудио файл')}</span>
                            <audio controls preload="metadata" style="height: 30px;">
                                <source src="${fileUrl}" type="${fileInfo.mimetype}">
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
                        <div class="message-document" onclick="app.downloadFile('${fileUrl}', '${fileName}')"
                             style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-tertiary); border-radius: 12px; cursor: pointer; transition: var(--transition-smooth);">
                            <i class="fas fa-file" style="color: var(--neon-blue); font-size: 1.5rem;"></i>
                            <div class="document-info">
                                <div class="document-name" style="font-family: var(--font-primary); font-weight: 600; color: var(--text-primary);">${this.escapeHtml(fileName)}</div>
                                ${fileSize ? `<div class="document-size" style="font-size: 0.8rem; color: var(--text-secondary);">${fileSize}</div>` : ''}
                            </div>
                            <i class="fas fa-download" style="color: var(--neon-green);"></i>
                        </div>
                    </div>
                `;
            }
        }
        
        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                ${fileContent}
                <div class="message-time">${this.formatTime(message.timestamp)}</div>
            </div>
        `;
        
        return messageDiv;
    }

    createGameElement(gameData, messageId) {
        switch (gameData.type) {
            case 'tic-tac-toe':
                return this.createTicTacToeElement(gameData, messageId);
            case 'word-game':
                return this.createWordGameElement(gameData, messageId);
            case 'quiz':
                return this.createQuizElement(gameData, messageId);
            default:
                return '<div class="game-element">Неизвестная игра</div>';
        }
    }

    createTicTacToeElement(gameData, messageId) {
        const board = gameData.board || Array(9).fill('');
        const isActive = gameData.status === 'active' || gameData.status === 'waiting';
        
        let boardHtml = '<div class="tic-tac-toe-board" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; width: 200px; height: 200px; background: var(--bg-tertiary); border-radius: 8px; padding: 4px;">';
        
        for (let i = 0; i < 9; i++) {
            const cellValue = board[i] || '';
            const clickable = isActive && !cellValue;
            boardHtml += `
                <div class="tic-tac-toe-cell" 
                     data-position="${i}" 
                     data-message-id="${messageId}"
                     style="background: var(--bg-secondary); border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: bold; color: var(--neon-green); cursor: ${clickable ? 'pointer' : 'default'}; transition: var(--transition-smooth);"
                     ${clickable ? 'onclick="app.makeGameMove(\'' + messageId + '\', \'tic-tac-toe\', {position: ' + i + '})"' : ''}>
                    ${cellValue}
                </div>
            `;
        }
        
        boardHtml += '</div>';
        
        const statusText = gameData.status === 'waiting' ? 'Ожидание игрока' : 
                          gameData.status === 'active' ? `Ход: ${gameData.currentPlayer}` :
                          gameData.status === 'finished' ? `Победил: ${gameData.winner}` : 'Ничья';
        
        return `
            <div class="game-element tic-tac-toe-game" style="padding: 15px; background: var(--bg-tertiary); border-radius: 12px; margin: 5px 0;">
                <div class="game-header" style="text-align: center; margin-bottom: 10px; color: var(--text-primary); font-weight: 600;">
                    🎮 Крестики-нолики
                </div>
                ${boardHtml}
                <div class="game-status" style="text-align: center; margin-top: 10px; color: var(--text-secondary); font-size: 0.9rem;">
                    ${statusText}
                </div>
            </div>
        `;
    }

    createWordGameElement(gameData, messageId) {
        const word = gameData.guessed ? gameData.guessed.join(' ') : '';
        const attempts = gameData.attempts || 0;
        const guessedLetters = gameData.guessedLetters || [];
        
        return `
            <div class="game-element word-game" style="padding: 15px; background: var(--bg-tertiary); border-radius: 12px; margin: 5px 0;">
                <div class="game-header" style="text-align: center; margin-bottom: 10px; color: var(--text-primary); font-weight: 600;">
                    📝 Угадай слово
                </div>
                <div class="word-display" style="text-align: center; font-size: 1.5rem; font-family: var(--font-mono); color: var(--neon-green); margin: 10px 0; letter-spacing: 3px;">
                    ${word}
                </div>
                <div class="game-info" style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 0.9rem; color: var(--text-secondary);">
                    <span>Попытки: ${attempts}</span>
                    <span>Буквы: ${guessedLetters.join(', ')}</span>
                </div>
                ${gameData.status === 'active' ? `
                    <div class="letter-input" style="text-align: center; margin-top: 10px;">
                        <input type="text" maxlength="1" placeholder="Буква" 
                               style="width: 50px; text-align: center; padding: 5px; border: 1px solid var(--neon-green); background: var(--bg-secondary); color: var(--text-primary); border-radius: 4px;"
                               onkeypress="if(event.key==='Enter') app.makeGameMove('${messageId}', 'word-game', {letter: this.value}); this.value='';">
                        <button onclick="const input = this.previousElementSibling; app.makeGameMove('${messageId}', 'word-game', {letter: input.value}); input.value='';" 
                                style="margin-left: 10px; padding: 5px 10px; background: var(--neon-green); color: var(--bg-primary); border: none; border-radius: 4px; cursor: pointer;">
                            Угадать
                        </button>
                    </div>
                ` : `
                    <div class="game-result" style="text-align: center; margin-top: 10px; color: ${gameData.status === 'won' ? 'var(--neon-green)' : 'var(--neon-pink)'}; font-weight: 600;">
                        ${gameData.status === 'won' ? '🎉 Слово угадано!' : '💀 Игра окончена'}
                    </div>
                `}
            </div>
        `;
    }

    createQuizElement(gameData, messageId) {
        const question = gameData.questions[gameData.currentQuestion];
        if (!question) return '<div class="game-element">Вопросы закончились</div>';
        
        let optionsHtml = '';
        question.options.forEach((option, index) => {
            optionsHtml += `
                <button onclick="app.makeGameMove('${messageId}', 'quiz', {answer: ${index}})" 
                        style="display: block; width: 100%; margin: 5px 0; padding: 10px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--neon-blue); border-radius: 6px; cursor: pointer; transition: var(--transition-smooth);"
                        onmouseover="this.style.background='var(--neon-blue)'; this.style.color='var(--bg-primary)';"
                        onmouseout="this.style.background='var(--bg-secondary)'; this.style.color='var(--text-primary)';">
                    ${option}
                </button>
            `;
        });
        
        return `
            <div class="game-element quiz-game" style="padding: 15px; background: var(--bg-tertiary); border-radius: 12px; margin: 5px 0;">
                <div class="game-header" style="text-align: center; margin-bottom: 10px; color: var(--text-primary); font-weight: 600;">
                    🧠 Викторина
                </div>
                <div class="question" style="margin-bottom: 15px; color: var(--text-primary); font-weight: 500;">
                    ${question.question}
                </div>
                <div class="options">
                    ${optionsHtml}
                </div>
            </div>
        `;
    }

    async makeGameMove(messageId, gameType, move) {
        if (!this.socket || !this.currentChat) {
            this.showNotification('Нет соединения с сервером', 'error');
            return;
        }
        
        console.log('🎮 Делаем ход в игре:', { messageId, gameType, move });
        
        this.socket.emit('game-move', {
            messageId: messageId,
            gameType: gameType,
            move: move,
            chatId: this.currentChat.id
        });
    }

    // Обработчик обновлений игр
    handleGameUpdate(data) {
        const { messageId, gameData } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            const gameElement = messageElement.querySelector('.game-element');
            if (gameElement) {
                gameElement.outerHTML = this.createGameElement(gameData, messageId);
            }
        }
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



    openSettingsSubscreen(setting) {
        if (setting === 'logout') {
            if (confirm('Вы уверены, что хотите выйти?')) {
                this.logout();
            }
            return;
        }

        const subscreen = document.getElementById(`${setting}-settings`);
        if (subscreen) {
            subscreen.style.display = 'block';
            subscreen.classList.add('active');
        }
    }

    closeSettingsSubscreen() {
        document.querySelectorAll('.settings-subscreen').forEach(screen => {
            screen.classList.remove('active');
            setTimeout(() => {
                screen.style.display = 'none';
            }, 300);
        });
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
        if (!this.currentChat) {
            this.showNotification('Выберите чат для звонка', 'error');
            return;
        }
        
        this.showNotification('Запуск видеозвонка...', 'info');
        this.initializeVideoCall();
    }

    startAudioCall() {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для звонка', 'error');
            return;
        }
        
        this.showNotification('Запуск аудиозвонка...', 'info');
        this.initializeVideoCall(false); // false = только аудио
    }

    async initializeVideoCall(includeVideo = true) {
        try {
            // Получаем доступ к камере и микрофону
            const stream = await navigator.mediaDevices.getUserMedia({
                video: includeVideo,
                audio: true
            });
            
            // Создаем экран видеозвонка
            this.createVideoCallScreen(stream, includeVideo);
            
            // Отправляем уведомление о звонке
            if (this.socket && this.currentChat) {
                console.log('🔥 Отправляем уведомление о звонке в чат:', this.currentChat.id);
                this.socket.emit('call-user', {
                    chatId: this.currentChat.id,
                    callType: includeVideo ? 'video' : 'audio'
                });
            }
            
        } catch (error) {
            console.error('🔥 Ошибка доступа к медиа:', error);
            this.showNotification('Ошибка доступа к камере/микрофону', 'error');
        }
    }

    setupWebRTCHandlers() {
        if (!this.socket) return;
        
        // Handle incoming call - показываем уведомление
        this.socket.on('incoming-call', (data) => {
            console.log('🔥 Получено уведомление о входящем звонке:', data);
            const { callId, fromUserId, fromUsername, callType, chatId } = data;
            
            // Создаем красивое уведомление о звонке
            this.showCallNotification(fromUsername, callType, () => {
                console.log('🔥 Звонок принят');
                this.showNotification(`Принят ${callType === 'video' ? 'видео' : 'аудио'}звонок от ${fromUsername}`, 'success');
                
                // Уведомляем отправителя что звонок принят
                this.socket.emit('call-accepted', {
                    targetUserId: fromUserId,
                    callId: callId
                });
            }, () => {
                console.log('🔥 Звонок отклонен');
                this.showNotification('Звонок отклонен', 'info');
                
                // Уведомляем отправителя что звонок отклонен
                this.socket.emit('call-rejected', {
                    targetUserId: fromUserId,
                    callId: callId
                });
            });
        });

        // Обработка ответов на звонки
        this.socket.on('call-accepted', (data) => {
            console.log('🔥 Звонок принят:', data);
            this.showNotification('Звонок принят!', 'success');
        });

        this.socket.on('call-rejected', (data) => {
            console.log('🔥 Звонок отклонен:', data);
            this.showNotification('Звонок отклонен', 'info');
        });

        this.socket.on('call-failed', (data) => {
            console.log('🔥 Ошибка звонка:', data);
            this.showNotification('Ошибка звонка: ' + (data.error || 'Неизвестная ошибка'), 'error');
        });
    }

    showCallNotification(fromUsername, callType, onAccept, onReject) {
        // Удаляем предыдущие уведомления
        const existingNotification = document.querySelector('.call-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = 'call-notification';
        notification.innerHTML = `
            <h4>📞 Входящий ${callType === 'video' ? 'видео' : 'аудио'}звонок</h4>
            <p>От: ${this.escapeHtml(fromUsername)}</p>
            <div class="call-actions">
                <button class="accept-call">✅ Принять</button>
                <button class="reject-call">❌ Отклонить</button>
            </div>
        `;
        
        // Добавляем обработчики
        notification.querySelector('.accept-call').onclick = () => {
            notification.remove();
            onAccept();
        };
        
        notification.querySelector('.reject-call').onclick = () => {
            notification.remove();
            onReject();
        };
        
        document.body.appendChild(notification);
        
        // Автоматически убираем через 30 секунд
        setTimeout(() => {
            if (document.body.contains(notification)) {
                notification.remove();
                onReject();
            }
        }, 30000);
    }



    createVideoCallScreen(stream, includeVideo) {
        // Создаем экран видеозвонка
        const callScreen = document.createElement('div');
        callScreen.id = 'video-call-screen';
        callScreen.className = 'screen active';
        callScreen.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: var(--bg-primary);
            z-index: 15000;
            display: flex;
            flex-direction: column;
        `;
        
        callScreen.innerHTML = `
            <div class="video-call-container" style="width: 100%; height: 100%; display: flex; flex-direction: column;">
                <div class="video-area" style="flex: 1; position: relative; background: var(--bg-secondary); margin: 20px; border-radius: 12px; overflow: hidden;">
                    ${includeVideo ? `
                        <video id="remote-video" autoplay class="remote-video" style="width: 100%; height: 100%; object-fit: cover;"></video>
                        <video id="local-video" autoplay muted class="local-video" style="position: absolute; top: 20px; right: 20px; width: 200px; height: 150px; border-radius: 12px; border: 2px solid var(--neon-green); object-fit: cover; box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);"></video>
                    ` : `
                        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-primary);">
                            <i class="fas fa-phone" style="font-size: 5rem; color: var(--neon-green); margin-bottom: 20px;"></i>
                            <h2 style="font-family: var(--font-primary);">Аудиозвонок</h2>
                            <p style="color: var(--text-secondary);">Подключение...</p>
                        </div>
                    `}
                </div>
                
                <div class="call-controls" style="display: flex; justify-content: center; gap: 20px; padding: 30px;">
                    ${includeVideo ? `
                        <button id="toggle-video-btn" class="control-btn video-btn" style="width: 60px; height: 60px; border: none; border-radius: 50%; background: var(--bg-tertiary); color: var(--neon-green); border: 2px solid var(--neon-green); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: var(--transition-smooth);">
                            <i class="fas fa-video"></i>
                        </button>
                    ` : ''}
                    <button id="toggle-audio-btn" class="control-btn audio-btn" style="width: 60px; height: 60px; border: none; border-radius: 50%; background: var(--bg-tertiary); color: var(--neon-green); border: 2px solid var(--neon-green); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: var(--transition-smooth);">
                        <i class="fas fa-microphone"></i>
                    </button>
                    <button id="end-call-btn" class="control-btn end-btn" style="width: 60px; height: 60px; border: none; border-radius: 50%; background: var(--neon-pink); color: var(--bg-primary); border: 2px solid var(--neon-pink); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; transition: var(--transition-smooth);">
                        <i class="fas fa-phone-slash"></i>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(callScreen);
        
        // Настраиваем локальное видео
        if (includeVideo) {
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = stream;
            }
        }
        
        // Добавляем обработчики кнопок
        document.getElementById('toggle-audio-btn')?.addEventListener('click', () => {
            this.toggleCallAudio(stream);
        });
        
        if (includeVideo) {
            document.getElementById('toggle-video-btn')?.addEventListener('click', () => {
                this.toggleCallVideo(stream);
            });
        }
        
        document.getElementById('end-call-btn')?.addEventListener('click', () => {
            this.endCall(stream);
        });
    }

    toggleCallAudio(stream) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            const btn = document.getElementById('toggle-audio-btn');
            if (btn) {
                if (audioTrack.enabled) {
                    btn.innerHTML = '<i class="fas fa-microphone"></i>';
                    btn.style.color = 'var(--neon-green)';
                } else {
                    btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
                    btn.style.color = 'var(--neon-pink)';
                }
            }
        }
    }

    toggleCallVideo(stream) {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            const btn = document.getElementById('toggle-video-btn');
            if (btn) {
                if (videoTrack.enabled) {
                    btn.innerHTML = '<i class="fas fa-video"></i>';
                    btn.style.color = 'var(--neon-green)';
                } else {
                    btn.innerHTML = '<i class="fas fa-video-slash"></i>';
                    btn.style.color = 'var(--neon-pink)';
                }
            }
        }
    }

    endCall(stream) {
        // Останавливаем все треки
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Уведомляем о завершении звонка
        if (this.socket && this.currentChat) {
            this.socket.emit('end-call', {
                chatId: this.currentChat.id
            });
        }
        
        // Удаляем экран звонка
        const callScreen = document.getElementById('video-call-screen');
        if (callScreen && document.body.contains(callScreen)) {
            document.body.removeChild(callScreen);
        }
        
        this.showNotification('Звонок завершен', 'info');
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
            const editAvatarEl = document.getElementById('edit-avatar');
            const profileNameEl = document.getElementById('profile-name');
            
            if (usernameEl) usernameEl.value = this.currentUser.username;
            if (emailEl) emailEl.value = this.currentUser.email;
            if (avatarEl) avatarEl.src = this.currentUser.avatar || '/default-avatar.png';
            if (editAvatarEl) editAvatarEl.src = this.currentUser.avatar || '/default-avatar.png';
            if (profileNameEl) profileNameEl.textContent = this.currentUser.username;
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

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    openMediaViewer(url, type) {
        // Создаем модальное окно для просмотра медиа
        const modal = document.createElement('div');
        modal.className = 'media-viewer-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 20000;
            backdrop-filter: blur(10px);
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            position: relative;
        `;
        
        if (type === 'image') {
            const img = document.createElement('img');
            img.src = url;
            img.style.cssText = `
                max-width: 100%;
                max-height: 100%;
                border-radius: 12px;
                box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
            `;
            content.appendChild(img);
        }
        
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            position: absolute;
            top: -40px; right: 0;
            background: var(--neon-pink);
            color: white;
            border: none;
            border-radius: 50%;
            width: 35px; height: 35px;
            cursor: pointer;
            font-size: 1rem;
        `;
        closeBtn.onclick = () => document.body.removeChild(modal);
        
        content.appendChild(closeBtn);
        modal.appendChild(content);
        
        // Закрытие по клику на фон
        modal.onclick = (e) => {
            if (e.target === modal) {
                document.body.removeChild(modal);
            }
        };
        
        document.body.appendChild(modal);
    }

    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        this.showNotification('Файл загружается...', 'info');
    }

    // Методы для кнопок в чате
    toggleVoiceRecording() {
        if (this.isRecording) {
            this.stopVoiceRecording();
        } else {
            this.startVoiceRecording();
        }
    }

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
            
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '<i class="fas fa-stop"></i>';
                voiceBtn.style.background = 'var(--neon-pink)';
            }
            
            this.showNotification('Запись голосового сообщения...', 'info');
            
        } catch (error) {
            console.error('🔥 Ошибка доступа к микрофону:', error);
            this.showNotification('Ошибка доступа к микрофону', 'error');
        }
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            const voiceBtn = document.getElementById('voice-btn');
            if (voiceBtn) {
                voiceBtn.innerHTML = '<i class="fas fa-microphone"></i>';
                voiceBtn.style.background = '';
            }
        }
    }

    async sendVoiceMessage(audioBlob) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки голосового сообщения', 'error');
            return;
        }
        
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-message.webm');
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
                await this.sendMessageWithFile({
                    ...data.file,
                    mimetype: 'audio/webm',
                    originalName: 'Голосовое сообщение'
                });
                this.showNotification('Голосовое сообщение отправлено', 'success');
            } else {
                this.showNotification('Ошибка отправки голосового сообщения', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка при отправке голосового сообщения:', error);
            this.showNotification('Ошибка отправки голосового сообщения', 'error');
        }
    }

    toggleStickerPanel() {
        const panel = document.getElementById('sticker-panel');
        if (panel) {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
            if (!isVisible) {
                this.loadStickers();
            }
        }
    }

    togglePollPanel() {
        // Check if current chat is a group chat
        if (!this.currentChat) {
            this.showNotification('Выберите чат', 'error');
            return;
        }
        
        // For now, we'll assume all chats are private unless specified otherwise
        // In a real implementation, you'd check chat.type === 'group'
        if (!this.currentChat.isGroup) {
            this.showNotification('Опросы доступны только в групповых чатах', 'error');
            return;
        }
        
        const panel = document.getElementById('poll-panel');
        if (panel) {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
        }
    }

    toggleDrawPanel() {
        const panel = document.getElementById('draw-panel');
        if (panel) {
            const isVisible = panel.style.display === 'block';
            panel.style.display = isVisible ? 'none' : 'block';
        }
    }

    loadStickers() {
        const stickersGrid = document.getElementById('stickers-grid');
        if (!stickersGrid) return;
        
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
            stickerItem.style.cssText = `
                width: 40px; height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
                cursor: pointer;
                border-radius: 8px;
                transition: var(--transition-smooth);
            `;
            stickerItem.addEventListener('click', () => {
                this.sendStickerMessage(sticker);
            });
            stickerItem.addEventListener('mouseenter', () => {
                stickerItem.style.background = 'var(--bg-tertiary)';
                stickerItem.style.transform = 'scale(1.2)';
            });
            stickerItem.addEventListener('mouseleave', () => {
                stickerItem.style.background = '';
                stickerItem.style.transform = 'scale(1)';
            });
            stickersGrid.appendChild(stickerItem);
        });
    }

    async sendStickerMessage(sticker) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки стикера', 'error');
            return;
        }
        
        try {
            console.log('🔥 Отправляем стикер:', sticker);
            
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: sticker,
                    type: 'text' // Изменяем на text вместо sticker
                })
            });
            
            const data = await response.json();
            console.log('🔥 Ответ сервера на стикер:', data);
            
            if (data.success) {
                const stickerPanel = document.getElementById('sticker-panel');
                if (stickerPanel) stickerPanel.style.display = 'none';
                this.showNotification('Стикер отправлен!', 'success');
            } else {
                console.error('🔥 Ошибка отправки стикера:', data);
                this.showNotification('Ошибка отправки стикера: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка отправки стикера:', error);
            this.showNotification('Ошибка отправки стикера', 'error');
        }
    }

    // Missing methods for settings and functionality
    
    handleAvatarSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            this.showNotification('Выберите изображение', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Файл слишком большой (максимум 5MB)', 'error');
            return;
        }
        
        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('settings-avatar');
            if (avatarPreview) {
                avatarPreview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);
        
        // Сохраняем файл для отправки
        this.pendingAvatarFile = file;
    }

    async saveSettings() {
        try {
            const username = document.getElementById('settings-username')?.value?.trim();
            const password = document.getElementById('settings-password')?.value;
            
            let avatarUrl = null;
            
            // Загружаем аватар если выбран
            if (this.pendingAvatarFile) {
                const formData = new FormData();
                formData.append('file', this.pendingAvatarFile);
                
                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });
                
                const uploadData = await uploadResponse.json();
                if (uploadData.success) {
                    avatarUrl = uploadData.file.url;
                } else {
                    this.showNotification('Ошибка загрузки аватара', 'error');
                    return;
                }
            }
            
            // Обновляем профиль
            const updateData = {};
            if (username && username !== this.currentUser.username) {
                updateData.username = username;
            }
            if (password) {
                updateData.password = password;
            }
            if (avatarUrl) {
                updateData.avatar = avatarUrl;
            }
            
            if (Object.keys(updateData).length === 0) {
                this.showNotification('Нет изменений для сохранения', 'info');
                return;
            }
            
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updateData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                this.updateUserProfile();
                this.closeModal('settings-modal');
                this.showNotification('Настройки сохранены!', 'success');
                this.pendingAvatarFile = null;
                
                // Очищаем поле пароля
                const passwordField = document.getElementById('settings-password');
                if (passwordField) passwordField.value = '';
            } else {
                this.showNotification('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка сохранения настроек:', error);
            this.showNotification('Ошибка сохранения настроек', 'error');
        }
    }

    // Search functionality
    setupSearchListeners() {
        const userSearch = document.getElementById('user-search');
        const chatSearch = document.getElementById('chat-search');
        
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }
        
        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => {
                this.searchChats(e.target.value);
            });
        }
    }

    searchUsers(query) {
        const userItems = document.querySelectorAll('.user-item');
        const searchTerm = query.toLowerCase().trim();
        
        userItems.forEach(item => {
            const userName = item.querySelector('.user-name')?.textContent?.toLowerCase() || '';
            const shouldShow = !searchTerm || userName.includes(searchTerm);
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const searchTerm = query.toLowerCase().trim();
        
        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name')?.textContent?.toLowerCase() || '';
            const shouldShow = !searchTerm || chatName.includes(searchTerm);
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    // GIF functionality
    async loadGifs(searchTerm = '') {
        const gifsContainer = document.querySelector('.gifs-container');
        if (!gifsContainer) return;
        
        try {
            // For now, show placeholder GIFs since we don't have API key
            const placeholderGifs = [
                'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
                'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
                'https://media.giphy.com/media/3o6Zt4HU9uwXmXSAuI/giphy.gif',
                'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif'
            ];
            
            gifsContainer.innerHTML = '';
            
            placeholderGifs.forEach(gifUrl => {
                const gifItem = document.createElement('div');
                gifItem.className = 'gif-item';
                gifItem.innerHTML = `<img src="${gifUrl}" alt="GIF" loading="lazy">`;
                gifItem.style.cssText = `
                    cursor: pointer;
                    border-radius: 8px;
                    overflow: hidden;
                    transition: var(--transition-smooth);
                `;
                
                gifItem.addEventListener('click', () => {
                    this.sendGifMessage(gifUrl);
                });
                
                gifsContainer.appendChild(gifItem);
            });
            
        } catch (error) {
            console.error('🔥 Ошибка загрузки GIF:', error);
            gifsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Ошибка загрузки GIF</p>';
        }
    }

    async sendGifMessage(gifUrl) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для отправки GIF', 'error');
            return;
        }
        
        try {
            console.log('🔥 Отправляем GIF:', gifUrl);
            
            // Отправляем как обычное текстовое сообщение с URL
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: `🎬 GIF: ${gifUrl}`,
                    type: 'text'
                })
            });
            
            const data = await response.json();
            console.log('🔥 Ответ сервера на GIF:', data);
            
            if (data.success) {
                const stickerPanel = document.getElementById('sticker-panel');
                if (stickerPanel) stickerPanel.style.display = 'none';
                this.showNotification('GIF отправлен!', 'success');
            } else {
                console.error('🔥 Ошибка отправки GIF:', data);
                this.showNotification('Ошибка отправки GIF: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка отправки GIF:', error);
            this.showNotification('Ошибка отправки GIF', 'error');
        }
    }

    // Game functionality
    async startGame(gameType) {
        if (!this.currentChat) {
            this.showNotification('Выберите чат для игры', 'error');
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
                    text: `🎮 Игра: ${this.getGameName(gameType)} начата!`,
                    type: 'text'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                this.closeModal('games-modal');
                this.showNotification('Игра начата!', 'success');
            } else {
                console.error('🔥 Ошибка создания игры:', data);
                this.showNotification('Ошибка создания игры: ' + (data.message || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка создания игры:', error);
            this.showNotification('Ошибка создания игры', 'error');
        }
    }

    getGameName(gameType) {
        const names = {
            'tic-tac-toe': 'Крестики-нолики',
            'word-game': 'Угадай слово',
            'quiz': 'Викторина'
        };
        return names[gameType] || gameType;
    }

    // Missing methods for settings and functionality

    handleAvatarSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            this.showNotification('Выберите изображение', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Файл слишком большой (максимум 5MB)', 'error');
            return;
        }

        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarPreview = document.getElementById('settings-avatar');
            if (avatarPreview) {
                avatarPreview.src = e.target.result;
            }
        };
        reader.readAsDataURL(file);

        // Сохраняем файл для отправки
        this.pendingAvatarFile = file;
    }

    async saveSettings() {
        try {
            const username = document.getElementById('settings-username')?.value?.trim();
            const password = document.getElementById('settings-password')?.value;

            let avatarUrl = null;

            // Загружаем аватар если выбран
            if (this.pendingAvatarFile) {
                const formData = new FormData();
                formData.append('file', this.pendingAvatarFile);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                const uploadData = await uploadResponse.json();
                if (uploadData.success) {
                    avatarUrl = uploadData.file.url;
                } else {
                    this.showNotification('Ошибка загрузки аватара', 'error');
                    return;
                }
            }

            // Обновляем профиль
            const updateData = {};
            if (username && username !== this.currentUser.username) {
                updateData.username = username;
            }
            if (password) {
                updateData.password = password;
            }
            if (avatarUrl) {
                updateData.avatar = avatarUrl;
            }

            if (Object.keys(updateData).length === 0) {
                this.showNotification('Нет изменений для сохранения', 'info');
                return;
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (data.success) {
                this.currentUser = data.user;
                this.updateUserProfile();
                this.closeModal('settings-modal');
                this.showNotification('Настройки сохранены!', 'success');
                this.pendingAvatarFile = null;

                // Очищаем поле пароля
                const passwordField = document.getElementById('settings-password');
                if (passwordField) passwordField.value = '';
            } else {
                this.showNotification('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'), 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка сохранения настроек:', error);
            this.showNotification('Ошибка сохранения настроек', 'error');
        }
    }

    // Search functionality
    setupSearchListeners() {
        const userSearch = document.getElementById('user-search');
        const chatSearch = document.getElementById('chat-search');

        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }

        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => {
                this.searchChats(e.target.value);
            });
        }
    }

    searchUsers(query) {
        const userItems = document.querySelectorAll('.user-item');
        const searchTerm = query.toLowerCase().trim();

        userItems.forEach(item => {
            const userName = item.querySelector('.user-name')?.textContent?.toLowerCase() || '';
            const shouldShow = !searchTerm || userName.includes(searchTerm);
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }

    searchChats(query) {
        const chatItems = document.querySelectorAll('.chat-item');
        const searchTerm = query.toLowerCase().trim();

        chatItems.forEach(item => {
            const chatName = item.querySelector('.chat-name')?.textContent?.toLowerCase() || '';
            const shouldShow = !searchTerm || chatName.includes(searchTerm);
            item.style.display = shouldShow ? 'flex' : 'none';
        });
    }
}
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    chatId: this.currentChat.id,
                    text: `🎮 Игра: ${this.getGameName(gameType)}`,
                    type: 'game',
                    fileData: gameData
                })
            });

            const data = await response.json();
            if (data.success) {
                this.closeModal('games-modal');
                this.showNotification('Игра начата!', 'success');
            } else {
                this.showNotification('Ошибка создания игры', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка создания игры:', error);
            this.showNotification('Ошибка создания игры', 'error');
        }
    }

    getGameName(gameType) {
        const names = {
            'tic-tac-toe': 'Крестики-нолики',
            'word-game': 'Угадай слово',
            'quiz': 'Викторина'
        };
        return names[gameType] || gameType;
    }
}

// Drawing functionality
MessengerApp.prototype.initializeDrawingCanvas = function() {
    const canvas = document.getElementById('draw-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let isDrawing = false;
    let currentTool = 'pen';
    let currentColor = '#667eea';
    let currentSize = 3;
    
    // Set canvas size
    canvas.width = 400;
    canvas.height = 300;
    
    // Drawing functions
    const startDrawing = (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(x, y);
    };
    
    const draw = (e) => {
        if (!isDrawing) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.lineWidth = currentSize;
        ctx.lineCap = 'round';
        
        if (currentTool === 'pen') {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = currentColor;
        } else if (currentTool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
        }
        
        ctx.lineTo(x, y);
        ctx.stroke();
    };
    
    const stopDrawing = () => {
        isDrawing = false;
        ctx.beginPath();
    };
    
    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // Tool controls
    document.querySelectorAll('.draw-tool').forEach(tool => {
        tool.addEventListener('click', (e) => {
            document.querySelectorAll('.draw-tool').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            currentTool = e.target.dataset.tool;
        });
    });
    
    document.getElementById('draw-color')?.addEventListener('change', (e) => {
        currentColor = e.target.value;
    });
    
    document.getElementById('draw-size')?.addEventListener('input', (e) => {
        currentSize = e.target.value;
    });
    
    document.querySelector('.clear-canvas')?.addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
    
    document.querySelector('.send-drawing')?.addEventListener('click', () => {
        this.sendDrawing(canvas);
    });
    
    document.querySelector('.cancel-drawing')?.addEventListener('click', () => {
        document.getElementById('draw-panel').style.display = 'none';
    });
};

MessengerApp.prototype.sendDrawing = async function(canvas) {
    if (!this.currentChat) {
        this.showNotification('Выберите чат для отправки рисунка', 'error');
        return;
    }
    
    try {
        // Convert canvas to blob
        canvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'drawing.png');
            formData.append('chatId', this.currentChat.id);
            
            const uploadResponse = await fetch('/api/upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });
            
            const uploadData = await uploadResponse.json();
            
            if (uploadData.success) {
                await this.sendMessageWithFile({
                    ...uploadData.file,
                    originalName: 'Рисунок'
                });
                
                // Clear canvas and close panel
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                document.getElementById('draw-panel').style.display = 'none';
                
                this.showNotification('Рисунок отправлен!', 'success');
            } else {
                this.showNotification('Ошибка отправки рисунка', 'error');
            }
        }, 'image/png');
        
    } catch (error) {
        console.error('🔥 Ошибка отправки рисунка:', error);
        this.showNotification('Ошибка отправки рисунка', 'error');
    }
};

// Инициализация приложения
const app = new MessengerApp();

console.log('🔥 Flux Messenger загружен и готов к работе!');

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🔥 Flux Messenger загружен и готов к работе!');
    window.app = new MessengerApp();
});

// Add CSS for call notifications
const callNotificationCSS = `
.call-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: var(--bg-secondary);
    border: 2px solid var(--neon-green);
    border-radius: 12px;
    padding: 20px;
    z-index: 10000;
    min-width: 300px;
    box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
    animation: slideIn 0.3s ease-out;
}

.call-notification h4 {
    margin: 0 0 10px 0;
    color: var(--neon-green);
    font-family: var(--font-primary);
}

.call-notification p {
    margin: 0 0 15px 0;
    color: var(--text-primary);
}

.call-actions {
    display: flex;
    gap: 10px;
}

.call-actions button {
    flex: 1;
    padding: 10px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: var(--transition-smooth);
}

.accept-call {
    background: var(--neon-green);
    color: var(--bg-primary);
}

.reject-call {
    background: var(--neon-pink);
    color: var(--bg-primary);
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}
`;

// Add the CSS to the document
const style = document.createElement('style');
style.textContent = callNotificationCSS;
document.head.appendChild(style);
    // Sticker functionality
    loadStickers() {
        const stickersGrid = document.getElementById('stickers-grid');
        if (!stickersGrid) return;
        
        const stickers = ['😀', '😂', '😍', '🤔', '😎', '🔥', '💯', '👍', '❤️', '🎉', '🚀', '⭐'];
        
        stickersGrid.innerHTML = '';
        stickers.forEach(sticker => {
            const stickerItem = document.createElement('div');
            stickerItem.className = 'sticker-item';
            stickerItem.textContent = sticker;
            stickerItem.style.cssText = `
                font-size: 2rem;
                padding: 10px;
                cursor: pointer;
                border-radius: 8px;
                transition: var(--transition-smooth);
                text-align: center;
            `;
            
            stickerItem.addEventListener('click', () => {
                this.sendStickerMessage(sticker);
            });
            
            stickersGrid.appendChild(stickerItem);
        });
    }

    async sendStickerMessage(sticker) {
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
                    type: 'text'
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const stickerPanel = document.getElementById('sticker-panel');
                if (stickerPanel) stickerPanel.style.display = 'none';
            } else {
                this.showNotification('Ошибка отправки стикера', 'error');
            }
        } catch (error) {
            console.error('🔥 Ошибка отправки стикера:', error);
            this.showNotification('Ошибка отправки стикера', 'error');
        }
    }

    toggleStickerPanel() {
        const panel = document.getElementById('sticker-panel');
        if (!panel) return;
        
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            this.loadStickers();
        } else {
            panel.style.display = 'none';
        }
    }

    togglePollPanel() {
        const panel = document.getElementById('poll-panel');
        if (!panel) return;
        
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }

    toggleDrawPanel() {
        const panel = document.getElementById('draw-panel');
        if (!panel) return;
        
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
        } else {
            panel.style.display = 'none';
        }
    }