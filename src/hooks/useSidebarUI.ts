import { useState, useEffect, useRef } from 'react';
import type { ChannelStatus, Toast, ChannelFilter, ChannelContextMenu, ViewerContextMenu } from '../types/sidebar';
import type { ViewerEntry } from '../utils/viewersHelpers';

export const useSidebarUI = () => {
  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [addChannelError, setAddChannelError] = useState<string | null>(null);
  
  const [modChannelsLoading, setModChannelsLoading] = useState(false);
  const [followedChannelsLoading, setFollowedChannelsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  const [channelContextMenu, setChannelContextMenu] = useState<ChannelContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    channelLogin: null
  });
  
  const [viewerContextMenu, setViewerContextMenu] = useState<ViewerContextMenu>({
    visible: false,
    x: 0,
    y: 0,
    viewer: null
  });
  
  const [channelStatus, setChannelStatus] = useState<Record<string, ChannelStatus>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('all');
  const [moderatedLogins, setModeratedLogins] = useState<string[]>([]);
  const [badgeSets, setBadgeSets] = useState<Record<string, Record<string, any>>>({});
  const [autoScale, setAutoScale] = useState(1);
  
  const lastLiveRef = useRef<Record<string, boolean>>({});

  // Загрузка мод-каналов
  useEffect(() => {
    (async () => {
      try {
        const list = await window.electronAPI.twitch.getModeratedChannels();
        if (!list) return;
        const logins = list.map((ch: any) => ch.broadcaster_login.toLowerCase());
        setModeratedLogins(logins);
      } catch (err) {
        console.warn('[useSidebarUI] не удалось получить мод-каналы', err);
      }
    })();
  }, []);

  // Загрузка бейджей
  useEffect(() => {
    (async () => {
      try {
        const json = await window.electronAPI.twitch.getGlobalBadges();
        const sets: Record<string, Record<string, any>> = {};
        for (const set of json.data || []) {
          const vers: Record<string, any> = {};
          for (const v of set.versions || []) {
            vers[v.id] = v;
          }
          sets[set.set_id] = vers;
        }
        setBadgeSets(sets);
      } catch (err) {
        console.warn('[useSidebarUI] не удалось загрузить бейджи', err);
      }
    })();
  }, []);

  // Авто-скейл
  useEffect(() => {
    const updateAutoScale = () => {
      const wScale = window.innerWidth / 1920;
      const hScale = window.innerHeight / 1080;
      const next = Math.min(wScale, hScale);
      const clamped = Math.min(1.5, Math.max(0.7, next));
      setAutoScale(clamped);
    };
    updateAutoScale();
    window.addEventListener('resize', updateAutoScale);
    return () => window.removeEventListener('resize', updateAutoScale);
  }, []);

  // Закрытие контекстных меню
  useEffect(() => {
    const close = () => {
      setChannelContextMenu((prev) => prev.visible ? { ...prev, visible: false, channelLogin: null } : prev);
      setViewerContextMenu((prev) => prev.visible ? { ...prev, visible: false, viewer: null } : prev);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const addToast = (text: string, type: Toast['type'] = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
  };

  return {
    isAddChannelOpen,
    setIsAddChannelOpen,
    newChannelName,
    setNewChannelName,
    addChannelError,
    setAddChannelError,
    modChannelsLoading,
    setModChannelsLoading,
    followedChannelsLoading,
    setFollowedChannelsLoading,
    importError,
    setImportError,
    channelContextMenu,
    setChannelContextMenu,
    viewerContextMenu,
    setViewerContextMenu,
    channelStatus,
    setChannelStatus,
    toasts,
    channelFilter,
    setChannelFilter,
    moderatedLogins,
    setModeratedLogins,
    badgeSets,
    autoScale,
    lastLiveRef,
    addToast
  };
};
