# 🗺️ План доработки Twitch Mod Dashboard

## 📊 Текущая оценка: 7.5/10

Проект представляет собой качественный MVP с отличным функционалом. Ниже приведён план улучшений для достижения production-ready состояния.

---

## 🔴 Приоритет 1: Критичные улучшения

### 1.1 Безопасность SSL
**Проблема:**
```javascript
// electron/main.js
const dimandusAgent = new https.Agent({
  rejectUnauthorized: false // ⚠️ Небезопасно
});
```

**Решение:**
- [ ] Получить валидный SSL сертификат для Dimandus сервера
- [ ] Удалить `rejectUnauthorized: false`
- [ ] Добавить проверку сертификатов

**Время:** 2-4 часа

---

### 1.2 Строгая типизация TypeScript
**Проблема:**
```typescript
// Много any типов
const json = await res.json(); // any
tags.badges || {} // any
```

**Решение:**
- [ ] Создать `src/types/twitch.ts` с интерфейсами для Twitch API
- [ ] Типизировать все API ответы
- [ ] Включить `strict: true` в tsconfig.json
- [ ] Добавить типы для IPC handlers

**Пример:**
```typescript
// src/types/twitch.ts
export interface TwitchUser {
  id: string;
  login: string;
  display_name: string;
  profile_image_url: string;
  offline_image_url: string;
  description: string;
  created_at: string;
  view_count: number;
}

export interface TwitchStream {
  id: string;
  user_id: string;
  user_login: string;
  title: string;
  viewer_count: number;
  started_at: string;
}

export interface ChatMessage {
  id: string;
  msgId?: string;
  userId?: string;
  text: string;
  userLogin: string;
  displayName: string;
  color?: string;
  badges: string[];
  timestamp: number;
  deleted?: boolean;
  isSystem?: boolean;
}
```

**Время:** 4-6 часов

---

### 1.3 Централизованная обработка ошибок
**Проблема:**
```javascript
catch (err) {
  console.warn('[App] getUsersInfo не удался', err);
  // Пользователь не видит ошибку
}
```

**Решение:**
- [ ] Создать `src/utils/errorHandler.ts`
- [ ] Добавить UI компонент для уведомлений (toast/snackbar)
- [ ] Логировать ошибки в файл (electron-log)
- [ ] Добавить ErrorBoundary для React

**Пример:**
```typescript
// src/utils/errorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'info' | 'warning' | 'error' | 'critical'
  ) {
    super(message);
  }
}

export function handleError(error: unknown, context: string) {
  const appError = error instanceof AppError 
    ? error 
    : new AppError(String(error), 'UNKNOWN', 'error');
  
  // Логирование
  console.error(`[${context}]`, appError);
  
  // UI уведомление
  window.electronAPI?.showNotification?.({
    type: appError.severity,
    message: appError.message
  });
}
```

**Время:** 3-4 часа

---

## 🟡 Приоритет 2: Важные улучшения

### 2.1 Рефакторинг App.tsx
**Проблема:**
- Файл >1000 строк
- Слишком много состояния в одном компоненте
- Сложно поддерживать

**Решение:**
- [ ] Разбить на контексты:
  - `ChatContext` — управление чатами
  - `UserContext` — данные пользователей
  - `ModerationContext` — модерация
- [ ] Вынести хуки в `src/hooks/`:
  - `useChatClient.ts`
  - `useActiveChatters.ts`
  - `useRoomModes.ts`
- [ ] Переместить логику в отдельные файлы

**Структура:**
```
src/
├── contexts/
│   ├── ChatContext.tsx
│   ├── UserContext.tsx
│   └── ModerationContext.tsx
├── hooks/
│   ├── useChatClient.ts
│   ├── useActiveChatters.ts
│   └── useRoomModes.ts
└── services/
    ├── chatService.ts
    └── moderationService.ts
```

**Время:** 6-8 часов

---

### 2.2 State Manager (Zustand)
**Проблема:**
- Prop drilling
- Сложная синхронизация состояния
- Дублирование данных (globalUsers vs activeChatters)

**Решение:**
- [ ] Установить Zustand: `npm install zustand`
- [ ] Создать stores:
  - `chatStore.ts` — чаты и сообщения
  - `userStore.ts` — пользователи
  - `settingsStore.ts` — настройки

**Пример:**
```typescript
// src/stores/chatStore.ts
import { create } from 'zustand';

interface ChatStore {
  panes: ChatPane[];
  addPane: (channel: string) => void;
  removePane: (channel: string) => void;
  addMessage: (channel: string, message: ChatMessage) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  panes: [],
  addPane: (channel) => set((state) => ({
    panes: [...state.panes, { channel, messages: [] }]
  })),
  removePane: (channel) => set((state) => ({
    panes: state.panes.filter(p => p.channel !== channel)
  })),
  addMessage: (channel, message) => set((state) => ({
    panes: state.panes.map(p => 
      p.channel === channel 
        ? { ...p, messages: [...p.messages, message] }
        : p
    )
  }))
}));
```

