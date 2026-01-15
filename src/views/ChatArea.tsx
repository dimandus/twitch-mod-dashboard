import React, { useEffect, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { TWITCH_COMMANDS, SLOW_MODE_OPTIONS, FOLLOWERS_MODE_OPTIONS } from '../constants/chatConstants';
import { clampWidth, clampHeight, clampAutoScale, formatFollowersDuration, buildEmoteUrls } from '../utils/chatHelpers';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatModesBar } from '../components/chat/ChatModesBar';
import { EmotePicker, Emote, EmoteSource } from '../components/chat/EmotePicker';
import { MentionAutocomplete, CommandAutocomplete } from '../components/chat/Autocomplete';
import { ChatContextMenu } from '../components/chat/ChatContextMenu';
import { Badges } from '../components/chat/Badges';
import { MessageWithEmotes } from '../components/chat/MessageWithEmotes';
import { logger } from '../utils/logger';
import { useChatInput } from '../hooks/useChatInput';
import { useChatAutocomplete } from '../hooks/useChatAutocomplete';
import { useChatEmotes } from '../hooks/useChatEmotes';

// =====================================================
// Типы
// =====================================================

export interface ChatMessage {
  id: string;
  msgId?: string;
  userId?: string;
  text: string;
  userLogin: string;
  displayName: string;
  color?: string;
  badges: string[];
  badgeInfo?: Record<string, string>;
  badgeVersions?: Record<string, string>;
  self: boolean;
  timestamp: number;
  emotes?: Record<string, string[]>;
  mentionedSelf?: boolean;
  deleted?: boolean;
  isSystem?: boolean;
  canDelete?: boolean;
  cleared?: boolean;
  isRaider?: boolean;
  isFirstMessage?: boolean;
  sourceRoomId?: string;
  sourceChannelName?: string;
}

export interface ChatPane {
  id: string;
  channel: string;
  paused: boolean;
  messages: ChatMessage[];
  buffer: ChatMessage[];
}

export type ModerationAction =
  | { type: 'deleteMessage'; channel: string; login: string; msgId: string }
  | {
      type: 'timeout';
      channel: string;
      login: string;
      durationSeconds: number;
      reason?: string;
    }
  | { type: 'ban'; channel: string; login: string; reason?: string }
  | { type: 'unban'; channel: string; login: string }
  | { type: 'clearChat'; channel: string };

type ChatModeKey = 'slow' | 'emote' | 'followers' | 'subs' | 'unique' | 'shield';

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



interface ChatAreaProps {
  selectedChannel: string | null;
  chatPanes: ChatPane[];
  onAddChat: (channel: string) => void;
  onRemoveChat: (id: string) => void;
  onClearChat: (id: string) => void;
  onTogglePause: (id: string) => void;
  onReorderChats: (next: ChatPane[]) => void;
  onSendMessage: (channel: string, text: string) => void;
  onModerationAction: (action: ModerationAction) => void;
  roomModes: Record<string, ChatModes>;
  onModeToggle: (channel: string, mode: ChatModeKey, value?: number) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;

  fontScale: number;
  globalScale: number;
  onFontScaleChange: (next: number) => void;
  onGlobalScaleChange: (next: number) => void;
  onSelectChannel: (channel: string) => void;
}



