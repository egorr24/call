class AwesomeMessenger {
    constructor() {
        this.socket = null;
        this.currentUser = null;
        this.currentChat = null;
        this.token = localStorage.getItem('messenger_token');
        this.chats = new Map();
        this.users = new Map();
        this.selectedFiles = [];
        
        // ИМБОВЫЕ новые свойства
        this.selectedUsers = new Set(); // Для групповых чатов
        this.currentTheme = localStorage.getItem('messenger_theme') || 'business';
        this.isRecordingVoice = false;
        this.voiceRecorder = null;
        this.voiceStartTime = null;
        this.voiceTimer = null;
        this.reactions = ['❤️', '😂', '😮', '😢', '😡', '👍', '👎', '🔥'];
        
        // Новые свойства для дополнительных функций
        this.stickers = [];
        this.currentDrawing = null;
        this.drawingContext = null;
        this.isDrawing = false;
        this.forwardingMessage = null;
        this.selectedForwardChats = new Set();
        this.currentGame = null;
        this.userStatus = 'available';
        this.customStatusText = '';
        
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
        
        // ИМБОВОЕ глобальное делегирование событий для ВСЕХ кнопок
        document.addEventListener('click', (e) => {
            const target = e.target.closest('button') || e.target;
            
            // Авторизация
            if (target.matches('#login-form .auth-btn') || target.closest('#login-form .auth-btn')) {
                e.preventDefault();
                this.login();
            } else if (target.matches('#register-form .auth-btn') || target.closest('#register-form .auth-btn')) {
                e.preventDefault();
                this.register();
            }
            
            // Кнопки мессенджера
            else if (target.matches('.header-actions button[title="Найти пользователей"]')) {
                this.showUsers();
            } else if (target.matches('.header-actions button[title="Настройки"]')) {
                this.showSettings();
            } else if (target.matches('.header-actions button[title="Выйти"]')) {
                this.logout();
            }
            
            // Кнопки чата
            else if (target.matches('.chat-actions button[title="Игры"]')) {
                this.showGames();
            } else if (target.matches('.chat-actions button[title="Видеозвонок"]')) {
                this.startVideoCall();
            } else if (target.matches('.chat-actions button[title="Аудиозвонок"]')) {
                this.startAudioCall();
            }
            
            // Кнопки ввода сообщений
            else if (target.matches('.message-input button[title="Стикеры и GIF"]') || target.matches('#sticker-btn')) {
                this.toggleStickerPanel();
            } else if (target.matches('.message-input button[title="Создать опрос"]') || target.matches('#poll-btn')) {
                this.togglePollPanel();
            } else if (target.matches('.message-input button[title="Совместное рисование"]') || target.matches('#draw-btn')) {
                this.toggleDrawPanel();
            } else if (target.matches('.message-input button[title="Прикрепить файл"]')) {
                this.selectFile();
            } else if (target.matches('.message-input button[title="Отправить фото"]')) {
                this.selectImage();
            } else if (target.matches('.message-input .send-btn') || target.matches('.send-btn')) {
                e.preventDefault();
                this.sendMessage();
            }
            
            // Кнопки заголовка
            else if (target.matches('.header-actions button[title="Статус"]')) {
                this.showStatusModal();
            } else if (target.matches('.header-actions button[title="Найти пользователей"]')) {
                this.showUsers();
            } else if (target.matches('.header-actions button[title="Настройки"]')) {
                this.showSettings();
            } else if (target.matches('.header-actions button[title="Выйти"]')) {
                this.logout();
            }
            
            // Групповые чаты
            else if (target.matches('.chat-type-btn')) {
                this.switchChatType(target.dataset.type);
            } else if (target.matches('#create-group-btn')) {
                this.createGroupChat();
            } else if (target.matches('.selected-user-remove')) {
                this.removeSelectedUser(target);
            }
            
            // Темы оформления
            else if (target.matches('.settings-tab')) {
                this.switchSettingsTab(target.dataset.tab);
            } else if (target.matches('.theme-card')) {
                this.selectTheme(target.dataset.theme);
            }
        });
        
        // ИМБОВАЯ обработка Enter для быстрого ввода
        document.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                const target = e.target;
                
                // Авторизация
                if (target.matches('#login-email, #login-password')) {
                    e.preventDefault();
                    this.login();
                } else if (target.matches('#register-username, #register-email, #register-password')) {
                    e.preventDefault();
                    this.register();
                }
                
                // Отправка сообщений (только на десктопе)
                else if (target.matches('#message-input') && window.innerWidth > 768) {
                    e.preventDefault();
                    this.sendMessage();
                }
            }
        });
        
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

        // Автоматическое изменение высоты textarea
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('input', (e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
            });
        }

        // Поиск чатов
        const chatSearch = document.getElementById('chat-search');
        if (chatSearch) {
            chatSearch.addEventListener('input', (e) => {
                this.searchChats(e.target.value);
            });
        }

        // Поиск пользователей
        const userSearch = document.getElementById('user-search');
        if (userSearch) {
            userSearch.addEventListener('input', (e) => {
                this.searchUsers(e.target.value);
            });
        }

        // Обработка выбора файлов
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }

        // Обработка выбора аватара
        const avatarInput = document.getElementById('avatar-input');
        if (avatarInput) {
            avatarInput.addEventListener('change', (e) => {
                this.handleAvatarSelect(e.target.files[0]);
            });
        }

        // ИМБОВАЯ мобильная навигация
        this.setupMobileNavigation();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Предотвращение зума на iOS
        if (this.isIOS()) {
            document.addEventListener('touchstart', () => {}, { passive: true });
        }

        // Мобильная клавиатура
        if (window.innerWidth <= 768) {
            this.setupMobileKeyboard();
        }

        console.log('🔥 ИМБОВЫЕ ОБРАБОТЧИКИ ЗАГРУЖЕНЫ!');
    }

    setupMobileNavigation() {
        // ИМБОВАЯ обработка кликов по заголовку чата для возврата
        document.addEventListener('click', (e) => {
            // Кнопка назад в чате (стрелка)
            if (e.target.closest('.chat-header') && window.innerWidth <= 768) {
                const rect = e.target.closest('.chat-header').getBoundingClientRect();
                if (e.clientX < 80) { // Расширенная область для кнопки назад
                    this.goBackToChats();
                }
            }
        });

        // ИМБОВЫЕ свайп жесты для навигации
        let startX = 0;
        let startY = 0;
        let startTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            startTime = Date.now();
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const endTime = Date.now();
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            const timeDiff = endTime - startTime;
            
            // Быстрый свайп (меньше 300мс) и достаточное расстояние
            if (timeDiff < 300 && Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 80) {
                if (diffX < 0 && Math.abs(diffX) > 120) {
                    // Свайп вправо - назад к чатам
                    if (document.querySelector('.chat-area.active')) {
                        this.goBackToChats();
                    }
                }
            }
            
            startX = 0;
            startY = 0;
            startTime = 0;
        }, { passive: true });
    }

    setupMobileKeyboard() {
        const messageInput = document.getElementById('message-input');
        const inputContainer = document.querySelector('.message-input-container');
        
        // Обработка появления клавиатуры
        window.addEventListener('resize', () => {
            if (document.activeElement === messageInput) {
                // Клавиатура открыта
                setTimeout(() => {
                    messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        });
        
        // Фикс для iOS Safari
        if (this.isIOS()) {
            messageInput.addEventListener('focus', () => {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                    document.body.scrollTop = 0;
                }, 300);
            });
        }
    }

    isIOS() {
        return /iPad|iPhone|iPod/.test(navigator.userAgent);
    }

    handleResize() {
        if (window.innerWidth > 768) {
            // Возвращаем десктопный вид
            document.querySelector('.sidebar').classList.remove('hidden');
            document.querySelector('.chat-area').classList.remove('active');
        }
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
                console.log('Токен недействителен, показываем форму входа');
                localStorage.removeItem('messenger_token');
                this.token = null;
                this.showScreen('auth-screen');
            }
        } catch (error) {
            console.error('Ошибка проверки токена:', error);
            localStorage.removeItem('messenger_token');
            this.token = null;
            this.showScreen('auth-screen');
        }
    }

    async register() {
        console.log('🔥 МЕТОД REGISTER ВЫЗВАН');
        
        const username = document.getElementById('register-username')?.value;
        const email = document.getElementById('register-email')?.value;
        const password = document.getElementById('register-password')?.value;

        console.log('Данные регистрации:', { username, email, password: password ? '***' : 'empty' });

        if (!username || !email || !password) {
            this.showError('Заполните все поля');
            return;
        }

        // Валидация email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showError('Введите корректный email');
            return;
        }

        // Валидация пароля
        if (password.length < 6) {
            this.showError('Пароль должен содержать минимум 6 символов');
            return;
        }

        const submitBtn = document.querySelector('#register-form .auth-btn');
        if (submitBtn && !submitBtn.dataset.originalText) {
            submitBtn.dataset.originalText = submitBtn.textContent;
        }
        this.setLoading(submitBtn, true);

        try {
            console.log('🔥 ОТПРАВКА ЗАПРОСА РЕГИСТРАЦИИ');
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();
            console.log('Ответ сервера:', data);

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('messenger_token', this.token);
                
                // Показываем успешную анимацию
                if (submitBtn) {
                    submitBtn.classList.add('success-animation');
                }
                this.showNotification('Регистрация успешна! Добро пожаловать!');
                
                // Небольшая задержка для анимации
                setTimeout(() => {
                    this.initMessenger();
                }, 400);
            } else {
                this.showError(data.error || 'Ошибка регистрации');
            }
        } catch (error) {
            console.error('Ошибка регистрации:', error);
            this.showError('Ошибка сервера. Проверьте подключение к интернету.');
        } finally {
            if (submitBtn) {
                this.setLoading(submitBtn, false);
            }
        }
    }

    async login() {
        console.log('🔥 МЕТОД LOGIN ВЫЗВАН');
        
        const email = document.getElementById('login-email')?.value;
        const password = document.getElementById('login-password')?.value;

        console.log('Данные входа:', { email, password: password ? '***' : 'empty' });

        if (!email || !password) {
            this.showError('Заполните все поля');
            return;
        }

        const submitBtn = document.querySelector('#login-form .auth-btn');
        if (submitBtn && !submitBtn.dataset.originalText) {
            submitBtn.dataset.originalText = submitBtn.textContent;
        }
        this.setLoading(submitBtn, true);

        try {
            console.log('🔥 ОТПРАВКА ЗАПРОСА ВХОДА');
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();
            console.log('Ответ сервера:', data);

            if (data.success) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('messenger_token', this.token);
                
                // Показываем успешную анимацию
                if (submitBtn) {
                    submitBtn.classList.add('success-animation');
                }
                this.showNotification('Вход выполнен успешно!');
                
                // Небольшая задержка для анимации
                setTimeout(() => {
                    this.initMessenger();
                }, 400);
            } else {
                this.showError(data.error || 'Ошибка входа');
            }
        } catch (error) {
            console.error('Ошибка входа:', error);
            this.showError('Ошибка сервера. Проверьте подключение к интернету.');
        } finally {
            if (submitBtn) {
                this.setLoading(submitBtn, false);
            }
        }
    }

    initMessenger() {
        this.showScreen('messenger-screen');
        this.setupSocket();
        this.loadUserInfo();
        this.loadChats();
        
        // Оптимизируем производительность
        setTimeout(() => {
            this.optimizePerformance();
        }, 1000);
    }

    setupSocket() {
        this.socket = io();

        this.socket.on('connect', () => {
            console.log('Подключено к серверу');
            if (this.token) {
                this.socket.emit('authenticate', this.token);
            }
        });

        this.socket.on('authenticated', () => {
            console.log('Аутентификация успешна');
        });

        this.socket.on('auth-error', (data) => {
            console.error('Ошибка аутентификации:', data.error);
            this.logout();
        });

        this.socket.on('disconnect', () => {
            console.log('Отключено от сервера');
        });

        this.socket.on('reconnect', () => {
            console.log('Переподключение к серверу');
            if (this.token) {
                this.socket.emit('authenticate', this.token);
            }
        });

        this.socket.on('new-message', (data) => {
            this.handleNewMessage(data);
        });

        this.socket.on('chat-created', (data) => {
            this.openChat(data.chatId);
        });

        this.socket.on('new-chat', (data) => {
            // Новый чат создан другим пользователем
            this.loadChats(); // Обновляем список чатов
        });

        this.socket.on('user-online', (userId) => {
            this.updateUserStatus(userId, true);
        });

        this.socket.on('user-offline', (userId) => {
            this.updateUserStatus(userId, false);
        });

        // ИМБОВЫЕ обработчики новых функций
        this.socket.on('reaction-added', (data) => {
            this.handleReactionUpdate(data);
        });

        this.socket.on('reaction-toggled', (data) => {
            this.handleReactionUpdate(data);
        });

        this.socket.on('new-group-chat', (data) => {
            this.showNotification(`Вы добавлены в группу "${data.name}" пользователем ${data.createdBy}`);
            this.loadChats(); // Обновляем список чатов
        });

        // Обработка ошибок
        this.socket.on('message-error', (data) => {
            console.error('Ошибка отправки сообщения:', data.error);
            alert('Ошибка отправки сообщения: ' + data.error);
        });

        this.socket.on('chat-error', (data) => {
            console.error('Ошибка чата:', data.error);
            alert('Ошибка чата: ' + data.error);
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

        this.socket.on('call-failed', (data) => {
            console.error('Звонок не удался:', data.error);
            alert('Звонок не удался: ' + data.error);
        });
        
        // Новые обработчики событий
        this.socket.on('user-status-changed', (data) => {
            this.handleUserStatusChanged(data);
        });
        
        this.socket.on('poll-updated', (data) => {
            this.handlePollUpdate(data);
        });
        
        this.socket.on('game-updated', (data) => {
            this.handleGameUpdate(data);
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
            } else {
                const error = await response.json();
                console.error('Ошибка загрузки чатов:', error);
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
            chatElement.style.cursor = 'pointer';
            
            // ИМБОВЫЙ обработчик клика
            chatElement.addEventListener('click', () => this.selectChat(chat.id));

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
            } else {
                const error = await response.json();
                console.error('Ошибка загрузки сообщений:', error);
            }
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
        }
    }

    renderMessages(messages) {
        const container = document.getElementById('messages-container');
        if (!container) return;
        
        // ИМБОВАЯ быстрая очистка
        container.innerHTML = '';

        // Создаем фрагмент для быстрой вставки
        const fragment = document.createDocumentFragment();

        messages.forEach((message) => {
            const messageElement = this.createMessageElement(message);
            fragment.appendChild(messageElement);
        });

        // Вставляем все сообщения одним блоком
        container.appendChild(fragment);

        // ИМБОВАЯ быстрая прокрутка к последнему сообщению
        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.currentUser.id ? 'own' : ''}`;
        messageDiv.dataset.messageId = message.id;
        messageDiv.dataset.senderName = message.senderName || 'Пользователь';

        const time = this.formatTime(new Date(message.timestamp));
        let fileContent = '';

        // Обработка файлов с проверкой доступности
        if (message.fileData) {
            const file = message.fileData;
            const fileUrl = file.url.startsWith('http') ? file.url : window.location.origin + file.url;
            
            if (message.type === 'voice') {
                // ИМБОВОЕ голосовое сообщение
                const duration = file.duration || 0;
                const minutes = Math.floor(duration / 60);
                const seconds = duration % 60;
                const durationText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                
                fileContent = `
                    <div class="voice-message" data-audio-url="${fileUrl}">
                        <button class="voice-play-btn">
                            <i class="fas fa-play"></i>
                        </button>
                        <div class="voice-waveform">
                            ${Array.from({length: 20}, (_, i) => 
                                `<div class="voice-waveform-bar" style="height: ${Math.random() * 20 + 10}px;"></div>`
                            ).join('')}
                        </div>
                        <div class="voice-duration">${durationText}</div>
                    </div>
                `;
            } else if (file.mimetype.startsWith('image/')) {
                fileContent = `
                    <div class="message-file">
                        <img src="${fileUrl}" 
                             alt="${this.escapeHtml(file.originalName)}" 
                             class="message-image" 
                             style="cursor: pointer;"
                             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                        <div class="file-error" style="display:none; padding:10px; background:rgba(255,0,0,0.1); border-radius:8px; color:#ff6b6b;">
                            <i class="fas fa-exclamation-triangle"></i> Изображение недоступно
                        </div>
                    </div>
                `;
            } else if (file.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video" preload="metadata">
                            <source src="${fileUrl}" type="${file.mimetype}">
                            <div class="file-error" style="padding:10px; background:rgba(255,0,0,0.1); border-radius:8px; color:#ff6b6b;">
                                <i class="fas fa-exclamation-triangle"></i> Видео недоступно
                            </div>
                        </video>
                    </div>
                `;
            } else {
                fileContent = `
                    <div class="message-file">
                        <div class="message-document" style="cursor: pointer;">
                            <i class="fas fa-file"></i>
                            <div class="document-info">
                                <div class="document-name">${this.escapeHtml(file.originalName)}</div>
                                <div class="document-size">${this.formatFileSize(file.size)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }
        
        // Обработка специальных типов сообщений
        if (message.type === 'sticker') {
            fileContent = `
                <div class="sticker-message">
                    <span class="sticker-emoji">${message.text}</span>
                </div>
            `;
        } else if (message.type === 'poll' && message.pollData) {
            fileContent = `
                <div class="poll-message">
                    <div class="poll-question">${this.escapeHtml(message.pollData.question)}</div>
                    <div class="poll-options-list">
                        ${message.pollData.options.map((option, index) => {
                            const votes = message.pollData.votes[index] || [];
                            const totalVotes = Object.values(message.pollData.votes).flat().length;
                            const percentage = totalVotes > 0 ? Math.round((votes.length / totalVotes) * 100) : 0;
                            
                            return `
                                <div class="poll-option-item" data-option="${index}">
                                    <span class="poll-option-text">${this.escapeHtml(option)}</span>
                                    <span class="poll-option-votes">${votes.length} (${percentage}%)</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } else if (message.type === 'game' && message.gameData) {
            fileContent = this.createGameContent(message.gameData);
        } else if (message.type === 'forwarded') {
            // Пересланное сообщение
            fileContent = `
                <div class="forwarded-message">
                    <div class="forwarded-label">
                        <i class="fas fa-share"></i> Переслано
                    </div>
                </div>
            `;
        }ile-error" style="display:none; padding:10px; background:rgba(255,0,0,0.1); border-radius:8px; color:#ff6b6b;">
                            <i class="fas fa-exclamation-triangle"></i> Изображение недоступно
                        </div>
                    </div>
                `;
            } else if (file.mimetype.startsWith('video/')) {
                fileContent = `
                    <div class="message-file">
                        <video controls class="message-video" preload="metadata">
                            <source src="${fileUrl}" type="${file.mimetype}">
                            <div class="file-error" style="padding:10px; background:rgba(255,0,0,0.1); border-radius:8px; color:#ff6b6b;">
                                <i class="fas fa-exclamation-triangle"></i> Видео недоступно
                            </div>
                        </video>
                    </div>
                `;
            } else {
                fileContent = `
                    <div class="message-file">
                        <div class="message-document" style="cursor: pointer;">
                            <i class="fas fa-file"></i>
                            <div class="document-info">
                                <div class="document-name">${this.escapeHtml(file.originalName)}</div>
                                <div class="document-size">${this.formatFileSize(file.size)}</div>
                            </div>
                        </div>
                    </div>
                `;
            }
        }

        // ИМБОВЫЕ реакции на сообщения
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
                <div class="message-time">${time}</div>
                ${reactionsContent}
            </div>
            <div class="message-actions">
                <button class="message-action-btn" data-action="react" title="Реакция">
                    <i class="fas fa-smile"></i>
                </button>
                <button class="message-action-btn" data-action="reply" title="Ответить">
                    <i class="fas fa-reply"></i>
                </button>
            </div>
        `;

        // ИМБОВЫЕ обработчики для файлов
        if (message.fileData) {
            const file = message.fileData;
            const fileUrl = file.url.startsWith('http') ? file.url : window.location.origin + file.url;
            
            if (file.mimetype.startsWith('image/')) {
                const img = messageDiv.querySelector('.message-image');
                if (img) {
                    img.addEventListener('click', () => {
                        window.open(fileUrl, '_blank');
                    });
                }
            } else if (!file.mimetype.startsWith('video/') && message.type !== 'voice') {
                const docElement = messageDiv.querySelector('.message-document');
                if (docElement) {
                    docElement.addEventListener('click', () => {
                        const a = document.createElement('a');
                        a.href = fileUrl;
                        a.download = file.originalName;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                    });
                }
            }
        }

        return messageDiv;
    }

    async sendMessage() {
        const input = document.getElementById('message-input');
        if (!input) return;
        
        const text = input.value.trim();

        if (!text && this.selectedFiles.length === 0) return;
        if (!this.currentChat) {
            this.showError('Выберите чат для отправки сообщения');
            return;
        }

        console.log('🔥 ОТПРАВКА СООБЩЕНИЯ');

        // ИМБОВАЯ быстрая очистка поля ввода
        input.value = '';
        input.style.height = 'auto';

        // Показываем индикатор отправки
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            sendBtn.disabled = true;
        }

        try {
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
                    type: 'text',
                    replyTo: this.replyToMessageId || null
                });
                
                // Очищаем ответ если был
                if (this.replyToMessageId) {
                    const replyInterface = document.querySelector('.reply-interface');
                    if (replyInterface) {
                        replyInterface.remove();
                    }
                    this.replyToMessageId = null;
                }
            }
            
            // Фокус обратно на поле ввода (только на десктопе)
            if (window.innerWidth > 768) {
                setTimeout(() => input.focus(), 100);
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            this.showError('Ошибка отправки сообщения');
            // Возвращаем текст в поле при ошибке
            input.value = text;
        } finally {
            // Возвращаем кнопку в нормальное состояние
            if (sendBtn) {
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                sendBtn.disabled = false;
            }
        }
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
                    type: file.type.startsWith('audio/') ? 'voice' : 'file',
                    fileData: result.file,
                    replyTo: this.replyToMessageId || null
                });
                
                // Очищаем ответ если был
                if (this.replyToMessageId) {
                    const replyInterface = document.querySelector('.reply-interface');
                    if (replyInterface) {
                        replyInterface.remove();
                    }
                    this.replyToMessageId = null;
                }
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
                <button class="remove-file">×</button>
            `;

            // ИМБОВЫЙ обработчик для удаления файла
            const removeBtn = previewItem.querySelector('.remove-file');
            removeBtn.addEventListener('click', () => this.removeFile(index));

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
            // ИМБОВОЕ добавление сообщения в текущий чат
            const messageElement = this.createMessageElement(data.message);
            const container = document.getElementById('messages-container');
            if (container) {
                container.appendChild(messageElement);
                
                // Быстрая прокрутка к новому сообщению
                requestAnimationFrame(() => {
                    container.scrollTop = container.scrollHeight;
                });
            }
        }

        // ИМБОВОЕ обновление списка чатов (только если нужно)
        if (data.chatId !== this.currentChat) {
            this.loadChats();
            // Показываем уведомление если чат не активен
            this.showNotification(`Новое сообщение от ${data.message.senderName}`);
        }
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
            } else {
                const error = await response.json();
                console.error('Ошибка загрузки пользователей:', error);
                alert('Ошибка загрузки пользователей: ' + (error.error || 'Неизвестная ошибка'));
            }
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            alert('Ошибка загрузки пользователей. Проверьте подключение к интернету.');
        }
    }

    renderUsers(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';

        users.forEach(user => {
            this.users.set(user.id, user);
            
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.style.cursor = 'pointer';
            
            // ИМБОВЫЙ обработчик клика
            userElement.addEventListener('click', () => this.createChat(user.id));

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

    showSettings() {
        // Загружаем текущие данные пользователя
        document.getElementById('settings-avatar').src = this.currentUser.avatar;
        document.getElementById('settings-username').value = this.currentUser.username;
        document.getElementById('settings-email').value = this.currentUser.email;
        document.getElementById('settings-password').value = '';
        
        document.getElementById('settings-modal').classList.add('active');
    }

    closeSettingsModal() {
        document.getElementById('settings-modal').classList.remove('active');
    }

    selectAvatar() {
        document.getElementById('avatar-input').click();
    }

    async saveSettings() {
        const username = document.getElementById('settings-username').value.trim();
        const password = document.getElementById('settings-password').value;
        const avatarFile = document.getElementById('avatar-input').files[0];

        if (!username) {
            alert('Введите имя пользователя');
            return;
        }

        try {
            let avatarUrl = this.currentUser.avatar;

            // Загружаем новый аватар если выбран
            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);

                const uploadResponse = await fetch('/api/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: formData
                });

                if (uploadResponse.ok) {
                    const uploadResult = await uploadResponse.json();
                    avatarUrl = uploadResult.file.url;
                }
            }

            // Обновляем профиль
            const updateData = {
                username,
                avatar: avatarUrl
            };

            if (password) {
                updateData.password = password;
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const result = await response.json();
                this.currentUser = result.user;
                this.loadUserInfo();
                this.closeSettingsModal();
                alert('Профиль обновлен!');
            } else {
                const error = await response.json();
                alert(error.error || 'Ошибка обновления профиля');
            }
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            alert('Ошибка сохранения настроек');
        }
    }

    handleAvatarSelect(file) {
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Выберите изображение');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) { // 5MB лимит для аватара
            alert('Файл слишком большой (максимум 5MB)');
            return;
        }
        
        // Показываем превью
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('settings-avatar').src = e.target.result;
        };
        reader.readAsDataURL(file);
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

    // ИМБОВЫЕ видеозвонки
    async startVideoCall() {
        if (!this.currentChat) {
            this.showError('Выберите чат для звонка');
            return;
        }
        
        const chat = this.chats.get(this.currentChat);
        if (!chat) {
            this.showError('Чат не найден');
            return;
        }
        
        try {
            console.log('🔥 НАЧИНАЕМ ВИДЕОЗВОНОК');
            
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
            
            this.showNotification('Видеозвонок начат');
        } catch (error) {
            console.error('Ошибка видеозвонка:', error);
            this.showError('Ошибка запуска видеозвонка');
        }
    }

    async startAudioCall() {
        if (!this.currentChat) {
            this.showError('Выберите чат для звонка');
            return;
        }
        
        const chat = this.chats.get(this.currentChat);
        if (!chat) {
            this.showError('Чат не найден');
            return;
        }
        
        try {
            console.log('🔥 НАЧИНАЕМ АУДИОЗВОНОК');
            
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
            
            this.showNotification('Аудиозвонок начат');
        } catch (error) {
            console.error('Ошибка аудиозвонка:', error);
            this.showError('Ошибка запуска аудиозвонка');
        }
    }

    async initializeMedia() {
        try {
            console.log('🔥 ИНИЦИАЛИЗАЦИЯ МЕДИА');
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            const localVideo = document.getElementById('local-video');
            if (localVideo) {
                localVideo.srcObject = this.localStream;
            }
            
            console.log('✅ МЕДИА ИНИЦИАЛИЗИРОВАНО');
        } catch (error) {
            console.error('Ошибка доступа к камере/микрофону:', error);
            this.showError('Не удалось получить доступ к камере или микрофону');
            throw error;
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

    setLoading(button, isLoading) {
        if (isLoading) {
            button.disabled = true;
            const originalText = button.dataset.originalText || button.textContent;
            button.dataset.originalText = originalText;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
            button.classList.add('loading');
            
            // Добавляем визуальную обратную связь
            button.style.opacity = '0.7';
            button.style.transform = 'scale(0.98)';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || 'Отправить';
            button.classList.remove('loading', 'success-animation', 'error-animation');
            
            // Возвращаем нормальный вид
            button.style.opacity = '1';
            button.style.transform = 'scale(1)';
        }
    }

    showError(message) {
        // ИМБОВОЕ уведомление об ошибке с эффектом жидкого стекла
        const notification = document.createElement('div');
        notification.className = 'notification error-notification glass-effect';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: rgba(239, 68, 68, 0.15);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(239, 68, 68, 0.3);
            color: #ffffff;
            padding: 18px 24px;
            border-radius: 16px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 
                0 8px 32px rgba(239, 68, 68, 0.2),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            gap: 14px;
            animation: glassSlideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="
                width: 24px; 
                height: 24px; 
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
            ">
                <i class="fas fa-exclamation" style="font-size: 12px; color: #fff;"></i>
            </div>
            <span style="flex: 1; font-size: 15px; line-height: 1.4;">${message}</span>
            <button onclick="this.parentNode.remove()" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление через 6 секунд (дольше для ошибок)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'glassSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        }, 6000);
    }

    showNotification(message) {
        // ИМБОВОЕ уведомление с эффектом жидкого стекла
        const notification = document.createElement('div');
        notification.className = 'notification success-notification glass-effect';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            left: 20px;
            max-width: 400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #ffffff;
            padding: 18px 24px;
            border-radius: 16px;
            z-index: 10000;
            font-weight: 500;
            box-shadow: 
                0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
            display: flex;
            align-items: center;
            gap: 14px;
            animation: glassSlideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: 'Segoe UI', system-ui, sans-serif;
        `;
        
        notification.innerHTML = `
            <div style="
                width: 24px; 
                height: 24px; 
                background: linear-gradient(135deg, #4ade80, #22c55e);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
            ">
                <i class="fas fa-check" style="font-size: 12px; color: #fff;"></i>
            </div>
            <span style="flex: 1; font-size: 15px; line-height: 1.4;">${message}</span>
            <button onclick="this.parentNode.remove()" style="
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                color: #fff;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                transition: all 0.2s ease;
            " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">×</button>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление через 4 секунды
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'glassSlideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 400);
            }
        }, 4000);
    }

    // Оптимизация производительности
    optimizePerformance() {
        // Ленивая загрузка изображений
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            });
        });
        
        images.forEach(img => imageObserver.observe(img));
        
        // Виртуализация длинных списков сообщений
        this.virtualizeMessagesList();
        
        // Дебаунс для поиска
        this.debounceSearch();
    }
    
    virtualizeMessagesList() {
        const container = document.getElementById('messages-container');
        if (!container) return;
        
        // Показываем только видимые сообщения + буфер
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    // Можно скрыть невидимые сообщения для экономии памяти
                    // entry.target.style.display = 'none';
                }
            });
        }, {
            rootMargin: '100px'
        });
        
        // Наблюдаем за сообщениями
        container.querySelectorAll('.message').forEach(msg => {
            observer.observe(msg);
        });
    }
    
    debounceSearch() {
        let searchTimeout;
        const originalSearchChats = this.searchChats.bind(this);
        const originalSearchUsers = this.searchUsers.bind(this);
        
        this.searchChats = (query) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => originalSearchChats(query), 300);
        };
        
        this.searchUsers = (query) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => originalSearchUsers(query), 300);
        };
    }

    logout() {
        // Анимация выхода
        const currentScreen = document.querySelector('.screen.active');
        if (currentScreen) {
            currentScreen.style.opacity = '0';
            currentScreen.style.transform = 'scale(0.95)';
        }
        
        // Очищаем данные
        localStorage.removeItem('messenger_token');
        this.token = null;
        this.currentUser = null;
        this.currentChat = null;
        
        if (this.socket) {
            this.socket.disconnect();
        }
        
        setTimeout(() => {
            this.showScreen('auth-screen');
            this.showNotification('Вы вышли из системы');
        }, 300);
    }

    showScreen(screenId) {
        // Добавляем плавный переход между экранами
        const currentScreen = document.querySelector('.screen.active');
        const newScreen = document.getElementById(screenId);
        
        if (currentScreen) {
            currentScreen.style.opacity = '0';
            currentScreen.style.transform = 'translateX(-20px)';
            
            setTimeout(() => {
                currentScreen.classList.remove('active');
                newScreen.classList.add('active');
                
                // Анимация появления нового экрана
                setTimeout(() => {
                    newScreen.style.opacity = '1';
                    newScreen.style.transform = 'translateX(0)';
                }, 50);
            }, 200);
        } else {
            newScreen.classList.add('active');
            setTimeout(() => {
                newScreen.style.opacity = '1';
                newScreen.style.transform = 'translateX(0)';
            }, 50);
        }
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

    // ========== ИМБОВЫЕ ГОЛОСОВЫЕ СООБЩЕНИЯ ==========
    
    async toggleVoiceRecording() {
        if (this.isRecordingVoice) {
            this.stopVoiceRecording();
        } else {
            await this.startVoiceRecording();
        }
    }
    
    async startVoiceRecording() {
        try {
            console.log('🎤 НАЧИНАЕМ ЗАПИСЬ ГОЛОСА');
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.voiceRecorder = new MediaRecorder(stream);
            this.voiceChunks = [];
            
            this.voiceRecorder.ondataavailable = (event) => {
                this.voiceChunks.push(event.data);
            };
            
            this.voiceRecorder.onstop = () => {
                const blob = new Blob(this.voiceChunks, { type: 'audio/webm' });
                this.voiceBlob = blob;
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.voiceRecorder.start();
            this.isRecordingVoice = true;
            this.voiceStartTime = Date.now();
            
            // Показываем интерфейс записи
            document.getElementById('voice-recording').style.display = 'block';
            document.querySelector('.voice-btn').classList.add('recording');
            
            // Запускаем таймер
            this.voiceTimer = setInterval(() => {
                const elapsed = Date.now() - this.voiceStartTime;
                const seconds = Math.floor(elapsed / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                
                document.querySelector('.voice-timer').textContent = 
                    `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
                
                // Автоматическая остановка через 5 минут
                if (elapsed > 300000) {
                    this.stopVoiceRecording();
                }
            }, 100);
            
            this.showNotification('Запись голосового сообщения...');
            
        } catch (error) {
            console.error('Ошибка записи голоса:', error);
            this.showError('Не удалось получить доступ к микрофону');
        }
    }
    
    stopVoiceRecording() {
        if (!this.isRecordingVoice) return;
        
        console.log('🎤 ОСТАНАВЛИВАЕМ ЗАПИСЬ ГОЛОСА');
        
        this.voiceRecorder.stop();
        this.isRecordingVoice = false;
        
        // Останавливаем таймер
        if (this.voiceTimer) {
            clearInterval(this.voiceTimer);
            this.voiceTimer = null;
        }
        
        // Убираем класс записи
        document.querySelector('.voice-btn').classList.remove('recording');
    }
    
    cancelVoiceRecording() {
        this.stopVoiceRecording();
        
        // Скрываем интерфейс записи
        document.getElementById('voice-recording').style.display = 'none';
        
        // Очищаем данные
        this.voiceBlob = null;
        this.voiceChunks = [];
        
        this.showNotification('Запись отменена');
    }
    
    async sendVoiceRecording() {
        if (!this.voiceBlob) return;
        
        try {
            console.log('🎤 ОТПРАВЛЯЕМ ГОЛОСОВОЕ СООБЩЕНИЕ');
            
            // Создаем файл из blob
            const file = new File([this.voiceBlob], `voice_${Date.now()}.webm`, {
                type: 'audio/webm'
            });
            
            // Загружаем на сервер
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
                
                // Отправляем сообщение с голосовым файлом
                this.socket.emit('send-message', {
                    chatId: this.currentChat,
                    text: '',
                    type: 'voice',
                    fileData: {
                        ...result.file,
                        duration: Math.floor((Date.now() - this.voiceStartTime) / 1000)
                    }
                });
                
                this.showNotification('Голосовое сообщение отправлено');
            } else {
                throw new Error('Ошибка загрузки');
            }
            
        } catch (error) {
            console.error('Ошибка отправки голосового сообщения:', error);
            this.showError('Ошибка отправки голосового сообщения');
        } finally {
            // Скрываем интерфейс записи
            document.getElementById('voice-recording').style.display = 'none';
            
            // Очищаем данные
            this.voiceBlob = null;
            this.voiceChunks = [];
        }
    }
    
    toggleVoicePlayback(button) {
        const voiceMessage = button.closest('.voice-message');
        const audio = voiceMessage.querySelector('audio') || this.createAudioElement(voiceMessage);
        
        if (audio.paused) {
            audio.play();
            button.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audio.pause();
            button.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
    
    // ========== ИМБОВЫЕ РЕАКЦИИ НА СООБЩЕНИЯ ==========
    
    showReactionPicker(button) {
        const message = button.closest('.message');
        const messageId = message.dataset.messageId;
        
        // Создаем пикер реакций
        const picker = document.createElement('div');
        picker.className = 'reaction-picker';
        picker.innerHTML = this.reactions.map(emoji => 
            `<button class="reaction-emoji-btn" data-emoji="${emoji}">${emoji}</button>`
        ).join('');
        
        // Позиционируем пикер
        picker.style.position = 'absolute';
        picker.style.top = '-60px';
        picker.style.left = '50%';
        picker.style.transform = 'translateX(-50%)';
        picker.style.background = 'rgba(26, 26, 26, 0.95)';
        picker.style.backdropFilter = 'blur(20px)';
        picker.style.border = '1px solid rgba(255, 255, 255, 0.2)';
        picker.style.borderRadius = '25px';
        picker.style.padding = '8px';
        picker.style.display = 'flex';
        picker.style.gap = '4px';
        picker.style.zIndex = '200';
        
        // Добавляем обработчики
        picker.addEventListener('click', (e) => {
            if (e.target.matches('.reaction-emoji-btn')) {
                this.addReaction(messageId, e.target.dataset.emoji);
                picker.remove();
            }
        });
        
        // Убираем пикер при клике вне его
        setTimeout(() => {
            document.addEventListener('click', (e) => {
                if (!picker.contains(e.target)) {
                    picker.remove();
                }
            }, { once: true });
        }, 100);
        
        message.style.position = 'relative';
        message.appendChild(picker);
    }
    
    addReaction(messageId, emoji) {
        this.socket.emit('add-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    toggleReaction(reactionElement) {
        const messageId = reactionElement.closest('.message').dataset.messageId;
        const emoji = reactionElement.querySelector('.reaction-emoji').textContent;
        
        this.socket.emit('toggle-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    addReaction(messageId, emoji) {
        this.socket.emit('add-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    toggleReaction(reactionElement) {
        const messageId = reactionElement.closest('.message').dataset.messageId;
        const emoji = reactionElement.querySelector('.reaction-emoji').textContent;
        
        this.socket.emit('toggle-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    handleReactionUpdate(data) {
        const { messageId, reactions } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            let reactionsContainer = messageElement.querySelector('.message-reactions');
            
            if (Object.keys(reactions).length === 0) {
                // Убираем контейнер реакций если их нет
                if (reactionsContainer) {
                    reactionsContainer.remove();
                }
                return;
            }
            
            if (!reactionsContainer) {
                // Создаем контейнер реакций
                reactionsContainer = document.createElement('div');
                reactionsContainer.className = 'message-reactions';
                messageElement.querySelector('.message-content').appendChild(reactionsContainer);
            }
            
            // Обновляем реакции
            reactionsContainer.innerHTML = Object.entries(reactions).map(([emoji, users]) => `
                <div class="reaction ${users.includes(this.currentUser.id) ? 'own' : ''}" data-emoji="${emoji}">
                    <span class="reaction-emoji">${emoji}</span>
                    <span class="reaction-count">${users.length}</span>
                </div>
            `).join('');
        }
    }
    
    replyToMessage(button) {
        const message = button.closest('.message');
        const messageText = message.querySelector('.message-text')?.textContent || 'Файл';
        const senderName = message.dataset.senderName || 'Пользователь';
        
        // Показываем интерфейс ответа
        const replyInterface = document.createElement('div');
        replyInterface.className = 'reply-interface';
        replyInterface.innerHTML = `
            <div class="reply-preview">
                <div class="reply-line"></div>
                <div class="reply-content">
                    <div class="reply-to">Ответ для ${senderName}</div>
                    <div class="reply-text">${messageText}</div>
                </div>
                <button class="reply-cancel">×</button>
            </div>
        `;
        
        const messageInputContainer = document.querySelector('.message-input-container');
        messageInputContainer.insertBefore(replyInterface, messageInputContainer.firstChild);
        
        // Фокус на поле ввода
        document.getElementById('message-input').focus();
        
        // Сохраняем ID сообщения для ответа
        this.replyToMessageId = message.dataset.messageId;
        
        // Обработчик отмены
        replyInterface.querySelector('.reply-cancel').addEventListener('click', () => {
            replyInterface.remove();
            this.replyToMessageId = null;
        });
    }
    
    addReaction(messageId, emoji) {
        this.socket.emit('add-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    toggleReaction(reactionElement) {
        const messageId = reactionElement.closest('.message').dataset.messageId;
        const emoji = reactionElement.querySelector('.reaction-emoji').textContent;
        
        this.socket.emit('toggle-reaction', {
            messageId: messageId,
            emoji: emoji,
            chatId: this.currentChat
        });
    }
    
    handleReactionUpdate(data) {
        const { messageId, reactions } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            let reactionsContainer = messageElement.querySelector('.message-reactions');
            
            if (Object.keys(reactions).length === 0) {
                // Убираем контейнер реакций если их нет
                if (reactionsContainer) {
                    reactionsContainer.remove();
                }
                return;
            }
            
            if (!reactionsContainer) {
                // Создаем контейнер реакций
                reactionsContainer = document.createElement('div');
                reactionsContainer.className = 'message-reactions';
                messageElement.querySelector('.message-content').appendChild(reactionsContainer);
            }
            
            // Обновляем реакции
            reactionsContainer.innerHTML = Object.entries(reactions).map(([emoji, users]) => `
                <div class="reaction ${users.includes(this.currentUser.id) ? 'own' : ''}" data-emoji="${emoji}">
                    <span class="reaction-emoji">${emoji}</span>
                    <span class="reaction-count">${users.length}</span>
                </div>
            `).join('');
        }
    }
    
    createAudioElement(voiceMessage) {
        const audioUrl = voiceMessage.dataset.audioUrl;
        const audio = document.createElement('audio');
        audio.src = audioUrl;
        audio.preload = 'metadata';
        
        audio.addEventListener('ended', () => {
            const playBtn = voiceMessage.querySelector('.voice-play-btn');
            playBtn.innerHTML = '<i class="fas fa-play"></i>';
        });
        
        voiceMessage.appendChild(audio);
        return audio;
    }
    
    // ========== ИМБОВЫЕ ГРУППОВЫЕ ЧАТЫ ==========
    
    switchChatType(type) {
        document.querySelectorAll('.chat-type-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        const groupCreation = document.getElementById('group-creation');
        const groupActions = document.getElementById('group-actions');
        
        if (type === 'group') {
            groupCreation.style.display = 'block';
            groupActions.style.display = 'flex';
        } else {
            groupCreation.style.display = 'none';
            groupActions.style.display = 'none';
            this.selectedUsers.clear();
            this.updateSelectedUsers();
        }
    }
    
    renderUsers(users) {
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';

        users.forEach(user => {
            this.users.set(user.id, user);
            
            const userElement = document.createElement('div');
            userElement.className = 'user-item';
            userElement.style.cursor = 'pointer';
            
            const isGroupMode = document.querySelector('.chat-type-btn[data-type="group"]')?.classList.contains('active');
            
            if (isGroupMode) {
                // Режим выбора для группового чата
                userElement.addEventListener('click', () => this.toggleUserSelection(user.id));
            } else {
                // Обычный режим создания личного чата
                userElement.addEventListener('click', () => this.createChat(user.id));
            }

            const lastSeen = user.online ? 'В сети' : 
                `Был(а) в сети ${this.formatTime(new Date(user.lastSeen))}`;

            const isSelected = this.selectedUsers.has(user.id);
            
            userElement.innerHTML = `
                <img src="${user.avatar}" alt="Avatar" class="avatar">
                <div class="user-item-info">
                    <div class="user-item-name">${user.username}</div>
                    <div class="user-item-status ${user.online ? 'online' : 'offline'}">${lastSeen}</div>
                </div>
                ${isGroupMode ? `<div class="user-select-indicator ${isSelected ? 'selected' : ''}">
                    <i class="fas fa-${isSelected ? 'check' : 'plus'}"></i>
                </div>` : ''}
            `;

            usersList.appendChild(userElement);
        });
    }
    
    toggleUserSelection(userId) {
        if (this.selectedUsers.has(userId)) {
            this.selectedUsers.delete(userId);
        } else {
            if (this.selectedUsers.size >= 99) { // Максимум 100 участников (включая создателя)
                this.showError('Максимум 100 участников в группе');
                return;
            }
            this.selectedUsers.add(userId);
        }
        
        this.updateSelectedUsers();
        this.renderUsers(Array.from(this.users.values()));
    }
    
    updateSelectedUsers() {
        const container = document.getElementById('selected-users');
        container.innerHTML = '';
        
        this.selectedUsers.forEach(userId => {
            const user = this.users.get(userId);
            if (user) {
                const userTag = document.createElement('div');
                userTag.className = 'selected-user';
                userTag.innerHTML = `
                    <img src="${user.avatar}" alt="Avatar" style="width: 20px; height: 20px; border-radius: 50%;">
                    <span>${user.username}</span>
                    <button class="selected-user-remove" data-user-id="${userId}">×</button>
                `;
                container.appendChild(userTag);
            }
        });
    }
    
    removeSelectedUser(button) {
        const userId = button.dataset.userId;
        this.selectedUsers.delete(userId);
        this.updateSelectedUsers();
        this.renderUsers(Array.from(this.users.values()));
    }
    
    async createGroupChat() {
        const groupName = document.getElementById('group-name').value.trim();
        const groupDescription = document.getElementById('group-description').value.trim();
        
        if (!groupName) {
            this.showError('Введите название группы');
            return;
        }
        
        if (this.selectedUsers.size < 2) {
            this.showError('Выберите минимум 2 участников');
            return;
        }
        
        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    name: groupName,
                    description: groupDescription,
                    participants: Array.from(this.selectedUsers)
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showNotification('Группа создана успешно!');
                this.closeUsersModal();
                this.openChat(result.chatId);
            } else {
                const error = await response.json();
                this.showError(error.error || 'Ошибка создания группы');
            }
        } catch (error) {
            console.error('Ошибка создания группы:', error);
            this.showError('Ошибка создания группы');
        }
    }
    
    // ========== ИМБОВЫЕ ТЕМЫ ОФОРМЛЕНИЯ ==========
    
    switchSettingsTab(tab) {
        document.querySelectorAll('.settings-tab').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.settings-content').forEach(content => content.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-settings`).classList.add('active');
    }
    
    selectTheme(theme) {
        document.querySelectorAll('.theme-card').forEach(card => card.classList.remove('active'));
        document.querySelector(`[data-theme="${theme}"]`).classList.add('active');
        
        this.currentTheme = theme;
        this.applyTheme(theme);
        localStorage.setItem('messenger_theme', theme);
        
        this.showNotification('Тема применена!');
    }
    
    applyTheme(theme) {
        document.body.className = `theme-${theme}`;
        
        // Применяем CSS переменные для темы
        const root = document.documentElement;
        
        const themes = {
            business: {
                '--primary-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '--accent-color': '#667eea',
                '--bg-primary': '#1a1a1a',
                '--bg-secondary': '#2d2d2d'
            },
            dark: {
                '--primary-gradient': 'linear-gradient(135deg, #2d3748 0%, #1a202c 100%)',
                '--accent-color': '#4a5568',
                '--bg-primary': '#0f0f0f',
                '--bg-secondary': '#1a1a1a'
            },
            blue: {
                '--primary-gradient': 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                '--accent-color': '#3182ce',
                '--bg-primary': '#0a1929',
                '--bg-secondary': '#1e3a8a'
            },
            green: {
                '--primary-gradient': 'linear-gradient(135deg, #38a169 0%, #2f855a 100%)',
                '--accent-color': '#38a169',
                '--bg-primary': '#0f2027',
                '--bg-secondary': '#203a43'
            },
            purple: {
                '--primary-gradient': 'linear-gradient(135deg, #805ad5 0%, #6b46c1 100%)',
                '--accent-color': '#805ad5',
                '--bg-primary': '#1a0b2e',
                '--bg-secondary': '#16213e'
            },
            pink: {
                '--primary-gradient': 'linear-gradient(135deg, #ed64a6 0%, #d53f8c 100%)',
                '--accent-color': '#ed64a6',
                '--bg-primary': '#2d1b2e',
                '--bg-secondary': '#44337a'
            }
        };
        
        const themeVars = themes[theme] || themes.business;
        Object.entries(themeVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ========== НОВЫЕ ФУНКЦИИ ==========
    
    // Стикеры и GIF
    toggleStickerPanel() {
        const panel = document.getElementById('sticker-panel');
        const isVisible = panel.style.display === 'block';
        
        // Закрываем другие панели
        document.getElementById('poll-panel').style.display = 'none';
        document.getElementById('draw-panel').style.display = 'none';
        
        panel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.loadStickers();
        }
    }
    
    loadStickers() {
        // Загружаем стандартные стикеры
        const stickersGrid = document.getElementById('stickers-grid');
        const stickers = [
            '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
            '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
            '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
            '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
            '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
            '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
            '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
            '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
            '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
            '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐'
        ];
        
        stickersGrid.innerHTML = stickers.map(sticker => 
            `<div class="sticker-item" data-sticker="${sticker}">${sticker}</div>`
        ).join('');
    }
    
    switchStickerTab(tab) {
        document.querySelectorAll('.sticker-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        document.querySelectorAll('.stickers-grid, .gifs-grid').forEach(g => g.classList.remove('active'));
        document.getElementById(`${tab}-grid`).classList.add('active');
        
        if (tab === 'gifs') {
            this.loadGifs();
        }
    }
    
    loadGifs() {
        // Здесь можно интегрировать с Giphy API
        const gifsContainer = document.querySelector('.gifs-container');
        gifsContainer.innerHTML = '<p>Поиск GIF временно недоступен</p>';
    }
    
    sendSticker(sticker) {
        if (!this.currentChat) return;
        
        this.socket.emit('send-message', {
            chatId: this.currentChat,
            text: sticker,
            type: 'sticker'
        });
        
        document.getElementById('sticker-panel').style.display = 'none';
    }
    
    // Опросы
    togglePollPanel() {
        const panel = document.getElementById('poll-panel');
        const isVisible = panel.style.display === 'block';
        
        // Закрываем другие панели
        document.getElementById('sticker-panel').style.display = 'none';
        document.getElementById('draw-panel').style.display = 'none';
        
        panel.style.display = isVisible ? 'none' : 'block';
    }
    
    closePollPanel() {
        document.getElementById('poll-panel').style.display = 'none';
        this.clearPollForm();
    }
    
    clearPollForm() {
        document.getElementById('poll-question').value = '';
        document.querySelectorAll('.poll-option').forEach(input => input.value = '');
        document.getElementById('poll-multiple').checked = false;
        document.getElementById('poll-anonymous').checked = false;
    }
    
    addPollOption() {
        const optionsContainer = document.querySelector('.poll-options');
        const optionCount = optionsContainer.children.length;
        
        if (optionCount >= 10) {
            this.showError('Максимум 10 вариантов ответа');
            return;
        }
        
        const newOption = document.createElement('input');
        newOption.type = 'text';
        newOption.className = 'poll-option';
        newOption.placeholder = `Вариант ${optionCount + 1}`;
        newOption.maxLength = 100;
        
        optionsContainer.appendChild(newOption);
    }
    
    createPoll() {
        const question = document.getElementById('poll-question').value.trim();
        const options = Array.from(document.querySelectorAll('.poll-option'))
            .map(input => input.value.trim())
            .filter(value => value);
        
        if (!question) {
            this.showError('Введите вопрос опроса');
            return;
        }
        
        if (options.length < 2) {
            this.showError('Добавьте минимум 2 варианта ответа');
            return;
        }
        
        const pollData = {
            question,
            options,
            multiple: document.getElementById('poll-multiple').checked,
            anonymous: document.getElementById('poll-anonymous').checked,
            votes: {},
            createdBy: this.currentUser.id,
            createdAt: new Date()
        };
        
        this.socket.emit('send-message', {
            chatId: this.currentChat,
            text: question,
            type: 'poll',
            pollData: pollData
        });
        
        this.closePollPanel();
        this.showNotification('Опрос создан');
    }
    
    // Рисование
    toggleDrawPanel() {
        const panel = document.getElementById('draw-panel');
        const isVisible = panel.style.display === 'block';
        
        // Закрываем другие панели
        document.getElementById('sticker-panel').style.display = 'none';
        document.getElementById('poll-panel').style.display = 'none';
        
        panel.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible) {
            this.initDrawing();
        }
    }
    
    initDrawing() {
        const canvas = document.getElementById('draw-canvas');
        this.drawingContext = canvas.getContext('2d');
        
        // Настройки по умолчанию
        this.drawingContext.lineCap = 'round';
        this.drawingContext.lineJoin = 'round';
        this.drawingContext.strokeStyle = '#667eea';
        this.drawingContext.lineWidth = 3;
        
        // Очищаем canvas
        this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        this.drawingContext.fillStyle = '#ffffff';
        this.drawingContext.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обработчики событий
        canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        canvas.addEventListener('mousemove', this.draw.bind(this));
        canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch события для мобильных
        canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }
    
    startDrawing(e) {
        this.isDrawing = true;
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(x, y);
    }
    
    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.drawingContext.lineTo(x, y);
        this.drawingContext.stroke();
    }
    
    stopDrawing() {
        this.isDrawing = false;
    }
    
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        e.target.dispatchEvent(mouseEvent);
    }
    
    clearCanvas() {
        const canvas = document.getElementById('draw-canvas');
        this.drawingContext.clearRect(0, 0, canvas.width, canvas.height);
        this.drawingContext.fillStyle = '#ffffff';
        this.drawingContext.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    closeDrawPanel() {
        document.getElementById('draw-panel').style.display = 'none';
    }
    
    sendDrawing() {
        const canvas = document.getElementById('draw-canvas');
        const dataURL = canvas.toDataURL('image/png');
        
        // Конвертируем в blob и отправляем как файл
        canvas.toBlob((blob) => {
            const file = new File([blob], `drawing_${Date.now()}.png`, { type: 'image/png' });
            this.sendFileMessage(file, 'Рисунок');
        });
        
        this.closeDrawPanel();
        this.showNotification('Рисунок отправлен');
    }
    
    // Игры
    showGames() {
        document.getElementById('games-modal').classList.add('active');
    }
    
    closeGamesModal() {
        document.getElementById('games-modal').classList.remove('active');
    }
    
    startGame(gameType) {
        this.closeGamesModal();
        
        switch (gameType) {
            case 'tic-tac-toe':
                this.startTicTacToe();
                break;
            case 'quiz':
                this.startQuiz();
                break;
            case 'word-game':
                this.startWordGame();
                break;
        }
    }
    
    startTicTacToe() {
        const gameData = {
            type: 'tic-tac-toe',
            board: Array(9).fill(''),
            currentPlayer: 'X',
            players: [this.currentUser.id],
            status: 'waiting'
        };
        
        this.socket.emit('send-message', {
            chatId: this.currentChat,
            text: 'Игра в крестики-нолики',
            type: 'game',
            gameData: gameData
        });
        
        this.showNotification('Игра создана! Ждем второго игрока');
    }
    
    startQuiz() {
        const questions = [
            { question: 'Столица России?', options: ['Москва', 'СПб', 'Казань'], correct: 0 },
            { question: '2 + 2 = ?', options: ['3', '4', '5'], correct: 1 },
            { question: 'Цвет неба?', options: ['Красный', 'Синий', 'Зеленый'], correct: 1 }
        ];
        
        const gameData = {
            type: 'quiz',
            questions: questions,
            currentQuestion: 0,
            scores: {},
            status: 'active'
        };
        
        this.socket.emit('send-message', {
            chatId: this.currentChat,
            text: 'Викторина началась!',
            type: 'game',
            gameData: gameData
        });
    }
    
    startWordGame() {
        const words = ['ПРОГРАММИРОВАНИЕ', 'КОМПЬЮТЕР', 'ИНТЕРНЕТ', 'СООБЩЕНИЕ'];
        const word = words[Math.floor(Math.random() * words.length)];
        
        const gameData = {
            type: 'word-game',
            word: word,
            guessed: Array(word.length).fill('_'),
            attempts: 6,
            guessedLetters: [],
            status: 'active'
        };
        
        this.socket.emit('send-message', {
            chatId: this.currentChat,
            text: 'Угадай слово!',
            type: 'game',
            gameData: gameData
        });
    }
    
    // Статусы
    showStatusModal() {
        document.getElementById('status-modal').classList.add('active');
    }
    
    closeStatusModal() {
        document.getElementById('status-modal').classList.remove('active');
    }
    
    setStatus(status) {
        this.userStatus = status;
        this.socket.emit('update-status', { status: status });
        this.closeStatusModal();
        this.showNotification(`Статус изменен на "${this.getStatusText(status)}"`);
    }
    
    setCustomStatus() {
        const text = document.getElementById('custom-status-text').value.trim();
        if (!text) return;
        
        this.customStatusText = text;
        this.socket.emit('update-status', { status: 'custom', text: text });
        this.closeStatusModal();
        this.showNotification('Пользовательский статус установлен');
    }
    
    getStatusText(status) {
        const statusTexts = {
            available: 'Доступен',
            busy: 'Занят',
            away: 'Отошел',
            invisible: 'Невидимый'
        };
        return statusTexts[status] || status;
    }
    
    // Пересылка сообщений
    forwardMessage(button) {
        const message = button.closest('.message');
        this.forwardingMessage = {
            id: message.dataset.messageId,
            text: message.querySelector('.message-text')?.textContent || 'Файл',
            senderName: message.dataset.senderName || 'Пользователь'
        };
        
        this.showForwardModal();
    }
    
    showForwardModal() {
        const modal = document.getElementById('forward-modal');
        const preview = modal.querySelector('.forward-message-preview');
        
        preview.innerHTML = `
            <div class="forward-preview">
                <div class="forward-from">От: ${this.forwardingMessage.senderName}</div>
                <div class="forward-text">${this.forwardingMessage.text}</div>
            </div>
        `;
        
        this.loadForwardChats();
        modal.classList.add('active');
    }
    
    closeForwardModal() {
        document.getElementById('forward-modal').classList.remove('active');
        this.forwardingMessage = null;
        this.selectedForwardChats.clear();
    }
    
    loadForwardChats() {
        const chatsList = document.getElementById('forward-chats-list');
        chatsList.innerHTML = '';
        
        this.chats.forEach(chat => {
            const chatElement = document.createElement('div');
            chatElement.className = 'forward-chat-item';
            chatElement.dataset.chatId = chat.id;
            
            chatElement.innerHTML = `
                <img src="${chat.user.avatar}" alt="Avatar" class="avatar">
                <div class="chat-info">
                    <div class="chat-name">${chat.user.username}</div>
                </div>
                <div class="forward-checkbox">
                    <input type="checkbox" id="forward-${chat.id}">
                </div>
            `;
            
            chatsList.appendChild(chatElement);
        });
    }
    
    toggleForwardChat(element) {
        const chatId = element.dataset.chatId;
        const checkbox = element.querySelector('input[type="checkbox"]');
        
        if (this.selectedForwardChats.has(chatId)) {
            this.selectedForwardChats.delete(chatId);
            checkbox.checked = false;
        } else {
            this.selectedForwardChats.add(chatId);
            checkbox.checked = true;
        }
        
        document.getElementById('forward-send-btn').disabled = this.selectedForwardChats.size === 0;
    }
    
    sendForwardedMessage() {
        if (!this.forwardingMessage || this.selectedForwardChats.size === 0) return;
        
        this.selectedForwardChats.forEach(chatId => {
            this.socket.emit('send-message', {
                chatId: chatId,
                text: `Переслано от ${this.forwardingMessage.senderName}: ${this.forwardingMessage.text}`,
                type: 'forwarded',
                originalMessageId: this.forwardingMessage.id
            });
        });
        
        this.closeForwardModal();
        this.showNotification(`Сообщение переслано в ${this.selectedForwardChats.size} чат(ов)`);
    }
    
    // Обработчики новых событий
    handleUserStatusChanged(data) {
        const { userId, status, statusText } = data;
        
        // Обновляем статус в списке пользователей
        const user = this.users.get(userId);
        if (user) {
            user.status = status;
            user.statusText = statusText;
        }
        
        // Обновляем статус в чатах
        this.chats.forEach(chat => {
            if (chat.user.id === userId) {
                chat.user.status = status;
                chat.user.statusText = statusText;
            }
        });
        
        // Обновляем интерфейс если это текущий чат
        if (this.currentChat) {
            const currentChatData = this.chats.get(this.currentChat);
            if (currentChatData && currentChatData.user.id === userId) {
                this.updateChatStatus(status, statusText);
            }
        }
    }
    
    updateChatStatus(status, statusText) {
        const statusElement = document.getElementById('chat-status');
        if (!statusElement) return;
        
        let statusText_display = '';
        switch (status) {
            case 'available':
                statusText_display = 'В сети';
                statusElement.className = 'status online';
                break;
            case 'busy':
                statusText_display = 'Занят';
                statusElement.className = 'status busy';
                break;
            case 'away':
                statusText_display = 'Отошел';
                statusElement.className = 'status away';
                break;
            case 'invisible':
                statusText_display = 'Не в сети';
                statusElement.className = 'status offline';
                break;
            case 'custom':
                statusText_display = statusText || 'Пользовательский статус';
                statusElement.className = 'status online';
                break;
            default:
                statusText_display = 'Не в сети';
                statusElement.className = 'status offline';
        }
        
        statusElement.textContent = statusText_display;
    }
    
    handlePollUpdate(data) {
        const { messageId, pollData } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            const pollMessage = messageElement.querySelector('.poll-message');
            if (pollMessage) {
                this.updatePollDisplay(pollMessage, pollData);
            }
        }
    }
    
    updatePollDisplay(pollElement, pollData) {
        const optionsList = pollElement.querySelector('.poll-options-list');
        if (!optionsList) return;
        
        optionsList.innerHTML = pollData.options.map((option, index) => {
            const votes = pollData.votes[index] || [];
            const percentage = pollData.options.length > 0 ? 
                Math.round((votes.length / Object.values(pollData.votes).flat().length) * 100) || 0 : 0;
            
            return `
                <div class="poll-option-item" data-option="${index}">
                    <span class="poll-option-text">${option}</span>
                    <span class="poll-option-votes">${votes.length} (${percentage}%)</span>
                </div>
            `;
        }).join('');
        
        // Добавляем обработчики голосования
        optionsList.querySelectorAll('.poll-option-item').forEach(item => {
            item.addEventListener('click', () => {
                const optionIndex = parseInt(item.dataset.option);
                this.voteInPoll(pollElement.closest('.message').dataset.messageId, optionIndex);
            });
        });
    }
    
    voteInPoll(messageId, optionIndex) {
        this.socket.emit('vote-poll', {
            messageId: messageId,
            optionIndex: optionIndex,
            chatId: this.currentChat
        });
    }
    
    handleGameUpdate(data) {
        const { messageId, gameData } = data;
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        
        if (messageElement) {
            const gameMessage = messageElement.querySelector('.game-message');
            if (gameMessage) {
                this.updateGameDisplay(gameMessage, gameData);
            }
        }
    }
    
    updateGameDisplay(gameElement, gameData) {
        switch (gameData.type) {
            case 'tic-tac-toe':
                this.updateTicTacToeDisplay(gameElement, gameData);
                break;
            case 'word-game':
                this.updateWordGameDisplay(gameElement, gameData);
                break;
            case 'quiz':
                this.updateQuizDisplay(gameElement, gameData);
                break;
        }
    }
    
    updateTicTacToeDisplay(gameElement, gameData) {
        const board = gameElement.querySelector('.tic-tac-toe-board');
        if (!board) return;
        
        board.innerHTML = gameData.board.map((cell, index) => 
            `<div class="tic-tac-toe-cell" data-position="${index}">${cell}</div>`
        ).join('');
        
        // Добавляем обработчики ходов
        if (gameData.status === 'active') {
            board.querySelectorAll('.tic-tac-toe-cell').forEach(cell => {
                if (!cell.textContent.trim()) {
                    cell.addEventListener('click', () => {
                        const position = parseInt(cell.dataset.position);
                        this.makeGameMove(gameElement.closest('.message').dataset.messageId, { position });
                    });
                }
            });
        }
        
        // Обновляем статус игры
        const statusElement = gameElement.querySelector('.game-status');
        if (statusElement) {
            if (gameData.status === 'finished') {
                statusElement.textContent = `Победил: ${gameData.winner}`;
            } else if (gameData.status === 'draw') {
                statusElement.textContent = 'Ничья!';
            } else {
                statusElement.textContent = `Ход: ${gameData.currentPlayer}`;
            }
        }
    }
    
    updateWordGameDisplay(gameElement, gameData) {
        const wordDisplay = gameElement.querySelector('.word-display');
        const attemptsDisplay = gameElement.querySelector('.attempts-display');
        const guessedLetters = gameElement.querySelector('.guessed-letters');
        
        if (wordDisplay) {
            wordDisplay.textContent = gameData.guessed.join(' ');
        }
        
        if (attemptsDisplay) {
            attemptsDisplay.textContent = `Попыток осталось: ${gameData.attempts}`;
        }
        
        if (guessedLetters) {
            guessedLetters.textContent = `Использованные буквы: ${gameData.guessedLetters.join(', ')}`;
        }
        
        // Обновляем статус
        const statusElement = gameElement.querySelector('.game-status');
        if (statusElement) {
            if (gameData.status === 'won') {
                statusElement.textContent = 'Поздравляем! Слово угадано!';
            } else if (gameData.status === 'lost') {
                statusElement.textContent = `Игра окончена. Слово было: ${gameData.word}`;
            }
        }
    }
    
    makeGameMove(messageId, move) {
        this.socket.emit('game-move', {
            messageId: messageId,
            move: move,
            chatId: this.currentChat
        });
    }
    
    createGameContent(gameData) {
        switch (gameData.type) {
            case 'tic-tac-toe':
                return `
                    <div class="game-message">
                        <div class="game-title">
                            <i class="fas fa-th"></i> Крестики-нолики
                        </div>
                        <div class="tic-tac-toe-board">
                            ${gameData.board.map((cell, index) => 
                                `<div class="tic-tac-toe-cell" data-position="${index}">${cell}</div>`
                            ).join('')}
                        </div>
                        <div class="game-status">
                            ${gameData.status === 'active' ? `Ход: ${gameData.currentPlayer}` :
                              gameData.status === 'finished' ? `Победил: ${gameData.winner}` :
                              gameData.status === 'draw' ? 'Ничья!' : 'Ожидание игрока'}
                        </div>
                    </div>
                `;
                
            case 'word-game':
                return `
                    <div class="game-message">
                        <div class="game-title">
                            <i class="fas fa-spell-check"></i> Угадай слово
                        </div>
                        <div class="word-display">${gameData.guessed.join(' ')}</div>
                        <div class="attempts-display">Попыток осталось: ${gameData.attempts}</div>
                        <div class="guessed-letters">Использованные буквы: ${gameData.guessedLetters.join(', ')}</div>
                        <div class="game-status">
                            ${gameData.status === 'won' ? 'Поздравляем! Слово угадано!' :
                              gameData.status === 'lost' ? `Игра окончена. Слово было: ${gameData.word}` : ''}
                        </div>
                        ${gameData.status === 'active' ? `
                            <div class="letter-input">
                                <input type="text" maxlength="1" placeholder="Буква" class="game-letter-input">
                                <button class="guess-letter-btn">Угадать</button>
                            </div>
                        ` : ''}
                    </div>
                `;
                
            case 'quiz':
                const currentQ = gameData.questions[gameData.currentQuestion];
                return `
                    <div class="game-message">
                        <div class="game-title">
                            <i class="fas fa-question-circle"></i> Викторина
                        </div>
                        ${currentQ ? `
                            <div class="quiz-question">
                                <div class="question-text">${currentQ.question}</div>
                                <div class="quiz-options">
                                    ${currentQ.options.map((option, index) => 
                                        `<button class="quiz-option" data-answer="${index}">${option}</button>`
                                    ).join('')}
                                </div>
                            </div>
                        ` : '<div class="quiz-finished">Викторина завершена!</div>'}
                        <div class="quiz-progress">
                            Вопрос ${gameData.currentQuestion + 1} из ${gameData.questions.length}
                        </div>
                    </div>
                `;
                
            default:
                return `
                    <div class="game-message">
                        <div class="game-title">
                            <i class="fas fa-gamepad"></i> Игра
                        </div>
                        <div>Неизвестный тип игры</div>
                    </div>
                `;
        }
    }
}
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AwesomeMessenger();
});