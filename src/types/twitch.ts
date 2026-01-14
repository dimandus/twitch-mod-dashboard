// Twitch API Types

export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: 'live' | '';
  title: string;
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface TwitchChannel {
  broadcaster_id: string;
  broadcaster_login: string;
  broadcaster_name: string;
}

export interface TwitchModerator {
  user_id: string;
  user_login: string;
  user_name: string;
}

export interface TwitchChatter {
  user_id: string;
  user_login: string;
  user_name: string;
}

export interface TwitchChatSettings {
  broadcaster_id: string;
  slow_mode: boolean;
  slow_mode_wait_time: number;
  follower_mode: boolean;
  follower_mode_duration: number;
  subscriber_mode: boolean;
  emote_mode: boolean;
  unique_chat_mode: boolean;
}

export interface TwitchShieldMode {
  is_active: boolean;
  moderator_id: string;
  moderator_login: string;
  moderator_name: string;
  last_activated_at: string;
}

export interface TwitchBadge {
  set_id: string;
  versions: TwitchBadgeVersion[];
}

export interface TwitchBadgeVersion {
  id: string;
  image_url_1x: string;
  image_url_2x: string;
  image_url_4x: string;
  title: string;
  description: string;
  click_action: string | null;
  click_url: string | null;
}

export interface TwitchEmote {
  id: string;
  name: string;
  images: {
    url_1x: string;
    url_2x: string;
    url_4x: string;
  };
  format: string[];
  scale: string[];
  theme_mode: string[];
}

export interface TwitchTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string[];
  token_type: string;
}

export interface TwitchApiResponse<T> {
  data: T[];
  pagination?: {
    cursor?: string;
  };
}

export interface TwitchErrorResponse {
  error: string;
  status: number;
  message: string;
}

export interface ChannelLiveStatus {
  login: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  modCount: number | null;
}

export interface UserInfo {
  login: string;
  displayName: string;
  avatarUrl: string;
  bannerUrl: string;
}
