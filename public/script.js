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
        
        // Добавляем глобальное делегирование событий для кнопок авторизации
        document.addEventListener('click', (e) => {
            // Обработка кнопок авторизации
            if (e.target.matches('#login-form .auth-btn') || e.target.closest('#login-form .auth-btn')) {
                e.preventDefault();
                console.log('🔥 ГЛОБАЛЬНЫЙ КЛИК ПО КНОПКЕ ВХОДА');
                this.login();
            } else if (e.target.matches('#register-form .auth-btn') || e.target.closest('#register-form .auth-btn')) {
                e.preventDefault();
                console.log('🔥 ГЛОБАЛЬНЫЙ КЛИК ПО КНОПКЕ РЕГИСТРАЦИИ');
                this.register();
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
                // После переключения вкладки добавляем обработчики
                setTimeout(() => this.setupAuthHandlers(), 100);
            });
        });

        // Инициализируем обработчики авторизации сразу
        this.setupAuthHandlers();

        // Enter для отправки сообщений (только на десктопе)
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 768) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            // Автоматическое изменение высоты textarea
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

        // ИМБОВЫЕ обработчики для кнопок в header
        const showUsersBtn = document.querySelector('.header-actions button[title="Найти пользователей"]');
        if (showUsersBtn) {
            showUsersBtn.addEventListener('click', () => this.showUsers());
        }

        const showSettingsBtn = document.querySelector('.header-actions button[title="Настройки"]');
        if (showSettingsBtn) {
            showSettingsBtn.addEventListener('click', () => this.showSettings());
        }

        const logoutBtn = document.querySelector('.header-actions button[title="Выйти"]');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // ИМБОВЫЕ обработчики для кнопок чата
        const startVideoCallBtn = document.querySelector('.chat-actions button[title="Видеозвонок"]');
        if (startVideoCallBtn) {
            startVideoCallBtn.addEventListener('click', () => this.startVideoCall());
        }

        const startAudioCallBtn = document.querySelector('.chat-actions button[title="Аудиозвонок"]');
        if (startAudioCallBtn) {
            startAudioCallBtn.addEventListener('click', () => this.startAudioCall());
        }

        // ИМБОВЫЕ обработчики для кнопок ввода сообщений
        const selectFileBtn = document.querySelector('.message-input button[title="Прикрепить файл"]');
        if (selectFileBtn) {
            selectFileBtn.addEventListener('click', () => this.selectFile());
        }

        const selectImageBtn = document.querySelector('.message-input button[title="Отправить фото"]');
        if (selectImageBtn) {
            selectImageBtn.addEventListener('click', () => this.selectImage());
        }

        const sendMessageBtn = document.querySelector('.message-input button[title="Отправить"]');
        if (sendMessageBtn) {
            sendMessageBtn.addEventListener('click', () => this.sendMessage());
        }

        // ИМБОВЫЕ обработчики для модальных окон
        const closeSettingsBtn = document.querySelector('#settings-modal .close-btn');
        if (closeSettingsBtn) {
            closeSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        const closeUsersBtn = document.querySelector('#users-modal .close-btn');
        if (closeUsersBtn) {
            closeUsersBtn.addEventListener('click', () => this.closeUsersModal());
        }

        const selectAvatarBtn = document.querySelector('.avatar-section .btn-secondary');
        if (selectAvatarBtn) {
            selectAvatarBtn.addEventListener('click', () => this.selectAvatar());
        }

        const saveSettingsBtn = document.querySelector('.settings-actions .btn-primary');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }

        const cancelSettingsBtn = document.querySelector('.settings-actions .btn-secondary');
        if (cancelSettingsBtn) {
            cancelSettingsBtn.addEventListener('click', () => this.closeSettingsModal());
        }

        // ИМБОВЫЕ обработчики для видеозвонков
        const toggleVideoBtn = document.getElementById('toggle-video-btn');
        if (toggleVideoBtn) {
            toggleVideoBtn.addEventListener('click', () => this.toggleVideo());
        }

        const toggleAudioBtn = document.getElementById('toggle-audio-btn');
        if (toggleAudioBtn) {
            toggleAudioBtn.addEventListener('click', () => this.toggleAudio());
        }

        const shareScreenBtn = document.querySelector('.call-controls .screen-btn');
        if (shareScreenBtn) {
            shareScreenBtn.addEventListener('click', () => this.shareScreen());
        }

        const endCallBtn = document.querySelector('.call-controls .end-btn');
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => this.endCall());
        }

        // Мобильная навигация - улучшенная
        this.setupMobileNavigation();

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Предотвращение зума на iOS при фокусе на input
        if (this.isIOS()) {
            document.addEventListener('touchstart', () => {}, { passive: true });
        }

        // Обработка клавиатуры на мобильных
        if (window.innerWidth <= 768) {
            this.setupMobileKeyboard();
        }

        console.log('🔥 ИМБОВЫЕ ОБРАБОТЧИКИ СОБЫТИЙ ЗАГРУЖЕНЫ!');
    }

    setupMobileNavigation() {
        // Обработка кликов по заголовку чата для возврата
        document.addEventListener('click', (e) => {
            if (e.target.closest('.chat-header') && window.innerWidth <= 768) {
                const rect = e.target.closest('.chat-header').getBoundingClientRect();
                if (e.clientX < 60) { // Расширенная область для кнопки назад
                    this.goBackToChats();
                }
            }
        });

        // Свайп жесты для навигации
        let startX = 0;
        let startY = 0;
        
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, { passive: true });
        
        document.addEventListener('touchend', (e) => {
            if (!startX || !startY) return;
            
            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            
            const diffX = startX - endX;
            const diffY = startY - endY;
            
            // Проверяем что это горизонтальный свайп
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                if (diffX < 0 && Math.abs(diffX) > 100) {
                    // Свайп вправо - назад к чатам
                    if (document.querySelector('.chat-area.active')) {
                        this.goBackToChats();
                    }
                }
            }
            
            startX = 0;
            startY = 0;
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

    setupAuthHandlers() {
        // ИМБОВЫЕ обработчики для форм авторизации
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        console.log('🔥 НАСТРОЙКА ОБРАБОТЧИКОВ АВТОРИЗАЦИИ');
        console.log('Login form:', loginForm);
        console.log('Register form:', registerForm);
        
        if (loginForm) {
            const loginBtn = loginForm.querySelector('.auth-btn');
            console.log('Login button:', loginBtn);
            if (loginBtn) {
                // Убираем старые обработчики
                loginBtn.replaceWith(loginBtn.cloneNode(true));
                const newLoginBtn = loginForm.querySelector('.auth-btn');
                
                newLoginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔥 КЛИК ПО КНОПКЕ ВХОДА');
                    this.login();
                });
                
                // Также добавляем обработчик Enter для формы входа
                const emailInput = loginForm.querySelector('#login-email');
                const passwordInput = loginForm.querySelector('#login-password');
                
                [emailInput, passwordInput].forEach(input => {
                    if (input) {
                        input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                console.log('🔥 ENTER В ФОРМЕ ВХОДА');
                                this.login();
                            }
                        });
                    }
                });
            }
        }
        
        if (registerForm) {
            const registerBtn = registerForm.querySelector('.auth-btn');
            console.log('Register button:', registerBtn);
            if (registerBtn) {
                // Убираем старые обработчики
                registerBtn.replaceWith(registerBtn.cloneNode(true));
                const newRegisterBtn = registerForm.querySelector('.auth-btn');
                
                newRegisterBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('🔥 КЛИК ПО КНОПКЕ РЕГИСТРАЦИИ');
                    this.register();
                });
                
                // Также добавляем обработчик Enter для формы регистрации
                const usernameInput = registerForm.querySelector('#register-username');
                const emailInput = registerForm.querySelector('#register-email');
                const passwordInput = registerForm.querySelector('#register-password');
                
                [usernameInput, emailInput, passwordInput].forEach(input => {
                    if (input) {
                        input.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                console.log('🔥 ENTER В ФОРМЕ РЕГИСТРАЦИИ');
                                this.register();
                            }
                        });
                    }
                });
            }
        }
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).classList.add('active');
        
        // После переключения вкладки обновляем обработчики
        setTimeout(() => this.setupAuthHandlers(), 50);
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
        container.innerHTML = '';

        messages.forEach((message, index) => {
            const messageElement = this.createMessageElement(message);
            // Добавляем задержку для анимации
            messageElement.style.animationDelay = `${index * 0.05}s`;
            container.appendChild(messageElement);
        });

        // Плавная прокрутка к последнему сообщению
        setTimeout(() => {
            container.scrollTo({
                top: container.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.currentUser.id ? 'own' : ''}`;

        const time = this.formatTime(new Date(message.timestamp));
        let fileContent = '';

        // Обработка файлов с проверкой доступности
        if (message.fileData) {
            const file = message.fileData;
            const fileUrl = file.url.startsWith('http') ? file.url : window.location.origin + file.url;
            
            if (file.mimetype.startsWith('image/')) {
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

        messageDiv.innerHTML = `
            <div class="message-content">
                ${message.text ? `<div class="message-text">${this.escapeHtml(message.text)}</div>` : ''}
                ${fileContent}
                <div class="message-time">${time}</div>
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
            } else if (!file.mimetype.startsWith('video/')) {
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
        const text = input.value.trim();

        if (!text && this.selectedFiles.length === 0) return;
        if (!this.currentChat) return;

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
                    type: 'text'
                });
            }

            // Очищаем поле ввода
            input.value = '';
            input.style.height = 'auto';
            
            // Фокус обратно на поле ввода (только на десктопе)
            if (window.innerWidth > 768) {
                input.focus();
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            this.showError('Ошибка отправки сообщения');
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
            // Добавляем сообщение в текущий чат с анимацией
            const messageElement = this.createMessageElement(data.message);
            const container = document.getElementById('messages-container');
            container.appendChild(messageElement);
            
            // Плавная прокрутка к новому сообщению
            setTimeout(() => {
                container.scrollTo({
                    top: container.scrollHeight,
                    behavior: 'smooth'
                });
            }, 100);
        }

        // Обновляем список чатов с анимацией
        this.loadChats();
        
        // Показываем уведомление если чат не активен
        if (data.chatId !== this.currentChat) {
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new AwesomeMessenger();
});