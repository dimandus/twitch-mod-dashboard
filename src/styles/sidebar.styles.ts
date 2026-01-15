import React from 'react';

export const sidebarStyle = (collapsed: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid var(--color-border)',
  transition: 'width 0.2s ease',
  width: collapsed ? 36 : '20%',
  minWidth: collapsed ? 36 : 220,
  maxWidth: collapsed ? 36 : 420,
  overflow: 'hidden',
  height: '100%'
});

export const sidebarHeaderStyle = (collapsed: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: collapsed ? 'center' : 'space-between',
  padding: '6px 8px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  flexShrink: 0
});

export const collapseButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: 'var(--color-text)',
  fontSize: 10,
  cursor: 'pointer'
};

export const sectionStyle: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0
};

export const sectionHeaderStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--color-textSecondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 4,
  flexShrink: 0
};

export const scrollListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 4px 8px 4px',
  minHeight: 0
};

export const iconButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

export const channelFilterButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: 999,
  border: `1px solid ${active ? 'var(--color-primary)' : '#4b5563'}`,
  background: active ? '#1f2937' : 'transparent',
  color: 'var(--color-text)',
  fontSize: 10,
  cursor: 'pointer'
});

export const contextMenuStyle = (x: number, y: number): React.CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  background: 'var(--color-surface)',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  zIndex: 2000,
  width: 'max-content',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
});

export const contextMenuHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  color: 'var(--color-textSecondary)',
  borderBottom: '1px solid var(--color-border)',
  marginBottom: 4
};

export const menuItemStyle: React.CSSProperties = {
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

export const menuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  margin: '4px 0'
};

export const toastContainerStyle: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 2500,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

export const toastStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid #4b5563',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--color-text)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};
