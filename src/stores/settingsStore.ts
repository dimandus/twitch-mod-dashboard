import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  theme: 'dark' | 'light';
  fontSize: number;
  globalScale: number;
  pauseKey: 'Alt' | 'Ctrl' | 'Shift';
  
  setTheme: (theme: 'dark' | 'light') => void;
  setFontSize: (size: number) => void;
  setGlobalScale: (scale: number) => void;
  setPauseKey: (key: 'Alt' | 'Ctrl' | 'Shift') => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      globalScale: 1,
      pauseKey: 'Alt',
      
      setTheme: (theme) => set({ theme }),
      setFontSize: (size) => set({ fontSize: size }),
      setGlobalScale: (scale) => set({ globalScale: scale }),
      setPauseKey: (key) => set({ pauseKey: key })
    }),
    {
      name: 'twitch-mod-settings'
    }
  )
);
