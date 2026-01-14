import tmi from 'tmi.js';
import { logger } from '../utils/logger';

// =====================================================
// Типы
// =====================================================

export type ChatMessageHandler = (params: {
  channel: string;
  message: string;
  tags: tmi.ChatUserstate;
  self: boolean;
}) => void;

export type ChatMessageDeleteHandler = (params: {
  channel: string;
  targetMsgId: string;
}) => void;

export type ChatUserClearHandler = (params: {
  channel: string;
  targetUserId?: string;
  targetLogin?: string;
  banDuration?: number;
}) => void;

export type RoomStateHandler = (params: {
  channel: string;
  state: tmi.RoomState;
}) => void;

export type NoticeHandler = (params: {
  channel: string;
  msgId: string;
  message: string;
}) => void;

export type AuthErrorHandler = () => void;

export type UserBanHandler = (params: {
  channel: string;
  username: string;
  reason?: string;
}) => void;

export type UserTimeoutHandler = (params: {
  channel: string;
  username: string;
  duration: number;
  reason?: string;
}) => void;

export type ModActionHandler = (params: {
  channel: string;
  action: string;
  args?: string[];
  moderator?: string;
}) => void;

// =====================================================
// Класс TwitchChatClient
// =====================================================

export class TwitchChatClient {
  private client: tmi.Client | null = null;
  private joinedChannels = new Set<string>();

  // Обработчики событий
  private messageHandlers = new Set<ChatMessageHandler>();
  private deleteHandlers = new Set<ChatMessageDeleteHandler>();
  private clearHandlers = new Set<ChatUserClearHandler>();
  private roomStateHandlers = new Set<RoomStateHandler>();
  private noticeHandlers = new Set<NoticeHandler>();
  private authErrorHandlers = new Set<AuthErrorHandler>();
  private banHandlers = new Set<UserBanHandler>();
  private timeoutHandlers = new Set<UserTimeoutHandler>();
  private modActionHandlers = new Set<ModActionHandler>();

  private currentUsername: string = '';

  // =====================================================
  // Подключение
  // =====================================================

