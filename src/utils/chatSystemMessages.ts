import type { ChatMessage } from '../views/ChatArea';

/**
 * Создает системное сообщение для чата
 */
export function createSystemMessage(text: string): ChatMessage {
  return {
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
}

/**
 * Добавляет системное сообщение в указанный канал
 */
export function addSystemMessageToChannel(
  chatPanes: any[],
  channel: string,
  message: string
): any[] {
  const chanLower = channel.toLowerCase();
  const systemMsg = createSystemMessage(message);

  return chatPanes.map((p) => {
    if (p.channel.toLowerCase() !== chanLower) return p;

    return {
      ...p,
      messages: [...p.messages, systemMsg],
      buffer: p.paused ? [...p.buffer, systemMsg] : p.buffer
    };
  });
}

/**
 * Тексты системных сообщений для различных событий
 */
export const SystemMessages = {
  chatCleared: 'Чат очищен модератором',
  userBanned: (username: string, reason?: string) => 
    reason 
      ? `🔨 Пользователь ${username} забанен. Причина: ${reason}`
      : `🔨 Пользователь ${username} забанен`,
  userTimedOut: (username: string, duration: number, reason?: string) => {
    const durationText = formatDuration(duration);
    return reason
      ? `⏱️ Пользователь ${username} получил таймаут на ${durationText}. Причина: ${reason}`
      : `⏱️ Пользователь ${username} получил таймаут на ${durationText}`;
  },
  userUnbanned: (username: string) => `✅ Пользователь ${username} разбанен`,
  messageDeleted: (username: string) => `🗑️ Сообщение от ${username} удалено`,
  slowModeEnabled: (seconds: number) => `🐌 Режим медленного чата включен (${seconds} сек)`,
  slowModeDisabled: '🐌 Режим медленного чата выключен',
  followersOnlyEnabled: (minutes: number) => {
    if (minutes === -1 || minutes === 0) {
      return '👥 Режим "Только подписчики" включен';
    }
    const durationText = formatDuration(minutes * 60);
    return `👥 Режим "Только подписчики" включен (${durationText})`;
  },
  followersOnlyDisabled: '👥 Режим "Только подписчики" выключен',
  subscribersOnlyEnabled: '⭐ Режим "Только подписчики" включен',
  subscribersOnlyDisabled: '⭐ Режим "Только подписчики" выключен',
  emoteOnlyEnabled: '😀 Режим "Только эмоуты" включен',
  emoteOnlyDisabled: '😀 Режим "Только эмоуты" выключен',
  uniqueChatEnabled: '🔤 Режим уникального чата (R9K) включен',
  uniqueChatDisabled: '🔤 Режим уникального чата (R9K) выключен',
  announcementSent: (message: string) => `📢 Объявление: ${message}`,
  raidStarted: (from: string, viewers: number) => 
    `⚔️ Рейд от ${from} с ${viewers} зрителями`,
  hostStarted: (from: string) => `📺 Хост от ${from}`,
  userMentioned: (username: string) => `@${username} упомянул вас`,
  modAdded: (username: string) => `👮 ${username} получил права модератора`,
  modRemoved: (username: string) => `👮 ${username} лишен прав модератора`,
  vipAdded: (username: string) => `💎 ${username} получил VIP статус`,
  vipRemoved: (username: string) => `💎 ${username} лишен VIP статуса`
};

/**
 * Форматирует длительность в читаемый вид
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} сек`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} мин`;
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} ч`;
  } else {
    const days = Math.floor(seconds / 86400);
    return `${days} дн`;
  }
}
