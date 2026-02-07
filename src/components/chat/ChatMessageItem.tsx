import React, { useMemo } from 'react';
import { Badges } from './Badges';
import { MessageWithEmotes } from './MessageWithEmotes';
import { ChatMessage } from '../../views/ChatArea';
import { useAutoModerationStore } from '../../stores/autoModerationStore';
import { checkAutoModTriggers } from '../../utils/autoModHelpers';

interface ChatMessageItemProps {
  message: ChatMessage;
  textScale: number;
  lineHeight: number;
  badgeSets: Record<string, Record<string, any>>;
  onContextMenu: (e: React.MouseEvent) => void;
  messageSpacing?: number; // px, optional
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = React.memo(({
  message: m,
  textScale,
  lineHeight,
  badgeSets,
  onContextMenu,
  messageSpacing = 4
}) => {
  const { enabled: autoModEnabled, triggers } = useAutoModerationStore();
  
  // Мемоизируем проверку триггеров
  const isAutoModTriggered = useMemo(
    () => !m.isSystem && autoModEnabled && checkAutoModTriggers(m.text, triggers),
    [m.isSystem, m.text, autoModEnabled, triggers]
  );
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
          margin: '4px 0',
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

  // Определяем фон сообщения
  const getMessageBackground = () => {
    if (isDeleted) return 'var(--color-chatMessageDeleted)';
    if (isMentionedSelf) return 'var(--color-chatMessageMention)';
    if (isRaider) return 'var(--color-chatMessageRaid)';
    return 'var(--color-chatMessage)';
  };

  // Определяем рамку сообщения
  const getMessageBorder = () => {
    if (isDeleted) return '2px solid var(--color-error)';
    if (isAutoModTriggered) return '2px solid #f59e0b'; // Желтая рамка для триггеров
    if (isRaider) return '2px solid #3b82f6';
    return '1px solid transparent';
  };

  return (
    <div
      onContextMenu={onContextMenu}
      data-msg-id={m.msgId}
      style={{
        fontSize: 12 * textScale,
        background: getMessageBackground(),
        border: getMessageBorder(),
        borderRadius: 4,
        padding: '2px 4px',
        margin: `0 0 ${messageSpacing}px 0`,
        display: 'block',
        opacity: isDeleted ? 0.7 : isCleared ? 0.6 : 1,
        cursor: 'context-menu',
        textDecoration: 'none',
        boxShadow: isFirstMessage ? '0 0 0 1px var(--color-chatMessageFirst)' : 'none',
        zIndex: isFirstMessage ? 1 : 'auto',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        position: 'relative'
      }}
    >
      <span style={{ display: 'inline-flex', gap: 2, marginRight: 4, alignItems: 'baseline' }}>
        <Badges
          badges={m.badges}
          badgeVersions={m.badgeVersions}
          badgeInfo={m.badgeInfo}
          badgeSets={badgeSets}
          textScale={textScale}
        />
      </span>
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
          textDecoration: 'none'
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
            marginRight: 4,
            display: 'inline-block'
          }}
          title={`Сообщение из другого канала коллаборации${m.sourceChannelName ? `: ${m.sourceChannelName}` : ''}`}
        >
          🔗{m.sourceChannelName || ''}
        </span>
      )}
      <span
        style={{
          fontSize: 12 * textScale,
          lineHeight: `${lineHeight}px`,
          color: isDeleted ? 'var(--color-textSecondary)' : isCleared ? 'var(--color-textMuted)' : 'var(--color-text)',
          textDecoration: isDeleted ? 'line-through' : 'none',
          wordBreak: 'break-word',
          overflowWrap: 'break-word'
        }}
      >
        <MessageWithEmotes text={m.text} emotes={m.emotes} />
      </span>
      {isDeleted && (
        <span
          style={{
            fontSize: 10,
            color: 'var(--color-error)',
            marginLeft: 6,
            fontStyle: 'italic',
            fontWeight: 'bold',
            whiteSpace: 'nowrap'
          }}
        >
          [удалено]
        </span>
      )}
      {isAutoModTriggered && (
        <span
          style={{
            fontSize: 14,
            marginLeft: 6,
            whiteSpace: 'nowrap'
          }}
          title="Сообщение соответствует триггеру автомодерации"
        >
          ⚠️
        </span>
      )}
    </div>
  );
});
