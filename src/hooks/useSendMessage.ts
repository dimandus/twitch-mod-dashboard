import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { twitchChatClient } from '../chat/TwitchChatClient';
import { handleModCommand } from '../commands/ModCommands';

export const useSendMessage = () => {
  const setPanes = useChatStore(state => state.setPanes);

  const sendMessage = useCallback(async (channel: string, text: string) => {
    const chanLower = channel.toLowerCase().trim();
    const trimmed = text.trim();
    if (!chanLower || !trimmed) return;

    if (trimmed.startsWith('/')) {
      const [cmd, ...args] = trimmed.slice(1).split(' ');

      try {
        const result = await handleModCommand(
          chanLower,
          cmd,
          args,
          window.electronAPI.twitch
        );

        if (result.handled && result.systemMessage) {
          const systemMsg = {
            id: `sys-${Date.now()}-${Math.random()}`,
            text: result.systemMessage,
            userLogin: '',
            displayName: '',
            color: '',
            badges: [],
            self: false,
            timestamp: Date.now(),
            isSystem: true
          };
          setPanes((prev) =>
            prev.map((p) => {
              if (p.channel.toLowerCase() !== chanLower) return p;
              return {
                ...p,
                messages: [...p.messages, systemMsg],
                buffer: p.paused ? [...p.buffer, systemMsg] : p.buffer
              };
            })
          );
          return;
        }

        if (!result.handled) {
          await twitchChatClient.sendMessage(chanLower, trimmed);
        }
      } catch (err) {
        console.error('[useSendMessage] Ошибка выполнения команды:', trimmed, err);
      }
      return;
    }

    try {
      const result = await window.electronAPI.twitch.sendChatMessage(chanLower, trimmed);
      if (!result || !result.messageId) {
        await twitchChatClient.sendMessage(chanLower, trimmed);
      }
    } catch (err) {
      try {
        await twitchChatClient.sendMessage(chanLower, trimmed);
      } catch (err2) {
        console.error('[useSendMessage] fallback отправка через IRC не удалась', err2);
      }
    }
  }, [setPanes]);

  return sendMessage;
};
