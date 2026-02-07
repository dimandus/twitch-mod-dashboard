import type { ErrorSeverity } from './utils/errorHandler';

export interface ElectronAPI {
  ping: () => Promise<string>;
  
  showNotification: (data: {
    type: ErrorSeverity;
    message: string;
    context?: string;
  }) => void;
  
  onNotification: (callback: (data: {
    type: ErrorSeverity;
    message: string;
    context?: string;
  }) => void) => () => void;

  config: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };

  automod: {
    connect: (channelLogins: string[]) => Promise<{ success: boolean }>;
    disconnect: () => Promise<void>;
    getQueue: () => Promise<Array<{ msgId: string; channel: string; userId: string; userLogin: string; message: string; reason: string; timestamp: number; status: 'pending' | 'approved' | 'denied' }>>;
    approve: (msgId: string) => Promise<{ success: boolean }>;
    deny: (msgId: string) => Promise<{ success: boolean }>;
    onMessage: (callback: (data: any) => void) => () => void;
    onLog: (callback: (data: { level: 'info' | 'warn' | 'error' | 'debug'; message: string; data?: any; timestamp: number }) => void) => () => void;
  };

  twitch: {
    login: () => Promise<{ login: string; userId: string }>;
    loginViaDimandus: () => Promise<{ login: string; userId: string }>;
    getCurrentUser: () => Promise<{ login: string; userId: string } | null>;
    logout: () => Promise<void>;
    getUserDetails: (login: string) => Promise<any>;
    
    getChannelChatters: (channelLogin: string) => Promise<any>;
    getModeratedChannels: () => Promise<any[]>;
    getChannelsLiveStatus: (logins: string[]) => Promise<any[]>;
    getUsersInfo: (logins: string[]) => Promise<any[]>;
    getUsersInfoById: (ids: string[]) => Promise<any[]>;
    getFollowedChannels: () => Promise<any[]>;
    getFollowDate: (broadcasterLogin: string, userId: string) => Promise<string | null>;
    
    getGlobalBadges: () => Promise<any>;
    getChannelBadges: (broadcasterId: string) => Promise<any>;
    
    getGlobalEmotes: () => Promise<any[]>;
    getUserEmotes: () => Promise<any[]>;
    getChannelEmotes: (channelLogin: string) => Promise<any[]>;
    
    sendChatMessage: (channel: string, text: string) => Promise<{ messageId?: string }>;
    ensureAccessToken: () => Promise<string | null>;
    
    banUser: (channelLogin: string, userLogin: string, duration: number | null, reason: string) => Promise<{ success: boolean }>;
    timeoutUser: (channelLogin: string, userLogin: string, duration: number, reason: string) => Promise<{ success: boolean }>;
    unbanUser: (channelLogin: string, userLogin: string) => Promise<{ success: boolean }>;
    deleteMessage: (channelLogin: string, messageId: string) => Promise<{ success: boolean }>;
    clearChat: (channelLogin: string) => Promise<{ success: boolean }>;
    
    getChatSettings: (channelLogin: string) => Promise<any>;
    updateChatSettings: (channelLogin: string, settings: any) => Promise<any>;
    
    getShieldMode: (channelLogin: string) => Promise<{ is_active: boolean }>;
    setShieldMode: (channelLogin: string, isActive: boolean) => Promise<{ is_active: boolean }>;
    
    slowMode: (channelLogin: string, enabled: boolean, seconds: number) => Promise<any>;
    followersOnly: (channelLogin: string, enabled: boolean, minutes: number) => Promise<any>;
    subscribersOnly: (channelLogin: string, enabled: boolean) => Promise<any>;
    emoteOnly: (channelLogin: string, enabled: boolean) => Promise<any>;
    
    sendAnnouncement: (channelLogin: string, message: string, color: string) => Promise<{ success: boolean }>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