// =====================================================
// Компонент
// =====================================================

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedChannel,
  chatPanes,
  onAddChat,
  onRemoveChat,
  onClearChat,
  onTogglePause,
  onReorderChats,
  onSendMessage,
  onModerationAction,
  roomModes,
  onModeToggle,
  onOpenUserLog,
  onOpenUserProfile,
  fontScale,
  globalScale,
  onFontScaleChange,
  onGlobalScaleChange,
  onSelectChannel
}) => {
  // Хуки для управления состоянием
  const chatInput = useChatInput();
  const chatAutocomplete = useChatAutocomplete(chatPanes);
  const chatEmotes = useChatEmotes(chatPanes);

  // Оставшиеся локальные состояния
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [rows, setRows] = useState<1 | 2>(1);

  const [paneWidth, setPaneWidth] = useState(320);
  const [paneHeight, setPaneHeight] = useState(260);

  const [hoveredPaneId, setHoveredPaneId] = useState<string | null>(null);
  const [hoverPauseKeyPressed, setHoverPauseKeyPressed] = useState(false);
  const [hoverPauseKey, setHoverPauseKey] = useState('Alt');

  const scrollContainersRef = useRef<Record<string, HTMLDivElement | null>>({});

  const [msgMenu, setMsgMenu] = useState<{
    x: number;
    y: number;
    channel: string;
    message: ChatMessage;
  } | null>(null);

  const [openDropdown, setOpenDropdown] = useState<{
    channel: string;
    type: 'slow' | 'followers';
  } | null>(null);

  const [badgeSets, setBadgeSets] = useState<Record<string, Record<string, any>>>({});

  const [autoScale, setAutoScale] = useState(1);

  // Загрузка клавиши для паузы скролла
  useEffect(() => {
    (async () => {
      try {
        const key = await window.electronAPI.config.get('ui.chat.hoverPauseKey');
        if (typeof key === 'string') setHoverPauseKey(key);
      } catch (err) {
        logger.warn('[ChatArea] не удалось загрузить клавишу паузы', err);
      }
    })();
  }, []);

  // Отслеживание нажатия клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === hoverPauseKey) {
        setHoverPauseKeyPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === hoverPauseKey) {
        setHoverPauseKeyPressed(false);
        setHoveredPaneId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hoverPauseKey]);

  // Загрузка глобальных бейджей через Helix
  useEffect(() => {
    (async () => {
      try {
        const json = await window.electronAPI.twitch.getGlobalBadges();
        const sets: Record<string, Record<string, any>> = {};
        for (const set of json.data || []) {
          const setId = set.set_id;
          const vers: Record<string, any> = {};
          for (const v of set.versions || []) {
            vers[v.id] = v;
          }
          sets[setId] = vers;
        }
        setBadgeSets(sets);
      } catch (err) {
        console.warn('[Badges] не удалось загрузить глобальные бейджи', err);
      }
    })();
  }, []);

  // Загрузка настроек раскладки (строки / размер панелей)
  useEffect(() => {
    (async () => {
      try {
        const [storedRows, storedWidth, storedHeight] = await Promise.all([
          window.electronAPI.config.get('ui.chat.rows'),
          window.electronAPI.config.get('ui.chat.paneWidth'),
          window.electronAPI.config.get('ui.chat.paneHeight')
        ]);

        if (storedRows === 1 || storedRows === 2) {
          setRows(storedRows);
        }

        if (typeof storedWidth === 'number') {
          setPaneWidth(clampWidth(storedWidth));
        }

        if (typeof storedHeight === 'number') {
          setPaneHeight(clampHeight(storedHeight));
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить настройки раскладки', err);
      }
    })();
  }, []);

  // Сохранение раскладки при изменении
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          window.electronAPI.config.set('ui.chat.rows', rows),
          window.electronAPI.config.set('ui.chat.paneWidth', paneWidth),
          window.electronAPI.config.set('ui.chat.paneHeight', paneHeight)
        ]);
      } catch (err) {
        console.warn('[ChatArea] не удалось сохранить настройки раскладки', err);
      }
    })();
  }, [rows, paneWidth, paneHeight]);

    // Клик вне — закрывать меню/дропдауны
  useEffect(() => {
    const handleClick = () => {
      setOpenDropdown(null);
      setMsgMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Авто‑масштаб от размера окна
  useEffect(() => {
    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;

    const updateAutoScale = () => {
      const wScale = window.innerWidth / BASE_WIDTH;
      const hScale = window.innerHeight / BASE_HEIGHT;
      const next = Math.min(wScale, hScale);
      const clamped = clampAutoScale(next);
      setAutoScale(clamped);
    };

    updateAutoScale();
    window.addEventListener('resize', updateAutoScale);
    return () => window.removeEventListener('resize', updateAutoScale);
  }, []);

  const changePaneWidth = (delta: number) =>
    setPaneWidth((w) => clampWidth(w + delta));
  const changePaneHeight = (delta: number) =>
    setPaneHeight((h) => clampHeight(h + delta));

  const changeFontScale = (delta: number) =>
    onFontScaleChange(fontScale + delta);

  const changeGlobalScale = (delta: number) =>
    onGlobalScaleChange(globalScale + delta);

  // Эмоты: глобальные и «мои»
  useEffect(() => {
    (async () => {
      try {
        // Глобальные эмоты
        const rawGlobal = await window.electronAPI.twitch.getGlobalEmotes?.();
        if (Array.isArray(rawGlobal)) {
          setGlobalEmotes(
            rawGlobal.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'global',
                ownerName: e.owner_name
              } as Emote;
            })
          );
        }

        // Эмоты пользователя (через /chat/emotes/user)
        const rawUser = await window.electronAPI.twitch.getUserEmotes?.();
        if (Array.isArray(rawUser)) {
          setUserEmotes(
            rawUser.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'user',
                ownerName: e.owner_name
              } as Emote;
            })
          );
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить эмоты (global/user)', err);
      }
    })();
  }, []);

  // Эмоты каналов
  useEffect(() => {
    (async () => {
      try {
        const current = channelEmotes;

        for (const pane of chatPanes) {
          const login = pane.channel.toLowerCase().trim();
          if (!login) continue;
          if (current[login]) continue;

          const raw = await window.electronAPI.twitch.getChannelEmotes?.(login);
          if (!Array.isArray(raw)) continue;

          const emotes: Emote[] = raw.map((e: any) => {
            const urls = buildEmoteUrls(e.id);
            return {
              id: e.id,
              name: e.name,
              url1x: urls.url1x,
              url2x: urls.url2x,
              url4x: urls.url4x,
              source: 'channel',
              ownerName: e.owner_name
            } as Emote;
          });

          setChannelEmotes((prev) => ({
            ...prev,
            [login]: emotes
          }));
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить эмоты каналов', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPanes]);

  // Drag & Drop
  const handleContainerDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    const types = e.dataTransfer.types;
    if (!Array.from(types).includes('text/channel-login')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropActive(true);
  };
  const handleContainerDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropActive(false);
  };
  const handleContainerDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!Array.from(e.dataTransfer.types).includes('text/channel-login')) return;
    e.preventDefault();
    setIsDropActive(false);
    const channel = e.dataTransfer.getData('text/channel-login');
    if (channel) onAddChat(channel);
  };
  const handlePaneDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    paneId: string
  ) => {
    setDraggingId(paneId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handlePaneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handlePaneDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = chatPanes.findIndex((p) => p.id === draggingId);
    const toIndex = chatPanes.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...chatPanes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderChats(next);
    setDraggingId(null);
  };
  const handlePaneDragEnd = () => setDraggingId(null);

  // Input
    const handleInputChange = (id: string, value: string) => {
    chatInput.handleInputChange(id, value);
    chatAutocomplete.updateMentionSuggestions(id, value);
    chatAutocomplete.updateCommandSuggestions(id, value);
  };

  const handleSend = (pane: ChatPane) => {
    const text = chatInput.getInputValue(pane.id).trim();
    if (!pane.channel || !text) return;
    onSendMessage(pane.channel, text);
    chatInput.clearInput(pane.id);
    chatAutocomplete.clearMentionState();
  };

    const applyMentionSuggestion = (paneId: string) => {
    const inputValue = chatInput.getInputValue(paneId);
    chatAutocomplete.applyMentionSuggestion(paneId, inputValue, (newValue) => {
      chatInput.handleInputChange(paneId, newValue);
    });
  };

  const applyCommandSuggestion = (paneId: string) => {
    chatAutocomplete.applyCommandSuggestion(paneId, (newValue) => {
      chatInput.handleInputChange(paneId, newValue);
    });
  };

    const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pane: ChatPane
  ) => {
    const { mentionState, commandState } = chatAutocomplete;
    
    if (mentionState && mentionState.paneId === pane.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        chatAutocomplete.moveMentionSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        chatAutocomplete.moveMentionSelection('up');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMentionSuggestion(pane.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        chatAutocomplete.clearMentionState();
        return;
      }
    }

    if (commandState && commandState.paneId === pane.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        chatAutocomplete.moveCommandSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        chatAutocomplete.moveCommandSelection('up');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCommandSuggestion(pane.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        chatAutocomplete.clearCommandState();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend(pane);
    }
  };



    const insertEmoteToInput = (paneId: string, code: string) => {
    chatEmotes.incrementEmoteUsage(code);
    chatInput.insertTextAtCursor(paneId, code);
  };

  // Auto-scroll убран - Virtuoso управляет скроллом через followOutput

  // Context Menu
  const handleMessageContextMenu = (
    e: React.MouseEvent,
    channel: string,
    message: ChatMessage
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (message.isSystem) return;

    const MENU_WIDTH = 260;
    const MENU_HEIGHT = 260;
    const { innerWidth, innerHeight } = window;
    let x = e.clientX;
    let y = e.clientY;

    if (x + MENU_WIDTH > innerWidth) {
      x = innerWidth - MENU_WIDTH - 8;
    }
    if (y + MENU_HEIGHT > innerHeight) {
      y = innerHeight - MENU_HEIGHT - 8;
    }
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    setMsgMenu({ x, y, channel, message });
  };

  const closeMsgMenu = () => setMsgMenu(null);

  const handleModerationClick = (
    type: 'deleteMessage' | 'timeout' | 'ban' | 'unban',
    duration?: number
  ) => {
    if (!msgMenu) return;
    const { channel, message } = msgMenu;
    const login = message.userLogin;

    try {
      switch (type) {
        case 'deleteMessage':
          if (!message.msgId) return;
          onModerationAction({
            type: 'deleteMessage',
            channel,
            login,
            msgId: message.msgId
          });
          break;
        case 'ban':
          onModerationAction({ type: 'ban', channel, login });
          break;
        case 'unban':
          onModerationAction({ type: 'unban', channel, login });
          break;
        case 'timeout':
          onModerationAction({
            type: 'timeout',
            channel,
            login,
            durationSeconds: duration ?? 600
          });
          break;
      }
    } catch (e) {
      console.error(e);
    }
    closeMsgMenu();
  };

  const handleClearGlobal = (pane: ChatPane) =>
    onModerationAction({ type: 'clearChat', channel: pane.channel });

  // Dropdown (slow / followers)
  const handleDropdownClick = (
    e: React.MouseEvent,
    channel: string,
    type: 'slow' | 'followers'
  ) => {
    e.stopPropagation();
    setOpenDropdown((prev) =>
      prev?.channel === channel && prev?.type === type
        ? null
        : { channel, type }
    );
  };
  const handleSlowModeSelect = (channel: string, seconds: number) => {
    onModeToggle(channel, 'slow', seconds);
    setOpenDropdown(null);
  };
  const handleFollowersModeSelect = (channel: string, minutes: number) => {
    onModeToggle(channel, 'followers', minutes);
    setOpenDropdown(null);
  };

  const isTwoRows = rows === 2;

  // итоговые множители
  const combinedScale = globalScale * autoScale;
  const textScale = fontScale * combinedScale;
  const scaledPaneWidth = paneWidth * combinedScale;
  const scaledPaneHeight = paneHeight * combinedScale;

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--color-border)',
        width: '100%',
        overflowX: 'hidden'
      }}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      onDragLeave={handleContainerDragLeave}
      onClick={() => {
        closeMsgMenu();
        setOpenDropdown(null);
      }}
    >
      <div style={topPanelStyle}>
        <div>
          <div style={{ fontSize: 13 * textScale, color: 'var(--color-textSecondary)' }}>Область чатов</div>
          <div style={{ fontSize: 11 * textScale, color: 'var(--color-textMuted)' }}>
            ПКМ по каналу или перетащи сюда
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {selectedChannel && (
            <div style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>
              Канал:{' '}
              <strong style={{ color: 'var(--color-text)' }}>
                {selectedChannel}
              </strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Строки:</span>
            <button
              onClick={() => setRows(1)}
              style={rowButtonStyle(rows === 1)}
            >
              1
            </button>
            <button
              onClick={() => setRows(2)}
              style={rowButtonStyle(rows === 2)}
            >
              2
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Размер:</span>
            <button
              onClick={() => changePaneWidth(-20)}
              style={sizeButtonStyle}
            >
              W-
            </button>
            <button
              onClick={() => changePaneWidth(20)}
              style={sizeButtonStyle}
            >
              W+
            </button>
            <button
              onClick={() => changePaneHeight(-20)}
              style={sizeButtonStyle}
            >
              H-
            </button>
            <button
              onClick={() => changePaneHeight(20)}
              style={sizeButtonStyle}
            >
              H+
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Шрифт:</span>
            <button
              onClick={() => changeFontScale(-0.1)}
              style={sizeButtonStyle}
            >
              A-
            </button>
            <button
              onClick={() => changeFontScale(0.1)}
              style={sizeButtonStyle}
            >
              A+
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Scale:</span>
            <button
              onClick={() => changeGlobalScale(-0.1)}
              style={sizeButtonStyle}
            >
              S-
            </button>
            <button
              onClick={() => changeGlobalScale(0.1)}
              style={sizeButtonStyle}
            >
              S+
            </button>
          </div>
        </div>
      </div>

      <div style={chatsContainerStyle(isTwoRows)}>
        <div style={chatsGridStyle(isTwoRows)}>
          {chatPanes.length === 0 && (
            <div style={emptyStateStyle(isDropActive)}>
              {isDropActive ? 'Отпусти здесь' : 'Нет открытых чатов.'}
            </div>
          )}

          {chatPanes.map((pane) => {
            const inputValue = chatInput.getInputValue(pane.id);
            const canSend = !!pane.channel && inputValue.trim().length > 0;
            const isSelected =
              selectedChannel?.toLowerCase() ===
              pane.channel.toLowerCase();
            const modes =
              roomModes[pane.channel.toLowerCase()] || defaultModes;
            const isSlowDropdownOpen =
              openDropdown?.channel === pane.channel &&
              openDropdown?.type === 'slow';
            const isFollowersDropdownOpen =
              openDropdown?.channel === pane.channel &&
              openDropdown?.type === 'followers';

            return (
              <div
                key={pane.id}
                onClick={() => onSelectChannel(pane.channel)}
                onDragOver={handlePaneDragOver}
                onDrop={(e) => handlePaneDrop(e, pane.id)}
                onMouseEnter={() => setHoveredPaneId(pane.id)}
                onMouseLeave={() => setHoveredPaneId(null)}
                style={chatPaneStyle(
                  scaledPaneWidth,
                  scaledPaneHeight,
                  draggingId === pane.id,
                  isSelected
                )}
              >
                {/* HEADER */}
                <div
                  draggable
                  onDragStart={(e) => handlePaneDragStart(e, pane.id)}
                  onDragEnd={handlePaneDragEnd}
                  style={paneHeaderStyle}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12 * textScale,
                        color: 'var(--color-textSecondary)',
                        textTransform: 'uppercase'
                      }}
                    >
                      Канал
                    </div>
                    <div
                      style={{
                        fontSize: 14 * textScale,
                        fontWeight: 500
                      }}
                    >
                      {pane.channel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearChat(pane.id);
                      }}
                      title="Очистить локально"
                      style={iconButtonStyle}
                    >
                      ⌫
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePause(pane.id);
                      }}
                      title={pane.paused ? 'Продолжить' : 'Пауза'}
                      style={iconButtonStyle}
                    >
                      {pane.paused ? '▶' : '⏸'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveChat(pane.id);
                      }}
                      title="Закрыть"
                      style={iconButtonStyle}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* MODES BAR */}
                <div style={modesBarStyle}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'shield');
                    }}
                    style={modeButtonStyle(modes.shield, 'var(--color-error)')}
                    title="Защитный режим"
                  >
                    🛡️
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) =>
                        handleDropdownClick(e, pane.channel, 'slow')
                      }
                      style={modeButtonStyle(modes.slow)}
                      title="Медленный режим"
                    >
                      Slow{' '}
                      {modes.slow && modes.slowDuration > 0
                        ? `(${modes.slowDuration}с)`
                        : ''}{' '}
                      <span style={{ marginLeft: 2, fontSize: 8 }}>▼</span>
                    </button>
                    {isSlowDropdownOpen && (
                      <div
                        style={dropdownMenuStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {SLOW_MODE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleSlowModeSelect(pane.channel, opt.value)
                            }
                            style={dropdownItemStyle(
                              opt.value === 0
                                ? !modes.slow
                                : modes.slow &&
                                    modes.slowDuration === opt.value
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'emote');
                    }}
                    style={modeButtonStyle(modes.emote)}
                    title="Только эмодзи"
                  >
                    Emote
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) =>
                        handleDropdownClick(e, pane.channel, 'followers')
                      }
                      style={modeButtonStyle(modes.followers)}
                      title="Только фолловеры"
                    >
                      Foll{' '}
                      {modes.followers
                        ? `(${formatFollowersDuration(
                            modes.followersDuration
                          )})`
                        : ''}{' '}
                      <span style={{ marginLeft: 2, fontSize: 8 }}>▼</span>
                    </button>
                    {isFollowersDropdownOpen && (
                      <div
                        style={dropdownMenuStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {FOLLOWERS_MODE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleFollowersModeSelect(
                                pane.channel,
                                opt.value
                              )
                            }
                            style={dropdownItemStyle(
                              opt.value === -1
                                ? !modes.followers
                                : modes.followers &&
                                    modes.followersDuration === opt.value
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'subs');
                    }}
                    style={modeButtonStyle(modes.subs)}
                    title="Только подписчики"
                  >
                    Subs
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'unique');
                    }}
                    style={modeButtonStyle(modes.unique)}
                    title="Уникальные сообщения"
                  >
                    Uniq
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearGlobal(pane);
                    }}
                    style={{
                      ...modeButtonStyle(false),
                      borderColor: '#f97316',
                      color: '#f97316'
                    }}
                    title="Очистить чат"
                  >
                    Clear
                  </button>
                </div>

                {/* MESSAGES */}
                <Virtuoso
                  ref={(el) => {
                    if (el) {
                      scrollContainersRef.current[pane.id] = el as any;
                    }
                  }}
                  style={messagesContainerStyle}
                  data={pane.messages}
                  followOutput={!pane.paused && !(hoverPauseKeyPressed && hoveredPaneId === pane.id)}
                  itemContent={(index, m) => (
                    <ChatMessageItem
                      message={m}
                      textScale={textScale}
                      badgeSets={badgeSets}
                      onContextMenu={(e) => handleMessageContextMenu(e, pane.channel, m)}
                    />
                  )}
                />

                                {chatAutocomplete.mentionState && chatAutocomplete.mentionState.paneId === pane.id && (
                  <MentionAutocomplete
                    suggestions={chatAutocomplete.mentionState.suggestions}
                    selectedIndex={chatAutocomplete.mentionState.selectedIndex}
                    onSelect={(idx) => chatAutocomplete.moveMentionSelection(idx === chatAutocomplete.mentionState!.selectedIndex + 1 ? 'down' : 'up')}
                    onApply={() => applyMentionSuggestion(pane.id)}
                    textScale={textScale}
                  />
                )}

                {chatAutocomplete.commandState && chatAutocomplete.commandState.paneId === pane.id && (
                  <CommandAutocomplete
                    suggestions={chatAutocomplete.commandState.suggestions}
                    selectedIndex={chatAutocomplete.commandState.selectedIndex}
                    onSelect={(idx) => chatAutocomplete.moveCommandSelection(idx === chatAutocomplete.commandState!.selectedIndex + 1 ? 'down' : 'up')}
                    onApply={() => applyCommandSuggestion(pane.id)}
                    textScale={textScale}
                  />
                )}

                                {chatEmotes.emotePicker && chatEmotes.emotePicker.paneId === pane.id && (
                  <EmotePicker
                    paneId={pane.id}
                    tab={chatEmotes.emotePicker.tab}
                    onTabChange={(tab) => chatEmotes.setEmotePicker(prev => prev ? {...prev, tab} : null)}
                    globalEmotes={chatEmotes.globalEmotes}
                    userEmotes={chatEmotes.userEmotes}
                    channelEmotes={chatEmotes.channelEmotes[pane.channel.toLowerCase()] || []}
                    emoteUsage={chatEmotes.emoteUsage}
                    onEmoteSelect={(code) => insertEmoteToInput(pane.id, code)}
                    textScale={textScale}
                  />
                )}

                {/* INPUT */}
                <div style={inputContainerStyle}>
                  <input
                    type="text"
                    placeholder="Сообщение..."
                    disabled={!pane.channel}
                    value={inputValue}
                    onChange={(e) =>
                      handleInputChange(pane.id, e.target.value)
                    }
                    onKeyDown={(e) => handleInputKeyDown(e, pane)}
                    style={inputStyle(textScale)}
                                        ref={(el) => chatInput.setInputRef(pane.id, el)}
                  />
                                    <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      chatEmotes.setEmotePicker((prev) =>
                        prev && prev.paneId === pane.id
                          ? null
                          : { paneId: pane.id, tab: 'channel' }
                      );
                    }}
                    style={emojiButtonStyle}
                    title="Вставить эмодзи"
                  >
                    😊
                  </button>
                  <button
                    disabled={!canSend}
                    onClick={() => handleSend(pane)}
                    style={sendButtonStyle(canSend)}
                  >
                    ►
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {msgMenu && (
        <ChatContextMenu
          x={msgMenu.x}
          y={msgMenu.y}
          message={msgMenu.message}
          onClose={closeMsgMenu}
          onOpenProfile={() => {
            onOpenUserProfile(msgMenu.message.userLogin);
            closeMsgMenu();
          }}
          onOpenLog={() => {
            onOpenUserLog(msgMenu.message.userLogin);
            closeMsgMenu();
          }}
          onDeleteMessage={() => handleModerationClick('deleteMessage')}
          onTimeout={(duration) => handleModerationClick('timeout', duration)}
          onBan={() => handleModerationClick('ban')}
          onUnban={() => handleModerationClick('unban')}
        />
      )}
    </section>
  );
};

