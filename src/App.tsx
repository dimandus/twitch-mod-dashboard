import React, { useState, useEffect, useRef } from 'react';
import DashboardView from './views/DashboardView';
import SettingsView from './views/SettingsView';
import UserMessageLog, {
  UserLogData,
  UserLogMessage
} from './components/UserMessageLog';
import UserProfileModal from './components/UserProfileModal';
import { twitchChatClient } from './chat/TwitchChatClient';
import type { ChatPane, ChatMessage } from './views/ChatArea';

type Tab = 'dashboard' | 'settings';

interface ChatModes {
  slow: boolean;
  slowDuration: number;
  emote: boolean;
  followers: boolean;
  followersDuration: number;
  subs: boolean;
  unique: boolean;
  shield: boolean;
}

const defaultModes: ChatModes = {
  slow: false,
  slowDuration: 0,
  emote: false,
  followers: false,
  followersDuration: -1,
  subs: false,
  unique: false,
  shield: false
};

interface GlobalUserData {
  login: string;
  displayName: string;
  color?: string;
  badges: string[];
  messages: UserLogMessage[];
  lastSeen: number;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

export interface ActiveChatter {
  odaterId: string;
  login: string;
  displayName: string;
  color?: string;
  badges: string[];
  badgeVersions: Record<string, string>;
  badgeInfo: Record<string, string>;
  lastSeen: number;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

interface PendingSelfMessage {
  msgId: string;
  text: string;
  createdAt: number;
}

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');

  const [chatPanes, setChatPanes] = useState<ChatPane[]>([]);
  const [roomModes, setRoomModes] = useState<Record<string, ChatModes>>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [chatReady, setChatReady] = useState(false);
  const [currentUserLogin, setCurrentUserLogin] = useState<string | null>(null);
  const joinedRef = useRef<Set<string>>(new Set());
  const modeChangeTimestamps = useRef<Record<string, number>>({});
  const pendingSelfMessagesRef = useRef<
    Record<string, PendingSelfMessage[]>
  >({});
  const currentUserLoginRef = useRef<string | null>(null);

  const [globalUsers, setGlobalUsers] = useState<Record<string, GlobalUserData>>(
    {}
  );
  const globalUsersRef = useRef<Record<string, GlobalUserData>>({});

  const [activeChatters, setActiveChatters] = useState<
    Record<string, Map<string, ActiveChatter>>
  >({});

  useEffect(() => {
    globalUsersRef.current = globalUsers;
  }, [globalUsers]);

  const [userLogOpen, setUserLogOpen] = useState<UserLogData | null>(null);
  const [userProfileLogin, setUserProfileLogin] = useState<string | null>(null);

  const markModeChanged = (channel: string) => {
    modeChangeTimestamps.current[channel.toLowerCase()] = Date.now();
  };

  // =====================================================
  // Отправка сообщений (через Helix, с fallback на IRC, с поддержкой /команд)
  // =====================================================

