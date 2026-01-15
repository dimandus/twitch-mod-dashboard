import { useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useUserStore } from '../stores/userStore';
import { handleError } from '../utils/errorHandler';

export const useModeration = () => {
  const setPanes = useChatStore(state => state.setPanes);
  const setGlobalUsers = useUserStore(state => state.setGlobalUsers);

  const markMessageAsDeleted = useCallback((channel: string, msgId: string) => {
    if (!msgId || msgId.startsWith('local-')) return;

    const chanLower = channel.toLowerCase();

    setPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        return {
          ...p,
          messages: p.messages.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          ),
          buffer: p.buffer.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          )
        };
      })
    );

    setGlobalUsers((prev) => {
      const updated = { ...prev };
      for (const login of Object.keys(updated)) {
        const user = updated[login];
        const hasMessage = user.messages.some((m) => m.msgId === msgId);
        if (hasMessage) {
          updated[login] = {
            ...user,
            messages: user.messages.map((m) =>
              m.msgId === msgId ? { ...m, deleted: true } : m
            )
          };
        }
      }
      return updated;
    });
  }, [setPanes, setGlobalUsers]);

  const markUserMessagesAsDeleted = useCallback((channel: string, userLogin: string) => {
    const chanLower = channel.toLowerCase();
    const loginLower = userLogin.toLowerCase();

    setPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        const mark = (m: any) => {
          if (m.deleted) return m;
          if (m.userLogin.toLowerCase() === loginLower)
            return { ...m, deleted: true };
          return m;
        };
        return {
          ...p,
          messages: p.messages.map(mark),
          buffer: p.buffer.map(mark)
        };
      })
    );

    setGlobalUsers((prev) => {
      const userData = prev[loginLower];
      if (!userData) return prev;

      return {
        ...prev,
        [loginLower]: {
          ...userData,
          messages: userData.messages.map((m) =>
            m.channel === chanLower ? { ...m, deleted: true } : m
          )
        }
      };
    });
  }, [setPanes, setGlobalUsers]);

  const performUserModeration = useCallback(async (
    action: 'timeout' | 'ban' | 'unban',
    channel: string,
    userLogin: string,
    duration?: number
  ) => {
    try {
      switch (action) {
        case 'timeout':
          await window.electronAPI.twitch.timeoutUser(
            channel,
            userLogin,
            duration || 600,
            ''
          );
          markUserMessagesAsDeleted(channel, userLogin);
          break;
        case 'ban':
          await window.electronAPI.twitch.banUser(
            channel,
            userLogin,
            null,
            ''
          );
          markUserMessagesAsDeleted(channel, userLogin);
          break;
        case 'unban':
          await window.electronAPI.twitch.unbanUser(channel, userLogin);
          break;
      }
    } catch (err) {
      handleError(err, 'UserModeration');
    }
  }, [markUserMessagesAsDeleted]);

  const deleteMessage = useCallback(async (channel: string, msgId: string) => {
    if (!msgId || msgId.startsWith('local-')) {
      console.warn('[DeleteMessage] Невозможно удалить сообщение без Twitch ID');
      return;
    }

    try {
      await window.electronAPI.twitch.deleteMessage(channel, msgId);
      markMessageAsDeleted(channel, msgId);
    } catch (err) {
      handleError(err, 'DeleteMessage');
    }
  }, [markMessageAsDeleted]);

  return {
    markMessageAsDeleted,
    markUserMessagesAsDeleted,
    performUserModeration,
    deleteMessage
  };
};
