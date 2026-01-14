import React, { useState, useEffect } from 'react';
import type { ErrorSeverity } from '../utils/errorHandler';

interface Notification {
  id: string;
  type: ErrorSeverity;
  message: string;
  context?: string;
}

const NotificationContainer: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const handler = (data: Omit<Notification, 'id'>) => {
      const id = `notif-${Date.now()}-${Math.random()}`;
      setNotifications(prev => [...prev, { ...data, id }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 5000);
    };

    if (window.electronAPI?.onNotification) {
      return window.electronAPI.onNotification(handler);
    }
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div style={containerStyle}>
      {notifications.map(notif => (
        <div key={notif.id} style={getNotificationStyle(notif.type)}>
          <div style={contentStyle}>
            <strong>{getIcon(notif.type)} {getTitle(notif.type)}</strong>
            <div>{notif.message}</div>
          </div>
          <button
            onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
            style={closeButtonStyle}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

function getIcon(type: ErrorSeverity): string {
  switch (type) {
    case 'info': return 'ℹ️';
    case 'warning': return '⚠️';
    case 'error': return '❌';
    case 'critical': return '🔴';
  }
}

function getTitle(type: ErrorSeverity): string {
  switch (type) {
    case 'info': return 'Информация';
    case 'warning': return 'Предупреждение';
    case 'error': return 'Ошибка';
    case 'critical': return 'Критическая ошибка';
  }
}

function getNotificationStyle(type: ErrorSeverity): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '12px 16px',
    marginBottom: 8,
    borderRadius: 6,
    color: '#fff',
    fontSize: 14,
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    animation: 'slideIn 0.3s ease-out'
  };

  switch (type) {
    case 'info':
      return { ...baseStyle, background: '#3b82f6' };
    case 'warning':
      return { ...baseStyle, background: '#f59e0b' };
    case 'error':
      return { ...baseStyle, background: '#ef4444' };
    case 'critical':
      return { ...baseStyle, background: '#dc2626' };
  }
}

const containerStyle: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 9999,
  maxWidth: 400,
  width: '100%'
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  marginRight: 12
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  fontSize: 18,
  padding: 0,
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.7
};

export default NotificationContainer;