  const handleSendMessage = async (channel: string, text: string) => {
    const chanLower = channel.toLowerCase().trim();
    const trimmed = text.trim();
    if (!chanLower || !trimmed) return;

    // Если это /команда — парсим и вызываем Helix или IRC
    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');

      try {
        switch (cmd.toLowerCase()) {
          case 'clear':
            await window.electronAPI.twitch.clearChat(chanLower);
            return;

          case 'slow':
            {
              let seconds = parseInt(args[0], 10) || 0;
              if (seconds > 0 && seconds < 10) {
                // Через IRC (Twitch Helix не поддерживает <10)
                await twitchChatClient.sendMessage(chanLower, `/slow ${seconds}`);
              } else {
                await window.electronAPI.twitch.slowMode(chanLower, true, seconds);
              }
            }
            return;

          case 'slowoff':
            await window.electronAPI.twitch.slowMode(chanLower, false, 0);
            return;

          case 'followers':
            {
              let minutes = -1;
              if (args[0]) {
                const match = args[0].match(/^(\d+)([mhdw]?)$/i);
                if (match) {
                  const num = parseInt(match[1], 10);
                  const unit = match[2]?.toLowerCase();
                  if (unit === 'm' || !unit) minutes = num;
                  else if (unit === 'h') minutes = num * 60;
                  else if (unit === 'd') minutes = num * 60 * 24;
                  else if (unit === 'w') minutes = num * 60 * 24 * 7;
                }
              }
              await window.electronAPI.twitch.followersOnly(chanLower, true, minutes);
            }
            return;

          case 'followersoff':
            await window.electronAPI.twitch.followersOnly(chanLower, false, 0);
            return;

          case 'subscribers':
            await window.electronAPI.twitch.subscribersOnly(chanLower, true);
            return;

          case 'subscribersoff':
            await window.electronAPI.twitch.subscribersOnly(chanLower, false);
            return;

          case 'emoteonly':
            await window.electronAPI.twitch.emoteOnly(chanLower, true);
            return;

          case 'emoteonlyoff':
            await window.electronAPI.twitch.emoteOnly(chanLower, false);
            return;

          case 'uniquechat':
          case 'r9kbeta':
            await window.electronAPI.twitch.updateChatSettings(chanLower, { unique_chat_mode: true });
            return;

          case 'uniquechatoff':
          case 'r9kbetaoff':
            await window.electronAPI.twitch.updateChatSettings(chanLower, { unique_chat_mode: false });
            return;

          case 'ban':
            if (args[0]) {
              const login = args[0];
              const reason = args.slice(1).join(' ') || '';
              await window.electronAPI.twitch.banUser(chanLower, login, null, reason);
            }
            return;

          case 'timeout':
            if (args[0]) {
              const login = args[0];
              const duration = parseInt(args[1], 10) || 600;
              const reason = args.slice(2).join(' ') || '';
              await window.electronAPI.twitch.timeoutUser(chanLower, login, duration, reason);
            }
            return;

          case 'unban':
            if (args[0]) {
              const login = args[0];
              await window.electronAPI.twitch.unbanUser(chanLower, login);
            }
            return;

          case 'announce':
            if (args.length > 0) {
              // /announce [color] message
              let color: any = 'primary';
              let message = args.join(' ');
              if (
                ['blue', 'green', 'orange', 'purple', 'primary'].includes(
                  args[0]?.toLowerCase()
                )
              ) {
                color = args[0].toLowerCase();
                message = args.slice(1).join(' ');
              }
              await window.electronAPI.twitch.sendAnnouncement(chanLower, message, color);
            }
            return;

          // Команды, которые работают только через IRC (и не поддерживаются Helix)
          case 'me':
          case 'mod':
          case 'unmod':
          case 'vip':
          case 'unvip':
          case 'host':
          case 'unhost':
          case 'raid':
          case 'unraid':
          case 'w':
          case 'color':
          case 'block':
          case 'unblock':
          case 'ignore':
          case 'unignore':
          case 'delete':
          case 'untimeout':
            await twitchChatClient.sendMessage(chanLower, trimmed);
            return;

          default:
            // Любая неизвестная команда — через IRC (может не сработать)
            await twitchChatClient.sendMessage(chanLower, trimmed);
            return;
        }
      } catch (err) {
        console.error('[App] Ошибка выполнения команды:', trimmed, err);
      }
      return;
    }

    // Обычные сообщения — через Helix, fallback на IRC
    try {
      const result = await window.electronAPI.twitch.sendChatMessage(
        chanLower,
        trimmed
      );
      if (result && result.messageId) {
        // ... твоя логика для self-сообщений
      } else {
        await twitchChatClient.sendMessage(chanLower, trimmed);
      }
    } catch (err) {
      try {
        await twitchChatClient.sendMessage(chanLower, trimmed);
      } catch (err2) {
        console.error('[App] fallback отправка через IRC не удалась', err2);
      }
    }
  };

