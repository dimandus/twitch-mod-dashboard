import { useEffect, useRef } from 'react';
import type { ChatPane } from '../views/ChatArea';
import { logger } from '../utils/logger';

export const useAutoModConnection = (chatReady: boolean, panes: ChatPane[]) => {
  const reconnectTimerRef = useRef<number | null>(null);
  const lastChannelKeyRef = useRef<string>('');

  useEffect(() => {
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (!chatReady || panes.length === 0) {
      if (lastChannelKeyRef.current) {
        logger.info('[AutoMod] Отключение PubSub', {
          reason: 'no-channels-or-chat-not-ready'
        });
        window.electronAPI.automod.disconnect();
        lastChannelKeyRef.current = '';
      }
      return;
    }

    const channelLogins = Array.from(
      new Set(panes.map((p) => p.channel.toLowerCase()))
    ).sort();
    const channelKey = channelLogins.join(',');

    if (channelKey === lastChannelKeyRef.current) return;

    reconnectTimerRef.current = window.setTimeout(() => {
      logger.info('[AutoMod] Подключение PubSub', { channels: channelLogins });

      window.electronAPI.automod
        .connect(channelLogins)
        .then(() => {
          logger.info('[AutoMod] PubSub подключен', { channels: channelLogins });
        })
        .catch((err) => {
          logger.warn('[AutoMod] Не удалось подключить PubSub', err);
        });

      lastChannelKeyRef.current = channelKey;
      reconnectTimerRef.current = null;
    }, 600);
  }, [chatReady, panes]);

  useEffect(() => {
    const unsubscribe = window.electronAPI.automod.onLog((entry) => {
      const payload = entry?.data ? { ...entry.data } : undefined;
      const level = entry?.level || 'info';
      const message = entry?.message || 'AutoMod log';
      if (level === 'error') logger.error(`[AutoMod] ${message}`, payload);
      else if (level === 'warn') logger.warn(`[AutoMod] ${message}`, payload);
      else if (level === 'debug') logger.debug(`[AutoMod] ${message}`, payload);
      else logger.info(`[AutoMod] ${message}`, payload);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (lastChannelKeyRef.current) {
        logger.info('[AutoMod] Отключение PubSub', { reason: 'unmount' });
        window.electronAPI.automod.disconnect();
        lastChannelKeyRef.current = '';
      }
    };
  }, []);
};
