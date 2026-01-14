import { twitchChatClient } from '../chat/TwitchChatClient';

// Типы для API
interface TwitchAPI {
  clearChat: (channel: string) => Promise<any>;
  slowMode: (channel: string, enabled: boolean, seconds: number) => Promise<any>;
  followersOnly: (channel: string, enabled: boolean, minutes: number) => Promise<any>;
  subscribersOnly: (channel: string, enabled: boolean) => Promise<any>;
  emoteOnly: (channel: string, enabled: boolean) => Promise<any>;
  updateChatSettings: (channel: string, settings: any) => Promise<any>;
  banUser: (channel: string, user: string, duration: number | null, reason: string) => Promise<any>;
  timeoutUser: (channel: string, user: string, duration: number, reason: string) => Promise<any>;
  unbanUser: (channel: string, user: string) => Promise<any>;
  sendAnnouncement: (channel: string, message: string, color?: any) => Promise<any>;
}

export interface ModCommandResult {
  handled: boolean;
  systemMessage?: string;
}

/**
 * Обрабатывает модераторские команды
 * @param channel - канал (в нижнем регистре)
 * @param command - команда без слеша (например, "ban", "slow")
 * @param args - аргументы команды
 * @param api - API для вызова методов Twitch
 * @returns результат обработки команды с информацией о системном сообщении
 */
