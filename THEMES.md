# 🎨 Темы оформления

## ✅ Что сделано

### Система тем
- ✅ Создана типизация тем (`src/themes/types.ts`)
- ✅ 4 готовые темы:
  - **Тёмная** (по умолчанию) - классическая тёмная тема
  - **Светлая** - для работы днём
  - **Фиолетовая** - в стиле Twitch
  - **Синяя** - холодные тона

### Zustand Store
- ✅ `themeStore.ts` - управление темой
- ✅ Автосохранение выбора в конфиг
- ✅ Автозагрузка при старте

### UI
- ✅ Вкладка "Дизайн" в настройках
- ✅ Превью тем с цветами
- ✅ Мгновенное применение
- ✅ Индикатор активной темы

### Интеграция
- ✅ App.tsx применяет тему к фону и границам
- ✅ Готово к расширению на другие компоненты

## 🎯 Как использовать

### Для пользователя

1. Открой **Настройки** → вкладка **Дизайн**
2. Выбери понравившуюся тему
3. Изменения применяются мгновенно
4. Выбор сохраняется автоматически

### Для разработчика

**Использование темы в компоненте:**

```typescript
import { useThemeStore } from '../stores/themeStore';

const MyComponent = () => {
  const { theme } = useThemeStore();
  
  return (
    <div style={{ 
      background: theme.colors.surface,
      color: theme.colors.text,
      border: `1px solid ${theme.colors.border}`
    }}>
      Контент
    </div>
  );
};
```

**Создание новой темы:**

```typescript
// src/themes/myTheme.ts
import { Theme } from './types';

export const myTheme: Theme = {
  name: 'Моя тема',
  colors: {
    background: '#...',
    surface: '#...',
    // ... остальные цвета
  }
};

// Добавить в src/themes/index.ts
import { myTheme } from './myTheme';

export const themes: Record<ThemeName, Theme> = {
  // ...
  myTheme: myTheme
};
```

## 📊 Структура темы

Каждая тема содержит:

### Основные цвета
- `background` - фон приложения
- `surface` - фон карточек/панелей
- `surfaceHover` - hover состояние
- `border` - границы элементов

### Текст
- `text` - основной текст
- `textSecondary` - вторичный текст
- `textMuted` - приглушённый текст

### Акценты
- `primary` - основной акцент (кнопки, ссылки)
- `success` - успех (зелёный)
- `warning` - предупреждение (жёлтый)
- `error` - ошибка (красный)

### Чат
- `chatBackground` - фон области чата
- `chatMessage` - фон сообщения
- `chatMessageDeleted` - удалённое сообщение
- `chatMessageMention` - упоминание
- `chatMessageRaid` - сообщение рейдера
- `chatMessageFirst` - первое сообщение
- `chatSystem` - системное сообщение

### Кнопки
- `buttonPrimary` - основная кнопка
- `buttonSecondary` - вторичная кнопка
- `buttonDanger` - опасная кнопка

### Модерация
- `modActive` - активный режим модерации
- `modInactive` - неактивный режим

## 🚀 Следующие шаги

### Применить тему к остальным компонентам:

1. **ChatArea.tsx** (приоритет: высокий)
   - Фон чата
   - Цвета сообщений
   - Кнопки модерации

2. **Sidebar.tsx**
   - Фон боковой панели
   - Цвета элементов списка

3. **Модальные окна**
   - UserMessageLog
   - UserProfileModal
   - AutoModQueue

4. **SettingsView.tsx**
   - Применить цвета темы к элементам

### Пример применения к ChatArea:

```typescript
const { theme } = useThemeStore();

const messageStyle = {
  background: message.deleted 
    ? theme.colors.chatMessageDeleted 
    : message.mentionedSelf
    ? theme.colors.chatMessageMention
    : theme.colors.chatMessage,
  color: theme.colors.text
};
```

## 💡 Советы

- Используй `theme.colors.*` вместо хардкода цветов
- Все новые компоненты должны поддерживать темы
- Тестируй на всех темах перед коммитом
- Светлая тема требует особого внимания к контрасту

## ✅ Полностью интегрировано

- [x] App.tsx
- [x] DashboardView.tsx
- [x] ChatArea.tsx - все цвета через CSS переменные
- [x] Sidebar.tsx - все цвета через CSS переменные
- [x] SettingsView.tsx
- [x] Глобальные стили (body, scrollbar, inputs)

Темы работают повсюду! 🎨

## ✅ Как это работает

### CSS Переменные

Темы применяются через CSS переменные в `:root`. Это позволяет:
- Мгновенно менять тему без перерисовки компонентов
- Использовать `var(--color-primary)` вместо хардкода
- Автоматически применять тему ко всем элементам

### Использование в стилях

```typescript
// Вместо хардкода
background: '#9147ff'

// Используй CSS переменную
background: 'var(--color-primary)'
```

### Доступные переменные

- `--color-background` - фон приложения
- `--color-surface` - фон карточек
- `--color-border` - границы
- `--color-text` - основной текст
- `--color-primary` - акцентный цвет
- `--color-chatMessage` - фон сообщения
- И все остальные из темы...

### Автоматическое применение

Хук `useApplyTheme()` в App.tsx автоматически обновляет CSS переменные при смене темы.
