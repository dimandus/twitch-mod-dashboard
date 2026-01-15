import { useCallback } from 'react';
import type { ChatPane } from '../views/ChatArea';

interface UseChatPanesProps {
  chatPanes: ChatPane[];
  setChatPanes: React.Dispatch<React.SetStateAction<ChatPane[]>>;
  setRoomModes: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

export const useChatPanes = ({ chatPanes, setChatPanes, setRoomModes }: UseChatPanesProps) => {
  const loadChatSettings = useCallback(async (channel: string) => {
    const chanLower = channel.toLowerCase();

    try {
      const [rawSettings, rawShieldStatus] = await Promise.all([
        window.electronAPI.twitch.getChatSettings(chanLower),
        window.electronAPI.twitch
          .getShieldMode(chanLower)
          .catch(() => ({ is_active: false }))
      ]);

      const settings = rawSettings || ({} as any);
      const shieldStatus = rawShieldStatus || ({} as any);
      const shield = shieldStatus?.is_active ?? false;

      const modes = {
        slow: settings.slow_mode ?? false,
        slowDuration: settings.slow_mode_wait_time ?? 0,
        emote: settings.emote_mode ?? false,
        followers: settings.follower_mode ?? false,
        followersDuration: settings.follower_mode
          ? settings.follower_mode_duration ?? 0
          : -1,
        subs: settings.subscriber_mode ?? false,
        unique: settings.unique_chat_mode ?? false,
        shield
      };

      setRoomModes((prev) => ({ ...prev, [chanLower]: modes }));
    } catch (err) {
      console.warn('[useChatPanes] не удалось загрузить настройки чата', chanLower, err);
    }
  }, [setRoomModes]);

  const addChatPane = useCallback((channelLogin: string) => {
    const login = channelLogin.toLowerCase().trim();
    if (!login) return;

    setChatPanes((prev) => {
      if (prev.some((p) => p.channel.toLowerCase() === login))
        return prev;
      return [
        ...prev,
        {
          id: login,
          channel: login,
          paused: false,
          messages: [],
          buffer: []
        }
      ];
    });

    loadChatSettings(login);
  }, [setChatPanes, loadChatSettings]);

  const removeChatPane = useCallback((id: string) => {
    setChatPanes((prev) => prev.filter((p) => p.id !== id));
  }, [setChatPanes]);

  const clearChatPane = useCallback((id: string) => {
    setChatPanes((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, messages: [], buffer: [] } : p
      )
    );
  }, [setChatPanes]);

  const togglePausePane = useCallback((id: string) => {
    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        if (p.paused) {
          const merged = [...p.messages, ...p.buffer];
          if (merged.length > 300)
            merged.splice(0, merged.length - 300);
          return {
            ...p,
            paused: false,
            messages: merged,
            buffer: []
          };
        }
        return { ...p, paused: true };
      })
    );
  }, [setChatPanes]);

  const reorderChatPanes = useCallback((next: ChatPane[]) => {
    setChatPanes(next);
  }, [setChatPanes]);

  return {
    addChatPane,
    removeChatPane,
    clearChatPane,
    togglePausePane,
    reorderChatPanes
  };
};
