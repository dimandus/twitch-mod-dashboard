import tmi from 'tmi.js';

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

  private currentUsername: string = '';

  // =====================================================
  // Подключение
  // =====================================================

  async connect(username: string, accessToken: string): Promise<void> {
    if (this.client) {
      console.log('[TwitchChatClient] уже подключен');
      return;
    }

    this.currentUsername = username.toLowerCase();

    const client = new tmi.Client({
      options: {
        debug: false,
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
      console.log('[TMI] connected to', addr, port);
    });

    client.on('disconnected', (reason) => {
      console.log('[TMI] disconnected:', reason);
    });

    client.on('message', (chan, tags, msg, self) => {
      const loginChan = normalizeChannel(chan);

      console.log('[TMI raw message]', {
        self,
        id: tags.id,
        messageType: tags['message-type'],
        username: tags.username,
        msgPreview: msg.substring(0, 30),
        allTagKeys: Object.keys(tags).join(', ')
      });

      if (self && !tags.username) {
        tags.username = this.currentUsername;
      }

      for (const h of this.messageHandlers) {
        h({ channel: loginChan, message: msg, tags, self });
      }
    });

    // Удаление конкретного сообщения (CLEARMSG)
    client.on('clearmsg', (chan, tags) => {
      const loginChan = normalizeChannel(chan);
      const msgId = tags['target-msg-id'];
      if (!msgId) return;
      for (const h of this.deleteHandlers) {
        h({ channel: loginChan, targetMsgId: msgId });
      }
    });

    // CLEARCHAT: полная очистка чата или бан/таймаут пользователя
    client.on('clearchat', (chan, username, tags) => {
      const loginChan = normalizeChannel(chan);

      // ВАЖНО: tags может быть undefined при полной очистке
      const t = (tags as any) || {};
      const targetUserId = t['target-user-id'] as string | undefined;
      const banDuration = t['ban-duration']
        ? parseInt(t['ban-duration'] as string, 10)
        : undefined;

      for (const h of this.clearHandlers) {
        h({
          channel: loginChan,
          targetUserId,
          targetLogin: username || undefined,
          banDuration
        });
      }
    });

    // Roomstate
    client.on('roomstate', (chan, state) => {
      const loginChan = normalizeChannel(chan);
      for (const h of this.roomStateHandlers) {
        h({ channel: loginChan, state });
      }
    });

    // Notice
    client.on('notice', (chan, msgId, message) => {
      const loginChan = normalizeChannel(chan);
      for (const h of this.noticeHandlers) {
        h({ channel: loginChan, msgId, message });
      }
    });

    await client.connect();
    console.log('[TwitchChatClient] connected as', this.currentUsername);
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
  }

  async partChannel(channelLogin: string): Promise<void> {
    if (!this.client) return;
    const login = channelLogin.toLowerCase().trim();
    if (!login || !this.joinedChannels.has(login)) return;
    try {
      await this.client.part(login);
    } catch (e) {
      console.warn('Part error', e);
    }
    this.joinedChannels.delete(login);
  }

  // Сейчас UI отправляет через Helix, но этот метод оставляем как fallback
  async sendMessage(channelLogin: string, text: string): Promise<void> {
    if (!this.client) throw new Error('TwitchChatClient: клиент не подключен');
    const login = channelLogin.toLowerCase().trim();
    const msg = text.trim();
    if (!login || !msg) return;
    if (isDeprecatedModCommand(msg)) {
      console.warn('Команда IRC устарела:', msg.split(' ')[0]);
    }
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
    console.log('[TwitchChatClient] disconnected');
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