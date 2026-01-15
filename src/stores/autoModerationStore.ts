import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AutoModTrigger {
  id: string;
  type: 'word' | 'regex';
  value: string;
  enabled: boolean;
}

interface AutoModerationStore {
  enabled: boolean;
  triggers: AutoModTrigger[];
  
  setEnabled: (enabled: boolean) => void;
  addTrigger: (trigger: Omit<AutoModTrigger, 'id'>) => void;
  removeTrigger: (id: string) => void;
  toggleTrigger: (id: string) => void;
  updateTrigger: (id: string, value: string) => void;
}

export const useAutoModerationStore = create<AutoModerationStore>()(
  persist(
    (set) => ({
      enabled: false,
      triggers: [],
      
      setEnabled: (enabled) => set({ enabled }),
      
      addTrigger: (trigger) =>
        set((state) => ({
          triggers: [
            ...state.triggers,
            { ...trigger, id: `trigger-${Date.now()}-${Math.random()}` }
          ]
        })),
      
      removeTrigger: (id) =>
        set((state) => ({
          triggers: state.triggers.filter((t) => t.id !== id)
        })),
      
      toggleTrigger: (id) =>
        set((state) => ({
          triggers: state.triggers.map((t) =>
            t.id === id ? { ...t, enabled: !t.enabled } : t
          )
        })),
      
      updateTrigger: (id, value) =>
        set((state) => ({
          triggers: state.triggers.map((t) =>
            t.id === id ? { ...t, value } : t
          )
        }))
    }),
    {
      name: 'twitch-automod-store'
    }
  )
);
