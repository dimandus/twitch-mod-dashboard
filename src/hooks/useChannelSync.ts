import { useEffect } from 'react';
import { twitchChatClient } from '../chat/TwitchChatClient';
import { handleError } from '../utils/errorHandler';
import type { ChatPane } from '../views/ChatArea';

export const useChannelSync = (
  panes: ChatPane[],
  chatReady: boolean,
  joinedRef: React.MutableRefObject<Set<string>>
) => {
  useEffect(() => {
    if (!chatReady) return;

    const syncChannels = async () => {
      const desired = new Set(panes.map((p) => p.channel.toLowerCase().trim()));
      const joined = joinedRef.current;

      for (const ch of desired) {
        if (!ch || joined.has(ch)) continue;
        try {
          await twitchChatClient.joinChannel(ch);
          joined.add(ch);
        } catch (err) {
          handleError(err, `JoinChannel:${ch}`);
        }
      }

      for (const ch of Array.from(joined)) {
        if (!desired.has(ch)) {
          try {
            await twitchChatClient.partChannel(ch);
          } catch (err) {
            console.error('[useChannelSync] не удалось part', ch, err);
          }
          joined.delete(ch);
        }
      }
    };

    syncChannels();
  }, [panes, chatReady, joinedRef]);
};
