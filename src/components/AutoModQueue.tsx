import React, { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export interface AutoModMessage {
  msgId: string;
  channel: string;
  userId: string;
  userLogin: string;
  message: string;
  reason: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'denied';
}

interface AutoModQueueProps {
  onClose: () => void;
}

const AutoModQueue: React.FC<AutoModQueueProps> = ({ onClose }) => {
  const [queue, setQueue] = useState<AutoModMessage[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const initialQueue = await window.electronAPI.automod.getQueue();
        if (!cancelled && Array.isArray(initialQueue) && initialQueue.length > 0) {
          setQueue(initialQueue);
        }
      } catch (err) {
        logger.warn('[AutoMod] Не удалось загрузить очередь', err);
      }
    })();

    const unsubscribe = window.electronAPI.automod.onMessage((data: any) => {
      logger.info('[AutoMod] Raw payload', JSON.stringify(data));
      logger.info('[AutoMod] Получено сообщение', data);

      try {
        const payload = data?.data || data;
        const msgId = payload?.id || payload?.content_classification?.msg_id || payload?.message?.id;
        const channel = payload?.message?.channel_login || payload?.channel_login || payload?.channel;
        const userId = payload?.message?.sender?.user_id;
        const userLogin = payload?.message?.sender?.login;
        const message = payload?.message?.content?.text || payload?.message?.content?.message || '';
        const reason = payload?.reason_code || payload?.caught_message_reason?.reason || 'unknown';

        if (!msgId || !message) {
          logger.warn('[AutoMod] Неполные данные', { msgId, channel, userId, userLogin, reason });
          return;
        }

        const automodMsg: AutoModMessage = {
          msgId,
          channel,
          userId,
          userLogin,
          message,
          reason,
          timestamp: Date.now(),
          status: 'pending'
        };

        setQueue((prev) => {
          // Проверяем, нет ли уже такого сообщения
          if (prev.some((m) => m.msgId === msgId)) {
            return prev;
          }
          return [...prev, automodMsg];
        });
      } catch (err) {
        logger.error('[AutoMod] Ошибка обработки', err);
      }
    });

    return () => {
      cancelled = true;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleApprove = async (msgId: string) => {
    try {
      await window.electronAPI.automod.approve(msgId);
      logger.info('[AutoMod] Одобрено', { msgId });
      setQueue((prev) =>
        prev.map((m) =>
          m.msgId === msgId ? { ...m, status: 'approved' } : m
        )
      );

      // Удаляем через 2 секунды
      setTimeout(() => {
        setQueue((prev) => prev.filter((m) => m.msgId !== msgId));
      }, 2000);
    } catch (err) {
      logger.error('[AutoMod] Ошибка одобрения', err);
      alert('Не удалось одобрить сообщение');
    }
  };

  const handleDeny = async (msgId: string) => {
    try {
      await window.electronAPI.automod.deny(msgId);
      logger.info('[AutoMod] Отклонено', { msgId });
      setQueue((prev) =>
        prev.map((m) =>
          m.msgId === msgId ? { ...m, status: 'denied' } : m
        )
      );

      // Удаляем через 2 секунды
      setTimeout(() => {
        setQueue((prev) => prev.filter((m) => m.msgId !== msgId));
      }, 2000);
    } catch (err) {
      logger.error('[AutoMod] Ошибка отклонения', err);
      alert('Не удалось отклонить сообщение');
    }
  };

  const pendingCount = queue.filter((m) => m.status === 'pending').length;

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h2 style={titleStyle}>
            🛡️ AutoMod Очередь {pendingCount > 0 && `(${pendingCount})`}
          </h2>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        <div style={contentStyle}>
          {queue.length === 0 ? (
            <div style={emptyStyle}>
              <p>Нет сообщений в очереди AutoMod</p>
              <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>
                Сообщения, задержанные AutoMod, появятся здесь
              </p>
            </div>
          ) : (
            <div style={listStyle}>
              {queue.map((msg) => (
                <div
                  key={msg.msgId}
                  style={{
                    ...itemStyle,
                    opacity: msg.status !== 'pending' ? 0.5 : 1
                  }}
                >
                  <div style={itemHeaderStyle}>
                    <span style={userStyle}>
                      {msg.userLogin}
                    </span>
                    <span style={channelStyle}>#{msg.channel}</span>
                  </div>

                  <div style={messageStyle}>{msg.message}</div>

                  <div style={reasonStyle}>
                    Причина: {translateReason(msg.reason)}
                  </div>

                  {msg.status === 'pending' ? (
                    <div style={actionsStyle}>
                      <button
                        onClick={() => handleApprove(msg.msgId)}
                        style={approveButtonStyle}
                      >
                        ✓ Разрешить
                      </button>
                      <button
                        onClick={() => handleDeny(msg.msgId)}
                        style={denyButtonStyle}
                      >
                        ✗ Удалить
                      </button>
                    </div>
                  ) : (
                    <div style={statusStyle}>
                      {msg.status === 'approved' ? '✓ Одобрено' : '✗ Удалено'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Перевод причин AutoMod
function translateReason(reason: string): string {
  const reasons: Record<string, string> = {
    'aggressive': 'Агрессивный язык',
    'identity_based': 'Дискриминация',
    'profanity': 'Нецензурная лексика',
    'sexual': 'Сексуальный контент',
    'unknown': 'Неизвестная причина'
  };
  return reasons[reason] || reason;
}

// Стили
const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000
};

const modalStyle: React.CSSProperties = {
  background: '#18181b',
  borderRadius: 8,
  width: '90%',
  maxWidth: 600,
  maxHeight: '80vh',
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid #9147ff'
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 20px',
  borderBottom: '1px solid #27272f'
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 18,
  color: '#fff'
};

const closeButtonStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  fontSize: 24,
  cursor: 'pointer',
  padding: 0,
  width: 32,
  height: 32
};

const contentStyle: React.CSSProperties = {
  flex: 1,
  overflow: 'auto',
  padding: 16
};

const emptyStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '40px 20px',
  color: '#999'
};

const listStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12
};

const itemStyle: React.CSSProperties = {
  background: '#27272f',
  borderRadius: 6,
  padding: 12,
  border: '1px solid #3f3f46'
};

const itemHeaderStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 8
};

const userStyle: React.CSSProperties = {
  fontWeight: 'bold',
  color: '#9147ff'
};

const channelStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#999'
};

const messageStyle: React.CSSProperties = {
  padding: '8px 0',
  color: '#fff',
  wordBreak: 'break-word'
};

const reasonStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#f87171',
  marginBottom: 8
};

const actionsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8
};

const approveButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: '#22c55e',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold'
};

const denyButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 'bold'
};

const statusStyle: React.CSSProperties = {
  textAlign: 'center',
  padding: '8px',
  color: '#999',
  fontSize: 13
};

export default AutoModQueue;
