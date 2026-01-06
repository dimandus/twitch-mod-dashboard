import React, { useEffect, useRef, useState } from 'react';

// =====================================================
// Типы
// =====================================================

export interface ChatMessage {
  id: string;                // Локальный UI ID
  msgId?: string;            // Реальный Twitch message ID (для delete)
  userId?: string;
  text: string;
  userLogin: string;
  displayName: string;
  color?: string;
  badges: string[];
  self: boolean;
  timestamp: number;
  emotes?: Record<string, string[]>;
  deleted?: boolean;
  isSystem?: boolean;
  canDelete?: boolean;
  cleared?: boolean;         // Сообщение «очищено» (clear chat), но не удалено
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

const SLOW_MODE_OPTIONS = [
  { label: 'Выкл', value: 0 },
  { label: '3с', value: 3 },
  { label: '5с', value: 5 },
  { label: '10с', value: 10 },
  { label: '20с', value: 20 },
  { label: '30с', value: 30 },
  { label: '60с', value: 60 },
  { label: '120с', value: 120 }
];

const FOLLOWERS_MODE_OPTIONS = [
  { label: 'Выкл', value: -1 },
  { label: '0м', value: 0 },
  { label: '10м', value: 10 },
  { label: '30м', value: 30 },
  { label: '1ч', value: 60 },
  { label: '1д', value: 1440 },
  { label: '1н', value: 10080 },
  { label: '1мес', value: 43200 }
];

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
  onOpenUserProfile
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [rows, setRows] = useState<1 | 2>(1);

  const [paneWidth, setPaneWidth] = useState(320);
  const [paneHeight, setPaneHeight] = useState(260);

  const [layoutLoaded, setLayoutLoaded] = useState(false);

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

