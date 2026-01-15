import React from 'react';

interface AddChannelModalProps {
  isOpen: boolean;
  channelName: string;
  error: string | null;
  onChannelNameChange: (name: string) => void;
  onAdd: () => void;
  onClose: () => void;
  textScale: number;
}

export const AddChannelModal: React.FC<AddChannelModalProps> = ({
  isOpen,
  channelName,
  error,
  onChannelNameChange,
  onAdd,
  onClose,
  textScale
}) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1500
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          padding: '16px 20px',
          borderRadius: 8,
          width: 320,
          boxShadow: '0 10px 25px rgba(0,0,0,0.7)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 16 * textScale }}>
          Добавить канал
        </h3>
        <input
          type="text"
          value={channelName}
          onChange={(e) => onChannelNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onAdd();
          }}
          placeholder="Логин канала"
          style={{
            width: '100%',
            padding: '6px 8px',
            borderRadius: 6,
            border: '1px solid #374151',
            background: '#020617',
            color: 'var(--color-text)',
            fontSize: 13 * textScale
          }}
          autoFocus
        />
        {error && (
          <div style={{ color: '#fecaca', fontSize: 12 * textScale, marginTop: 4 }}>
            {error}
          </div>
        )}
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #4b5563',
              background: '#1f2933',
              color: 'var(--color-text)',
              fontSize: 13 * textScale,
              cursor: 'pointer'
            }}
          >
            Отмена
          </button>
          <button
            onClick={onAdd}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: 13 * textScale,
              cursor: 'pointer'
            }}
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
};
