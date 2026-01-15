import React from 'react';

export type EmoteSource = 'global' | 'user' | 'channel';

export interface Emote {
  id: string;
  name: string;
  url1x: string;
  url2x: string;
  url4x: string;
  source: EmoteSource;
  ownerName?: string;
}

interface EmotePickerProps {
  paneId: string;
  tab: EmoteSource;
  onTabChange: (tab: EmoteSource) => void;
  globalEmotes: Emote[];
  userEmotes: Emote[];
  channelEmotes: Emote[];
  emoteUsage: Record<string, number>;
  onEmoteSelect: (code: string) => void;
  textScale: number;
}

export const EmotePicker: React.FC<EmotePickerProps> = ({
  tab,
  onTabChange,
  globalEmotes,
  userEmotes,
  channelEmotes,
  emoteUsage,
  onEmoteSelect,
  textScale
}) => {
  let list: Emote[] = [];
  if (tab === 'channel') list = channelEmotes;
  else if (tab === 'user') list = userEmotes;
  else if (tab === 'global') list = globalEmotes;

  const sorted = [...list].sort((a, b) => {
    const ua = emoteUsage[a.name] || 0;
    const ub = emoteUsage[b.name] || 0;
    if (ua !== ub) return ub - ua;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 72,
        left: 6,
        right: 6,
        maxHeight: 230,
        overflowY: 'auto',
        background: 'var(--color-chatMessage)',
        border: '1px solid #374151',
        borderRadius: 6,
        zIndex: 1900,
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        padding: 4
      }}
    >
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        <button
          style={emoteTabButtonStyle(tab === 'channel')}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('channel');
          }}
        >
          Канал
        </button>
        <button
          style={emoteTabButtonStyle(tab === 'user')}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('user');
          }}
        >
          Мои
        </button>
        <button
          style={emoteTabButtonStyle(tab === 'global')}
          onClick={(e) => {
            e.stopPropagation();
            onTabChange('global');
          }}
        >
          Глобальные
        </button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {!list.length ? (
          <div style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)', padding: 4 }}>
            Нет эмотов для этой вкладки.
          </div>
        ) : (
          sorted.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={(ev) => {
                ev.stopPropagation();
                onEmoteSelect(e.name);
              }}
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                border: 'none',
                background: 'var(--color-modInactive)',
                padding: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={e.ownerName ? `${e.name} (${e.ownerName})` : e.name}
            >
              <img
                src={e.url1x}
                alt={e.name}
                style={{ width: 24, height: 24 }}
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

const emoteTabButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '2px 4px',
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: active ? 'var(--color-border)' : 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 11,
  cursor: 'pointer'
});
