import { create } from 'zustand';
import type { UserLogMessage } from '../components/UserMessageLog';

export interface GlobalUserData {
  login: string;
  displayName: string;
  color?: string;
  badges: string[];
  messages: UserLogMessage[];
  lastSeen: number;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

export interface ActiveChatter {
  odaterId: string;
  login: string;
  displayName: string;
  color?: string;
  badges: string[];
  badgeVersions: Record<string, string>;
  badgeInfo: Record<string, string>;
  lastSeen: number;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}

interface UserStore {
  globalUsers: Record<string, GlobalUserData>;
  activeChatters: Record<string, Map<string, ActiveChatter>>;
  
  setGlobalUsers: (users: Record<string, GlobalUserData> | ((prev: Record<string, GlobalUserData>) => Record<string, GlobalUserData>)) => void;
  setActiveChatters: (chatters: Record<string, Map<string, ActiveChatter>> | ((prev: Record<string, Map<string, ActiveChatter>>) => Record<string, Map<string, ActiveChatter>>)) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  globalUsers: {},
  activeChatters: {},
  
  setGlobalUsers: (users) => set((state) => ({
    globalUsers: typeof users === 'function' ? users(state.globalUsers) : users
  })),
  
  setActiveChatters: (chatters) => set((state) => ({
    activeChatters: typeof chatters === 'function' ? chatters(state.activeChatters) : chatters
  }))
}));
