// =====================================================
// Базовые типы
// =====================================================

interface TwitchUser {
  login: string;
  userId: string;
}

interface TwitchUserDetails {
  id: string;
  login: string;
  display_name: string;
  type: string;              // "staff", "admin", "global_mod" или ""
  broadcaster_type: string;  // "partner", "affiliate", "" 
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;        // ISO
}

interface ChannelChatter {
  user_id: string;
  user_login: string;
  user_name: string;
}

interface ChannelChattersResult {
  broadcasterId: string;
  moderatorIds: string[];
  chatters: ChannelChatter[];
}

interface ChannelLiveStatus {
  login: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  modCount: number | null;
}

interface UserBasicInfo {
  login: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
}

interface ModeratedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
}

interface ShieldModeStatus {
  is_active: boolean;
  moderator_id?: string;
  moderator_login?: string;
  moderator_name?: string;
  last_activated_at?: string;
}

interface FollowedChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
  followed_at: string;
}

// =====================================================
// Модерация (НОВОЕ)
// =====================================================

interface ModerationResult {
  success: boolean;
}

interface ChatSettings {
  broadcaster_id?: string;
  slow_mode?: boolean;
  slow_mode_wait_time?: number;           // 3-120 секунд
  follower_mode?: boolean;
  follower_mode_duration?: number;        // 0-129600 минут
  subscriber_mode?: boolean;
  emote_mode?: boolean;
  unique_chat_mode?: boolean;             // R9K mode
  non_moderator_chat_delay?: boolean;
  non_moderator_chat_delay_duration?: number; // 2, 4, 6 секунд
}

type AnnouncementColor = 'blue' | 'green' | 'orange' | 'purple' | 'primary';

// =====================================================
// API интерфейсы
// =====================================================

interface ConfigAPI {
  get: (key: string) => Promise<any>;
  set: (key: string, value: any) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

interface TwitchAPI {
  // Авторизация
  login: () => Promise<TwitchUser>;
  loginViaDimandus: () => Promise<TwitchUser>;
  getCurrentUser: () => Promise<TwitchUser | null>;
  logout: () => Promise<void>;
  getUserDetails: (login: string) => Promise<TwitchUserDetails>;
  // Информация о каналах и пользователях
  getChannelChatters: (channelLogin: string) => Promise<ChannelChattersResult>;
  getModeratedChannels: () => Promise<ModeratedChannel[]>;
  getChannelsLiveStatus: (logins: string[]) => Promise<ChannelLiveStatus[]>;
  getUsersInfo: (logins: string[]) => Promise<UserBasicInfo[]>;
  getFollowedChannels: () => Promise<FollowedChannel[]>;
    getGlobalBadges: () => Promise<any>;
  getChannelBadges?: (broadcasterId: string) => Promise<any>;
  // =====================================================
  // МОДЕРАЦИЯ (НОВОЕ)
  // =====================================================
  
  getShieldMode: (channelLogin: string) => Promise<ShieldModeStatus>;
setShieldMode: (channelLogin: string, isActive: boolean) => Promise<ShieldModeStatus>;
  
  // Баны и таймауты
  banUser: (
    channelLogin: string,
    userLogin: string,
    duration?: number | null,
    reason?: string
  ) => Promise<ModerationResult>;
  
  timeoutUser: (
    channelLogin: string,
    userLogin: string,
    duration?: number,
    reason?: string
  ) => Promise<ModerationResult>;
  
  unbanUser: (
    channelLogin: string,
    userLogin: string
  ) => Promise<ModerationResult>;
  
  // Сообщения
  deleteMessage: (
    channelLogin: string,
    messageId: string
  ) => Promise<ModerationResult>;
  
  clearChat: (channelLogin: string) => Promise<ModerationResult>;
  
  // Настройки чата
  getChatSettings: (channelLogin: string) => Promise<ChatSettings>;
  
  updateChatSettings: (
    channelLogin: string,
    settings: Partial<ChatSettings>
  ) => Promise<ChatSettings>;
  
  // Быстрые команды
  slowMode: (
    channelLogin: string,
    enabled: boolean,
    seconds?: number
  ) => Promise<ChatSettings>;
  
  followersOnly: (
    channelLogin: string,
    enabled: boolean,
    minutes?: number
  ) => Promise<ChatSettings>;
  
  subscribersOnly: (
    channelLogin: string,
    enabled: boolean
  ) => Promise<ChatSettings>;
  
  emoteOnly: (
    channelLogin: string,
    enabled: boolean
  ) => Promise<ChatSettings>;
  
  // Объявления
  sendAnnouncement: (
    channelLogin: string,
    message: string,
    color?: AnnouncementColor
  ) => Promise<ModerationResult>;
}

interface ElectronAPI {
  ping: () => Promise<string>;
  config: ConfigAPI;
  twitch: TwitchAPI;
}

// =====================================================
// Global
// =====================================================

declare global {
  interface Window {
    electronAPI: {
      twitch: {
        // ...
        sendChatMessage(
          channel: string,
          text: string
        ): Promise<{ messageId: string }>;
      };
      config: {
        // ...
      };
    };
  }
}

export {};