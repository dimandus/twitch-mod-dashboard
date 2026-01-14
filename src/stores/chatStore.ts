import { create } from 'zustand';
import type { ChatPane, ChatMessage } from '../views/ChatArea';

interface ChatModes {
  slow: boolean;
  slowDuration: number;
  emote: boolean;
  followers: boolean;
  followersDuration: number;
  subs: boolean;
  unique: boolean;
  shield: boolean;
}

export const defaultModes: ChatModes = {
  slow: false,
  slowDuration: 0,
  emote: false,
  followers: false,
  followersDuration: -1,
  subs: false,
  unique: false,
  shield: false
};

interface ChatStore {
  panes: ChatPane[];
  roomModes: Record<string, ChatModes>;
  selectedChannel: string | null;
  chatReady: boolean;
  currentUserLogin: string | null;
  
  setPanes: (panes: ChatPane[] | ((prev: ChatPane[]) => ChatPane[])) => void;
  setRoomModes: (modes: Record<string, ChatModes> | ((prev: Record<string, ChatModes>) => Record<string, ChatModes>)) => void;
  setSelectedChannel: (channel: string | null) => void;
  setChatReady: (ready: boolean) => void;
  setCurrentUserLogin: (login: string | null) => void;
  
  addSystemMessage: (channel: string, text: string) => void;
  markModeChanged: (channel: string) => void;
}

const recentSystemMessages = new Set<string>();
const modeChangeTimestamps: Record<string, number> = {};

export const useChatStore = create<ChatStore>((set, get) => ({
  panes: [],
  roomModes: {},
  selectedChannel: null,
  chatReady: false,
  currentUserLogin: null,
  
  setPanes: (panes) => set((state) => ({
    panes: typeof panes === 'function' ? panes(state.panes) : panes
  })),
  
  setRoomModes: (modes) => set((state) => ({
    roomModes: typeof modes === 'function' ? modes(state.roomModes) : modes
  })),
  
  setSelectedChannel: (channel) => set({ selectedChannel: channel }),
  setChatReady: (ready) => set({ chatReady: ready }),
  setCurrentUserLogin: (login) => set({ currentUserLogin: login }),
  
  addSystemMessage: (channel, text) => {
    const shortKey = `${channel}:${text}`;
    
    if (recentSystemMessages.has(shortKey)) return;
    
    recentSystemMessages.add(shortKey);
    setTimeout(() => recentSystemMessages.delete(shortKey), 2000);
    
    const systemMsg: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random()}`,
      text,
      userLogin: '',
      displayName: '',
      color: '',
      badges: [],
      self: false,
      timestamp: Date.now(),
      isSystem: true
    };
    
    set((state) => ({
      panes: state.panes.map((p) => {
        if (p.channel.toLowerCase() !== channel.toLowerCase()) return p;
        return {
          ...p,
          messages: [...p.messages, systemMsg],
          buffer: p.paused ? [...p.buffer, systemMsg] : p.buffer
        };
      })
    }));
  },
  
  markModeChanged: (channel) => {
    modeChangeTimestamps[channel.toLowerCase()] = Date.now();
  }
}));

export { modeChangeTimestamps };
