import React, { useState, useEffect } from 'react';
import ChatArea, {
  ChatPane,
  ModerationAction
} from './ChatArea';
import Sidebar from './Sidebar';
import type { ActiveChatter } from '../App';

type ChatModeKey =
  | 'slow'
  | 'emote'
  | 'followers'
  | 'subs'
  | 'unique'
  | 'shield';

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

// Значения по умолчанию для границ масштабирования
const DEFAULT_FONT_MIN = 0.7;
const DEFAULT_FONT_MAX = 1.5;
const DEFAULT_GLOBAL_MIN = 0.7;
const DEFAULT_GLOBAL_MAX = 1.5;

interface DashboardViewProps {
  chatPanes: ChatPane[];
  setChatPanes: React.Dispatch<React.SetStateAction<ChatPane[]>>;
  roomModes: Record<string, ChatModes>;
  setRoomModes: React.Dispatch<
    React.SetStateAction<Record<string, ChatModes>>
  >;
  selectedChannel: string | null;
  setSelectedChannel: React.Dispatch<
    React.SetStateAction<string | null>
  >;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  chatReady: boolean;
  markModeChanged: (channel: string) => void;
  markMessageAsDeleted: (channel: string, msgId: string) => void;
  markUserMessagesAsDeleted: (
    channel: string,
    userLogin: string
  ) => void;
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
  // Текущие множители шрифта / глобального UI
  const [fontScale, setFontScale] = useState(1);
  const [globalScale, setGlobalScale] = useState(1);

  // Границы из настроек
  const [fontScaleMin, setFontScaleMin] = useState(DEFAULT_FONT_MIN);
  const [fontScaleMax, setFontScaleMax] = useState(DEFAULT_FONT_MAX);
  const [globalScaleMin, setGlobalScaleMin] = useState(DEFAULT_GLOBAL_MIN);
  const [globalScaleMax, setGlobalScaleMax] = useState(DEFAULT_GLOBAL_MAX);

  // Хелпер клэмпа с учётом границ
  const clamp = (value: number, min: number, max: number) => {
    if (Number.isNaN(value)) return min;
    return Math.min(max, Math.max(min, value));
  };

  const handleFontScaleChange = (next: number) => {
    setFontScale((prev) => clamp(next, fontScaleMin, fontScaleMax));
  };

  const handleGlobalScaleChange = (next: number) => {
    setGlobalScale((prev) => clamp(next, globalScaleMin, globalScaleMax));
  };

  // Загрузка UI-настроек при старте
  useEffect(() => {
    (async () => {
      try {
        const [
          storedFont,
          storedGlobal,
          fsMinStored,
          fsMaxStored,
          gsMinStored,
          gsMaxStored
        ] = await Promise.all([
          window.electronAPI.config.get('ui.chat.fontScale'),
          window.electronAPI.config.get('ui.chat.globalScale'),
          window.electronAPI.config.get('ui.chat.fontScaleMin'),
          window.electronAPI.config.get('ui.chat.fontScaleMax'),
          window.electronAPI.config.get('ui.chat.globalScaleMin'),
          window.electronAPI.config.get('ui.chat.globalScaleMax')
        ]);

        // 1) границы
        const fsMin =
          typeof fsMinStored === 'number' ? fsMinStored : DEFAULT_FONT_MIN;
        const fsMax =
          typeof fsMaxStored === 'number' ? fsMaxStored : DEFAULT_FONT_MAX;
        const gsMin =
          typeof gsMinStored === 'number' ? gsMinStored : DEFAULT_GLOBAL_MIN;
        const gsMax =
          typeof gsMaxStored === 'number' ? gsMaxStored : DEFAULT_GLOBAL_MAX;

        setFontScaleMin(fsMin);
        setFontScaleMax(fsMax);
        setGlobalScaleMin(gsMin);
        setGlobalScaleMax(gsMax);

        // 2) сами значения скейла, с учётом свежих границ
        if (typeof storedFont === 'number') {
          setFontScale(clamp(storedFont, fsMin, fsMax));
        }
        if (typeof storedGlobal === 'number') {
          setGlobalScale(clamp(storedGlobal, gsMin, gsMax));
        }
      } catch (err) {
        console.warn('[DashboardView] не удалось загрузить UI-настройки', err);
      }
    })();
  }, []);

  // Сохранение текущих значений скейла при изменении
  useEffect(() => {
    (async () => {
      try {
        await window.electronAPI.config.set('ui.chat.fontScale', fontScale);
        await window.electronAPI.config.set('ui.chat.globalScale', globalScale);
      } catch (err) {
        console.warn('[DashboardView] не удалось сохранить UI-scale', err);
      }
    })();
  }, [fontScale, globalScale]);

  const toggleSidebar = () =>
    setSidebarCollapsed((v) => !v);

