export function clampMessageSpacing(value: number): number {
  if (Number.isNaN(value)) return 4;
  return value;
}
// Утилиты для чата

export function clampWidth(w: number): number {
  return w;
}

export function clampHeight(h: number): number {
  return h;
}

export function clampAutoScale(value: number): number {
  if (Number.isNaN(value)) return 1;
  return value;
}

export function clampLineHeight(value: number): number {
  if (Number.isNaN(value)) return 1.2;
  return value;
}

export function formatFollowersDuration(minutes: number): string {
  if (minutes < 0 || isNaN(minutes)) return '';
  if (minutes === 0) return '0м';
  if (minutes < 60) return `${minutes}м`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}ч`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}д`;
  if (minutes < 43200) return `${Math.floor(minutes / 10080)}н`;
  return `${Math.floor(minutes / 43200)}мес`;
}

export function buildEmoteUrls(id: string): { url1x: string; url2x: string; url4x: string } {
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark`;
  return {
    url1x: `${base}/1.0`,
    url2x: `${base}/2.0`,
    url4x: `${base}/3.0`
  };
}

export function badgeTitle(setId: string, months?: string): string {
  switch (setId) {
    case 'broadcaster':
      return 'Стример';
    case 'moderator':
      return 'Модератор';
    case 'vip':
      return 'VIP';
    case 'subscriber':
      return months ? `Подписчик (${months} мес.)` : 'Подписчик';
    case 'staff':
      return 'Twitch Staff';
    case 'admin':
      return 'Twitch Admin';
    case 'global_mod':
      return 'Global Moderator';
    default:
      return setId;
  }
}