**Время:** 4-6 часов

---

### 2.3 Виртуализация списков
**Проблема:**
- Тормоза при >1000 сообщений
- Высокое потребление памяти

**Решение:**
- [ ] Установить `react-window` или `react-virtuoso`
- [ ] Применить к списку сообщений
- [ ] Применить к списку зрителей

**Пример:**
```typescript
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={600}
  itemCount={messages.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <ChatMessage message={messages[index]} />
    </div>
  )}
</FixedSizeList>
```

**Время:** 2-3 часа

---

### 2.4 Тестирование
**Проблема:**
- Нет тестов
- Риск регрессий при изменениях

**Решение:**
- [ ] Установить Vitest: `npm install -D vitest @testing-library/react`
- [ ] Написать unit тесты для utils
- [ ] Написать integration тесты для stores
- [ ] Добавить E2E тесты (Playwright)

**Структура:**
```
src/
├── utils/
│   ├── chatSystemMessages.ts
│   └── chatSystemMessages.test.ts
├── stores/
│   ├── chatStore.ts
│   └── chatStore.test.ts
└── __tests__/
    └── e2e/
        └── chat.spec.ts
```

**Время:** 8-12 часов

---

## 🟢 Приоритет 3: Желательные улучшения

### 3.1 Конфигурация через .env
**Решение:**
- [ ] Создать `.env.example`
- [ ] Использовать `dotenv` для загрузки
- [ ] Вынести константы из кода

```bash
# .env.example
DIMANDUS_BASE_URL=https://dimandus.ru:5001
DIMANDUS_CLIENT_ID=2sk3t84wmxpeulajhrnrf7ztlid1xp
TWITCH_REDIRECT_PORT=58585
```

**Время:** 1 час

---

### 3.2 Темы оформления
**Решение:**
- [ ] Создать `src/themes/`
- [ ] Добавить переключатель темы
- [ ] Сохранять выбор в настройках

```typescript
// src/themes/dark.ts
export const darkTheme = {
  background: '#18181b',
  surface: '#27272f',
  primary: '#9147ff',
  text: '#ffffff',
  textSecondary: '#adadb8'
};
```

**Время:** 3-4 часа

---

### 3.3 Кэширование данных
**Решение:**
- [ ] Использовать IndexedDB для кэша
- [ ] Кэшировать профили пользователей
- [ ] Кэшировать эмоты и бейджи

**Время:** 4-6 часов

---

### 3.4 Автообновление
**Решение:**
- [ ] Установить `electron-updater`
- [ ] Настроить GitHub Releases
- [ ] Добавить UI для уведомлений об обновлениях

**Время:** 2-3 часа

---

## 🚀 Быстрые победы (1-2 часа)

### ErrorBoundary
```tsx
// src/components/ErrorBoundary.tsx
import React from 'react';

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Что-то пошло не так. Перезагрузите приложение.</div>;
    }
    return this.props.children;
  }
}
```

### Оптимизация ре-рендеров
```typescript
// Использовать React.memo для компонентов
export const ChatMessage = React.memo(({ message }: Props) => {
  // ...
});

// Использовать useCallback для функций
const handleSend = useCallback((text: string) => {
  // ...
}, [dependencies]);
```

### Дебаунс для API запросов
```typescript
import { debounce } from 'lodash-es';

const debouncedFetch = useMemo(
  () => debounce((query) => fetchData(query), 300),
  []
);
```

---

## 📈 Метрики успеха

После выполнения плана:

- ✅ TypeScript coverage: 100% (сейчас ~70%)
- ✅ Test coverage: >80% (сейчас 0%)
- ✅ Bundle size: <5MB (сейчас ~8MB)
- ✅ Startup time: <2s (сейчас ~3s)
- ✅ Memory usage: <200MB (сейчас ~300MB)
- ✅ Zero SSL warnings
- ✅ Zero console errors

---

## 🎯 Roadmap по времени

### Месяц 1: Критичные улучшения
- Неделя 1-2: SSL + TypeScript
- Неделя 3-4: Обработка ошибок + рефакторинг App.tsx

### Месяц 2: Важные улучшения
- Неделя 1-2: State manager + виртуализация
- Неделя 3-4: Тестирование

### Месяц 3: Желательные улучшения
- Неделя 1: Темы + .env
- Неделя 2: Кэширование
- Неделя 3: Автообновление
- Неделя 4: Полировка и документация

---

## 📝 Заметки

- Все изменения делать в отдельных ветках
- Каждое улучшение = отдельный PR
- Обновлять CHANGELOG.md
- Тестировать на всех платформах (Windows/macOS/Linux)

---

**Последнее обновление:** 2024
