// Константы для чата

export const SLOW_MODE_OPTIONS = [
  { label: 'Выкл', value: 0 },
  { label: '3с', value: 3 },
  { label: '5с', value: 5 },
  { label: '10с', value: 10 },
  { label: '20с', value: 20 },
  { label: '30с', value: 30 },
  { label: '60с', value: 60 },
  { label: '120с', value: 120 }
];

export const FOLLOWERS_MODE_OPTIONS = [
  { label: 'Выкл', value: -1 },
  { label: '0м', value: 0 },
  { label: '10м', value: 10 },
  { label: '30м', value: 30 },
  { label: '1ч', value: 60 },
  { label: '1д', value: 1440 },
  { label: '1н', value: 10080 },
  { label: '1мес', value: 43200 }
];

export const TWITCH_COMMANDS = [
  { name: '/me', desc: 'Цветной текст' },
  { name: '/clear', desc: 'Очистить чат' },
  { name: '/slow', desc: 'Включить slowmode' },
  { name: '/slowoff', desc: 'Выключить slowmode' },
  { name: '/followers', desc: 'Только для фолловеров' },
  { name: '/followersoff', desc: 'Отключить только для фолловеров' },
  { name: '/subscribers', desc: 'Только для подписчиков' },
  { name: '/subscribersoff', desc: 'Отключить только для подписчиков' },
  { name: '/emoteonly', desc: 'Только эмодзи' },
  { name: '/emoteonlyoff', desc: 'Отключить только эмодзи' },
  { name: '/ban', desc: 'Бан пользователя' },
  { name: '/timeout', desc: 'Таймаут пользователя' },
  { name: '/unban', desc: 'Разбан пользователя' },
  { name: '/announce', desc: 'Объявление' },
  { name: '/uniquechat', desc: 'Уникальные сообщения' },
  { name: '/uniquechatoff', desc: 'Отключить уникальные сообщения' }
];
