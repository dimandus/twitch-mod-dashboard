import React from 'react';

interface ChannelStatus {
  login: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  modCount: number | null;
}

interface ChannelListProps {
  channels: string[];
  selectedChannel: string | null;
  channelStatus: Record<string, ChannelStatus>;
  onChannelSelect: (channel: string) => void;
  onChannelRemove: (channel: string) => void;
  onChannelContextMenu: (e: React.MouseEvent, channel: string) => void;
  textScale: number;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  channels,
  selectedChannel,
  channelStatus,
  onChannelSelect,
  onChannelRemove,
  onChannelContextMenu,
  textScale
}) => {
  if (channels.length === 0) {
    return (
      <div style={{ color: '#6b7280', fontSize: 12 * textScale, padding: '8px 4px' }}>
        Нет каналов. Нажми +, M или ♥
      </div>
    );
  }

  return (
    <>
      {channels.map((ch) => {
        const st = channelStatus[ch.toLowerCase()] || ({} as ChannelStatus);
        const dotColor = st.isLive === undefined ? '#4b5563' : st.isLive ? 'var(--color-success)' : '#ef4444';
        const isSelected = selectedChannel === ch;

        const viewerCount = st.viewerCount ?? 0;
        const hasViewerCount = st.viewerCount !== null && st.viewerCount !== undefined;
        const hasModCount = st.modCount !== null && st.modCount !== undefined;
        const statusText = hasModCount
          ? `(${viewerCount}/${st.modCount})`
          : hasViewerCount
          ? `(${viewerCount})`
          : '';

        return (
          <button
            key={ch}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '4px 6px',
              marginBottom: 4,
              borderRadius: 6,
              border: 'none',
              background: isSelected ? '#4b5563' : 'transparent',
              color: 'var(--color-text)',
              fontSize: 13 * textScale,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}
            onClick={() => onChannelSelect(ch)}
            onContextMenu={(e) => onChannelContextMenu(e, ch)}
            onDragStart={(e) => {
              e.dataTransfer.setData('text/channel-login', ch);
              e.dataTransfer.effectAllowed = 'copy';
            }}
            draggable
            title={st.isLive ? `${ch} онлайн: ${st.title || ''}` : `${ch} оффлайн`}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '999px',
                  background: dotColor,
                  flexShrink: 0
                }}
              />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ch}</span>
              {statusText && (
                <span
                  style={{
                    fontSize: 11 * textScale,
                    color: 'var(--color-textSecondary)',
                    marginLeft: 'auto',
                    flexShrink: 0
                  }}
                >
                  {statusText}
                </span>
              )}
              <span
                style={{
                  marginLeft: 4,
                  padding: '0 4px',
                  borderRadius: 4,
                  fontSize: 11,
                  color: 'var(--color-textSecondary)',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                title="Удалить канал из списка"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChannelRemove(ch);
                }}
              >
                ✕
              </span>
            </span>
          </button>
        );
      })}
    </>
  );
};
