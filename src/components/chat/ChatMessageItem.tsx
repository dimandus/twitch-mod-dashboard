import React from 'react';
import { Badges } from './Badges';
import { MessageWithEmotes } from './MessageWithEmotes';
import { ChatMessage } from '../../views/ChatArea';

interface ChatMessageItemProps {
  message: ChatMessage;
  textScale: number;
  badgeSets: Record<string, Record<string, any>>;
  onContextMenu: (e: React.MouseEvent) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message: m,
  textScale,
  badgeSets,
  onContextMenu
}) => {
  if (m.isSystem) {
    return (
      <div
        style={{
          textAlign: 'center',
          color: 'var(--color-textSecondary)',
          fontSize: 11 * textScale,
          padding: '4px 0',
          borderTop: '1px solid #374151',
          borderBottom: '1px solid #374151',
          margin: '8px 8px',
          background: 'var(--color-surfaceHover)',
          fontStyle: 'italic'
        }}
      >
        {m.text}
      </div>
    );
  }

  const isDeleted = !!m.deleted;
  const isCleared = !!m.cleared && !isDeleted;
  const isMentionedSelf = !!m.mentionedSelf;
  const isRaider = !!m.isRaider;
  const isFirstMessage = !!m.isFirstMessage;
  const isSharedChat = !!m.sourceRoomId;

  return (
    <div
      onContextMenu={onContextMenu}
      data-msg-id={m.msgId}
      style={{
        fontSize: 12 * textScale,
        background: isDeleted
          ? 'var(--color-chatMessageDeleted)'
          : isMentionedSelf
          ? 'var(--color-chatMessageMention)'
          : isRaider
          ? 'var(--color-chatMessageRaid)'
          : 'var(--color-chatMessage)',
        borderRadius: 4,
        padding: '2px 4px',
        margin: '0 8px',
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        opacity: isDeleted ? 0.7 : isCleared ? 0.6 : 1,
        cursor: 'context-menu',
        borderLeft: isDeleted ? '3px solid var(--color-error)' : isRaider ? '3px solid #3b82f6' : '3px solid transparent',
        textDecoration: 'none',
        outline: isFirstMessage ? '1px solid var(--color-chatMessageFirst)' : 'none',
        flexWrap: 'wrap',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
    >
      <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
        <Badges
          badges={m.badges}
          badgeVersions={m.badgeVersions}
          badgeInfo={m.badgeInfo}
          badgeSets={badgeSets}
        />
      </div>
      <span
        style={{
          fontWeight: 600,
          fontSize: 12 * textScale,
          color: isDeleted
            ? 'var(--color-textSecondary)'
            : isCleared
            ? 'var(--color-textMuted)'
            : m.color || 'var(--color-text)',
          marginRight: 4,
          textDecoration: 'none',
          flexShrink: 0
        }}
      >
        {m.displayName || m.userLogin}:
      </span>
      {isSharedChat && (
        <span
          style={{
            fontSize: 9 * textScale,
            color: '#a78bfa',
            backgroundColor: '#2e1065',
            padding: '1px 4px',
            borderRadius: 3,
            fontWeight: 600,
            marginRight: 4
          }}
          title={`Сообщение из другого канала коллаборации${m.sourceChannelName ? `: ${m.sourceChannelName}` : ''}`}
        >
          🔗{m.sourceChannelName || ''}
        </span>
      )}
      <span
        style={{
          fontSize: 12 * textScale,
          color: isDeleted ? 'var(--color-textSecondary)' : isCleared ? 'var(--color-textMuted)' : 'var(--color-text)',
          textDecoration: isDeleted ? 'line-through' : 'none',
          wordBreak: 'break-word',
          overflowWrap: 'break-word',
          flex: 1,
          minWidth: 0
        }}
      >
        <MessageWithEmotes text={m.text} emotes={m.emotes} />
      </span>
      {isDeleted && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--color-error)',
            marginLeft: 'auto',
            flexShrink: 0,
            fontStyle: 'italic',
            fontWeight: 'bold'
          }}
        >
          [удалено]
        </span>
      )}
    </div>
  );
};