  async connect(username: string, accessToken: string): Promise<void> {
    if (this.client) {
      logger.info('[TMI] уже подключен');
      return;
    }

    this.currentUsername = username.toLowerCase();

    const client = new tmi.Client({
      options: {
        debug: true, // ВКЛЮЧЕН ДЕБАГ
        skipUpdatingEmotesets: true
      },
      connection: {
        secure: true,
        reconnect: true
      },
      identity: {
        username: this.currentUsername,
        password: `oauth:${accessToken}`
      },
      channels: []
    });

    this.client = client;

    // =====================================================
    // Обработчики событий
    // =====================================================

    client.on('connected', (addr, port) => {
      logger.info('[TMI] connected to', addr, port);
    });

    client.on('disconnected', (reason) => {
      logger.warn('[TMI] disconnected:', reason);
      
      // Если отключение из-за ошибки аутентификации, нужно обновить токен
      if (reason && typeof reason === 'string' && 
          (reason.includes('Login authentication failed') || 
           reason.includes('authentication') ||
           reason.includes('Invalid oauth token'))) {
        logger.error('[TMI] Обнаружена ошибка аутентификации, требуется обновление токена');
        // Сбрасываем клиент, чтобы можно было переподключиться
        this.client = null;
        this.joinedChannels.clear();
        
        // Уведомляем обработчики об ошибке аутентификации
        for (const h of this.authErrorHandlers) {
          h();
        }
      }
    });

    client.on('message', (chan, tags, msg, self) => {
      const loginChan = normalizeChannel(chan);

      logger.debug('[TMI message]', {
        rawChannel: chan,
        channel: loginChan,
        self,
        msg,
        tags
      });

      if (self && !tags.username) {
        tags.username = this.currentUsername;
      }

      for (const h of this.messageHandlers) {
        h({ channel: loginChan, message: msg, tags, self });
      }
    });

    client.on('clearmsg', (chan, tags) => {
      const loginChan = normalizeChannel(chan);
      const msgId = tags['target-msg-id'];
      if (!msgId) return;
      for (const h of this.deleteHandlers) {
        h({ channel: loginChan, targetMsgId: msgId });
      }
    });

    client.on('clearchat', (chan, username, tags) => {
      const loginChan = normalizeChannel(chan);
      const t = (tags as any) || {};
      const targetUserId = t['target-user-id'] as string | undefined;
      const banDuration = t['ban-duration']
        ? parseInt(t['ban-duration'] as string, 10)
        : undefined;

      // Если есть username и banDuration, это таймаут
      if (username && banDuration !== undefined) {
        for (const h of this.timeoutHandlers) {
          h({
            channel: loginChan,
            username,
            duration: banDuration,
            reason: t['ban-reason']
          });
        }
      }
      // Если есть username но нет banDuration, это бан
      else if (username && banDuration === undefined) {
        for (const h of this.banHandlers) {
          h({
            channel: loginChan,
            username,
            reason: t['ban-reason']
          });
        }
      }

      for (const h of this.clearHandlers) {
        h({
          channel: loginChan,
          targetUserId,
          targetLogin: username || undefined,
          banDuration
        });
      }
    });

    client.on('roomstate', (chan, state) => {
      const loginChan = normalizeChannel(chan);
      for (const h of this.roomStateHandlers) {
        h({ channel: loginChan, state });
      }
    });

    client.on('notice', (chan, msgId, message) => {
      const loginChan = normalizeChannel(chan);
      logger.info('[TMI NOTICE]', { channel: loginChan, msgId, message });
      for (const h of this.noticeHandlers) {
        h({ channel: loginChan, msgId, message });
      }
    });

    // ===== ДОПОЛНИТЕЛЬНЫЕ ЛОГИ =====
    client.on('join', (chan, username, self) => {
      logger.debug('[TMI JOIN]', { channel: normalizeChannel(chan), username, self });
    });
    client.on('part', (chan, username, self) => {
      logger.debug('[TMI PART]', { channel: normalizeChannel(chan), username, self });
    });
    client.on('error', (err) => {
      logger.error('[TMI ERROR]', err);
      
      // Обработка ошибок аутентификации
      const errMsg = err?.message || String(err || '');
      if (errMsg.includes('Login authentication failed') || 
          errMsg.includes('authentication') ||
          errMsg.includes('Invalid oauth token')) {
        logger.error('[TMI] Ошибка аутентификации токена, требуется обновление');
        // Сбрасываем клиент для переподключения
        this.client = null;
        this.joinedChannels.clear();
        
        // Уведомляем обработчики об ошибке аутентификации
        for (const h of this.authErrorHandlers) {
          h();
        }
      }
    });
    client.on('raw_message', (msgCloned, msg) => {
      logger.debug('[TMI RAW]', msgCloned);
    });
    client.on('data', (data) => {
      logger.debug('[TMI DATA]', data);
    });

    await client.connect();
    logger.info('[TMI] connected as', this.currentUsername);
  }

  // =====================================================
  // Методы
  // =====================================================

  async joinChannel(channelLogin: string): Promise<void> {
    if (!this.client) throw new Error('TwitchChatClient: клиент не подключен');
    const login = channelLogin.toLowerCase().trim();
    if (!login) return;
    if (this.joinedChannels.has(login)) return;
    await this.client.join(login);
    this.joinedChannels.add(login);
    logger.info('[TMI] joined', login);
    logger.debug('[TMI] getChannels:', this.client.getChannels());
  }

  async partChannel(channelLogin: string): Promise<void> {
    if (!this.client) return;
    const login = channelLogin.toLowerCase().trim();
    if (!login || !this.joinedChannels.has(login)) return;
    try {
      await this.client.part(login);
    } catch (e) {
      logger.warn('Part error', e);
    }
    this.joinedChannels.delete(login);
  }

