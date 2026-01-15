import React from 'react';
import { SLOW_MODE_OPTIONS, FOLLOWERS_MODE_OPTIONS } from '../../constants/chatConstants';
import { formatFollowersDuration } from '../../utils/chatHelpers';

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

type ChatModeKey = 'slow' | 'emote' | 'followers' | 'subs' | 'unique' | 'shield';

interface ChatModesBarProps {
  channel: string;
  modes: ChatModes;
  onModeToggle: (channel: string, mode: ChatModeKey, value?: number) => void;
  onClearChat: () => void;
  openDropdown: { channel: string; type: 'slow' | 'followers' } | null;
  onDropdownClick: (e: React.MouseEvent, channel: string, type: 'slow' | 'followers') => void;
  onSlowModeSelect: (channel: string, seconds: number) => void;
  onFollowersModeSelect: (channel: string, minutes: number) => void;
}

export const ChatModesBar: React.FC<ChatModesBarProps> = ({
  channel,
  modes,
  onModeToggle,
  onClearChat,
  openDropdown,
  onDropdownClick,
  onSlowModeSelect,
  onFollowersModeSelect
}) => {
  const isSlowDropdownOpen = openDropdown?.channel === channel && openDropdown?.type === 'slow';
  const isFollowersDropdownOpen = openDropdown?.channel === channel && openDropdown?.type === 'followers';

  return (
    <div
      style={{
        padding: '2px 4px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexShrink: 0,
        flexWrap: 'wrap'
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onModeToggle(channel, 'shield');
        }}
        style={modeButtonStyle(modes.shield, 'var(--color-error)')}
        title="Защитный режим"
      >
        🛡️
      </button>

      <div style={{ position: 'relative' }}>
        <button
          onClick={(e) => onDropdownClick(e, channel, 'slow')}
          style={modeButtonStyle(modes.slow)}
          title="Медленный режим"
        >
          Slow {modes.slow && modes.slowDuration > 0 ? `(${modes.slowDuration}с)` : ''}{' '}
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
                onClick={() => onSlowModeSelect(channel, opt.value)}
                style={dropdownItemStyle(
                  opt.value === 0
                    ? !modes.slow
                    : modes.slow && modes.slowDuration === opt.value
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
          onModeToggle(channel, 'emote');
        }}
        style={modeButtonStyle(modes.emote)}
        title="Только эмодзи"
      >
        Emote
      </button>

      <div style={{ position: 'relative' }}>
        <button
          onClick={(e) => onDropdownClick(e, channel, 'followers')}
          style={modeButtonStyle(modes.followers)}
          title="Только фолловеры"
        >
          Foll {modes.followers ? `(${formatFollowersDuration(modes.followersDuration)})` : ''}{' '}
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
                onClick={() => onFollowersModeSelect(channel, opt.value)}
                style={dropdownItemStyle(
                  opt.value === -1
                    ? !modes.followers
                    : modes.followers && modes.followersDuration === opt.value
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
          onModeToggle(channel, 'subs');
        }}
        style={modeButtonStyle(modes.subs)}
        title="Только подписчики"
      >
        Subs
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onModeToggle(channel, 'unique');
        }}
        style={modeButtonStyle(modes.unique)}
        title="Уникальные сообщения"
      >
        Uniq
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClearChat();
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
  );
};

function modeButtonStyle(active: boolean, activeColor = '#4ade80'): React.CSSProperties {
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
