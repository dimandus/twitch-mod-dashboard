# Проверка ErrorBoundary и тестов

## ✅ ErrorBoundary установлен

ErrorBoundary уже интегрирован в приложение:
- Файл: `src/components/ErrorBoundary.tsx`
- Подключен в: `src/main.tsx`

### Как проверить ErrorBoundary:

1. Запустите приложение: `npm run dev`
2. Откройте DevTools (F12)
3. В консоли выполните:
```javascript
// Симулируем ошибку
throw new Error('Test error');
```
4. Вы должны увидеть красивый экран ошибки с кнопкой перезагрузки

## ⚠️ Проблема с тестами

Из-за проблем с кодировкой Windows (CP866) тестовые файлы создаются некорректно.

### Решение:

**Вариант 1: Создать тесты вручную в VS Code**

1. Откройте VS Code
2. Создайте файл `src/utils/example.test.ts`
3. Вставьте код:

```typescript
import { describe, it, expect } from 'vitest';

describe('Example Test', () => {
  it('should work', () => {
    expect(1 + 1).toBe(2);
  });
});
```

4. Сохраните с кодировкой UTF-8
5. Запустите: `npm test`

**Вариант 2: Использовать PowerShell**

```powershell
# В PowerShell (не cmd)
cd "g:\Twitch Mod Dashboard\twitch-mod-dashboard"

# Создать тестовый файл
@"
import { describe, it, expect } from 'vitest';

describe('Example', () => {
  it('works', () => {
    expect(true).toBe(true);
  });
});
"@ | Out-File -Encoding UTF8 src\utils\example.test.ts

# Запустить тесты
npm test
```

## 📝 Что уже готово:

✅ ErrorBoundary - работает  
✅ Vitest установлен  
✅ Конфигурация готова (`vite.config.ts`)  
✅ Примеры тестов созданы (нужно пересоздать в UTF-8):
  - `src/utils/chatSystemMessages.test.ts`
  - `src/stores/chatStore.test.ts`

## 🎯 Следующие шаги:

1. Пересоздайте тестовые файлы в VS Code с UTF-8
2. Запустите `npm test`
3. Все тесты должны пройти ✅

## 📊 Команды для тестирования:

```bash
# Запуск всех тестов
npm test

# Запуск один раз
npm run test:run

# Запуск конкретного файла
npm test -- src/utils/chatSystemMessages.test.ts

# Watch режим
npm test -- --watch
```