export default ChatArea;

// =====================================================
// Styles
// =====================================================

const topPanelStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-chatMessage)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const chatsContainerStyle = (isTwoRows: boolean): React.CSSProperties => ({
  flex: 1,
  background: 'var(--color-chatBackground)',
  padding: 8,
  overflowX: isTwoRows ? 'hidden' : 'auto',
  overflowY: isTwoRows ? 'auto' : 'hidden'
});

const chatsGridStyle = (isTwoRows: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: isTwoRows ? 'wrap' : 'nowrap',
  alignContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 8,
  minHeight: '100%'
});

const emptyStateStyle = (isDropActive: boolean): React.CSSProperties => ({
  flex: 1,
  borderRadius: 8,
  border: isDropActive
    ? '1px dashed #4ade80'
    : '1px dashed #374151',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-textMuted)',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200
});

const chatPaneStyle = (
  width: number,
  height: number,
  isDragging: boolean,
  isSelected: boolean
): React.CSSProperties => ({
  position: 'relative',
  flex: `0 0 ${width}px`,
  width,
  maxWidth: width,
  height,
  maxHeight: height,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 8,
  border: `1px solid ${
    isDragging ? '#fbbf24' : isSelected ? '#4ade80' : 'var(--color-border)'
  }`,
  background: 'var(--color-chatBackground)',
  overflow: 'hidden'
});

const paneHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'move',
  flexShrink: 0
};

const modesBarStyle: React.CSSProperties = {
  padding: '2px 4px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  flexWrap: 'wrap'
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 18px 8px 8px',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  gap: 4
};

const inputContainerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  padding: 6,
  display: 'flex',
  gap: 6,
  flexShrink: 0
};

const inputStyle = (fontScale: number): React.CSSProperties => ({
  flex: 1,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-text)',
  fontSize: 12 * fontScale,
  userSelect: 'text'
});

const sendButtonStyle = (canSend: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: canSend ? 'var(--color-border)' : 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: canSend ? 'pointer' : 'default',
  opacity: canSend ? 1 : 0.6
});

const emojiButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer'
};

const iconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
};

const sizeButtonStyle: React.CSSProperties = {
  width: 26,
  height: 20,
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 10,
  cursor: 'pointer',
  padding: 0
};

const rowButtonStyle = (active: boolean): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: active ? 'var(--color-border)' : 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
});

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 100,
  background: 'var(--color-chatMessage)',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  minWidth: 80,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

const dropdownItemStyle = (selected: boolean): React.CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  padding: '4px 8px',
  borderRadius: 4,
  border: 'none',
  background: selected ? 'var(--color-border)' : 'transparent',
  color: 'var(--color-text)',
  fontSize: 11,
  cursor: 'pointer',
  marginBottom: 2
});

function modeButtonStyle(
  active: boolean,
  activeColor = '#4ade80'
): React.CSSProperties {
  return {
    padding: '1px 4px',
    borderRadius: 4,
    border: `1px solid ${active ? activeColor : 'var(--color-border)'}`,
    background: active
      ? activeColor === 'var(--color-error)'
        ? '#7f1d1d'
        : 'var(--color-modActive)'
      : 'var(--color-modInactive)',
    color: active
      ? activeColor === 'var(--color-error)'
        ? '#fecaca'
        : '#bbf7d0'
      : 'var(--color-text)',
    fontSize: 9,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
  };
}

// =====================================================
// Styles
// =====================================================



