import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { twitchChatClient } from '../chat/TwitchChatClient';
import { handleError } from '../utils/errorHandler';

export const useLoginSync = (currentUserLoginRef: React.MutableRefObject<string | null>) => {
  const setChatReady = useChatStore(state => state.setChatReady);
  const joinedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    let lastCheckedLogin: string | null = null;
    let isInitializing = false;

    const checkLoginAndInitChat = async () => {
      if (isInitializing) return;

      try {
        const user = await window.electronAPI.twitch.getCurrentUser();
        const currentLogin = user?.login?.toLowerCase() || null;

        if (currentLogin !== lastCheckedLogin) {
          lastCheckedLogin = currentLogin;

          if (currentLogin && currentUserLoginRef.current !== currentLogin) {
            isInitializing = true;
            console.log('[useLoginSync] Обнаружен новый логин, переинициализируем чат...');
            
            if (twitchChatClient.isConnected()) {
              await twitchChatClient.disconnect();
            }

            setChatReady(false);
            joinedRef.current.clear();

            let token = await window.electronAPI.config.get('twitch.accessToken');
            
            try {
              const ensured = await window.electronAPI.twitch.ensureAccessToken();
              if (ensured) token = ensured;
            } catch (e) {
              console.warn('[useLoginSync] не удалось обновить токен Twitch через Helix', e);
            }

            if (token && user) {
              await twitchChatClient.connect(user.login, token);
              currentUserLoginRef.current = currentLogin;
              setChatReady(true);
              console.log('[useLoginSync] Чат успешно переинициализирован после логина');
            }
            
            isInitializing = false;
          } else if (!currentLogin && currentUserLoginRef.current) {
            console.log('[useLoginSync] Пользователь вышел, отключаемся от чата...');
            await twitchChatClient.disconnect();
            setChatReady(false);
            currentUserLoginRef.current = null;
            joinedRef.current.clear();
          }
        }
      } catch (err) {
        handleError(err, 'LoginCheck');
        isInitializing = false;
      }
    };

    checkLoginAndInitChat();
    intervalId = setInterval(checkLoginAndInitChat, 1000);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [setChatReady, currentUserLoginRef]);

  return joinedRef;
};