  async sendMessage(channelLogin: string, text: string): Promise<void> {
    if (!this.client) throw new Error('TwitchChatClient: клиент не подключен');
    const login = channelLogin.toLowerCase().trim();
    const msg = text.trim();
    if (!login || !msg) return;

    if (!this.joinedChannels.has(login)) {
      await this.joinChannel(login);
    }

    logger.debug('[TMI] getChannels:', this.client.getChannels());
    logger.debug('[TMI] sendMessage:', { login, msg });

    await this.client.say(login, msg);
  }

  async sendReply(
    channelLogin: string,
    text: string,
    parentMsgId: string
  ): Promise<void> {
    if (!this.client) throw new Error('TwitchChatClient: клиент не подключен');
    const login = channelLogin.toLowerCase().trim();
    const msg = text.trim();
    if (!login || !msg || !parentMsgId) return;
    // @ts-ignore
    await this.client.say(login, msg, { 'reply-parent-msg-id': parentMsgId });
  }

  // Подписки на события

  onMessage(handler: ChatMessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  onMessageDeleted(handler: ChatMessageDeleteHandler): () => void {
    this.deleteHandlers.add(handler);
    return () => this.deleteHandlers.delete(handler);
  }

  onUserClearchat(handler: ChatUserClearHandler): () => void {
    this.clearHandlers.add(handler);
    return () => this.clearHandlers.delete(handler);
  }

  onRoomState(handler: RoomStateHandler): () => void {
    this.roomStateHandlers.add(handler);
    return () => this.roomStateHandlers.delete(handler);
  }

  onNotice(handler: NoticeHandler): () => void {
    this.noticeHandlers.add(handler);
    return () => this.noticeHandlers.delete(handler);
  }

  onAuthError(handler: AuthErrorHandler): () => void {
    this.authErrorHandlers.add(handler);
    return () => this.authErrorHandlers.delete(handler);
  }

  onUserBan(handler: UserBanHandler): () => void {
    this.banHandlers.add(handler);
    return () => this.banHandlers.delete(handler);
  }

  onUserTimeout(handler: UserTimeoutHandler): () => void {
    this.timeoutHandlers.add(handler);
    return () => this.timeoutHandlers.delete(handler);
  }

  onModAction(handler: ModActionHandler): () => void {
    this.modActionHandlers.add(handler);
    return () => this.modActionHandlers.delete(handler);
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.disconnect();
    } catch {
      // ignore
    }
    this.client = null;
    this.joinedChannels.clear();
    this.messageHandlers.clear();
    this.deleteHandlers.clear();
    this.clearHandlers.clear();
    this.roomStateHandlers.clear();
    this.noticeHandlers.clear();
    this.authErrorHandlers.clear();
    this.banHandlers.clear();
    this.timeoutHandlers.clear();
    this.modActionHandlers.clear();
    logger.info('[TMI] disconnected');
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

// =====================================================
// Helpers
// =====================================================

function normalizeChannel(chan: string): string {
  return chan.startsWith('#') ? chan.slice(1) : chan;
}

function isDeprecatedModCommand(text: string): boolean {
  const cmd = text.toLowerCase().split(' ')[0];
  const deprecatedCommands = [
    '/ban',
    '/unban',
    '/timeout',
    '/untimeout',
    '/delete',
    '/clear',
    '/slow',
    '/slowoff',
    '/followers',
    '/followersoff',
    '/subscribers',
    '/subscribersoff',
    '/emoteonly',
    '/emoteonlyoff',
    '/uniquechat',
    '/uniquechatoff',
    '/r9kbeta',
    '/r9kbetaoff'
  ];
  return deprecatedCommands.includes(cmd);
}

export const twitchChatClient = new TwitchChatClient();