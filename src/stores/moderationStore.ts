import { create } from 'zustand';
import type { UserLogData } from '../components/UserMessageLog';

interface ModerationStore {
  userLogOpen: UserLogData | null;
  userProfileLogin: string | null;
  autoModQueueOpen: boolean;
  
  setUserLogOpen: (data: UserLogData | null) => void;
  setUserProfileLogin: (login: string | null) => void;
  setAutoModQueueOpen: (open: boolean) => void;
  
  openUserLog: (userLogin: string) => void;
  closeUserLog: () => void;
  openUserProfile: (login: string) => void;
  closeUserProfile: () => void;
}

export const useModerationStore = create<ModerationStore>((set) => ({
  userLogOpen: null,
  userProfileLogin: null,
  autoModQueueOpen: false,
  
  setUserLogOpen: (data) => set({ userLogOpen: data }),
  setUserProfileLogin: (login) => set({ userProfileLogin: login }),
  setAutoModQueueOpen: (open) => set({ autoModQueueOpen: open }),
  
  openUserLog: (userLogin) => set({
    userLogOpen: {
      login: userLogin,
      displayName: userLogin,
      color: undefined,
      badges: [],
      messages: []
    }
  }),
  
  closeUserLog: () => set({ userLogOpen: null }),
  
  openUserProfile: (login) => {
    if (!login) return;
    set({ userProfileLogin: login.toLowerCase() });
  },
  
  closeUserProfile: () => set({ userProfileLogin: null })
}));