export async function handleModCommand(
  channel: string,
  command: string,
  args: string[],
  api: TwitchAPI
): Promise<ModCommandResult> {
  const cmd = command.toLowerCase();
  const chanLower = channel.toLowerCase().trim();

  try {
    switch (cmd) {
      case 'clear':
        await api.clearChat(chanLower);
        // Системное сообщение для clear обрабатывается через onUserClearchat
        return { handled: true };

      case 'slow':
        {
          let seconds = parseInt(args[0], 10) || 0;
          if (seconds > 0 && seconds < 10) {
            // Через IRC (Twitch Helix не поддерживает <10)
            await twitchChatClient.sendMessage(chanLower, `/slow ${seconds}`);
            return { handled: true, systemMessage: `🐌 Режим медленного чата включен (${seconds} сек)` };
          } else {
            await api.slowMode(chanLower, true, seconds);
            return { handled: true, systemMessage: `🐌 Режим медленного чата включен (${seconds} сек)` };
          }
        }

      case 'slowoff':
        await api.slowMode(chanLower, false, 0);
        return { handled: true, systemMessage: '🐌 Режим медленного чата выключен' };

      case 'followers':
        {
          let minutes = -1;
          if (args[0]) {
            const match = args[0].match(/^(\d+)([mhdw]?)$/i);
            if (match) {
              const num = parseInt(match[1], 10);
              const unit = match[2]?.toLowerCase();
              if (unit === 'm' || !unit) minutes = num;
              else if (unit === 'h') minutes = num * 60;
              else if (unit === 'd') minutes = num * 60 * 24;
              else if (unit === 'w') minutes = num * 60 * 24 * 7;
            }
          }
          await api.followersOnly(chanLower, true, minutes);
          const durationText = minutes === -1 || minutes === 0 
            ? '' 
            : ` (${formatDuration(minutes * 60)})`;
          return { handled: true, systemMessage: `👥 Режим "Только подписчики" включен${durationText}` };
        }

      case 'followersoff':
        await api.followersOnly(chanLower, false, 0);
        return { handled: true, systemMessage: '👥 Режим "Только подписчики" выключен' };

      case 'subscribers':
        await api.subscribersOnly(chanLower, true);
        return { handled: true, systemMessage: '⭐ Режим "Только подписчики" включен' };

      case 'subscribersoff':
        await api.subscribersOnly(chanLower, false);
        return { handled: true, systemMessage: '⭐ Режим "Только подписчики" выключен' };

      case 'emoteonly':
        await api.emoteOnly(chanLower, true);
        return { handled: true, systemMessage: '😀 Режим "Только эмоуты" включен' };

      case 'emoteonlyoff':
        await api.emoteOnly(chanLower, false);
        return { handled: true, systemMessage: '😀 Режим "Только эмоуты" выключен' };

      case 'uniquechat':
      case 'r9kbeta':
        await api.updateChatSettings(chanLower, { unique_chat_mode: true });
        return { handled: true, systemMessage: '🔤 Режим уникального чата (R9K) включен' };

      case 'uniquechatoff':
      case 'r9kbetaoff':
        await api.updateChatSettings(chanLower, { unique_chat_mode: false });
        return { handled: true, systemMessage: '🔤 Режим уникального чата (R9K) выключен' };

      case 'ban':
        if (args[0]) {
          const login = args[0];
          const reason = args.slice(1).join(' ') || '';
          await api.banUser(chanLower, login, null, reason);
          const reasonText = reason ? `. Причина: ${reason}` : '';
          return { handled: true, systemMessage: `🔨 Пользователь ${login} забанен${reasonText}` };
        }
        return { handled: true };

      case 'timeout':
        if (args[0]) {
          const login = args[0];
          const duration = parseInt(args[1], 10) || 600;
          const reason = args.slice(2).join(' ') || '';
          await api.timeoutUser(chanLower, login, duration, reason);
          const durationText = formatDuration(duration);
          const reasonText = reason ? `. Причина: ${reason}` : '';
          return { handled: true, systemMessage: `⏱️ Пользователь ${login} получил таймаут на ${durationText}${reasonText}` };
        }
        return { handled: true };

      case 'unban':
        if (args[0]) {
          const login = args[0];
          await api.unbanUser(chanLower, login);
          return { handled: true, systemMessage: `✅ Пользователь ${login} разбанен` };
        }
        return { handled: true };

      case 'announce':
        if (args.length > 0) {
          // /announce [color] message
          let color: any = 'primary';
          let message = args.join(' ');
          if (
            ['blue', 'green', 'orange', 'purple', 'primary'].includes(
              args[0]?.toLowerCase()
            )
          ) {
            color = args[0].toLowerCase();
            message = args.slice(1).join(' ');
          }
          await api.sendAnnouncement(chanLower, message, color);
          return { handled: true, systemMessage: `📢 Объявление: ${message}` };
        }
        return { handled: true };

      // Команды, которые работают только через IRC (и не поддерживаются Helix)
      case 'me':
      case 'w':
      case 'color':
      case 'block':
      case 'unblock':
      case 'ignore':
      case 'unignore':
      case 'delete':
      case 'untimeout':
        // Эти команды отправляются как есть через IRC
        const fullCommand = `/${cmd}${args.length > 0 ? ' ' + args.join(' ') : ''}`;
        await twitchChatClient.sendMessage(chanLower, fullCommand);
        return { handled: true };

      case 'mod':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          return { handled: true, systemMessage: `👮 ${args[0]} получил права модератора` };
        }
        return { handled: true };

      case 'unmod':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          return { handled: true, systemMessage: `👮 ${args[0]} лишен прав модератора` };
        }
        return { handled: true };

      case 'vip':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          return { handled: true, systemMessage: `💎 ${args[0]} получил VIP статус` };
        }
        return { handled: true };

      case 'unvip':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          return { handled: true, systemMessage: `💎 ${args[0]} лишен VIP статуса` };
        }
        return { handled: true };

      case 'host':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          return { handled: true, systemMessage: `📺 Хост от ${args[0]}` };
        }
        return { handled: true };

      case 'unhost':
        await twitchChatClient.sendMessage(chanLower, '/unhost');
        return { handled: true, systemMessage: '📺 Хост завершен' };

      case 'raid':
        if (args[0]) {
          const fullCommand = `/${cmd} ${args[0]}`;
          await twitchChatClient.sendMessage(chanLower, fullCommand);
          const viewers = args[1] ? ` с ${args[1]} зрителями` : '';
          return { handled: true, systemMessage: `⚔️ Рейд от ${args[0]}${viewers}` };
        }
        return { handled: true };

      case 'unraid':
        await twitchChatClient.sendMessage(chanLower, '/unraid');
        return { handled: true, systemMessage: '⚔️ Рейд отменен' };

      default:
        // Неизвестная команда - не обрабатываем
        return { handled: false };
    }
  } catch (err) {
    console.error('[ModCommands] Ошибка выполнения команды:', cmd, err);
    throw err;
  }
}

/**
 * Проверяет, является ли команда IRC-командой (должна отправляться напрямую через IRC)
 */
export function isIRCCommand(command: string): boolean {
  const cmd = command.toLowerCase();
  const ircCommands = [
    'me',
    'mod',
    'unmod',
    'vip',
    'unvip',
    'host',
    'unhost',
    'raid',
    'unraid',
    'w',
    'color',
    'block',
    'unblock',
    'ignore',
    'unignore',
    'delete',
    'untimeout'
  ];
  return ircCommands.includes(cmd);
}

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
