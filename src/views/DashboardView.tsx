import React from 'react';
import ChatArea, { ChatPane, ModerationAction } from './ChatArea';
import Sidebar from './Sidebar';
import type { ActiveChatter } from '../App';
import { useChatPanes } from '../hooks/useChatPanes';
import { useChatModes } from '../hooks/useChatModes';
import { useUIScale } from '../hooks/useUIScale';
import { useChatStore } from '../stores/chatStore';

interface DashboardViewProps {
  chatPanes: ChatPane[];
  setChatPanes: React.Dispatch<React.SetStateAction<ChatPane[]>>;
  roomModes: Record<string, any>;
  setRoomModes: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<React.SetStateAction<string | null>>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  chatReady: boolean;
  markModeChanged: (channel: string) => void;
  markMessageAsDeleted: (channel: string, msgId: string) => void;
  markUserMessagesAsDeleted: (channel: string, userLogin: string) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;
  activeChatters: Record<string, Map<string, ActiveChatter>>;
  onSendMessage: (channel: string, text: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  chatPanes,
  setChatPanes,
  roomModes,
  setRoomModes,
  selectedChannel,
  setSelectedChannel,
  sidebarCollapsed,
  setSidebarCollapsed,
  chatReady,
  markModeChanged,
  markMessageAsDeleted,
  markUserMessagesAsDeleted,
  onOpenUserLog,
  onOpenUserProfile,
  activeChatters,
  onSendMessage
}) => {
  const { fontScale, globalScale, handleFontScaleChange, handleGlobalScaleChange } = useUIScale();
  
  const { addChatPane, removeChatPane, clearChatPane, togglePausePane, reorderChatPanes } = useChatPanes({
    chatPanes,
    setChatPanes,
    setRoomModes
  });
  
  const { toggleMode } = useChatModes({
    roomModes,
    setRoomModes,
    markModeChanged
  });

  const toggleSidebar = () =>
    setSidebarCollapsed((v) => !v);



  const handleModerationAction = async (action: ModerationAction) => {
    const channel = action.channel.toLowerCase().trim();

    try {
      switch (action.type) {
        case 'deleteMessage':
          if (!action.msgId) return;
          await window.electronAPI.twitch.deleteMessage(
            channel,
            action.msgId
          );
          markMessageAsDeleted(channel, action.msgId);
          break;

        case 'ban':
          if (!action.login) return;
          await window.electronAPI.twitch.banUser(
            channel,
            action.login,
            null,
            action.reason
          );
          markUserMessagesAsDeleted(channel, action.login);
          break;

        case 'timeout':
          if (!action.login) return;
          await window.electronAPI.twitch.timeoutUser(
            channel,
            action.login,
            action.durationSeconds ?? 600,
            action.reason
          );
          markUserMessagesAsDeleted(channel, action.login);
          break;

        case 'unban':
          if (!action.login) return;
          await window.electronAPI.twitch.unbanUser(
            channel,
            action.login
          );
          break;

        case 'clearChat':
          await window.electronAPI.twitch.clearChat(channel);
          setChatPanes((prev) =>
            prev.map((p) => {
              if (p.channel.toLowerCase() !== channel) return p;
              return {
                ...p,
                messages: p.messages.map((m) => ({
                  ...m,
                  cleared: true
                })),
                buffer: p.buffer.map((m) => ({
                  ...m,
                  cleared: true
                }))
              };
            })
          );
          break;
      }
    } catch (err) {
      console.error('[Moderation] ошибка', action, err);
    }
  };



  const handleChannelRemovedGlobally = (channelLogin: string) => {
    const lower = channelLogin.toLowerCase();
    setChatPanes((prev) =>
      prev.filter((p) => p.channel.toLowerCase() !== lower)
    );
    setSelectedChannel((prev) =>
      prev?.toLowerCase() === lower ? null : prev
    );
    setRoomModes((prev) => {
      const next = { ...prev };
      delete next[lower];
      return next;
    });
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        background: 'var(--color-chatBackground)',
        color: 'var(--color-text)'
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
		selectedChannel={selectedChannel}
        onToggleCollapse={toggleSidebar}
        onChannelSelected={setSelectedChannel}
        onRemoveChannelFromApp={handleChannelRemovedGlobally}
        onOpenChatForChannel={addChatPane}
        onOpenUserLog={onOpenUserLog}
        onOpenUserProfile={onOpenUserProfile}
        activeChatters={activeChatters}
        fontScale={fontScale}
        globalScale={globalScale}
      />

      <ChatArea
        selectedChannel={selectedChannel}
        chatPanes={chatPanes}
        onAddChat={addChatPane}
        onRemoveChat={removeChatPane}
        onClearChat={clearChatPane}
        onTogglePause={togglePausePane}
        onReorderChats={reorderChatPanes}
        onSendMessage={onSendMessage}
        onModerationAction={handleModerationAction}
        roomModes={roomModes}
        onModeToggle={toggleMode}
        onOpenUserLog={onOpenUserLog}
        onOpenUserProfile={onOpenUserProfile}
        fontScale={fontScale}
        globalScale={globalScale}
        onFontScaleChange={handleFontScaleChange}
        onGlobalScaleChange={handleGlobalScaleChange}
		onSelectChannel={(ch) => setSelectedChannel(ch)}
      />
    </div>
  );
};

export default DashboardView;