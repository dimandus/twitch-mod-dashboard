# Примеры использования системы обработки ошибок

## В React компонентах (src/)

```typescript
import { handleError, AppError, ErrorCodes } from './utils/errorHandler';

// Пример 1: Обработка ошибки API
try {
  const data = await window.electronAPI.twitch.getUserDetails(login);
  // ...
} catch (err) {
  handleError(err, 'UserProfile');
  // Пользователь увидит уведомление
}

// Пример 2: Создание кастомной ошибки
if (!channelName) {
  throw new AppError(
    'Не указано имя канала',
    ErrorCodes.CHANNEL_NOT_FOUND,
    'warning',
    'ChannelInput'
  );
}

// Пример 3: Критическая ошибка
try {
  await criticalOperation();
} catch (err) {
  const appError = new AppError(
    'Критическая ошибка операции',
    ErrorCodes.API_ERROR,
    'critical',
    'CriticalOp'
  );
  handleError(appError, 'System');
}
```

## В Electron main процессе (electron/main.js)

```javascript
// Функция sendNotification уже добавлена в main.js

// Пример использования:
function someFunction() {
  try {
    // код
  } catch (err) {
    sendNotification('error', 'Описание ошибки для пользователя', 'FunctionName');
    throw err;
  }
}

// Типы уведомлений:
// 'info' - синий
// 'warning' - оранжевый  
// 'error' - красный
// 'critical' - тёмно-красный
```

## Типы ошибок (ErrorCodes)

```typescript
ErrorCodes.AUTH_FAILED           // Ошибка авторизации
ErrorCodes.TOKEN_EXPIRED         // Токен истёк
ErrorCodes.INSUFFICIENT_SCOPES   // Недостаточно прав
ErrorCodes.NETWORK_ERROR         // Сетевая ошибка
ErrorCodes.API_ERROR             // Ошибка API
ErrorCodes.CHAT_CONNECTION_FAILED // Ошибка подключения к чату
ErrorCodes.MODERATION_FAILED     // Ошибка модерации
ErrorCodes.USER_NOT_FOUND        // Пользователь не найден
ErrorCodes.CHANNEL_NOT_FOUND     // Канал не найден
```

## Что уже применено

### В App.tsx:
- ✅ handleUserModeration
- ✅ handleDeleteMessageFromLog
- ✅ fetchUsersInfo
- ✅ initChat
- ✅ checkLoginAndInitChat
- ✅ syncChannels (joinChannel)
- ✅ refreshChatSettings

### В electron/main.js:
- ✅ getBroadcasterIdByLogin
- ✅ getUserIdByLogin
- ✅ refreshTwitchToken (Dimandus)
- ✅ refreshTwitchToken (Direct)
- ✅ helixFetch (401 errors)
- ✅ banUserHelix
- ✅ deleteMessageHelix
- ✅ sendAnnouncementHelix
- ✅ sendChatMessageHelix

## Результат

Теперь при любой ошибке:
1. Пользователь видит понятное уведомление в правом верхнем углу
2. Ошибка логируется в консоль с контекстом
3. Уведомление автоматически исчезает через 5 секунд
4. Можно закрыть вручную кнопкой ✕
