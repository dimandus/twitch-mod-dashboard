import { useEffect, useCallback } from 'react';
import { useUserStore } from '../stores/userStore';
import { useModerationStore } from '../stores/moderationStore';

export const useUserLog = () => {
  const globalUsers = useUserStore(state => state.globalUsers);
  const userLogOpen = useModerationStore(state => state.userLogOpen);
  const setUserLogOpen = useModerationStore(state => state.setUserLogOpen);

  // Синхронизация сообщений в открытом логе
  useEffect(() => {
    if (!userLogOpen) return;

    const loginLower = userLogOpen.login.toLowerCase();
    const userData = globalUsers[loginLower];

    if (userData) {
      setUserLogOpen((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...userData.messages]
        };
      });
    }
  }, [globalUsers, userLogOpen?.login, setUserLogOpen]);

  const openUserLog = useCallback((userLogin: string) => {
    const loginLower = userLogin.toLowerCase();
    const userData = globalUsers[loginLower];

    if (userData) {
      setUserLogOpen({
        login: userData.login,
        displayName: userData.displayName,
        color: userData.color,
        badges: userData.badges,
        messages: [...userData.messages]
      });
    } else {
      setUserLogOpen({
        login: userLogin,
        displayName: userLogin,
        color: undefined,
        badges: [],
        messages: []
      });
    }
  }, [globalUsers, setUserLogOpen]);

  return { openUserLog };
};
