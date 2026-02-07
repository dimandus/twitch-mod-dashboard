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
  ownerId?: string;
  emoteType?: string;
}

interface EmotePickerProps {
  paneId: string;
  tab: EmoteSource;
  onTabChange: (tab: EmoteSource) => void;
  globalEmotes: Emote[];
  userEmotes: Emote[];
  channelEmotes: Emote[];
  usageSnapshot: Record<string, number>;
  onEmoteSelect: (code: string) => void;
  textScale: number;
}

export const EmotePicker: React.FC<EmotePickerProps> = ({
  tab,
  onTabChange,
  globalEmotes,
  userEmotes,
  channelEmotes,
  usageSnapshot,
  onEmoteSelect,
  textScale
}) => {
  let list: Emote[] = [];
  if (tab === 'channel') list = channelEmotes;
  else if (tab === 'user') list = userEmotes;
  else if (tab === 'global') list = globalEmotes;

  const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name));

  const groups = new Map<string, { label: string; items: Emote[]; usage: number }>();
  if (tab === 'user') {
    for (const e of sorted) {
      const key = e.ownerName || e.ownerId || 'unknown';
      const label = e.ownerName ? e.ownerName : e.ownerId ? `ID: ${e.ownerId}` : 'Без владельца';
      const bucket = groups.get(key) || { label, items: [], usage: 0 };
      bucket.items.push(e);
      bucket.usage += usageSnapshot[e.name] || 0;
      groups.set(key, bucket);
    }
  }

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

      {!list.length ? (
        <div style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)', padding: 4 }}>
          Нет эмотов для этой вкладки.
        </div>
      ) : tab === 'user' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from(groups.entries())
            .sort(([, a], [, b]) => {
              const aUnknown = a.label === 'Без владельца';
              const bUnknown = b.label === 'Без владельца';
              if (aUnknown && !bUnknown) return 1;
              if (!aUnknown && bUnknown) return -1;
              const diff = b.usage - a.usage;
              if (Math.abs(diff) >= 5) return diff;
              return a.label.localeCompare(b.label);
            })
            .map(([key, group], idx) => (
            <div
              key={key}
              style={{
                paddingTop: idx === 0 ? 0 : 6,
                borderTop: idx === 0 ? 'none' : '1px solid var(--color-border)'
              }}
            >
              <div style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)', margin: '0 0 4px 2px' }}>
                {group.label}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {group.items.map((e) => (
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
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {sorted.map((e) => (
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
          ))}
        </div>
      )}
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