  // Layout persistence
  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.config.get('settings.chatLayout');
        if (stored && typeof stored === 'object') {
          const r = stored.rows === 2 ? 2 : 1;
          const w =
            typeof stored.paneWidth === 'number'
              ? clampWidth(stored.paneWidth)
              : 320;
          const h =
            typeof stored.paneHeight === 'number'
              ? clampHeight(stored.paneHeight)
              : 260;
          setRows(r);
          setPaneWidth(w);
          setPaneHeight(h);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLayoutLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!layoutLoaded) return;
    const layout = { rows, paneWidth, paneHeight };
    window.electronAPI.config
      .set('settings.chatLayout', layout)
      .catch(console.error);
  }, [rows, paneWidth, paneHeight, layoutLoaded]);

  useEffect(() => {
    const handleClick = () => {
      setOpenDropdown(null);
      setMsgMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const changePaneWidth = (delta: number) =>
    setPaneWidth((w) => clampWidth(w + delta));
  const changePaneHeight = (delta: number) =>
    setPaneHeight((h) => clampHeight(h + delta));

  // Drag & Drop
  const handleContainerDragOver: React.DragEventHandler<HTMLDivElement> = (
    e
  ) => {
    const types = e.dataTransfer.types;
    if (!Array.from(types).includes('text/channel-login')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropActive(true);
  };
  const handleContainerDragLeave: React.DragEventHandler<HTMLDivElement> = (
    e
  ) => {
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
  const handlePaneDragStart = (e: React.DragEvent<HTMLDivElement>, paneId: string) => {
    setDraggingId(paneId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handlePaneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handlePaneDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
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
  const handleInputChange = (id: string, value: string) =>
    setInputValues((p) => ({ ...p, [id]: value }));
  const handleSend = (pane: ChatPane) => {
    const text = (inputValues[pane.id] || '').trim();
    if (!pane.channel || !text) return;
    onSendMessage(pane.channel, text);
    setInputValues((p) => ({ ...p, [pane.id]: '' }));
  };

  // Auto-scroll
  useEffect(() => {
    chatPanes.forEach((pane) => {
      if (pane.paused) return;
      const el = scrollContainersRef.current[pane.id];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [chatPanes]);

  // Context Menu
  const handleMessageContextMenu = (
    e: React.MouseEvent,
    channel: string,
    message: ChatMessage
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (message.isSystem) return;
    const MENU_WIDTH = 260;   // примерно ширина меню
  const MENU_HEIGHT = 260;  // примерно высота меню

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

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #27272f',
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
          <div style={{ fontSize: 13, color: '#9ca3af' }}>Область чатов</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>
            ПКМ по каналу или перетащи сюда
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedChannel && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>
              Канал:{' '}
              <strong style={{ color: '#e5e7eb' }}>
                {selectedChannel}
              </strong>
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Строки:</span>
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
            <span style={{ fontSize: 11, color: '#9ca3af' }}>Размер:</span>
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
            const inputValue = inputValues[pane.id] || '';
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
                draggable
                onDragStart={(e) => handlePaneDragStart(e, pane.id)}
                onDragOver={handlePaneDragOver}
                onDrop={(e) => handlePaneDrop(e, pane.id)}
                onDragEnd={handlePaneDragEnd}
                style={chatPaneStyle(
                  paneWidth,
                  paneHeight,
                  draggingId === pane.id,
                  isSelected
                )}
              >
                {/* HEADER */}
                <div style={paneHeaderStyle}>
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#9ca3af',
                        textTransform: 'uppercase'
                      }}
                    >
                      Канал
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500
                      }}
                    >
                      {pane.channel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => onClearChat(pane.id)}
                      title="Очистить локально"
                      style={iconButtonStyle}
                    >
                      ⌫
                    </button>
                    <button
                      onClick={() => onTogglePause(pane.id)}
                      title={pane.paused ? 'Продолжить' : 'Пауза'}
                      style={iconButtonStyle}
                    >
                      {pane.paused ? '▶' : '⏸'}
                    </button>
                    <button
                      onClick={() => onRemoveChat(pane.id)}
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
                    onClick={() => onModeToggle(pane.channel, 'shield')}
                    style={modeButtonStyle(modes.shield, '#ef4444')}
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
                    onClick={() => onModeToggle(pane.channel, 'emote')}
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
                    onClick={() => onModeToggle(pane.channel, 'subs')}
                    style={modeButtonStyle(modes.subs)}
                    title="Только подписчики"
                  >
                    Subs
                  </button>
                  <button
                    onClick={() => onModeToggle(pane.channel, 'unique')}
                    style={modeButtonStyle(modes.unique)}
                    title="Уникальные сообщения"
                  >
                    Uniq
                  </button>
                  <button
                    onClick={() => handleClearGlobal(pane)}
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
                <div
                  ref={(el) => {
                    scrollContainersRef.current[pane.id] = el;
                  }}
                  style={messagesContainerStyle}
                >
                  {pane.messages.length === 0 ? (
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      Сообщений пока нет.
                    </div>
                  ) : (
                    pane.messages.map((m) => {
                      if (m.isSystem) {
                        return (
                          <div key={m.id} style={systemMessageStyle}>
                            {m.text}
                          </div>
                        );
                      }

                      const isDeleted = !!m.deleted;
                      const isCleared = !!m.cleared && !isDeleted;

                      return (
                        <div
                          key={m.msgId || m.id}
                          onContextMenu={(e) =>
                            handleMessageContextMenu(
                              e,
                              pane.channel,
                              m
                            )
                          }
                          data-msg-id={m.msgId}
                          style={messageStyle(isDeleted, isCleared)}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: 2,
                              flexShrink: 0
                            }}
                          >
                            {renderBadges(m.badges)}
                          </div>
                          <span
                            style={usernameStyle(
                              isDeleted,
                              isCleared,
                              m.color
                            )}
                          >
                            {m.displayName || m.userLogin}:
                          </span>
                          <span
                            style={messageTextStyle(
                              isDeleted,
                              isCleared
                            )}
                          >
                            {renderMessageWithEmotes(
                              m.text,
                              m.emotes
                            )}
                          </span>
                          {isDeleted && (
                            <span style={deletedLabelStyle}>
                              [удалено]
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSend(pane);
                      }
                    }}
                    style={inputStyle}
                  />
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

      {/* CONTEXT MENU для сообщения */}
      {msgMenu && (
        <div
          style={contextMenuStyle(msgMenu.x, msgMenu.y)}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={contextMenuHeaderStyle}>
            {msgMenu.message.displayName || msgMenu.message.userLogin}
          </div>
          <button
            onClick={() => {
              onOpenUserProfile(msgMenu.message.userLogin);
              closeMsgMenu();
            }}
            style={menuItemStyle}
          >
            👤 Профиль
          </button>
          <button
            onClick={() => {
              onOpenUserLog(msgMenu.message.userLogin);
              closeMsgMenu();
            }}
            style={menuItemStyle}
          >
            📜 Лог сообщений
          </button>
          {msgMenu.message.msgId && (
            <button
              onClick={() => handleModerationClick('deleteMessage')}
              style={{ ...menuItemStyle, color: '#fca5a5' }}
            >
              🗑️ Удалить
            </button>
          )}
          <div style={menuDividerStyle} />
          <button
            onClick={() => handleModerationClick('timeout', 60)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 1м
          </button>
          <button
            onClick={() => handleModerationClick('timeout', 600)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 10м
          </button>
          <button
            onClick={() => handleModerationClick('timeout', 3600)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 1ч
          </button>
          <div style={menuDividerStyle} />
          <button
            onClick={() => handleModerationClick('ban')}
            style={{ ...menuItemStyle, color: '#fca5a5' }}
          >
            ⛔ Бан
          </button>
          <button
            onClick={() => handleModerationClick('unban')}
            style={{ ...menuItemStyle, color: '#86efac' }}
          >
            ✅ Разбан
          </button>
        </div>
      )}
    </section>
  );
};

// =====================================================
// Styles
// =====================================================

const topPanelStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid #27272f',
  background: '#111827',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const chatsContainerStyle = (isTwoRows: boolean): React.CSSProperties => ({
  flex: 1,
  background: '#020617',
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
  background: '#020617',
  color: '#6b7280',
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
  flex: `0 0 ${width}px`,
  width,
  maxWidth: width,
  height,
  maxHeight: height,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 8,
  border: `1px solid ${
    isDragging ? '#fbbf24' : isSelected ? '#4ade80' : '#27272f'
  }`,
  background: '#020617',
  overflow: 'hidden'
});

const paneHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'move',
  flexShrink: 0
};

const modesBarStyle: React.CSSProperties = {
  padding: '2px 4px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  flexWrap: 'wrap'
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  gap: 4
};

const inputContainerStyle: React.CSSProperties = {
  borderTop: '1px solid #27272f',
  padding: 6,
  display: 'flex',
  gap: 6,
  flexShrink: 0
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: '#020617',
  color: '#e5e7eb',
  fontSize: 12
};

const sendButtonStyle = (canSend: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #4b5563',
  background: canSend ? '#4b5563' : '#1f2933',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: canSend ? 'pointer' : 'default',
  opacity: canSend ? 1 : 0.6
});

const iconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
};

const sizeButtonStyle: React.CSSProperties = {
  width: 26,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 10,
  cursor: 'pointer',
  padding: 0
};

const rowButtonStyle = (active: boolean): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: active ? '#4b5563' : '#1f2933',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
});

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 100,
  background: '#111827',
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
  background: selected ? '#4b5563' : 'transparent',
  color: '#e5e7eb',
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
    border: `1px solid ${active ? activeColor : '#4b5563'}`,
    background: active
      ? activeColor === '#ef4444'
        ? '#7f1d1d'
        : '#166534'
      : '#1f2933',
    color: active
      ? activeColor === '#ef4444'
        ? '#fecaca'
        : '#bbf7d0'
      : '#e5e7eb',
    fontSize: 9,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
  };
}

const messageStyle = (
  isDeleted: boolean = false,
  isCleared: boolean = false
): React.CSSProperties => ({
  fontSize: 12,
  background: isDeleted ? '#291415' : '#111827',
  borderRadius: 4,
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
  opacity: isDeleted ? 0.7 : isCleared ? 0.6 : 1,
  cursor: 'context-menu',
  borderLeft: isDeleted ? '3px solid #ef4444' : '3px solid transparent',
  textDecoration: 'none'
});

const usernameStyle = (
  isDeleted: boolean,
  isCleared: boolean,
  color?: string
): React.CSSProperties => ({
  fontWeight: 600,
  color: isDeleted
    ? '#9ca3af'
    : isCleared
    ? '#6b7280'
    : color || '#e5e7eb',
  marginRight: 4,
  textDecoration: 'none',
  flexShrink: 0
});

const messageTextStyle = (
  isDeleted: boolean,
  isCleared: boolean
): React.CSSProperties => ({
  color: isDeleted ? '#9ca3af' : isCleared ? '#6b7280' : '#e5e7eb',
  textDecoration: isDeleted ? 'line-through' : 'none',
  wordBreak: 'break-word'
});

const deletedLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#ef4444',
  marginLeft: 'auto',
  flexShrink: 0,
  fontStyle: 'italic',
  fontWeight: 'bold'
};

const contextMenuStyle = (
  x: number,
  y: number
): React.CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  zIndex: 3000,
  width: 'max-content',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
});

const contextMenuHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  color: '#9ca3af',
  borderBottom: '1px solid #27272f',
  marginBottom: 4
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '5px 10px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const menuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid #27272f',
  margin: '4px 0'
};

// Системное сообщение ("Чат очищен модератором")
const systemMessageStyle: React.CSSProperties = {
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: 11,
  padding: '4px 0',
  borderTop: '1px solid #374151',
  borderBottom: '1px solid #374151',
  margin: '8px 0',
  background: '#1f2937',
  fontStyle: 'italic'
};

// =====================================================
// Helpers
// =====================================================

function clampWidth(w: number): number {
  return Math.min(600, Math.max(220, w));
}

function clampHeight(h: number): number {
  return Math.min(600, Math.max(180, h));
}

function formatFollowersDuration(minutes: number): string {
  if (minutes < 0 || isNaN(minutes)) return '';
  if (minutes === 0) return '0м';
  if (minutes < 60) return `${minutes}м`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}ч`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}д`;
  if (minutes < 43200) return `${Math.floor(minutes / 10080)}н`;
  return `${Math.floor(minutes / 43200)}мес`;
}

function renderBadges(badges: string[]) {
  if (!badges.length) return null;
  const mapping: Record<
    string,
    { label: string; color: string }
  > = {
    broadcaster: { label: 'S', color: '#a855f7' },
    moderator: { label: 'M', color: '#22c55e' },
    vip: { label: 'V', color: '#0ea5e9' },
    subscriber: { label: 'Sub', color: '#f97316' },
    staff: { label: 'T', color: '#f97316' },
    admin: { label: 'T', color: '#f97316' },
    global_mod: { label: 'T', color: '#f97316' }
  };
  return badges.map((b, i) => {
    const info = mapping[b];
    if (!info) return null;
    return (
      <span
        key={b + i}
        style={{
          minWidth: 14,
          height: 14,
          borderRadius: 4,
          fontSize: 9,
          lineHeight: '14px',
          textAlign: 'center',
          background: info.color,
          color: '#020617',
          fontWeight: 700,
          padding: '0 2px'
        }}
      >
        {info.label}
      </span>
    );
  });
}

