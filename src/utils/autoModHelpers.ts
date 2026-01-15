import { AutoModTrigger } from '../stores/autoModerationStore';

/**
 * Проверяет сообщение на соответствие триггерам автомодерации
 */
export const checkAutoModTriggers = (
  message: string,
  triggers: AutoModTrigger[]
): boolean => {
  if (!message || triggers.length === 0) return false;

  const enabledTriggers = triggers.filter((t) => t.enabled);
  if (enabledTriggers.length === 0) return false;

  const lowerMessage = message.toLowerCase();

  for (const trigger of enabledTriggers) {
    try {
      if (trigger.type === 'word') {
        // Проверка на точное совпадение слова
        // Используем (?:^|\s) и (?:\s|$) для поддержки кириллицы
        const escapedValue = escapeRegex(trigger.value.toLowerCase());
        const wordRegex = new RegExp(`(?:^|\s|[^\wа-яё])${escapedValue}(?:$|\s|[^\wа-яё])`, 'i');
        if (wordRegex.test(lowerMessage)) {
          return true;
        }
      } else if (trigger.type === 'regex') {
        // Проверка регулярного выражения
        const regex = new RegExp(trigger.value, 'i');
        if (regex.test(message)) {
          return true;
        }
      }
    } catch (err) {
      // Игнорируем невалидные регулярные выражения
      console.warn(`[AutoMod] ❌ Invalid trigger: ${trigger.value}`, err);
    }
  }

  return false;
};

/**
 * Экранирует специальные символы для использования в регулярном выражении
 */
const escapeRegex = (str: string): string => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\$&');
};
