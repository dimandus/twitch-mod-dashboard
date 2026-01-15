import React from 'react';
import { themes, ThemeName } from '../../themes';

interface DesignTabProps {
  currentTheme: ThemeName;
  onThemeChange: (theme: ThemeName) => void;
}

export const DesignTab: React.FC<DesignTabProps> = ({ currentTheme, onThemeChange }) => {
  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>🎨 Тема оформления</h3>
      <p style={hintStyle}>
        Выбери тему, которая тебе нравится. Изменения применяются мгновенно.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
        {(Object.keys(themes) as ThemeName[]).map((themeName) => {
          const theme = themes[themeName];
          const isActive = currentTheme === themeName;

          return (
            <button
              key={themeName}
              onClick={() => onThemeChange(themeName)}
              style={{
                padding: 12,
                borderRadius: 8,
                border: `2px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                background: theme.colors.surface,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                transition: 'all 0.2s'
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.colors.text }}>
                {theme.name}
              </div>

              <div style={{ display: 'flex', gap: 4, height: 24 }}>
                <div style={{ flex: 1, background: theme.colors.background, borderRadius: 4 }} />
                <div style={{ flex: 1, background: theme.colors.primary, borderRadius: 4 }} />
                <div style={{ flex: 1, background: theme.colors.success, borderRadius: 4 }} />
              </div>

              {isActive && (
                <div style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 600 }}>
                  ✓ Активна
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  background: 'var(--color-surface)',
  borderRadius: 8,
  border: '1px solid var(--color-border)'
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 16,
  fontWeight: 600
};

const hintStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 12,
  color: '#9ca3af'
};
