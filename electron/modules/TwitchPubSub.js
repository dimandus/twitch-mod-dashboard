// TwitchPubSub.js - Клиент для Twitch PubSub (AutoMod)

const WebSocket = require('ws');

class TwitchPubSub {
  constructor() {
    this.ws = null;
    this.topics = new Set();
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.messageHandlers = new Set();
  }

  connect(accessToken, userId, channelIds = []) {
    if (this.ws) {
      console.log('[PubSub] Уже подключен');
      return;
    }

    this.ws = new WebSocket('wss://pubsub-edge.twitch.tv');

    this.ws.on('open', () => {
      console.log('[PubSub] Подключено');
      
      // Подписываемся на AutoMod для каждого канала
      for (const channelId of channelIds) {
        this.listenToAutoMod(accessToken, userId, channelId);
      }

      // Ping каждые 4 минуты
      this.pingInterval = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'PING' }));
        }
      }, 240000);
    });

    this.ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.type === 'PONG') {
          console.log('[PubSub] PONG получен');
          return;
        }

        if (msg.type === 'RECONNECT') {
          console.log('[PubSub] Сервер запросил переподключение');
          this.reconnect(accessToken, userId, channelIds);
          return;
        }

        if (msg.type === 'RESPONSE') {
          if (msg.error) {
            console.error('[PubSub] Ошибка подписки:', msg.error);
          }
          return;
        }

        if (msg.type === 'MESSAGE') {
          this.handleMessage(msg);
        }
      } catch (err) {
        console.error('[PubSub] Ошибка парсинга:', err);
      }
    });

    this.ws.on('close', () => {
      console.log('[PubSub] Отключено');
      this.cleanup();
      
      // Автоматическое переподключение через 5 секунд
      this.reconnectTimeout = setTimeout(() => {
        this.connect(accessToken, userId, channelIds);
      }, 5000);
    });

    this.ws.on('error', (err) => {
      console.error('[PubSub] Ошибка WebSocket:', err);
    });
  }

  listenToAutoMod(accessToken, userId, channelId) {
    const topic = `automod-queue.${userId}.${channelId}`;
    
    if (this.topics.has(topic)) {
      console.log('[PubSub] Уже подписан на', topic);
      return;
    }

    const message = {
      type: 'LISTEN',
      data: {
        topics: [topic],
        auth_token: accessToken
      }
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.topics.add(topic);
      console.log('[PubSub] Подписка на AutoMod:', topic);
    }
  }

  unlistenFromAutoMod(userId, channelId) {
    const topic = `automod-queue.${userId}.${channelId}`;
    
    if (!this.topics.has(topic)) return;

    const message = {
      type: 'UNLISTEN',
      data: {
        topics: [topic]
      }
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      this.topics.delete(topic);
      console.log('[PubSub] Отписка от AutoMod:', topic);
    }
  }

  handleMessage(msg) {
    try {
      const data = JSON.parse(msg.data.message);
      
      // Уведомляем всех подписчиков
      for (const handler of this.messageHandlers) {
        handler(data);
      }
    } catch (err) {
      console.error('[PubSub] Ошибка обработки сообщения:', err);
    }
  }

  onMessage(handler) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  reconnect(accessToken, userId, channelIds) {
    this.disconnect();
    setTimeout(() => {
      this.connect(accessToken, userId, channelIds);
    }, 1000);
  }

  cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  disconnect() {
    this.cleanup();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.topics.clear();
    this.messageHandlers.clear();
  }
}

module.exports = { TwitchPubSub };
