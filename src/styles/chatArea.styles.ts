import React from 'react';

export const topPanelStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-chatMessage)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

export const chatsContainerStyle = (isTwoRows: boolean): React.CSSProperties => ({
  flex: 1,
  background: 'var(--color-chatBackground)',
  padding: 8,
  overflowX: isTwoRows ? 'hidden' : 'auto',
  overflowY: isTwoRows ? 'auto' : 'hidden'
});

export const chatsGridStyle = (isTwoRows: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: isTwoRows ? 'wrap' : 'nowrap',
  alignContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 8,
  minHeight: '100%'
});

export const emptyStateStyle = (isDropActive: boolean): React.CSSProperties => ({
  flex: 1,
  borderRadius: 8,
  border: isDropActive ? '1px dashed #4ade80' : '1px dashed #374151',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-textMuted)',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200
});

export const chatPaneStyle = (
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
  border: `1px solid ${isDragging ? '#fbbf24' : isSelected ? '#4ade80' : 'var(--color-border)'}`,
  background: 'var(--color-chatBackground)',
  overflow: 'hidden'
});

export const paneHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'move',
  flexShrink: 0
};

export const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 18px 8px 8px',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  overflowX: 'hidden',
  gap: 4
};

export const inputContainerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  padding: 6,
  display: 'flex',
  gap: 6,
  flexShrink: 0
};

export const inputStyle = (fontScale: number): React.CSSProperties => ({
  flex: 1,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-text)',
  fontSize: 12 * fontScale,
  userSelect: 'text'
});

export const sendButtonStyle = (canSend: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: canSend ? 'var(--color-border)' : 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: canSend ? 'pointer' : 'default',
  opacity: canSend ? 1 : 0.6
});

export const emojiButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer'
};

export const iconButtonStyle: React.CSSProperties = {
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

export const sizeButtonStyle: React.CSSProperties = {
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

export const rowButtonStyle = (active: boolean): React.CSSProperties => ({
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
