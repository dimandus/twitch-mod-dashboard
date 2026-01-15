import { KNOWN_BOTS, ViewerRole, roleOrder } from '../constants/sidebarConstants';

export interface ViewerEntry {
  odaterId?: string;
  login: string;
  role: ViewerRole;
  isBot: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
  bannerUrl?: string | null;
  badges?: string[];
  badgeVersions?: Record<string, string>;
  badgeInfo?: Record<string, string>;
  lastSeen?: number;
  isFromFallback?: boolean;
}

interface ActiveChatter {
  odaterId?: string;
  login: string;
  displayName?: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  badges?: string[];
  badgeVersions?: Record<string, string>;
  badgeInfo?: Record<string, string>;
  lastSeen?: number;
}

export async function fetchChattersForChannel(
  channelLogin: string,
  fallbackChatters?: Map<string, ActiveChatter>
): Promise<{ viewers: ViewerEntry[]; fallback: boolean }> {
  const login = channelLogin.toLowerCase().trim();
  if (!login) return { viewers: [], fallback: false };

  let helixViewers: ViewerEntry[] | null = null;

  try {
    const result = await window.electronAPI.twitch.getChannelChatters(login);

    if (result && Array.isArray(result.chatters)) {
      const { broadcasterId, moderatorIds, chatters } = result;
      const modsSet = new Set(moderatorIds);

      let viewers: ViewerEntry[] = chatters.map((c: any) => {
        let role: ViewerRole = 'viewer';
        if (c.user_id === broadcasterId) role = 'broadcaster';
        else if (modsSet.has(c.user_id)) role = 'moderator';

        return {
          odaterId: c.user_id,
          login: c.user_login,
          role,
          isBot: KNOWN_BOTS.has(c.user_login.toLowerCase()),
          isFromFallback: false
        };
      });

      viewers.sort((a, b) => {
        const aIdx = roleOrder.indexOf(a.role);
        const bIdx = roleOrder.indexOf(b.role);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.login.localeCompare(b.login);
      });

      try {
        const logins = viewers.map((v) => v.login);
        const infos = await window.electronAPI.twitch.getUsersInfo(logins);
        const infoMap = new Map(infos.map((i: any) => [i.login.toLowerCase(), i]));
        viewers = viewers.map((v) => {
          const info = infoMap.get(v.login.toLowerCase());
          return {
            ...v,
            avatarUrl: info?.avatarUrl || null,
            displayName: info?.displayName || v.login,
            bannerUrl: info?.bannerUrl || null
          };
        });
      } catch {}

      if (viewers.length > 0) {
        helixViewers = viewers;
      }
    }
  } catch (err: any) {
    console.warn('[fetchChatters] Helix error:', err);
  }

  if (helixViewers) {
    return { viewers: helixViewers, fallback: false };
  }

  if (fallbackChatters && fallbackChatters.size > 0) {
    const now = Date.now();

    const viewers: ViewerEntry[] = Array.from(fallbackChatters.values()).map((c: ActiveChatter) => {
      let role: ViewerRole = 'viewer';
      const badgeIds = (c.badges || []).map((b) => b.toLowerCase());
      if (badgeIds.some((b) => b.startsWith('broadcaster'))) role = 'broadcaster';
      else if (badgeIds.some((b) => b.startsWith('moderator'))) role = 'moderator';
      else if (badgeIds.some((b) => b.startsWith('vip'))) role = 'vip';

      return {
        odaterId: c.odaterId,
        login: c.login,
        role,
        isBot: KNOWN_BOTS.has(c.login.toLowerCase()),
        displayName: c.displayName,
        avatarUrl: c.avatarUrl ?? null,
        bannerUrl: c.bannerUrl ?? null,
        badges: c.badges || [],
        badgeVersions: c.badgeVersions,
        badgeInfo: c.badgeInfo,
        lastSeen: typeof c.lastSeen === 'number' ? c.lastSeen : now,
        isFromFallback: true
      };
    });

    viewers.sort((a, b) => {
      const aIdx = roleOrder.indexOf(a.role);
      const bIdx = roleOrder.indexOf(b.role);
      if (aIdx !== bIdx) return aIdx - bIdx;
      return a.login.localeCompare(b.login);
    });

    return { viewers, fallback: true };
  }

  return { viewers: [], fallback: false };
}