  const handleAddChatPane = (channelLogin: string) => {
    const login = channelLogin.toLowerCase().trim();
    if (!login) return;

    setChatPanes((prev) => {
      if (prev.some((p) => p.channel.toLowerCase() === login))
        return prev;
      return [
        ...prev,
        {
          id: login,
          channel: login,
          paused: false,
          messages: [],
          buffer: []
        }
      ];
    });

    loadChatSettings(login);
  };

  const loadChatSettings = async (channel: string) => {
    const chanLower = channel.toLowerCase();

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

      const modes: ChatModes = {
        slow: settings.slow_mode ?? false,
        slowDuration: settings.slow_mode_wait_time ?? 0,
        emote: settings.emote_mode ?? false,
        followers: settings.follower_mode ?? false,
        followersDuration: settings.follower_mode
          ? settings.follower_mode_duration ?? 0
          : -1,
        subs: settings.subscriber_mode ?? false,
        unique: settings.unique_chat_mode ?? false,
        shield
      };

      setRoomModes((prev) => ({ ...prev, [chanLower]: modes }));
    } catch (err) {
      console.warn(
        '[Dashboard] не удалось загрузить настройки чата',
        chanLower,
        err
      );
    }
  };

  const handleRemoveChatPane = (id: string) => {
    setChatPanes((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearChatPane = (id: string) => {
    setChatPanes((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, messages: [], buffer: [] } : p
      )
    );
  };

  const handleTogglePausePane = (id: string) => {
    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.paused) {
          const merged = [...p.messages, ...p.buffer];
          if (merged.length > 300)
            merged.splice(0, merged.length - 300);
          return {
            ...p,
            paused: false,
            messages: merged,
            buffer: []
          };
        }
        return { ...p, paused: true };
      })
    );
  };

  const handleReorderChatPanes = (next: ChatPane[]) => {
    setChatPanes(next);
  };

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

  const handleModeToggle = async (
    channel: string,
    mode: ChatModeKey,
    value?: number
  ) => {
    const chanLower = channel.toLowerCase().trim();
    if (!chanLower) return;

    const current = roomModes[chanLower] || defaultModes;

    markModeChanged(chanLower);

    try {
      switch (mode) {
        case 'slow': {
          const seconds = value ?? 0;
          const enabled = seconds > 0;
          await window.electronAPI.twitch.slowMode(
            chanLower,
            enabled,
            seconds
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: {
              ...current,
              slow: enabled,
              slowDuration: seconds
            }
          }));
          break;
        }

        case 'followers': {
          const minutes = value ?? -1;
          const enabled = minutes >= 0;

          if (enabled) {
            await window.electronAPI.twitch.followersOnly(
              chanLower,
              true,
              minutes
            );
          } else {
            await window.electronAPI.twitch.followersOnly(
              chanLower,
              false,
              0
            );
          }

          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: {
              ...current,
              followers: enabled,
              followersDuration: enabled ? minutes : -1
            }
          }));
          break;
        }

        case 'emote': {
          const enabled = !current.emote;
          await window.electronAPI.twitch.emoteOnly(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, emote: enabled }
          }));
          break;
        }

        case 'subs': {
          const enabled = !current.subs;
          await window.electronAPI.twitch.subscribersOnly(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, subs: enabled }
          }));
          break;
        }

        case 'unique': {
          const enabled = !current.unique;
          await window.electronAPI.twitch.updateChatSettings(
            chanLower,
            { unique_chat_mode: enabled }
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, unique: enabled }
          }));
          break;
        }

        case 'shield': {
          const enabled = !current.shield;
          await window.electronAPI.twitch.setShieldMode(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, shield: enabled }
          }));
          break;
        }
      }
    } catch (err) {
      console.error('[ChatMode] ошибка', mode, value, err);
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
        background: '#0b0b10',
        color: '#e5e7eb'
      }}
    >
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        onChannelSelected={setSelectedChannel}
        onRemoveChannelFromApp={handleChannelRemovedGlobally}
        onOpenChatForChannel={handleAddChatPane}
        onOpenUserLog={onOpenUserLog}
        onOpenUserProfile={onOpenUserProfile}
        activeChatters={activeChatters}
        fontScale={fontScale}
        globalScale={globalScale}
      />

      <ChatArea
        selectedChannel={selectedChannel}
        chatPanes={chatPanes}
        onAddChat={handleAddChatPane}
        onRemoveChat={handleRemoveChatPane}
        onClearChat={handleClearChatPane}
        onTogglePause={handleTogglePausePane}
        onReorderChats={handleReorderChatPanes}
        onSendMessage={onSendMessage}
        onModerationAction={handleModerationAction}
        roomModes={roomModes}
        onModeToggle={handleModeToggle}
        onOpenUserLog={onOpenUserLog}
        onOpenUserProfile={onOpenUserProfile}
        fontScale={fontScale}
        globalScale={globalScale}
        onFontScaleChange={handleFontScaleChange}
        onGlobalScaleChange={handleGlobalScaleChange}
      />
    </div>
  );
};

export default DashboardView;