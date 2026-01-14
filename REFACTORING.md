# Рефакторинг App.tsx - Документация

## Обзор

App.tsx был успешно рефакторен с **1000+ строк до ~400 строк** путём разделения логики на контексты и хуки.

---

## Структура

### Контексты (`src/contexts/`)

#### ChatContext.tsx
**Отвечает за:** Управление чатами и их состоянием

**Состояние:**
- `chatPanes` — открытые панели чатов
- `roomModes` — режимы чата (slow, emote, subs и т.д.)
- `selectedChannel` — выбранный канал
- `chatReady` — готовность чат-клиента
- `currentUserLogin` — логин текущего пользователя

**Методы:**
- `markModeChanged(channel)` — отметить изменение режима
- `addSystemMessage(channel, text)` — добавить системное сообщение

#### UserContext.tsx
**Отвечает за:** Данные пользователей

**Состояние:**
- `globalUsers` — все пользователи с историей сообщений
- `activeChatters` — активные зрители по каналам

#### ModerationContext.tsx
**Отвечает за:** Модальные окна модерации

**Состояние:**
- `userLogOpen` — открытый лог пользователя
- `userProfileLogin` — открытый профиль
- `autoModQueueOpen` — открыта ли очередь AutoMod

**Методы:**
- `openUserLog(login)` — открыть лог пользователя
- `openUserProfile(login)` — открыть профиль
- `closeUserLog()` / `closeUserProfile()` — закрыть модалки

---

### Хуки (`src/hooks/`)

#### useChatClient.ts
**Отвечает за:** Инициализацию и обработку событий чат-клиента

**Что делает:**
- Подключается к Twitch IRC
- Обрабатывает входящие сообщения
- Обрабатывает события (бан, таймаут, clearchat, notice)
- Обрабатывает roomstate (режимы чата)
- Автоматически переподключается при ошибках аутентификации

**Возвращает:**
- `pendingSelfMessagesRef` — очередь отправленных сообщений

#### useActiveChatters.ts
**Отвечает за:** Управление списком активных зрителей

**Что делает:**
- Очищает неактивных чаттеров каждую минуту
- Удаляет пользователей, неактивных >5 минут

#### useRoomModes.ts
**Отвечает за:** Периодическое обновление режимов чата

**Что делает:**
- Запрашивает настройки чата через Helix API
- Обновляет состояние каждые 30 секунд
- Учитывает недавние изменения (не перезаписывает 5 секунд после изменения)

---

## Использование

### В App.tsx

```tsx
import { ChatProvider, useChatContext } from './contexts/ChatContext';
import { UserProvider, useUserContext } from './contexts/UserContext';
import { ModerationProvider, useModerationContext } from './contexts/ModerationContext';
import { useChatClient } from './hooks/useChatClient';
import { useActiveChatters } from './hooks/useActiveChatters';
import { useRoomModes } from './hooks/useRoomModes';

const AppContent: React.FC = () => {
  const { chatPanes, setChatPanes, chatReady } = useChatContext();
  const { globalUsers, activeChatters } = useUserContext();
  const { openUserLog, openUserProfile } = useModerationContext();

  useChatClient(markMessageAsDeleted);
  useActiveChatters();
  useRoomModes();

  // ... остальная логика
};

const App: React.FC = () => {
  return (
    <ChatProvider>
      <UserProvider>
        <ModerationProvider>
          <AppContent />
        </ModerationProvider>
      </UserProvider>
    </ChatProvider>
  );
};
```

---

## Преимущества

### До рефакторинга
- ❌ 1000+ строк в одном файле
- ❌ Вся логика в одном компоненте
- ❌ Сложно найти нужный код
- ❌ Трудно тестировать
- ❌ Много дублирования

### После рефакторинга
- ✅ ~400 строк в App.tsx
- ✅ Логика разбита по контекстам
- ✅ Каждый модуль отвечает за свою область
- ✅ Легко тестировать отдельные части
- ✅ Переиспользуемые хуки
- ✅ Чистая архитектура

---

## Миграция

Старый App.tsx сохранён как `App.old.tsx` для справки.

### Основные изменения:

1. **Состояние разбито по контекстам**
   - Чаты → ChatContext
   - Пользователи → UserContext
   - Модерация → ModerationContext

2. **Логика вынесена в хуки**
   - Инициализация чата → useChatClient
   - Активные зрители → useActiveChatters
   - Режимы чата → useRoomModes

3. **App.tsx теперь только координирует**
   - Рендерит провайдеры
   - Связывает контексты
   - Обрабатывает высокоуровневые действия

---

## Следующие шаги

Теперь можно легко:
- Добавить Zustand для глобального стейта
- Написать unit-тесты для хуков
- Добавить новые фичи без раздувания App.tsx
- Оптимизировать отдельные части

---

**Дата рефакторинга:** 2024
**Время затрачено:** ~2 часа
**Результат:** Код стал модульным, поддерживаемым и масштабируемым
