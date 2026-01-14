import { useEffect } from 'react';
import { useChatContext } from '../contexts/ChatContext';
import { defaultModes } from '../contexts/ChatContext';
import { handleError } from '../utils/errorHandler';

export const useRoomModes = () => {
  const { chatReady, chatPanes, roomModes, setRoomModes, modeChangeTimestamps } = useChatContext();

  useEffect(() => {
    if (!chatReady) return;

    const refreshChatSettings = async () => {
      const channels = chatPanes.map((p) => p.channel.toLowerCase());
      if (channels.length === 0) return;

      for (const chanLower of channels) {
        const lastChange = modeChangeTimestamps.current[chanLower];
        if (lastChange && Date.now() - lastChange < 5000) continue;

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

          setRoomModes((prev) => {
            const existing = prev[chanLower] || defaultModes;
            const lastChangeNow = modeChangeTimestamps.current[chanLower];
            if (lastChangeNow && Date.now() - lastChangeNow < 5000)
              return prev;

            return {
              ...prev,
              [chanLower]: {
                ...existing,
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
              }
            };
          });
        } catch (err) {
          handleError(err, `RefreshSettings:${chanLower}`);
        }
      }
    };

    const initialTimeout = setTimeout(refreshChatSettings, 5000);
    const intervalId = setInterval(refreshChatSettings, 30000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [chatReady, chatPanes, setRoomModes, modeChangeTimestamps]);

  return { roomModes };
};
