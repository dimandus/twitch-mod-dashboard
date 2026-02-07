import { useEffect, useRef } from 'react';
import { twitchChatClient } from '../chat/TwitchChatClient';
import { useChatStore, modeChangeTimestamps } from '../stores/chatStore';
import { useUserStore } from '../stores/userStore';
import type { ChatMessage } from '../views/ChatArea';
import type { UserLogMessage } from '../components/UserMessageLog';
import { logger } from '../utils/logger';
import { handleError } from '../utils/errorHandler';

interface PendingSelfMessage {
  msgId: string;
  text: string;
  createdAt: number;
}

export const useChatClient = (onMessageDeleted?: (channel: string, msgId: string) => void) => {
  const setPanes = useChatStore(state => state.setPanes);
  const setChatReady = useChatStore(state => state.setChatReady);
  const setCurrentUserLogin = useChatStore(state => state.setCurrentUserLogin);
  const addSystemMessage = useChatStore(state => state.addSystemMessage);
  const setRoomModes = useChatStore(state => state.setRoomModes);
  
  const setGlobalUsers = useUserStore(state => state.setGlobalUsers);
  const setActiveChatters = useUserStore(state => state.setActiveChatters);
  const globalUsers = useUserStore(state => state.globalUsers);
  
  const currentUserLoginRef = useRef<string | null>(null);
  const initializedChannels = useRef<Set<string>>(new Set());
  const pendingSelfMessagesRef = useRef<Record<string, PendingSelfMessage[]>>({});

  useEffect(() => {
    let cancelled = false;

    // ВРЕМЕННО: логировать все входящие сообщения (raw)
    const debugLogRawMessage = (params: { channel: string; message: string; tags: any; self: boolean }) => {
      // eslint-disable-next-line no-console
      console.log('[DEBUG RAW MESSAGE]', JSON.stringify(params, null, 2));
    };

    // Подписка на сообщения
    const unsub = twitchChatClient.onMessage((params) => {
      debugLogRawMessage(params);
    });

    const initChat = async () => {
      try {
        const user = await window.electronAPI.twitch.getCurrentUser();
        if (!user) {
          logger.warn('[useChatClient] Нет сохранённого Twitch пользователя');
          setChatReady(false);
          return;
        }

        if (twitchChatClient.isConnected() && currentUserLoginRef.current === user.login.toLowerCase()) {
          logger.info('[useChatClient] Чат уже подключен для этого пользователя');
          return;
        }

        if (twitchChatClient.isConnected()) {
          logger.info('[useChatClient] Отключаемся от предыдущего пользователя');
          await twitchChatClient.disconnect();
        }
      /*...*/
        setCurrentUserLogin(user.login.toLowerCase());
        currentUserLoginRef.current = user.login.toLowerCase();

        let token = await window.electronAPI.config.get('twitch.accessToken');

        try {
          const ensured = await window.electronAPI.twitch.ensureAccessToken();
          if (ensured) token = ensured;
        } catch (e) {
          logger.warn('[useChatClient] не удалось обновить токен Twitch через Helix', e);
        }

        if (!token) {
          logger.warn('[useChatClient] Нет валидного Twitch accessToken. Нужно заново войти в аккаунт.');
          setChatReady(false);
          return;
        }

        await twitchChatClient.connect(user.login, token);
        if (cancelled) return;

        setupChatHandlers();
        setChatReady(true);
      } catch (err) {
        handleError(err, 'ChatInit');
      }
    };

    const setupChatHandlers = () => {
      twitchChatClient.onMessage(({ channel, message, tags, self }) => {
        const chanLower = channel.toLowerCase();

        if (self && !tags.id) {
          const queue = pendingSelfMessagesRef.current[chanLower];
          if (queue && queue.length > 0) {
            const pending = queue.shift()!;
            if (pending.text === message.trim()) {
              tags.id = pending.msgId;
            } else {
              queue.unshift(pending);
            }
          }
        }

        const selfLogin = currentUserLoginRef.current;
        const mentionedSelf = !!selfLogin && message.toLowerCase().includes('@' + selfLogin);
        
        const msg = buildChatMessage(channel, message, tags, self, mentionedSelf);
        const loginLower = (tags.username || '').toLowerCase();
        const odaterId = tags['user-id'] || loginLower;
        const badgeVersions: Record<string, string> = tags.badges || {};
        const badgeInfo: Record<string, string> = tags['badge-info'] || {};
        const badgesArray = Object.keys(badgeVersions);

        setPanes((prev) =>
          prev.map((p) => {
            if (p.channel.toLowerCase() !== chanLower) return p;

            if (p.paused) {
              const newBuf = [...p.buffer, msg];
              if (newBuf.length > 300) newBuf.splice(0, newBuf.length - 300);
              return { ...p, buffer: newBuf };
            } else {
              const newMsgs = [...p.messages, msg];
              if (newMsgs.length > 300) newMsgs.splice(0, newMsgs.length - 300);
              return { ...p, messages: newMsgs };
            }
          })
        );

        setGlobalUsers((prev) => {
          const existing = prev[loginLower] || {
            login: tags.username || '',
            displayName: tags['display-name'] || tags.username || '',
            color: tags.color,
            badges: Object.keys(tags.badges || {}),
            messages: [],
            lastSeen: Date.now(),
            avatarUrl: null,
            bannerUrl: null
          };

          const newMessage: UserLogMessage = {
            id: msg.id,
            msgId: msg.msgId,
            channel: chanLower,
            text: message,
            timestamp: Date.now(),
            deleted: false,
            emotes: tags.emotes
          };

          const messages = [...existing.messages, newMessage];
          if (messages.length > 500) {
            messages.splice(0, messages.length - 500);
          }

          return {
            ...prev,
            [loginLower]: {
              ...existing,
              displayName: tags['display-name'] || existing.displayName,
              color: tags.color || existing.color,
              badges: Object.keys(tags.badges || {}),
              messages,
              lastSeen: Date.now()
            }
          };
        });

        setActiveChatters((prev) => {
          const channelChatters = new Map(prev[chanLower] || []);
          const userData = globalUsers[loginLower];

          channelChatters.set(odaterId, {
            odaterId,
            login: tags.username || '',
            displayName: tags['display-name'] || tags.username || '',
            color: tags.color,
            badges: badgesArray,
            badgeVersions,
            badgeInfo,
            lastSeen: Date.now(),
            avatarUrl: userData?.avatarUrl ?? null,
            bannerUrl: userData?.bannerUrl ?? null
          });

          return { ...prev, [chanLower]: channelChatters };
        });
      });

      twitchChatClient.onMessageDeleted(({ channel, targetMsgId }) => {
        if (onMessageDeleted) {
          onMessageDeleted(channel, targetMsgId);
        }
      });

      twitchChatClient.onUserBan(({ channel, username, reason }) => {
        const msg = reason 
          ? `⛔ ${username} забанен. Причина: ${reason}`
          : `⛔ ${username} забанен`;
        addSystemMessage(channel, msg);
      });

      twitchChatClient.onUserTimeout(({ channel, username, duration, reason }) => {
        const timeStr = duration >= 60 ? `${Math.floor(duration / 60)}м` : `${duration}с`;
        const msg = reason
          ? `⏱️ ${username} получил таймаут на ${timeStr}. Причина: ${reason}`
          : `⏱️ ${username} получил таймаут на ${timeStr}`;
        addSystemMessage(channel, msg);
      });

      twitchChatClient.onUserClearchat(({ channel, targetUserId, targetLogin }) => {
        const chanLower = channel.toLowerCase();

        setPanes((prev) =>
          prev.map((p) => {
            if (p.channel.toLowerCase() !== chanLower) return p;

            if (!targetUserId && !targetLogin) {
              const systemMsg: ChatMessage = {
                id: `sys-${Date.now()}-${Math.random()}`,
                text: 'Чат очищен модератором',
                userLogin: '',
                displayName: '',
                color: '',
                badges: [],
                self: false,
                timestamp: Date.now(),
                isSystem: true
              };

              const clearedMessages = p.messages.map((m) =>
                m.isSystem ? m : { ...m, cleared: true }
              );
              const clearedBuffer = p.buffer.map((m) =>
                m.isSystem ? m : { ...m, cleared: true }
              );

              return {
                ...p,
                messages: [...clearedMessages, systemMsg],
                buffer: clearedBuffer
              };
            }

            const mark = (m: ChatMessage) => {
              if (m.deleted) return m;
              if (targetUserId && m.userId === targetUserId)
                return { ...m, deleted: true };
              if (targetLogin && m.userLogin.toLowerCase() === targetLogin.toLowerCase()) {
                return { ...m, deleted: true };
              }
              return m;
            };

            return {
              ...p,
              messages: p.messages.map(mark),
              buffer: p.buffer.map(mark)
            };
          })
        );

        if (targetLogin) {
          const loginLower = targetLogin.toLowerCase();
          setGlobalUsers((prev) => {
            const userData = prev[loginLower];
            if (!userData) return prev;

            return {
              ...prev,
              [loginLower]: {
                ...userData,
                messages: userData.messages.map((m) =>
                  m.channel === chanLower ? { ...m, deleted: true } : m
                )
              }
            };
          });
        }
      });

      twitchChatClient.onNotice(({ channel, msgId, message }) => {
        const msgLower = message.toLowerCase();
        
        if (msgLower.includes('emote-only') || 
            msgLower.includes('slow mode') || 
            msgLower.includes('slow-mode') ||
            msgLower.includes('followers-only') ||
            msgLower.includes('subscribers-only') ||
            msgLower.includes('subscriber-only') ||
            msgLower.includes('r9k') ||
            msgLower.includes('unique-chat')) {
          return;
        }
        
        let text = '';
        
        if (msgId === 'raid' || msgLower.includes('raid')) {
          const raidMatch = message.match(/raid\s+from\s+(\w+)/i) || 
                           message.match(/(\w+)\s+is\s+raiding/i) ||
                           message.match(/(\w+)\s+raided/i);
          if (raidMatch) {
            const raider = raidMatch[1];
            const viewerMatch = message.match(/(\d+)\s+viewer/i);
            const viewers = viewerMatch ? parseInt(viewerMatch[1], 10) : null;
            const viewerText = viewers ? ` с ${viewers} зрителями` : '';
            text = `⚔️ Рейд от ${raider}${viewerText}`;
          }
        } else if (msgId === 'host_on' || msgLower.includes('hosting')) {
          const hostMatch = message.match(/hosting\s+(\w+)/i) ||
                           message.match(/(\w+)\s+is\s+now\s+hosting/i);
          if (hostMatch) {
            text = `📺 Хост от ${hostMatch[1]}`;
          }
        } else if (msgId === 'host_off' || msgLower.includes('hosting ended')) {
          text = '📺 Хост завершен';
        } else if (msgId === 'sub' || msgId === 'resub' || msgLower.includes('subscribed') || msgLower.includes('resubscribed')) {
          text = `⭐ ${message}`;
        } else if (msgId === 'subgift' || msgId === 'submysterygift' || msgLower.includes('gifted')) {
          text = `🎁 ${message}`;
        } else if (msgId === 'bitsbadgetier' || msgLower.includes('bits') || msgLower.includes('cheer')) {
          text = `💎 ${message}`;
        } else if (msgId === 'ritual' || msgLower.includes('ritual')) {
          text = `🎉 ${message}`;
        } else if (msgId === 'announcement' || msgLower.includes('announcement')) {
          text = `📢 ${message}`;
        } else if (message && message.trim()) {
          text = `ℹ️ ${message}`;
        }
        
        if (text) {
          addSystemMessage(channel, text);
        }
      });

      twitchChatClient.onRoomState(({ channel, state }) => {
        const chanLower = channel.toLowerCase();
        const lastChange = modeChangeTimestamps[chanLower];
        const now = Date.now();
        const ignoreIRC = lastChange && now - lastChange < 3000;

        const slowRaw = state.slow;
        const slowDuration = parsePositiveInt(slowRaw);
        const slowEnabled = slowDuration > 0;

        const followersRaw = state['followers-only'];
        let followersEnabled = false;
        let followersDuration = -1;

        if (followersRaw === false || followersRaw === '-1' || followersRaw === -1) {
          followersEnabled = false;
          followersDuration = -1;
        } else if (followersRaw === true) {
          followersEnabled = true;
          followersDuration = 0;
        } else if (typeof followersRaw === 'string' || typeof followersRaw === 'number') {
          const parsed = parseInt(String(followersRaw), 10);
          if (!isNaN(parsed) && parsed >= 0) {
            followersEnabled = true;
            followersDuration = parsed;
          }
        }

        setRoomModes((prev) => {
          const isFirstTime = !initializedChannels.current.has(chanLower);
          const existing = prev[chanLower];

          const newSlow = state.slow !== undefined ? slowEnabled : existing?.slow ?? false;
          const newSlowDuration = state.slow !== undefined ? slowDuration : existing?.slowDuration ?? 0;
          const newEmote = state['emote-only'] !== undefined ? parseBool(state['emote-only']) : existing?.emote ?? false;
          const newSubs = state['subs-only'] !== undefined ? parseBool(state['subs-only']) : existing?.subs ?? false;
          const newUnique = state.r9k !== undefined ? parseBool(state.r9k) : existing?.unique ?? false;

          if (!isFirstTime && existing) {
            if (state.slow !== undefined && existing.slow !== newSlow) {
              const msg = newSlow 
                ? `⏱️ Медленный режим включен (${newSlowDuration}с)`
                : '⏱️ Медленный режим выключен';
              addSystemMessage(chanLower, msg);
            }
            if (state['emote-only'] !== undefined && existing.emote !== newEmote) {
              const msg = newEmote ? '😊 Режим только эмодзи включен' : '😊 Режим только эмодзи выключен';
              addSystemMessage(chanLower, msg);
            }
            if (state['subs-only'] !== undefined && existing.subs !== newSubs) {
              const msg = newSubs ? '⭐ Режим только для подписчиков включен' : '⭐ Режим только для подписчиков выключен';
              addSystemMessage(chanLower, msg);
            }
            if (state.r9k !== undefined && existing.unique !== newUnique) {
              const msg = newUnique ? '🔄 Режим уникальных сообщений включен' : '🔄 Режим уникальных сообщений выключен';
              addSystemMessage(chanLower, msg);
            }
            if (!ignoreIRC && state['followers-only'] !== undefined && existing.followers !== followersEnabled) {
              const msg = followersEnabled 
                ? `👥 Режим только для фолловеров включен (${followersDuration}м)`
                : '👥 Режим только для фолловеров выключен';
              addSystemMessage(chanLower, msg);
            }
          }

          if (isFirstTime) {
            initializedChannels.current.add(chanLower);
          }

          const base = {
            slow: newSlow,
            slowDuration: newSlowDuration,
            emote: newEmote,
            subs: newSubs,
            unique: newUnique,
            followers: ignoreIRC ? (existing?.followers ?? false) : followersEnabled,
            followersDuration: ignoreIRC ? (existing?.followersDuration ?? -1) : followersDuration,
            shield: existing?.shield ?? false
          };

          return {
            ...prev,
            [chanLower]: base
          };
        });
      });
    };

    initChat();

    return () => {
      cancelled = true;
      unsub && unsub();
      twitchChatClient.disconnect().catch(() => {});
    };
  }, []);

  return { pendingSelfMessagesRef, currentUserLoginRef };
};

