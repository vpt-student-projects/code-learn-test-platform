// services/SessionManager.js
import { StorageService } from './StorageService.js';

export class SessionManager {
    constructor() {
        this.storage = new StorageService();
        this.eventSource = null;
        this.isConnected = false;
    }

    startSessionListener() {
        const user = this.storage.getUser();
        if (!user || !user.id) {
            console.log('No user found for session listening');
            return;
        }

        this.stopSessionListener();

        const userId = user.id;
        const url = `${this.getBaseUrl()}/api/session-events?userId=${userId}`;

        try {
            this.eventSource = new EventSource(url);
            
            this.eventSource.addEventListener('connected', (event) => {
                console.log('✅ Session events connected');
                this.isConnected = true;
            });

            this.eventSource.addEventListener('session_revoked', (event) => {
                console.log('🛑 Session revoked event received', event);
                const data = JSON.parse(event.data);
                if (data.revoked) {
                    this.handleSessionRevoked(data.message);
                }
            });

            this.eventSource.addEventListener('ping', (event) => {
                console.log('📡 Session ping received');
            });

            this.eventSource.onerror = (error) => {
                console.error('❌ Session events error:', error);
                this.isConnected = false;
                
                setTimeout(() => {
                    if (this.storage.isAuthenticated()) {
                        this.startSessionListener();
                    }
                }, 5000);
            };

        } catch (error) {
            console.error('❌ Failed to create EventSource:', error);
        }
    }

    stopSessionListener() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
            this.isConnected = false;
            console.log('🔴 Session listener stopped');
        }
    }

    handleSessionRevoked(message = 'Ваша сессия была завершена администратором') {
        console.log('🛑 Handling session revocation - IMMEDIATE LOGOUT');
        
        // 1. НЕМЕДЛЕННО показываем уведомление
        if (window.app && window.app.uiManager) {
            window.app.uiManager.showToast(message, 'warning');
        }
        
        // 2. МГНОВЕННЫЙ ВЫХОД БЕЗ ЗАДЕРЖКИ
        this.forceImmediateLogout();
    }

    forceImmediateLogout() {
        console.log('🚪 Executing immediate logout');
        
        // Шаг 1: Останавливаем слушатель SSE
        this.stopSessionListener();
        
        // Шаг 2: Очищаем ВСЕ данные аутентификации
        this.storage.clearAuth();
        
        // Шаг 3: Сбрасываем UI состояние
        if (window.app) {
            // Показываем кнопки входа вместо пользовательского меню
            window.app.uiManager.showAuthButtons();
            // Переключаем на безопасную секцию (каталог)
            window.app.uiManager.showSection('catalog');
            // Показываем финальное уведомление
            window.app.uiManager.showToast('Вы вышли из системы', 'info');
        }
        
        // Шаг 4: Перезагружаем страницу для полного сброса состояния
        console.log('🔄 Reloading page in 1 second...');
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }

    getBaseUrl() {
        const apiUrl = window.API_URL || 'https://localhost:7000';
        return apiUrl.replace('/api', '');
    }

    isListening() {
        return this.isConnected && this.eventSource !== null;
    }
}