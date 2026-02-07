import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CollabStore {
  roomIdToLogin: Record<string, string>; // room-id (string) → login (string)
  setRoomIdToLogin: (map: Record<string, string>) => void;
  updateRoomIdToLogin: (updates: Record<string, string>) => void;
  clearRoomIdToLogin: () => void;
}

export const useCollabStore = create<CollabStore>()(devtools((set) => ({
  roomIdToLogin: {},
  setRoomIdToLogin: (map) => set({ roomIdToLogin: map }),
  updateRoomIdToLogin: (updates) => set((state) => ({
    roomIdToLogin: { ...state.roomIdToLogin, ...updates }
  })),
  clearRoomIdToLogin: () => set({ roomIdToLogin: {} })
}), { name: 'CollabStore' }));