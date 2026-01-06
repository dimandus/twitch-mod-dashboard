// src/components/UserMessageLog.tsx
import React, { useEffect, useRef } from 'react';

export interface UserLogMessage {
  id: string;
  msgId?: string;
  channel: string;
  text: string;
  timestamp: number;
  deleted?: boolean;
  emotes?: Record<string, string[]>;
}

export interface UserLogData {
  login: string;
  displayName: string;
  color?: string;
  badges: string[];
  messages: UserLogMessage[];
}

interface UserMessageLogProps {
  user: UserLogData;
  onClose: () => void;
  onModeration: (
    action: 'timeout' | 'ban' | 'unban',
    channel: string,
    duration?: number
  ) => void;
  onDeleteMessage: (channel: string, msgId: string) => void;
}

const UserMessageLog: React.FC<UserMessageLogProps> = ({
  user,
  onClose,
  onModeration,
  onDeleteMessage
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const [selectedChannel, setSelectedChannel] = React.useState<string | null>(
    null
  );
  const [moderationError, setModerationError] = React.useState<string | null>(
    null
  );

  // Авто-скролл вниз при новых сообщениях
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [user.messages]);

  // Уникальные каналы для фильтра
  const channels = Array.from(new Set(user.messages.map((m) => m.channel)));

  // Фильтрованные сообщения
  const filteredMessages = selectedChannel
    ? user.messages.filter((m) => m.channel === selectedChannel)
    : user.messages;

  // Сортировка по времени
  const sortedMessages = [...filteredMessages].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  // Определяем канал для модерации:
  // - если выбран явно — его
  // - если всего один канал в логе — его
  // - иначе просим пользователя выбрать канал
  const getModerationChannel = (): string | null => {
    if (selectedChannel) return selectedChannel;

    if (channels.length === 1) return channels[0];

    setModerationError('Выбери канал сверху, чтобы применить действие.');
    return null;
  };

  const handleModerationSelect = (value: string) => {
    if (!value) return;
    setModerationError(null);

    const channel = getModerationChannel();
    if (!channel) return;

    if (value === 'ban') {
      onModeration('ban', channel);
    } else if (value === 'unban') {
      onModeration('unban', channel);
    } else {
      onModeration('timeout', channel, parseInt(value, 10));
    }
  };

  const handleBanClick = () => {
    setModerationError(null);
    const channel = getModerationChannel();
    if (!channel) return;
    onModeration('ban', channel);
  };

  const handleUnbanClick = () => {
    setModerationError(null);
    const channel = getModerationChannel();
    if (!channel) return;
    onModeration('unban', channel);
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* Заголовок */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: user.color || '#9147ff'
              }}
            />
            <span style={{ fontWeight: 600, fontSize: 16 }}>
              {user.displayName || user.login}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>
              ({user.messages.length} сообщений)
            </span>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        {/* Панель модерации */}
        <div style={moderationPanelStyle}>
          <span
            style={{
              fontSize: 12,
              color: '#9ca3af',
              marginRight: 8
            }}
          >
            Действия:
          </span>

          <select
            onChange={(e) => {
              handleModerationSelect(e.target.value);
              e.target.value = '';
            }}
            style={selectStyle}
          >
            <option value="">Таймаут / бан...</option>
            <option value="60">⏱️ 1 мин</option>
            <option value="600">⏱️ 10 мин</option>
            <option value="3600">⏱️ 1 час</option>
            <option value="86400">⏱️ 24 часа</option>
            <option value="ban">⛔ Бан</option>
            <option value="unban">✅ Разбан</option>
          </select>

          <button onClick={handleBanClick} style={dangerButtonStyle}>
            ⛔ Бан
          </button>

          <button onClick={handleUnbanClick} style={successButtonStyle}>
            ✅ Разбан
          </button>

          {moderationError && (
            <span
              style={{
                fontSize: 11,
                color: '#f97316',
                marginLeft: 8
              }}
            >
              {moderationError}
            </span>
          )}
        </div>

        {/* Фильтр по каналам */}
        {channels.length > 0 && (
          <div style={filterStyle}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Канал:</span>
            <button
              onClick={() => {
                setSelectedChannel(null);
                setModerationError(null);
              }}
              style={filterButtonStyle(selectedChannel === null)}
            >
              Все ({user.messages.length})
            </button>
            {channels.map((ch) => {
              const count = user.messages.filter(
                (m) => m.channel === ch
              ).length;
              return (
                <button
                  key={ch}
                  onClick={() => {
                    setSelectedChannel(ch);
                    setModerationError(null);
                  }}
                  style={filterButtonStyle(selectedChannel === ch)}
                >
                  {ch} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Список сообщений */}
        <div ref={scrollRef} style={messagesContainerStyle}>
          {sortedMessages.length === 0 ? (
            <div
              style={{
                color: '#6b7280',
                textAlign: 'center',
                padding: 20
              }}
            >
              Нет сообщений
            </div>
          ) : (
            sortedMessages.map((msg) => (
              <div
                key={msg.msgId || msg.id}
                style={{
                  ...messageStyle,
                  opacity: msg.deleted ? 0.5 : 1,
                  borderLeft: msg.deleted
                    ? '2px solid #ef4444'
                    : '2px solid transparent'
                }}
              >
                <div style={messageHeaderStyle}>
                  <span
                    style={{
                      color: '#9147ff',
                      fontWeight: 500
                    }}
                  >
                    #{msg.channel}
                  </span>
                  <span
                    style={{
                      color: '#6b7280',
                      fontSize: 11
                    }}
                  >
                    {formatTime(msg.timestamp)}
                  </span>
                  {msg.msgId && !msg.deleted && (
                    <button
                      onClick={() =>
                        onDeleteMessage(msg.channel, msg.msgId!)
                      }
                      style={deleteMessageButtonStyle}
                      title="Удалить сообщение"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <div
                  style={{
                    color: msg.deleted ? '#6b7280' : '#e5e7eb',
                    textDecoration: msg.deleted ? 'line-through' : 'none',
                    wordBreak: 'break-word'
                  }}
                >
                  {renderMessageWithEmotes(msg.text, msg.emotes)}
                  {msg.deleted && (
                    <span
                      style={{
                        color: '#ef4444',
                        marginLeft: 8,
                        fontSize: 11
                      }}
                    >
                      [удалено]
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// =====================================================
// Styles
// =====================================================

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3000
};

const modalStyle: React.CSSProperties = {
  background: '#111827',
  borderRadius: 8,
  width: '90%',
  maxWidth: 600,
  height: '80%',
  maxHeight: 700,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid #374151',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)'
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const closeButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: 'none',
  background: '#374151',
  color: '#e5e7eb',
  fontSize: 14,
  cursor: 'pointer'
};

const moderationPanelStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
  flexWrap: 'wrap'
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2937',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer'
};

const dangerButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #ef4444',
  background: 'transparent',
  color: '#fca5a5',
  fontSize: 12,
  cursor: 'pointer'
};

const successButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #22c55e',
  background: 'transparent',
  color: '#86efac',
  fontSize: 12,
  cursor: 'pointer'
};

const filterStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  flexShrink: 0,
  flexWrap: 'wrap'
};

const filterButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: 4,
  border: `1px solid ${active ? '#9147ff' : '#4b5563'}`,
  background: active ? '#9147ff' : 'transparent',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer'
});

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 16
};

const messageStyle: React.CSSProperties = {
  marginBottom: 12,
  padding: '8px 10px',
  background: '#1f2937',
  borderRadius: 6
};

const messageHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
  fontSize: 12
};

const deleteMessageButtonStyle: React.CSSProperties = {
  marginLeft: 'auto',
  padding: '2px 4px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: '#9ca3af',
  fontSize: 11,
  cursor: 'pointer'
};

// =====================================================
// Helpers
// =====================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return (
    date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }) +
    ' ' +
    date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit'
    })
  );
}

function renderMessageWithEmotes(
  text: string,
  emotes?: Record<string, string[]>
): React.ReactNode {
  if (!emotes || Object.keys(emotes).length === 0) {
    return text;
  }

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
        <span key={`t-${idx}-${lastIndex}`}>{text.slice(lastIndex, t.start)}</span>
      );
    }
    const emoteCode = text.slice(t.start, t.end + 1);
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${t.id}/default/dark/1.0`;
    result.push(
      <img
        key={`e-${idx}-${t.id}`}
        src={url}
        alt={emoteCode}
        style={{ verticalAlign: 'middle', margin: '0 1px' }}
      />
    );
    lastIndex = t.end + 1;
  });

  if (lastIndex < text.length) {
    result.push(<span key="t-tail">{text.slice(lastIndex)}</span>);
  }

  return result;
}

export default UserMessageLog;