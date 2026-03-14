class VideoCallApp {
    constructor() {
        this.socket = io();
        this.localVideo = document.getElementById('local-video');
        this.remoteVideo = document.getElementById('remote-video');
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.roomId = null;
        this.userId = null;
        this.isVideoEnabled = true;
        this.isAudioEnabled = true;
        
        this.initializeElements();
        this.initializeSocket();
        this.checkUrlParams();
    }

    initializeElements() {
        // Кнопки главного экрана
        document.getElementById('create-room').addEventListener('click', () => this.createRoom());
        document.getElementById('join-room').addEventListener('click', () => this.joinRoom());
        
        // Кнопки управления
        document.getElementById('toggle-video').addEventListener('click', () => this.toggleVideo());
        document.getElementById('toggle-audio').addEventListener('click', () => this.toggleAudio());
        document.getElementById('share-screen').addEventListener('click', () => this.shareScreen());
        document.getElementById('end-call').addEventListener('click', () => this.endCall());
        
        // Кнопки копирования ссылки
        document.getElementById('copy-link').addEventListener('click', () => this.copyRoomLink());
        document.getElementById('copy-waiting-link').addEventListener('click', () => this.copyRoomLink());
    }

    initializeSocket() {
        const statusEl = document.getElementById('connection-status');
        
        this.socket.on('connect', () => {
            console.log('Подключено к серверу');
            if (statusEl) {
                statusEl.textContent = 'Подключено';
                statusEl.className = 'connected';
            }
        });

        this.socket.on('disconnect', () => {
            console.log('Отключено от сервера');
            if (statusEl) {
                statusEl.textContent = 'Отключено';
                statusEl.className = 'disconnected';
            }
        });

        this.socket.on('room-created', (data) => {
            this.userId = data.userId;
            this.roomId = data.roomId;
            console.log('Комната создана:', data);
        });

        this.socket.on('room-joined', (data) => {
            this.userId = data.userId;
            this.roomId = data.roomId;
            console.log('Присоединился к комнате:', data);
            
            // Если в комнате больше одного пользователя, создаем offer
            if (data.users.length > 1) {
                this.createOffer();
            }
        });

        this.socket.on('user-joined', (userId) => {
            console.log('Пользователь присоединился:', userId);
            this.showScreen('call-screen');
            document.getElementById('current-room-id').textContent = this.roomId;
        });

        this.socket.on('user-left', (userId) => {
            console.log('Пользователь покинул комнату:', userId);
            // Можно добавить логику для обработки отключения пользователя
        });

        this.socket.on('signal', async (data) => {
            await this.handleSignal(data.signal, data.from);
        });

        this.socket.on('error', (message) => {
            alert('Ошибка: ' + message);
        });
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const roomId = urlParams.get('room');
        if (roomId) {
            document.getElementById('join-room-id').value = roomId;
        }
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    async createRoom() {
        const roomName = document.getElementById('room-name').value || 'Комната';
        this.roomId = this.generateRoomId();
        
        document.getElementById('waiting-room-id').textContent = this.roomId;
        this.showScreen('waiting-screen');
        
        await this.initializeMedia();
        this.setupPeerConnection();
        
        // Создаем комнату на сервере
        this.socket.emit('create-room', this.roomId);
        
        // Обновляем URL
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
        window.history.pushState({}, '', newUrl);
    }

    async joinRoom() {
        const roomId = document.getElementById('join-room-id').value.trim();
        if (!roomId) {
            alert('Введите ID комнаты');
            return;
        }
        
        this.roomId = roomId;
        
        await this.initializeMedia();
        this.setupPeerConnection();
        this.showScreen('call-screen');
        
        document.getElementById('current-room-id').textContent = this.roomId;
        
        // Присоединяемся к комнате на сервере
        this.socket.emit('join-room', this.roomId);
        
        // Обновляем URL
        const newUrl = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
        window.history.pushState({}, '', newUrl);
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
        // Конфигурация STUN серверов
        const configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.peerConnection = new RTCPeerConnection(configuration);

        // Добавляем локальный поток
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
        }

        // Обработка удаленного потока
        this.peerConnection.ontrack = (event) => {
            this.remoteStream = event.streams[0];
            this.remoteVideo.srcObject = this.remoteStream;
        };

        // Обработка ICE кандидатов
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit('signal', {
                    roomId: this.roomId,
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
                roomId: this.roomId,
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
                roomId: this.roomId,
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
        
        const btn = document.getElementById('toggle-video');
        btn.classList.toggle('active', !this.isVideoEnabled);
        btn.textContent = this.isVideoEnabled ? '📹' : '📹';
    }

    toggleAudio() {
        this.isAudioEnabled = !this.isAudioEnabled;
        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = this.isAudioEnabled;
        }
        
        const btn = document.getElementById('toggle-audio');
        btn.classList.toggle('active', !this.isAudioEnabled);
        btn.textContent = this.isAudioEnabled ? '🎤' : '🔇';
    }

    async shareScreen() {
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true
            });
            
            // Заменяем видео трек на экран
            const videoTrack = screenStream.getVideoTracks()[0];
            const sender = this.peerConnection.getSenders().find(s => 
                s.track && s.track.kind === 'video'
            );
            
            if (sender) {
                await sender.replaceTrack(videoTrack);
            }
            
            this.localVideo.srcObject = screenStream;
            
            // Возвращаемся к камере когда прекращается демонстрация экрана
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
        // Уведомляем сервер о выходе
        if (this.roomId) {
            this.socket.emit('leave-room', this.roomId);
        }
        
        // Останавливаем все потоки
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Закрываем peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Возвращаемся на главный экран
        this.showScreen('home-screen');
        
        // Очищаем URL
        window.history.pushState({}, '', window.location.pathname);
        
        // Очищаем поля
        document.getElementById('room-name').value = '';
        document.getElementById('join-room-id').value = '';
        
        // Сбрасываем переменные
        this.userId = null;
        this.roomId = null;
    }

    copyRoomLink() {
        const link = `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
        navigator.clipboard.writeText(link).then(() => {
            // Показываем уведомление
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = 'Скопировано!';
            btn.style.background = '#28a745';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            // Fallback для старых браузеров
            prompt('Скопируйте ссылку:', link);
        });
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }
}

// Инициализация приложения
document.addEventListener('DOMContentLoaded', () => {
    new VideoCallApp();
});