import { useState, useEffect } from 'react';
import { buildEmoteUrls } from '../utils/chatHelpers';
import type { Emote, EmoteSource } from '../components/chat/EmotePicker';

export const useChatEmotes = (chatPanes: any[]) => {
  const [globalEmotes, setGlobalEmotes] = useState<Emote[]>([]);
  const [userEmotes, setUserEmotes] = useState<Emote[]>([]);
  const [channelEmotes, setChannelEmotes] = useState<Record<string, Emote[]>>({});
  const [emotePicker, setEmotePicker] = useState<{ paneId: string; tab: EmoteSource; openedAt: number } | null>(null);
  const [emoteUsage, setEmoteUsage] = useState<Record<string, number>>({});

  // Загрузка глобальных и пользовательских эмотов
  useEffect(() => {
    (async () => {
      try {
        const rawGlobal = await window.electronAPI.twitch.getGlobalEmotes?.();
        if (Array.isArray(rawGlobal)) {
          setGlobalEmotes(
            rawGlobal.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'global',
                ownerName: e.owner_name,
                ownerId: e.owner_id,
                emoteType: e.emote_type
              } as Emote;
            })
          );
        }

        const rawUser = await window.electronAPI.twitch.getUserEmotes?.();
        if (Array.isArray(rawUser)) {
          setUserEmotes(
            rawUser.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'user',
                ownerName: e.owner_name,
                ownerId: e.owner_id,
                emoteType: e.emote_type
              } as Emote;
            })
          );
        }
      } catch (err) {
        console.warn('[useChatEmotes] не удалось загрузить эмоты', err);
      }
    })();
  }, []);

  // Загрузка эмотов каналов
  useEffect(() => {
    (async () => {
      try {
        for (const pane of chatPanes) {
          const login = pane.channel.toLowerCase().trim();
          if (!login || channelEmotes[login]) continue;

          const raw = await window.electronAPI.twitch.getChannelEmotes?.(login);
          if (!Array.isArray(raw)) continue;

          const emotes: Emote[] = raw.map((e: any) => {
            const urls = buildEmoteUrls(e.id);
            return {
              id: e.id,
              name: e.name,
              url1x: urls.url1x,
              url2x: urls.url2x,
              url4x: urls.url4x,
              source: 'channel',
              ownerName: e.owner_name,
              ownerId: e.owner_id,
              emoteType: e.emote_type
            } as Emote;
          });

          setChannelEmotes((prev) => ({ ...prev, [login]: emotes }));
        }
      } catch (err) {
        console.warn('[useChatEmotes] не удалось загрузить эмоты каналов', err);
      }
    })();
  }, [chatPanes, channelEmotes]);

  // Загрузка статистики
  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.config.get('ui.chat.emoteUsage');
        if (stored && typeof stored === 'object') {
          setEmoteUsage(stored as Record<string, number>);
        }
      } catch (err) {
        console.warn('[useChatEmotes] не удалось загрузить статистику', err);
      }
    })();
  }, []);

  // Сохранение статистики
  useEffect(() => {
    (async () => {
      try {
        await window.electronAPI.config.set('ui.chat.emoteUsage', emoteUsage);
      } catch (err) {
        console.warn('[useChatEmotes] не удалось сохранить статистику', err);
      }
    })();
  }, [emoteUsage]);

  const incrementEmoteUsage = (code: string) => {
    setEmoteUsage((prev) => ({
      ...prev,
      [code]: (prev[code] || 0) + 1
    }));
  };

  return {
    globalEmotes,
    userEmotes,
    channelEmotes,
    emotePicker,
    setEmotePicker,
    emoteUsage,
    incrementEmoteUsage
  };
};