function renderMessageWithEmotes(
  text: string,
  emotes?: Record<string, string[]>
): React.ReactNode {
  if (!emotes || Object.keys(emotes).length === 0) return text;
  type EmoteToken = { start: number; end: number; id: string };
  const tokens: EmoteToken[] = [];
  for (const [id, ranges] of Object.entries(emotes)) {
    for (const r of ranges) {
      const [s, e] = r.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(s) && !Number.isNaN(e) && s <= e) {
        tokens.push({ start: s, end: e, id });
      }
    }
  }
  if (!tokens.length) return text;
  tokens.sort((a, b) => a.start - b.start);
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  tokens.forEach((t, idx) => {
    if (t.start > lastIndex) {
      result.push(
        <span key={`t-${idx}-${lastIndex}`}>
          {text.slice(lastIndex, t.start)}
        </span>
      );
    }
    const emoteCode = text.slice(t.start, t.end + 1);
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${t.id}/default/dark/1.0`;
    result.push(
      <img
        key={`e-${idx}-${t.id}`}
        src={url}
        alt={emoteCode}
        style={{
          verticalAlign: 'middle',
          margin: '0 1px',
          maxHeight: '1.2em'
        }}
      />
    );
    lastIndex = t.end + 1;
  });
  if (lastIndex < text.length) {
    result.push(
      <span key={'t-tail'}>{text.slice(lastIndex)}</span>
    );
  }
  return result;
}

export default ChatArea;