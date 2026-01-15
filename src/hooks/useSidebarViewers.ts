import { useState, useEffect } from 'react';
import { fetchChattersForChannel, ViewerEntry } from '../utils/viewersHelpers';
import type { ActiveChatter } from '../App';

export const useSidebarViewers = (
  selectedChannel: string | null,
  activeChatters: Record<string, Map<string, ActiveChatter>>
) => {
  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (!selectedChannel) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const { viewers: list, fallback } = await fetchChattersForChannel(
          selectedChannel,
          activeChatters[selectedChannel.toLowerCase()]
        );
        if (!cancelled) {
          setViewers(list);
          setViewersError(null);
          setUsingFallback(fallback);
        }
      } catch (err: any) {
        if (!cancelled) setViewersError(err?.message || 'Ошибка');
      }
    };

    refresh();
    const intervalId = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedChannel, activeChatters]);

  return {
    viewers,
    setViewers,
    viewersLoading,
    viewersError,
    setViewersError,
    usingFallback
  };
};
