// Тестовый скрипт для проверки автомодерации
// Запустите в консоли браузера (DevTools)

console.log('=== Тест автомодерации ===');

// Импортируем функцию (если нужно, скопируйте код функции сюда)
const escapeRegex = (str) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const checkAutoModTriggers = (message, triggers) => {
  if (!message || triggers.length === 0) return false;

  const enabledTriggers = triggers.filter((t) => t.enabled);
  if (enabledTriggers.length === 0) return false;

  const lowerMessage = message.toLowerCase();

  for (const trigger of enabledTriggers) {
    try {
      if (trigger.type === 'word') {
        const wordRegex = new RegExp(`\\b${escapeRegex(trigger.value.toLowerCase())}\\b`, 'i');
        console.log('Testing word:', trigger.value, 'Regex:', wordRegex, 'Message:', lowerMessage);
        if (wordRegex.test(lowerMessage)) {
          console.log('✅ MATCH!');
          return true;
        }
      } else if (trigger.type === 'regex') {
        const regex = new RegExp(trigger.value, 'i');
        console.log('Testing regex:', trigger.value, 'Regex:', regex, 'Message:', message);
        if (regex.test(message)) {
          console.log('✅ MATCH!');
          return true;
        }
      }
    } catch (err) {
      console.warn(`Invalid trigger: ${trigger.value}`, err);
    }
  }

  return false;
};

// Тестовые данные
const testTriggers = [
  { id: '1', type: 'word', value: 'test', enabled: true },
  { id: '2', type: 'word', value: 'spoiler', enabled: true },
  { id: '3', type: 'regex', value: 'https?://', enabled: true }
];

const testMessages = [
  'This is a test message',
  'testing',
  'This is a spoiler',
  'Check this http://example.com',
  'Normal message'
];

console.log('\n--- Тестирование ---');
testMessages.forEach(msg => {
  const result = checkAutoModTriggers(msg, testTriggers);
  console.log(`Message: "${msg}" -> ${result ? '🟡 TRIGGERED' : '⚪ OK'}`);
});

console.log('\n--- Проверка localStorage ---');
const stored = localStorage.getItem('twitch-automod-store');
if (stored) {
  const data = JSON.parse(stored);
  console.log('Stored data:', data);
  console.log('Enabled:', data.state?.enabled);
  console.log('Triggers:', data.state?.triggers);
} else {
  console.log('❌ Нет данных в localStorage');
}

console.log('\n=== Конец теста ===');
