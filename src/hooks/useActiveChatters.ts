import { useEffect } from 'react';
import { useUserStore } from '../stores/userStore';

export const useActiveChatters = () => {
  const setActiveChatters = useUserStore(state => state.setActiveChatters);

  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const INACTIVE_TIMEOUT = 5 * 60 * 1000;

      setActiveChatters((prev) => {
        const updated: Record<string, Map<string, any>> = {};

        for (const [channel, chatters] of Object.entries(prev)) {
          const filtered = new Map();
          for (const [odaterId, chatter] of chatters) {
            if (now - chatter.lastSeen < INACTIVE_TIMEOUT) {
              filtered.set(odaterId, chatter);
            }
          }
          if (filtered.size > 0) {
            updated[channel] = filtered;
          }
        }

        return updated;
      });
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, [setActiveChatters]);
};