function buildChatMessage(
  channel: string,
  text: string,
  tags: any,
  self: boolean,
  mentionedSelf?: boolean
): ChatMessage {
  const localId = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const msgId: string | undefined = tags.id || undefined;
  const badgeVersions: Record<string, string> = tags.badges || {};
  const badgeInfo: Record<string, string> = tags['badge-info'] || {};
  const badges = Object.keys(badgeVersions);
  const isRaider = !!(tags['msg-param-viewerCount'] || tags['msg-param-viewer-count']);
  const isFirstMessage = tags['first-msg'] === true || tags['first-msg'] === '1';
  const sourceRoomId = tags['source-room-id'];
  const sourceChannelName = tags['source-channel-name'];

  return {
    id: localId,
    msgId,
    userId: tags['user-id'],
    text,
    userLogin: tags.username || tags.login || '',
    displayName: tags['display-name'] || tags.username || 'unknown',
    color: tags.color,
    badges,
    badgeInfo,
    badgeVersions,
    self,
    timestamp: tags['tmi-sent-ts'] ? parseInt(tags['tmi-sent-ts'], 10) : Date.now(),
    emotes: tags.emotes,
    deleted: false,
    mentionedSelf: mentionedSelf ?? false,
    isRaider,
    isFirstMessage,
    sourceRoomId,
    sourceChannelName
  };
}

function parseBool(v: any): boolean {
  if (v === true) return true;
  if (v === false || v == null) return false;
  if (typeof v === 'number') return v > 0;
  if (typeof v === 'string')
    return v !== '0' && v !== '' && v !== '-1' && v !== 'false';
  return false;
}

function parsePositiveInt(v: any): number {
  if (typeof v === 'number') return v >= 0 ? v : 0;
  if (typeof v === 'string') {
    const parsed = parseInt(v, 10);
    return !isNaN(parsed) && parsed >= 0 ? parsed : 0;
  }
  return 0;
}
