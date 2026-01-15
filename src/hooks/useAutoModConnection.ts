import { useEffect } from 'react';
import type { ChatPane } from '../views/ChatArea';

export const useAutoModConnection = (chatReady: boolean, panes: ChatPane[]) => {
  useEffect(() => {
    if (!chatReady || panes.length === 0) return;

    const channelLogins = panes.map((p) => p.channel.toLowerCase());
    
    window.electronAPI.automod
      .connect(channelLogins)
      .then(() => {
        console.log('[useAutoModConnection] AutoMod подключен для каналов:', channelLogins);
      })
      .catch((err) => {
        console.warn('[useAutoModConnection] Не удалось подключить AutoMod:', err);
      });

    return () => {
      window.electronAPI.automod.disconnect();
    };
  }, [chatReady, panes]);
};
