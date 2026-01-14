import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
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

interface ChatContextType {
  chatPanes: ChatPane[];
  setChatPanes: React.Dispatch<React.SetStateAction<ChatPane[]>>;
  roomModes: Record<string, ChatModes>;
  setRoomModes: React.Dispatch<React.SetStateAction<Record<string, ChatModes>>>;
  selectedChannel: string | null;
  setSelectedChannel: (channel: string | null) => void;
  chatReady: boolean;
  setChatReady: (ready: boolean) => void;
  currentUserLogin: string | null;
  setCurrentUserLogin: (login: string | null) => void;
  joinedRef: React.MutableRefObject<Set<string>>;
  modeChangeTimestamps: React.MutableRefObject<Record<string, number>>;
  initializedChannels: React.MutableRefObject<Set<string>>;
  currentUserLoginRef: React.MutableRefObject<string | null>;
  recentSystemMessages: React.MutableRefObject<Set<string>>;
  markModeChanged: (channel: string) => void;
  addSystemMessage: (channel: string, text: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
};

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

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatPanes, setChatPanes] = useState<ChatPane[]>([]);
  const [roomModes, setRoomModes] = useState<Record<string, ChatModes>>({});
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [chatReady, setChatReady] = useState(false);
  const [currentUserLogin, setCurrentUserLogin] = useState<string | null>(null);
  
  const joinedRef = useRef<Set<string>>(new Set());
  const modeChangeTimestamps = useRef<Record<string, number>>({});
  const initializedChannels = useRef<Set<string>>(new Set());
  const currentUserLoginRef = useRef<string | null>(null);
  const recentSystemMessages = useRef<Set<string>>(new Set());

  const markModeChanged = (channel: string) => {
    modeChangeTimestamps.current[channel.toLowerCase()] = Date.now();
  };

  const addSystemMessage = (channel: string, text: string) => {
    const shortKey = `${channel}:${text}`;
    
    if (recentSystemMessages.current.has(shortKey)) {
      return;
    }
    
    recentSystemMessages.current.add(shortKey);
    setTimeout(() => recentSystemMessages.current.delete(shortKey), 2000);
    
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
    
    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== channel.toLowerCase()) return p;
        return {
          ...p,
          messages: [...p.messages, systemMsg],
          buffer: p.paused ? [...p.buffer, systemMsg] : p.buffer
        };
      })
    );
  };

  const markMessageAsDeleted = (channel: string, msgId: string) => {
    if (!msgId || msgId.startsWith('local-')) return;

    const chanLower = channel.toLowerCase();

    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        return {
          ...p,
          messages: p.messages.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          ),
          buffer: p.buffer.map((m) =>
            m.msgId === msgId ? { ...m, deleted: true } : m
          )
        };
      })
    );
  };

  const markUserMessagesAsDeleted = (channel: string, userLogin: string) => {
    const chanLower = channel.toLowerCase();
    const loginLower = userLogin.toLowerCase();

    setChatPanes((prev) =>
      prev.map((p) => {
        if (p.channel.toLowerCase() !== chanLower) return p;
        const mark = (m: ChatMessage) => {
          if (m.deleted) return m;
          if (m.userLogin.toLowerCase() === loginLower)
            return { ...m, deleted: true };
          return m;
        };
        return {
          ...p,
          messages: p.messages.map(mark),
          buffer: p.buffer.map(mark)
        };
      })
    );
  };

  return (
    <ChatContext.Provider
      value={{
        chatPanes,
        setChatPanes,
        roomModes,
        setRoomModes,
        selectedChannel,
        setSelectedChannel,
        chatReady,
        setChatReady,
        currentUserLogin,
        setCurrentUserLogin,
        joinedRef,
        modeChangeTimestamps,
        initializedChannels,
        currentUserLoginRef,
        recentSystemMessages,
        markModeChanged,
        addSystemMessage
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