  // =====================================================
  // Лог пользователя
  // =====================================================

  const openUserLog = (userLogin: string) => {
    const loginLower = userLogin.toLowerCase();
    const userData = globalUsers[loginLower];

    if (userData) {
      setUserLogOpen({
        login: userData.login,
        displayName: userData.displayName,
        color: userData.color,
        badges: userData.badges,
        messages: [...userData.messages]
      });
    } else {
      setUserLogOpen({
        login: userLogin,
        displayName: userLogin,
        color: undefined,
        badges: [],
        messages: []
      });
    }
  };

  const closeUserLog = () => {
    setUserLogOpen(null);
  };

  const openUserProfile = (login: string) => {
    if (!login) return;
    setUserProfileLogin(login.toLowerCase());
  };

  const closeUserProfile = () => setUserProfileLogin(null);

  // Обновляем данные в открытом логе при изменении globalUsers
  useEffect(() => {
    if (!userLogOpen) return;

    const loginLower = userLogOpen.login.toLowerCase();
    const userData = globalUsers[loginLower];

    if (userData) {
      setUserLogOpen((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...userData.messages]
        };
      });
    }
  }, [globalUsers, userLogOpen?.login]);

  const handleUserModeration = async (
    action: 'timeout' | 'ban' | 'unban',
    channel: string,
    duration?: number
  ) => {
    if (!userLogOpen) return;

    try {
      switch (action) {
        case 'timeout':
          await window.electronAPI.twitch.timeoutUser(
            channel,
            userLogOpen.login,
            duration || 600
          );
          markUserMessagesAsDeleted(channel, userLogOpen.login);
          break;
        case 'ban':
          await window.electronAPI.twitch.banUser(
            channel,
            userLogOpen.login,
            null,
            ''
          );
          markUserMessagesAsDeleted(channel, userLogOpen.login);
          break;
        case 'unban':
          await window.electronAPI.twitch.unbanUser(
            channel,
            userLogOpen.login
          );
          break;
      }
    } catch (err) {
      console.error('[UserLog Moderation] ошибка', err);
    }
  };

  const handleDeleteMessageFromLog = async (
    channel: string,
    msgId: string
  ) => {
    if (!msgId || msgId.startsWith('local-')) {
      console.warn(
        '[DeleteMessage] Невозможно удалить сообщение без Twitch ID'
      );
      return;
    }

    try {
      await window.electronAPI.twitch.deleteMessage(channel, msgId);
      markMessageAsDeleted(channel, msgId);
    } catch (err) {
      console.error('[DeleteMessage] ошибка', err);
    }
  };

  // =====================================================
  // Пометка сообщений
  // =====================================================

  const markMessageAsDeleted = (channel: string, msgId: string) => {
    if (!msgId) {
      console.warn('[markMessageAsDeleted] Попытка удалить без msgId!');
      return;
    }
    if (msgId.startsWith('local-')) {
      console.warn(
        '[markMessageAsDeleted] Попытка удалить по локальному ID:',
        msgId
      );
      return;
    }

    const chanLower = channel.toLowerCase();

    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        return {
          ...p,
          messages: p.messages.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          ),
          buffer: p.buffer.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          )
        };
      })
    );

    setGlobalUsers((prev) => {
      const updated = { ...prev };
      for (const login of Object.keys(updated)) {
        const user = updated[login];
        const hasMessage = user.messages.some((m) => m.msgId === msgId);
        if (hasMessage) {
          updated[login] = {
            ...user,
            messages: user.messages.map((m) =>
              m.msgId === msgId ? { ...m, deleted: true } : m
            )
          };
        }
      }
      return updated;
    });
  };

  const markUserMessagesAsDeleted = (channel: string, userLogin: string) => {
    const chanLower = channel.toLowerCase();
    const loginLower = userLogin.toLowerCase();

    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        const mark = (m: ChatMessage) => {
          if (m.deleted) return m;
          if (m.userLogin.toLowerCase() === loginLower)
            return { ...m, deleted: true };
          return m;
        };
        return {
          ...p,
          messages: p.messages.map(mark),
          buffer: p.buffer.map(mark)
        };
      })
    );

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
  };

  // =====================================================
  // Очистка неактивных чаттеров
  // =====================================================

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const INACTIVE_TIMEOUT = 5 * 60 * 1000;

      setActiveChatters((prev) => {
        const updated: Record<string, Map<string, ActiveChatter>> = {};

        for (const [channel, chatters] of Object.entries(prev)) {
          const filtered = new Map<string, ActiveChatter>();
          for (const [odaterId, chatter] of chatters) {
            if (now - chatter.lastSeen < INACTIVE_TIMEOUT) {
              filtered.set(odaterId, chatter);
            }
          }
          if (filtered.size > 0) {
            updated[channel] = filtered;
          }
        }

        return updated;
      });
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  // =====================================================
  // Подтягиваем доп.инфу о пользователях (аватар/баннер)
  // =====================================================

  useEffect(() => {
    const users = Object.values(globalUsers);
    const toFetch = users.filter(
      (u) => !u.avatarUrl && !u.bannerUrl
    );
    if (toFetch.length === 0) return;

    let cancelled = false;

    const fetchInfo = async () => {
      try {
        const logins = Array.from(
          new Set(toFetch.map((u) => u.login.toLowerCase()))
        );
        const infos =
          await window.electronAPI.twitch.getUsersInfo(logins);
        if (cancelled || !infos) return;

        const infoMap = new Map(
          infos.map((i: any) => [i.login.toLowerCase(), i])
        );

        // 1) обновляем globalUsers
        setGlobalUsers((prev) => {
          const next = { ...prev };
          for (const [loginLower, user] of Object.entries(next)) {
            const info = infoMap.get(loginLower);
            if (!info) continue;
            next[loginLower] = {
              ...user,
              displayName: info.displayName || user.displayName,
              avatarUrl:
                info.avatarUrl ?? user.avatarUrl ?? null,
              bannerUrl:
                info.bannerUrl ?? user.bannerUrl ?? null
            };
          }
          return next;
        });

        // 2) обновляем activeChatters, чтобы сразу появился баннер/аватар
        setActiveChatters((prev) => {
          const updated: Record<string, Map<string, ActiveChatter>> = {};

          for (const [channel, chatters] of Object.entries(prev)) {
            const newMap = new Map<string, ActiveChatter>();

            for (const [odaterId, chatter] of chatters) {
              const info = infoMap.get(chatter.login.toLowerCase());
              if (!info) {
                newMap.set(odaterId, chatter);
                continue;
              }

              newMap.set(odaterId, {
                ...chatter,
                displayName: info.displayName || chatter.displayName,
                avatarUrl:
                  info.avatarUrl ?? chatter.avatarUrl ?? null,
                bannerUrl:
                  info.bannerUrl ?? chatter.bannerUrl ?? null
              });
            }

            updated[channel] = newMap;
          }

          return updated;
        });
      } catch (err) {
        console.warn('[App] getUsersInfo для globalUsers не удался', err);
      }
    };

    const timeoutId = setTimeout(fetchInfo, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [globalUsers]);

  // =====================================================
  // Инициализация чат-клиента
  // =====================================================

  useEffect(() => {
    let cancelled = false;

    const initChat = async () => {
      try {
        const user = await window.electronAPI.twitch.getCurrentUser();
        if (!user) {
          console.warn('[App] Нет сохранённого Twitch пользователя');
          return;
        }

        setCurrentUserLogin(user.login.toLowerCase());
        currentUserLoginRef.current = user.login.toLowerCase();

        let token = await window.electronAPI.config.get(
          'twitch.accessToken'
        );

        try {
          const ensured =
            await window.electronAPI.twitch.ensureAccessToken();
          if (ensured) token = ensured;
        } catch (e) {
          console.warn(
            '[App] не удалось обновить токен Twitch через Helix',
            e
          );
        }

        if (!token) {
          console.warn(
            '[App] Нет валидного Twitch accessToken. Нужно заново войти в аккаунт.'
          );
          return;
        }

        await twitchChatClient.connect(user.login, token);
        if (cancelled) return;

        // Обработка сообщений
        twitchChatClient.onMessage(({ channel, message, tags, self }) => {
          const chanLower = channel.toLowerCase();

          if (self && !tags.id) {
            const queue = pendingSelfMessagesRef.current[chanLower];
            if (queue && queue.length > 0) {
              const pending = queue.shift()!;
              if (pending.text === message.trim()) {
                tags.id = pending.msgId;
                console.log(
                  '[App] Привязали Helix message_id к self-сообщению',
                  {
                    text: message,
                    msgId: pending.msgId
                  }
                );
              } else {
                console.warn(
                  '[App] pending self message не совпал по тексту',
                  {
                    pending: pending.text,
                    incoming: message
                  }
                );
                queue.unshift(pending);
              }
            } else {
              console.warn(
                '[App] self-сообщение без id и без pending, оставляем без msg-id:',
                message.substring(0, 80)
              );
            }
          }

          const selfLogin = currentUserLoginRef.current;
          const mentionedSelf =
            !!selfLogin &&
            message.toLowerCase().includes('@' + selfLogin);

          const msg = buildChatMessage(
            channel,
            message,
            tags,
            self,
            mentionedSelf
          );

          const loginLower = (tags.username || '').toLowerCase();
          const odaterId = tags['user-id'] || loginLower;
const badgeVersions: Record<string, string> = tags.badges || {};
const badgeInfo: Record<string, string> = tags['badge-info'] || {};
const badgesArray = Object.keys(badgeVersions);

          setChatPanes((prev) =>
            prev.map((p) => {
              if (p.channel.toLowerCase() !== chanLower) return p;

              if (p.paused) {
                const newBuf = [...p.buffer, msg];
                if (newBuf.length > 300)
                  newBuf.splice(0, newBuf.length - 300);
                return { ...p, buffer: newBuf };
              } else {
                const newMsgs = [...p.messages, msg];
                if (newMsgs.length > 300)
                  newMsgs.splice(0, newMsgs.length - 300);
                return { ...p, messages: newMsgs };
              }
            })
          );

          setGlobalUsers((prev) => {
            const existing = prev[loginLower] || {
              login: tags.username || '',
              displayName:
                tags['display-name'] || tags.username || '',
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
                displayName:
                  tags['display-name'] || existing.displayName,
                color: tags.color || existing.color,
                badges: Object.keys(tags.badges || {}),
                messages,
                lastSeen: Date.now()
              }
            };
          });

setActiveChatters((prev) => {
  const channelChatters = new Map(prev[chanLower] || []);

  const userData = globalUsersRef.current[loginLower];

  channelChatters.set(odaterId, {
    odaterId,
    login: tags.username || '',
    displayName:
      tags['display-name'] || tags.username || '',
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

        // Удаление одного сообщения
        twitchChatClient.onMessageDeleted(
          ({ channel, targetMsgId }) => {
            markMessageAsDeleted(channel, targetMsgId);
          }
        );

        // CLEARCHAT: очистка/бан/таймаут
        twitchChatClient.onUserClearchat(
          ({ channel, targetUserId, targetLogin }) => {
            const chanLower = channel.toLowerCase();

            setChatPanes((prev) =>
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
                  if (
                    targetLogin &&
                    m.userLogin.toLowerCase() ===
                      targetLogin.toLowerCase()
                  ) {
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
                      m.channel === chanLower
                        ? { ...m, deleted: true }
                        : m
                    )
                  }
                };
              });
            }
          }
        );

        // Room state
        twitchChatClient.onRoomState(({ channel, state }) => {
          const chanLower = channel.toLowerCase();

          const lastChange = modeChangeTimestamps.current[chanLower];
          const now = Date.now();
          const ignoreIRC =
            lastChange && now - lastChange < 3000;

          const slowRaw = state.slow;
          const slowDuration = parsePositiveInt(slowRaw);
          const slowEnabled = slowDuration > 0;

          const followersRaw = state['followers-only'];
          let followersEnabled = false;
          let followersDuration = -1;

          if (
            followersRaw === false ||
            followersRaw === '-1' ||
            followersRaw === -1
          ) {
            followersEnabled = false;
            followersDuration = -1;
          } else if (followersRaw === true) {
            followersEnabled = true;
            followersDuration = 0;
          } else if (
            typeof followersRaw === 'string' ||
            typeof followersRaw === 'number'
          ) {
            const parsed = parseInt(String(followersRaw), 10);
            if (!isNaN(parsed) && parsed >= 0) {
              followersEnabled = true;
              followersDuration = parsed;
            }
          }

          setRoomModes((prev) => {
            const existing = prev[chanLower] || defaultModes;

            const base = {
              ...existing,
              slow: slowEnabled,
              slowDuration,
              emote: parseBool(state['emote-only']),
              subs: parseBool(state['subs-only']),
              unique: parseBool(state.r9k)
            };

            if (ignoreIRC) {
              return {
                ...prev,
                [chanLower]: base
              };
            }

            return {
              ...prev,
              [chanLower]: {
                ...base,
                followers: followersEnabled,
                followersDuration,
                shield: existing.shield
              }
            };
          });
        });

        setChatReady(true);
      } catch (err) {
        console.error('[App] ошибка инициализации чат-клиента', err);
      }
    };

    initChat();

    return () => {
      cancelled = true;
      twitchChatClient.disconnect().catch(() => {});
    };
  }, []);

  // =====================================================
  // Sync JOIN/PART
  // =====================================================

  useEffect(() => {
    if (!chatReady) return;

    const syncChannels = async () => {
      const desired = new Set(
        chatPanes.map((p) => p.channel.toLowerCase().trim())
      );
      const joined = joinedRef.current;

      for (const ch of desired) {
        if (!ch || joined.has(ch)) continue;
        try {
          await twitchChatClient.joinChannel(ch);
          joined.add(ch);
        } catch (err) {
          console.error('[App] не удалось join', ch, err);
        }
      }

      for (const ch of Array.from(joined)) {
        if (!desired.has(ch)) {
          try {
            await twitchChatClient.partChannel(ch);
          } catch (err) {
            console.error('[App] не удалось part', ch, err);
          }
          joined.delete(ch);
        }
      }
    };

    syncChannels();
  }, [chatPanes, chatReady]);

  // =====================================================
  // Периодическое обновление настроек чата
  // =====================================================

  useEffect(() => {
    if (!chatReady) return;

    const refreshChatSettings = async () => {
      const channels = chatPanes.map((p) => p.channel.toLowerCase());
      if (channels.length === 0) return;

      for (const chanLower of channels) {
        const lastChange = modeChangeTimestamps.current[chanLower];
        if (lastChange && Date.now() - lastChange < 5000) continue;

        try {
          const [rawSettings, rawShieldStatus] = await Promise.all([
            window.electronAPI.twitch.getChatSettings(chanLower),
            window.electronAPI.twitch
              .getShieldMode(chanLower)
              .catch(() => ({ is_active: false }))
          ]);

          const settings = rawSettings || ({} as any);
          const shieldStatus = rawShieldStatus || ({} as any);
          const shield = shieldStatus?.is_active ?? false;

          setRoomModes((prev) => {
            const existing = prev[chanLower] || defaultModes;
            const lastChangeNow =
              modeChangeTimestamps.current[chanLower];
            if (
              lastChangeNow &&
              Date.now() - lastChangeNow < 5000
            )
              return prev;

            return {
              ...prev,
              [chanLower]: {
                ...existing,
                slow: settings.slow_mode ?? false,
                slowDuration:
                  settings.slow_mode_wait_time ?? 0,
                emote: settings.emote_mode ?? false,
                followers: settings.follower_mode ?? false,
                followersDuration: settings.follower_mode
                  ? settings.follower_mode_duration ?? 0
                  : -1,
                subs: settings.subscriber_mode ?? false,
                unique: settings.unique_chat_mode ?? false,
                shield
              }
            };
          });
        } catch (err) {
          console.warn(
            '[RefreshSettings] ошибка для',
            chanLower,
            err
          );
        }
      }
    };

    const initialTimeout = setTimeout(refreshChatSettings, 5000);
    const intervalId = setInterval(refreshChatSettings, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [chatReady, chatPanes]);

  // =====================================================
  // Render
  // =====================================================

  return (
    <div style={appContainerStyle}>
      <header style={headerStyle}>
        <h1 style={titleStyle}>Twitch Mod Dashboard</h1>
        <TabButton
          active={tab === 'dashboard'}
          onClick={() => setTab('dashboard')}
        >
          Dashboard
        </TabButton>
        <TabButton
          active={tab === 'settings'}
          onClick={() => setTab('settings')}
        >
          Настройки
        </TabButton>
      </header>

      <main style={mainStyle}>
        <div
          style={{
            display: tab === 'dashboard' ? 'block' : 'none',
            height: '100%'
          }}
        >
          <DashboardView
            chatPanes={chatPanes}
            setChatPanes={setChatPanes}
            roomModes={roomModes}
            setRoomModes={setRoomModes}
            selectedChannel={selectedChannel}
            setSelectedChannel={setSelectedChannel}
            sidebarCollapsed={sidebarCollapsed}
            setSidebarCollapsed={setSidebarCollapsed}
            chatReady={chatReady}
            markModeChanged={markModeChanged}
            markMessageAsDeleted={markMessageAsDeleted}
            markUserMessagesAsDeleted={markUserMessagesAsDeleted}
            onOpenUserLog={openUserLog}
            onOpenUserProfile={openUserProfile}
            activeChatters={activeChatters}
            onSendMessage={handleSendMessage}
          />
        </div>
        <div
          style={{
            display: tab === 'settings' ? 'block' : 'none',
            height: '100%'
          }}
        >
          <SettingsView />
        </div>
      </main>

      {userLogOpen && (
        <UserMessageLog
          user={userLogOpen}
          onClose={closeUserLog}
          onModeration={handleUserModeration}
          onDeleteMessage={handleDeleteMessageFromLog}
        />
      )}

      {userProfileLogin && (
        <UserProfileModal
          login={userProfileLogin}
          onClose={closeUserProfile}
        />
      )}
    </div>
  );
};

// =====================================================
// Styles
// =====================================================

const appContainerStyle: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  color: '#fff',
  background: '#18181b'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderBottom: '1px solid #27272f',
  flexShrink: 0
};

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  margin: 0,
  marginRight: 32
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden'
};

// =====================================================
// Components
// =====================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  children
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      marginRight: 8,
      background: active ? '#9147ff' : 'transparent',
      color: '#fff',
      border: active ? 'none' : '1px solid #3f3f46',
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 13
    }}
  >
    {children}
  </button>
);

// =====================================================
// Helpers
// =====================================================

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

function buildChatMessage(
  channel: string,
  text: string,
  tags: any,
  self: boolean,
  mentionedSelf?: boolean
): ChatMessage {
  const localId = `msg-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;

  const msgId: string | undefined = tags.id || undefined;

  const badgeVersions: Record<string, string> = tags.badges || {};
  const badgeInfo: Record<string, string> = tags['badge-info'] || {};
  const badges = Object.keys(badgeVersions);

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
    timestamp: tags['tmi-sent-ts']
      ? parseInt(tags['tmi-sent-ts'], 10)
      : Date.now(),
    emotes: tags.emotes,
    deleted: false,
    mentionedSelf: mentionedSelf ?? false
  };
}

export default App;