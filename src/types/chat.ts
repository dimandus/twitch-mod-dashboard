export interface ChatMessage {
  id: string;
  msgId?: string;
  userId?: string;
  text: string;
  userLogin: string;
  displayName: string;
  color?: string;
  badges: string[];
  badgeInfo?: Record<string, string>;
  badgeVersions?: Record<string, string>;
  self: boolean;
  timestamp: number;
  emotes?: Record<string, string[]>;
  mentionedSelf?: boolean;
  deleted?: boolean;
  isSystem?: boolean;
  canDelete?: boolean;
  cleared?: boolean;
  isRaider?: boolean;
  isFirstMessage?: boolean;
  sourceRoomId?: string;
  sourceChannelName?: string;
}

export interface ChatPane {
  id: string;
  channel: string;
  paused: boolean;
  messages: ChatMessage[];
  buffer: ChatMessage[];
}

export type ModerationAction =
  | { type: 'deleteMessage'; channel: string; login: string; msgId: string }
  | { type: 'timeout'; channel: string; login: string; durationSeconds: number; reason?: string }
  | { type: 'ban'; channel: string; login: string; reason?: string }
  | { type: 'unban'; channel: string; login: string }
  | { type: 'clearChat'; channel: string };

export type ChatModeKey = 'slow' | 'emote' | 'followers' | 'subs' | 'unique' | 'shield';

export interface ChatModes {
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
