import { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';
import { handleError } from '../utils/errorHandler';

export const useUserInfoFetch = () => {
  const globalUsers = useUserStore(state => state.globalUsers);
  const setGlobalUsers = useUserStore(state => state.setGlobalUsers);

  useEffect(() => {
    const users = Object.values(globalUsers);
    const toFetch = users.filter((u) => !u.avatarUrl && !u.bannerUrl);
    if (toFetch.length === 0) return;

    let cancelled = false;

    const fetchInfo = async () => {
      try {
        const logins = Array.from(new Set(toFetch.map((u) => u.login.toLowerCase())));
        const infos = await window.electronAPI.twitch.getUsersInfo(logins);
        if (cancelled || !infos) return;

        const infoMap = new Map(infos.map((i) => [i.login.toLowerCase(), i]));

        setGlobalUsers((prev) => {
          const next = { ...prev };
          for (const [loginLower, user] of Object.entries(next)) {
            const info = infoMap.get(loginLower);
            if (!info) continue;
            next[loginLower] = {
              ...user,
              displayName: info.displayName || user.displayName,
              avatarUrl: info.avatarUrl ?? user.avatarUrl ?? null,
              bannerUrl: info.bannerUrl ?? user.bannerUrl ?? null
            };
          }
          return next;
        });
      } catch (err) {
        handleError(err, 'FetchUsersInfo');
      }
    };

    const timeoutId = setTimeout(fetchInfo, 500);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [globalUsers, setGlobalUsers]);
};
