import React, { useState, useEffect } from 'react';
import DashboardView from './views/DashboardView';
import SettingsView from './views/SettingsView';
import UserMessageLog from './components/UserMessageLog';
import UserProfileModal from './components/UserProfileModal';
import AutoModQueue from './components/AutoModQueue';
import NotificationContainer from './components/NotificationContainer';
import { useChatStore } from './stores/chatStore';
import { useUserStore } from './stores/userStore';
import { useModerationStore } from './stores/moderationStore';
import { useThemeStore } from './stores/themeStore';
import { useApplyTheme } from './hooks/useApplyTheme';
import { useChatClient } from './hooks/useChatClient';
import { useActiveChatters } from './hooks/useActiveChatters';
import { useRoomModes } from './hooks/useRoomModes';
import { useSendMessage } from './hooks/useSendMessage';
import { useModeration } from './hooks/useModeration';
import { useUserLog } from './hooks/useUserLog';
import { useLoginSync } from './hooks/useLoginSync';
import { useChannelSync } from './hooks/useChannelSync';
import { useUserInfoFetch } from './hooks/useUserInfoFetch';
import { useAutoModConnection } from './hooks/useAutoModConnection';

type Tab = 'dashboard' | 'settings';

const App: React.FC = () => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const panes = useChatStore(state => state.panes);
  const setPanes = useChatStore(state => state.setPanes);
  const roomModes = useChatStore(state => state.roomModes);
  const setRoomModes = useChatStore(state => state.setRoomModes);
  const selectedChannel = useChatStore(state => state.selectedChannel);
  const setSelectedChannel = useChatStore(state => state.setSelectedChannel);
  const chatReady = useChatStore(state => state.chatReady);
  const setChatReady = useChatStore(state => state.setChatReady);
  const markModeChanged = useChatStore(state => state.markModeChanged);

  const activeChatters = useUserStore(state => state.activeChatters);

  const userLogOpen = useModerationStore(state => state.userLogOpen);
  const userProfileLogin = useModerationStore(state => state.userProfileLogin);
  const autoModQueueOpen = useModerationStore(state => state.autoModQueueOpen);
  const setAutoModQueueOpen = useModerationStore(state => state.setAutoModQueueOpen);
  const openUserProfile = useModerationStore(state => state.openUserProfile);
  const closeUserProfile = useModerationStore(state => state.closeUserProfile);
  const closeUserLog = useModerationStore(state => state.closeUserLog);
  
  const { theme, loadTheme } = useThemeStore();
  
  // Применяем тему через CSS переменные
  useApplyTheme();
  
  // Загрузка темы при старте
  useEffect(() => {
    loadTheme();
  }, [loadTheme]);

  const { markMessageAsDeleted, markUserMessagesAsDeleted, performUserModeration, deleteMessage } = useModeration();
  const { pendingSelfMessagesRef, currentUserLoginRef } = useChatClient(markMessageAsDeleted);
  const { openUserLog } = useUserLog();
  const joinedRef = useLoginSync(currentUserLoginRef);
  
  useActiveChatters();
  useRoomModes();
  useAutoModConnection(chatReady, panes);
  useUserInfoFetch();
  useChannelSync(panes, chatReady, joinedRef);

  const sendMessage = useSendMessage();

  const handleUserModeration = async (
    action: 'timeout' | 'ban' | 'unban',
    channel: string,
    duration?: number
  ) => {
    if (!userLogOpen) return;
    await performUserModeration(action, channel, userLogOpen.login, duration);
  };

  return (
    <div style={getAppContainerStyle(theme.colors.background)}>
      <NotificationContainer />
      <header style={getHeaderStyle(theme.colors.border)}>
        <h1 style={titleStyle}>Twitch Mod Dashboard</h1>
        <TabButton active={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          Dashboard
        </TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>
          Настройки
        </TabButton>
        <button
          onClick={() => setAutoModQueueOpen(true)}
          style={getAutomodButtonStyle(theme.colors.primary)}
          title="AutoMod Очередь"
        >
          🛡️ AutoMod
        </button>
      </header>

      <main style={mainStyle}>
        <div style={{ display: tab === 'dashboard' ? 'block' : 'none', height: '100%' }}>
          <DashboardView
            chatPanes={panes}
            setChatPanes={setPanes}
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
            onSendMessage={sendMessage}
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
          onDeleteMessage={deleteMessage}
        />
      )}

      {userProfileLogin && (
        <UserProfileModal login={userProfileLogin} onClose={closeUserProfile} />
      )}

      {autoModQueueOpen && <AutoModQueue onClose={() => setAutoModQueueOpen(false)} />}
    </div>
  );
};

const getAppContainerStyle = (bgColor: string): React.CSSProperties => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--color-text)',
  background: 'var(--color-background)'
});

const getHeaderStyle = (borderColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  padding: '8px 16px',
  borderBottom: '1px solid var(--color-border)',
  flexShrink: 0
});

const titleStyle: React.CSSProperties = {
  fontSize: 18,
  margin: 0,
  marginRight: 32
};

const mainStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'hidden'
};

const getAutomodButtonStyle = (primaryColor: string): React.CSSProperties => ({
  marginLeft: 'auto',
  padding: '6px 12px',
  background: 'var(--color-primary)',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold'
});

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = React.memo(({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      marginRight: 8,
      background: active ? 'var(--color-primary)' : 'transparent',
      color: active ? '#fff' : 'var(--color-text)',
      border: active ? 'none' : '1px solid var(--color-border)',
      borderRadius: 4,
      cursor: 'pointer',
      fontSize: 13
    }}
  >
    {children}
  </button>
));

export default App;
