import { useCallback } from 'react';

type ChatModeKey = 'slow' | 'emote' | 'followers' | 'subs' | 'unique' | 'shield';

interface ChatModes {
  slow: boolean;
  slowDuration: number;
  emote: boolean;
  followers: boolean;
  followersDuration: number;
  subs: boolean;
  unique: boolean;
  shield: boolean;
}

const defaultModes: ChatModes = {
  slow: false,
  slowDuration: 0,
  emote: false,
  followers: false,
  followersDuration: -1,
  subs: false,
  unique: false,
  shield: false
};

interface UseChatModesProps {
  roomModes: Record<string, ChatModes>;
  setRoomModes: React.Dispatch<React.SetStateAction<Record<string, ChatModes>>>;
  markModeChanged: (channel: string) => void;
}

export const useChatModes = ({ roomModes, setRoomModes, markModeChanged }: UseChatModesProps) => {
  const toggleMode = useCallback(async (
    channel: string,
    mode: ChatModeKey,
    value?: number
  ) => {
    const chanLower = channel.toLowerCase().trim();
    if (!chanLower) return;

    const current = roomModes[chanLower] || defaultModes;

    markModeChanged(chanLower);

    try {
      switch (mode) {
        case 'slow': {
          const seconds = value ?? 0;
          const enabled = seconds > 0;
          await window.electronAPI.twitch.slowMode(
            chanLower,
            enabled,
            seconds
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: {
              ...current,
              slow: enabled,
              slowDuration: seconds
            }
          }));
          break;
        }

        case 'followers': {
          const minutes = value ?? -1;
          const enabled = minutes >= 0;

          if (enabled) {
            await window.electronAPI.twitch.followersOnly(
              chanLower,
              true,
              minutes
            );
          } else {
            await window.electronAPI.twitch.followersOnly(
              chanLower,
              false,
              0
            );
          }

          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: {
              ...current,
              followers: enabled,
              followersDuration: enabled ? minutes : -1
            }
          }));
          break;
        }

        case 'emote': {
          const enabled = !current.emote;
          await window.electronAPI.twitch.emoteOnly(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, emote: enabled }
          }));
          break;
        }

        case 'subs': {
          const enabled = !current.subs;
          await window.electronAPI.twitch.subscribersOnly(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, subs: enabled }
          }));
          break;
        }

        case 'unique': {
          const enabled = !current.unique;
          await window.electronAPI.twitch.updateChatSettings(
            chanLower,
            { unique_chat_mode: enabled }
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, unique: enabled }
          }));
          break;
        }

        case 'shield': {
          const enabled = !current.shield;
          await window.electronAPI.twitch.setShieldMode(
            chanLower,
            enabled
          );
          setRoomModes((prev) => ({
            ...prev,
            [chanLower]: { ...current, shield: enabled }
          }));
          break;
        }
      }
    } catch (err) {
      console.error('[useChatModes] ошибка', mode, value, err);
    }
  }, [roomModes, setRoomModes, markModeChanged]);

  return { toggleMode };
};
