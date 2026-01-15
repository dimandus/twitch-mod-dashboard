import React from 'react';
import { TWITCH_COMMANDS } from '../../constants/chatConstants';

interface MentionAutocompleteProps {
  suggestions: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onApply: () => void;
  textScale: number;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  onApply,
  textScale
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 72,
        left: 6,
        right: 6,
        maxHeight: 150,
        overflowY: 'auto',
        background: 'var(--color-chatMessage)',
        border: '1px solid #374151',
        borderRadius: 6,
        zIndex: 2000,
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontSize: 12 * textScale
      }}
    >
      {suggestions.map((name, idx) => (
        <div
          key={name}
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            background: idx === selectedIndex ? 'var(--color-border)' : 'transparent',
            color: 'var(--color-text)'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(idx);
            onApply();
          }}
        >
          {name}
        </div>
      ))}
    </div>
  );
};

interface CommandAutocompleteProps {
  suggestions: typeof TWITCH_COMMANDS;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onApply: () => void;
}

export const CommandAutocomplete: React.FC<CommandAutocompleteProps> = ({
  suggestions,
  selectedIndex,
  onSelect,
  onApply
}) => {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 72,
        left: 6,
        right: 6,
        maxHeight: 150,
        overflowY: 'auto',
        background: 'var(--color-chatMessage)',
        border: '1px solid #374151',
        borderRadius: 6,
        zIndex: 2100,
        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
        fontSize: 12
      }}
    >
      {suggestions.map((cmd, idx) => (
        <div
          key={cmd.name}
          style={{
            padding: '4px 8px',
            cursor: 'pointer',
            background: idx === selectedIndex ? 'var(--color-border)' : 'transparent',
            color: 'var(--color-text)',
            display: 'flex',
            alignItems: 'center'
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(idx);
            onApply();
          }}
        >
          <span style={{ fontWeight: 600 }}>{cmd.name}</span>
          <span style={{ color: 'var(--color-textSecondary)', marginLeft: 8, fontSize: 11 }}>
            {cmd.desc}
          </span>
        </div>
      ))}
    </div>
  );
};
