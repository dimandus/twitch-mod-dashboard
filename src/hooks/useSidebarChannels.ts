import { useState, useEffect } from 'react';
import type { ChannelStatus } from '../types/sidebar';

export const useSidebarChannels = (
  onChannelSelected: (channel: string | null) => void,
  onRemoveChannelFromApp: (channel: string) => void,
  selectedChannel: string | null,
  setViewers: (viewers: any[]) => void,
  setViewersError: (error: string | null) => void,
  channelStatus: Record<string, ChannelStatus>,
  setChannelStatus: (status: Record<string, ChannelStatus> | ((prev: Record<string, ChannelStatus>) => Record<string, ChannelStatus>)) => void,
  lastLiveRef: React.MutableRefObject<Record<string, boolean>>,
  addToast: (text: string, type?: 'info' | 'success' | 'error') => void
) => {
  const [channels, setChannels] = useState<string[]>([]);

  // Загрузка каналов
  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.config.get('settings.channels');
        if (Array.isArray(stored)) setChannels(stored);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Опрос статуса каналов
  useEffect(() => {
    if (!channels.length) {
      setChannelStatus({});
      lastLiveRef.current = {};
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const statuses = await window.electronAPI.twitch.getChannelsLiveStatus(channels);
        if (cancelled || !statuses) return;
        setChannelStatus(() => {
          const next: Record<string, ChannelStatus> = {};
          const last = lastLiveRef.current;
          const newLast: Record<string, boolean> = {};
          for (const st of statuses) {
            const key = st.login.toLowerCase();
            const was = last[key];
            const now = st.isLive;
            next[key] = st;
            newLast[key] = now;
            if (was !== undefined && was !== now) {
              addToast(`${st.login} ${now ? '🟢 онлайн' : '🔴 оффлайн'}`, now ? 'success' : 'info');
            }
          }
          lastLiveRef.current = newLast;
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    };
    poll();
    const intervalId = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [channels, setChannelStatus, lastLiveRef, addToast]);

  const handleSelectChannel = (channelLogin: string) => {
    onChannelSelected(channelLogin);
  };

  const handleAddChannel = async (newChannelName: string) => {
    const raw = newChannelName.trim().toLowerCase();
    if (!raw) return { error: 'Укажи логин канала' };
    if (channels.some((ch) => ch.toLowerCase() === raw)) {
      return { error: 'Канал уже есть' };
    }
    const updated = [...channels, raw];
    setChannels(updated);
    try {
      await window.electronAPI.config.set('settings.channels', updated);
    } catch {}
    handleSelectChannel(raw);
    return { success: true };
  };

  const mergeChannels = (newLogins: string[]): number => {
    const existing = new Set(channels.map((c) => c.toLowerCase()));
    const toAdd: string[] = [];
    for (const login of newLogins) {
      if (!existing.has(login)) {
        toAdd.push(login);
        existing.add(login);
      }
    }
    if (toAdd.length === 0) return 0;
    const merged = [...channels, ...toAdd];
    setChannels(merged);
    window.electronAPI.config.set('settings.channels', merged).catch(console.error);
    return toAdd.length;
  };

  const removeChannel = async (login: string) => {
    const lower = login.toLowerCase();
    const updated = channels.filter((ch) => ch.toLowerCase() !== lower);
    setChannels(updated);
    try {
      await window.electronAPI.config.set('settings.channels', updated);
    } catch {}
    if (selectedChannel?.toLowerCase() === lower) {
      setViewers([]);
      setViewersError(null);
      onChannelSelected(null);
    }
    onRemoveChannelFromApp(login);
  };

  const handleClearAllChannels = async () => {
    if (channels.length === 0) return;
    const prevList = [...channels];
    setChannels([]);
    try {
      await window.electronAPI.config.set('settings.channels', []);
    } catch {}
    if (selectedChannel) {
      setViewers([]);
      setViewersError(null);
      onChannelSelected(null);
    }
    prevList.forEach((login) => onRemoveChannelFromApp(login));
  };

  return {
    channels,
    handleSelectChannel,
    handleAddChannel,
    mergeChannels,
    removeChannel,
    handleClearAllChannels
  };
};
