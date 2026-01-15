import React from 'react';
import { ChatMessage } from '../../views/ChatArea';

interface ChatContextMenuProps {
  x: number;
  y: number;
  message: ChatMessage;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenLog: () => void;
  onDeleteMessage: () => void;
  onTimeout: (duration: number) => void;
  onBan: () => void;
  onUnban: () => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  x,
  y,
  message,
  onClose,
  onOpenProfile,
  onOpenLog,
  onDeleteMessage,
  onTimeout,
  onBan,
  onUnban
}) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: y,
        left: x,
        background: 'var(--color-chatMessage)',
        border: '1px solid #374151',
        borderRadius: 6,
        padding: 4,
        zIndex: 3000,
        width: 'max-content',
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          padding: '4px 8px',
          fontSize: 12,
          color: 'var(--color-textSecondary)',
          borderBottom: '1px solid var(--color-border)',
          marginBottom: 4
        }}
      >
        {message.displayName || message.userLogin}
      </div>
      <button onClick={onOpenProfile} style={menuItemStyle}>
        👤 Профиль
      </button>
      <button onClick={onOpenLog} style={menuItemStyle}>
        📜 Лог сообщений
      </button>
      {message.msgId && (
        <button onClick={onDeleteMessage} style={{ ...menuItemStyle, color: '#fca5a5' }}>
          🗑️ Удалить
        </button>
      )}
      <div style={menuDividerStyle} />
      <button onClick={() => onTimeout(60)} style={menuItemStyle}>
        ⏱️ Таймаут 1м
      </button>
      <button onClick={() => onTimeout(600)} style={menuItemStyle}>
        ⏱️ Таймаут 10м
      </button>
      <button onClick={() => onTimeout(3600)} style={menuItemStyle}>
        ⏱️ Таймаут 1ч
      </button>
      <div style={menuDividerStyle} />
      <button onClick={onBan} style={{ ...menuItemStyle, color: '#fca5a5' }}>
        ⛔ Бан
      </button>
      <button onClick={onUnban} style={{ ...menuItemStyle, color: '#86efac' }}>
        ✅ Разбан
      </button>
    </div>
  );
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '5px 10px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const menuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  margin: '4px 0'
};
