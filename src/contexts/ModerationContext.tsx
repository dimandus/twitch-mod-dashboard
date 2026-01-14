import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { UserLogData } from '../components/UserMessageLog';

interface ModerationContextType {
  userLogOpen: UserLogData | null;
  setUserLogOpen: (data: UserLogData | null) => void;
  userProfileLogin: string | null;
  setUserProfileLogin: (login: string | null) => void;
  autoModQueueOpen: boolean;
  setAutoModQueueOpen: (open: boolean) => void;
  openUserLog: (userLogin: string) => void;
  closeUserLog: () => void;
  openUserProfile: (login: string) => void;
  closeUserProfile: () => void;
}

const ModerationContext = createContext<ModerationContextType | undefined>(undefined);

export const useModerationContext = () => {
  const context = useContext(ModerationContext);
  if (!context) {
    throw new Error('useModerationContext must be used within ModerationProvider');
  }
  return context;
};

export const ModerationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userLogOpen, setUserLogOpen] = useState<UserLogData | null>(null);
  const [userProfileLogin, setUserProfileLogin] = useState<string | null>(null);
  const [autoModQueueOpen, setAutoModQueueOpen] = useState(false);

  const openUserLog = (userLogin: string) => {
    setUserLogOpen({
      login: userLogin,
      displayName: userLogin,
      color: undefined,
      badges: [],
      messages: []
    });
  };

  const closeUserLog = () => {
    setUserLogOpen(null);
  };

  const openUserProfile = (login: string) => {
    if (!login) return;
    setUserProfileLogin(login.toLowerCase());
  };

  const closeUserProfile = () => setUserProfileLogin(null);

  return (
    <ModerationContext.Provider
      value={{
        userLogOpen,
        setUserLogOpen,
        userProfileLogin,
        setUserProfileLogin,
        autoModQueueOpen,
        setAutoModQueueOpen,
        openUserLog,
        closeUserLog,
        openUserProfile,
        closeUserProfile
      }}
    >
      {children}
    </ModerationContext.Provider>
  );
};
