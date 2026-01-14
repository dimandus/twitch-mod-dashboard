import React, { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';
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

interface UserContextType {
  globalUsers: Record<string, GlobalUserData>;
  setGlobalUsers: React.Dispatch<React.SetStateAction<Record<string, GlobalUserData>>>;
  globalUsersRef: React.MutableRefObject<Record<string, GlobalUserData>>;
  activeChatters: Record<string, Map<string, ActiveChatter>>;
  setActiveChatters: React.Dispatch<React.SetStateAction<Record<string, Map<string, ActiveChatter>>>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserContext must be used within UserProvider');
  }
  return context;
};

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [globalUsers, setGlobalUsers] = useState<Record<string, GlobalUserData>>({});
  const globalUsersRef = useRef<Record<string, GlobalUserData>>({});
  const [activeChatters, setActiveChatters] = useState<Record<string, Map<string, ActiveChatter>>>({});

  useEffect(() => {
    globalUsersRef.current = globalUsers;
  }, [globalUsers]);

  return (
    <UserContext.Provider
      value={{
        globalUsers,
        setGlobalUsers,
        globalUsersRef,
        activeChatters,
        setActiveChatters
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
