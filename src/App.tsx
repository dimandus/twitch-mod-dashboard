import React, { useState, useEffect } from 'react';
import DashboardView from './views/DashboardView';
import SettingsView from './views/SettingsView';
import UserMessageLog from './components/UserMessageLog';
import UserProfileModal from './components/UserProfileModal';
import AutoModQueue from './components/AutoModQueue';
import NotificationContainer from './components/NotificationContainer';
import { ChatProvider, useChatContext } from './contexts/ChatContext';
import { UserProvider, useUserContext } from './contexts/UserContext';
import { ModerationProvider, useModerationContext } from './contexts/ModerationContext';
import { useChatClient } from './hooks/useChatClient';
import { useActiveChatters } from './hooks/useActiveChatters';
import { useRoomModes } from './hooks/useRoomModes';
import { twitchChatClient } from './chat/TwitchChatClient';
import { handleModCommand } from './commands/ModCommands';
import { handleError } from './utils/errorHandler';

type Tab = 'dashboard' | 'settings';

const AppContent: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const {
    chatPanes,
    setChatPanes,
    roomModes,
    setRoomModes,
    selectedChannel,
    setSelectedChannel,
    chatReady,
    setChatReady,
    currentUserLoginRef,
    joinedRef,
    markModeChanged
  } = useChatContext();

  // Функции для пометки сообщений (используют оба контекста)
  const markMessageAsDeleted = (channel: string, msgId: string) => {
    if (!msgId || msgId.startsWith('local-')) return;

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
        const mark = (m: any) => {
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

  const { globalUsers, setGlobalUsers, activeChatters } = useUserContext();

  const {
    userLogOpen,
    setUserLogOpen,
    userProfileLogin,
    autoModQueueOpen,
    setAutoModQueueOpen,
    openUserLog,
    closeUserLog,
    openUserProfile,
    closeUserProfile
  } = useModerationContext();

  const { pendingSelfMessagesRef } = useChatClient(markMessageAsDeleted);
  useActiveChatters();
  useRoomModes();

  // AutoMod подключение
  useEffect(() => {
    if (!chatReady || chatPanes.length === 0) return;

    const channelLogins = chatPanes.map((p) => p.channel.toLowerCase());
    
    window.electronAPI.automod
      .connect(channelLogins)
      .then(() => {
        console.log('[App] AutoMod подключен для каналов:', channelLogins);
      })
      .catch((err) => {
        console.warn('[App] Не удалось подключить AutoMod:', err);
      });

    return () => {
      window.electronAPI.automod.disconnect();
    };
  }, [chatReady, chatPanes]);

  // Обновляем данные в открытом логе
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
  }, [globalUsers, userLogOpen?.login, setUserLogOpen]);

  // Подтягиваем доп.инфу о пользователях
  useEffect(() => {
    const users = Object.values(globalUsers);
    const toFetch = users.filter((u) => !u.avatarUrl && !u.bannerUrl);
    if (toFetch.length === 0) return;

    let cancelled = false;

    const fetchInfo = async () => {
      try {
        const logins = Array.from(new Set(toFetch.map((u) => u.login.toLowerCase())));
        const infos = await window.electronAPI.twitch.getUsersInfo(logins);
        if (cancelled || !infos) return;

        const infoMap = new Map(infos.map((i) => [i.login.toLowerCase(), i]));

        setGlobalUsers((prev) => {
          const next = { ...prev };
          for (const [loginLower, user] of Object.entries(next)) {
            const info = infoMap.get(loginLower);
            if (!info) continue;
            next[loginLower] = {
              ...user,
              displayName: info.displayName || user.displayName,
              avatarUrl: info.avatarUrl ?? user.avatarUrl ?? null,
              bannerUrl: info.bannerUrl ?? user.bannerUrl ?? null
            };
          }
          return next;
        });
      } catch (err) {
        handleError(err, 'FetchUsersInfo');
      }
    };

    const timeoutId = setTimeout(fetchInfo, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [globalUsers, setGlobalUsers]);

  // Отслеживание изменений логина
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let lastCheckedLogin: string | null = null;
    let isInitializing = false;

    const checkLoginAndInitChat = async () => {
      if (isInitializing) return;

      try {
        const user = await window.electronAPI.twitch.getCurrentUser();
        const currentLogin = user?.login?.toLowerCase() || null;

        if (currentLogin !== lastCheckedLogin) {
          lastCheckedLogin = currentLogin;

          if (currentLogin && currentUserLoginRef.current !== currentLogin) {
            isInitializing = true;
            console.log('[App] Обнаружен новый логин, переинициализируем чат...');
            
            if (twitchChatClient.isConnected()) {
              await twitchChatClient.disconnect();
            }

            setChatReady(false);
            joinedRef.current.clear();

            let token = await window.electronAPI.config.get('twitch.accessToken');
            
            try {
              const ensured = await window.electronAPI.twitch.ensureAccessToken();
              if (ensured) token = ensured;
            } catch (e) {
              console.warn('[App] не удалось обновить токен Twitch через Helix', e);
            }

            if (token && user) {
              await twitchChatClient.connect(user.login, token);
              currentUserLoginRef.current = currentLogin;
              setChatReady(true);
              console.log('[App] Чат успешно переинициализирован после логина');
            }
            
            isInitializing = false;
          } else if (!currentLogin && currentUserLoginRef.current) {
            console.log('[App] Пользователь вышел, отключаемся от чата...');
            await twitchChatClient.disconnect();
            setChatReady(false);
            currentUserLoginRef.current = null;
            joinedRef.current.clear();
          }
        }
      } catch (err) {
        handleError(err, 'LoginCheck');
        isInitializing = false;
      }
    };

    checkLoginAndInitChat();
    intervalId = setInterval(checkLoginAndInitChat, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setChatReady, currentUserLoginRef, joinedRef]);

  // Sync JOIN/PART
  useEffect(() => {
    if (!chatReady) return;

    const syncChannels = async () => {
      const desired = new Set(chatPanes.map((p) => p.channel.toLowerCase().trim()));
      const joined = joinedRef.current;

      for (const ch of desired) {
        if (!ch || joined.has(ch)) continue;
        try {
          await twitchChatClient.joinChannel(ch);
          joined.add(ch);
        } catch (err) {
          handleError(err, `JoinChannel:${ch}`);
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
  }, [chatPanes, chatReady, joinedRef]);

  const handleSendMessage = async (channel: string, text: string) => {
    const chanLower = channel.toLowerCase().trim();
    const trimmed = text.trim();
    if (!chanLower || !trimmed) return;

    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');

      try {
        const result = await handleModCommand(
          chanLower,
          cmd,
          args,
          window.electronAPI.twitch
        );

        if (result.handled && result.systemMessage) {
          const systemMsg = {
            id: `sys-${Date.now()}-${Math.random()}`,
            text: result.systemMessage,
            userLogin: '',
            displayName: '',
            color: '',
            badges: [],
            self: false,
            timestamp: Date.now(),
            isSystem: true
          };
          setChatPanes((prev) =>
            prev.map((p) => {
              if (p.channel.toLowerCase() !== chanLower) return p;
              return {
                ...p,
                messages: [...p.messages, systemMsg],
                buffer: p.paused ? [...p.buffer, systemMsg] : p.buffer
              };
            })
          );
          return;
        }

        if (!result.handled) {
          await twitchChatClient.sendMessage(chanLower, trimmed);
        }
      } catch (err) {
        console.error('[App] Ошибка выполнения команды:', trimmed, err);
      }
      return;
    }

    try {
      const result = await window.electronAPI.twitch.sendChatMessage(chanLower, trimmed);
      if (!result || !result.messageId) {
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
            duration || 600,
            ''
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
          await window.electronAPI.twitch.unbanUser(channel, userLogOpen.login);
          break;
      }
    } catch (err) {
      handleError(err, 'UserModeration');
    }
  };

  const handleDeleteMessageFromLog = async (channel: string, msgId: string) => {
    if (!msgId || msgId.startsWith('local-')) {
      console.warn('[DeleteMessage] Невозможно удалить сообщение без Twitch ID');
      return;
    }

    try {
      await window.electronAPI.twitch.deleteMessage(channel, msgId);
      markMessageAsDeleted(channel, msgId);
    } catch (err) {
      handleError(err, 'DeleteMessage');
    }
  };

  const handleOpenUserLog = (userLogin: string) => {
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
      openUserLog(userLogin);
    }
  };

  return (
    <div style={appContainerStyle}>
      <NotificationContainer />
      <header style={headerStyle}>
        <h1 style={titleStyle}>Twitch Mod Dashboard</h1>
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Dashboard
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          Настройки
        </TabButton>
        <button
          onClick={() => setAutoModQueueOpen(true)}
          style={automodButtonStyle}
          title="AutoMod Очередь"
        >
          🛡️ AutoMod
        </button>
      </header>

      <main style={mainStyle}>
        <div style={{ display: tab === 'dashboard' ? 'block' : 'none', height: '100%' }}>
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
            onOpenUserLog={handleOpenUserLog}
            onOpenUserProfile={openUserProfile}
            activeChatters={activeChatters}
            onSendMessage={handleSendMessage}
          />
        </div>
        <div style={{ display: tab === 'settings' ? 'block' : 'none', height: '100%' }}>
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
        <UserProfileModal login={userProfileLogin} onClose={closeUserProfile} />
      )}

      {autoModQueueOpen && <AutoModQueue onClose={() => setAutoModQueueOpen(false)} />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ChatProvider>
      <UserProvider>
        <ModerationProvider>
          <AppContent />
        </ModerationProvider>
      </UserProvider>
    </ChatProvider>
  );
};

// Styles
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

const automodButtonStyle: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '6px 12px',
  background: '#9147ff',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold'
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children }) => (
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

export default App;
