# 📋 Оставшиеся файлы для рефакторинга

## ✅ Уже отрефакторено

| Файл | Строк | Статус |
|------|-------|--------|
| ChatArea.tsx | 2300 → 900 | ✅ Готово |
| Sidebar.tsx | 1400 → 700 | ✅ Готово |
| SettingsView.tsx | 700 → 300 | ✅ Готово |

---

## 🟡 Средний приоритет

### 1. App.tsx (~600 строк)

**Текущее состояние:** Хорошо структурирован, но можно улучшить

**Что можно вынести:**

#### Хуки → `hooks/`
- **useSendMessage.ts** (~80 строк)
  - `handleSendMessage` - отправка сообщений
  - Обработка команд
  - Fallback на IRC

- **useModeration.ts** (~100 строк)
  - `markMessageAsDeleted`
  - `markUserMessagesAsDeleted`
  - `handleUserModeration`
  - `handleDeleteMessageFromLog`

- **useUserLog.ts** (~50 строк)
  - `handleOpenUserLog`
  - Логика работы с логом пользователя

#### Результат:
- App.tsx: 600 → 350-400 строк (-35%)
- Логика изолирована в хуках
- Легче тестировать

---

### 2. DashboardView.tsx (~400 строк)

**Текущее состояние:** Уже неплохо, но есть что улучшить

**Что можно вынести:**

#### Хуки → `hooks/`
- **useChatPanes.ts** (~100 строк)
  - `handleAddChatPane`
  - `handleRemoveChatPane`
  - `handleClearChatPane`
  - `handleTogglePausePane`
  - `handleReorderChatPanes`

- **useChatModes.ts** (~80 строк)
  - `handleModeToggle`
  - `loadChatSettings`
  - Логика режимов чата

#### Результат:
- DashboardView.tsx: 400 → 200-250 строк (-40%)
- Чистая структура
- Переиспользуемые хуки

---

## 🟢 Низкий приоритет (уже хорошо)

### 3. UserMessageLog.tsx (~350 строк)
**Статус:** Хорошо структурирован, рефакторинг не требуется

### 4. UserProfileModal.tsx (~200 строк)
**Статус:** Компактный, рефакторинг не требуется

### 5. AutoModQueue.tsx (размер неизвестен)
**Статус:** Нужно проверить размер

---

## 📊 Приоритеты рефакторинга

### Высокий ✅ (Выполнено)
1. ✅ ChatArea.tsx - 2300 строк
2. ✅ Sidebar.tsx - 1400 строк
3. ✅ SettingsView.tsx - 700 строк

### Средний 🟡 (Рекомендуется)
4. 🟡 App.tsx - 600 строк → вынести хуки
5. 🟡 DashboardView.tsx - 400 строк → вынести хуки

### Низкий 🟢 (Опционально)
6. 🟢 Остальные файлы уже хорошо структурированы

---

## 🎯 Рекомендации

### Для App.tsx

**Создать хуки:**

```typescript
// hooks/useSendMessage.ts
export const useSendMessage = () => {
  const setPanes = useChatStore(state => state.setPanes);
  
  const handleSendMessage = useCallback(async (channel: string, text: string) => {
    // вся логика отправки
  }, [setPanes]);
  
  return { handleSendMessage };
};

// hooks/useModeration.ts
export const useModeration = () => {
  const setPanes = useChatStore(state => state.setPanes);
  const setGlobalUsers = useUserStore(state => state.setGlobalUsers);
  
  const markMessageAsDeleted = useCallback((channel: string, msgId: string) => {
    // логика
  }, [setPanes, setGlobalUsers]);
  
  const markUserMessagesAsDeleted = useCallback((channel: string, userLogin: string) => {
    // логика
  }, [setPanes, setGlobalUsers]);
  
  return { markMessageAsDeleted, markUserMessagesAsDeleted };
};
```

**Использование в App.tsx:**

```typescript
const { handleSendMessage } = useSendMessage();
const { markMessageAsDeleted, markUserMessagesAsDeleted } = useModeration();
```

---

### Для DashboardView.tsx

**Создать хуки:**

```typescript
// hooks/useChatPanes.ts
export const useChatPanes = () => {
  const setChatPanes = useChatStore(state => state.setPanes);
  
  const handleAddChatPane = useCallback((channelLogin: string) => {
    // логика
  }, [setChatPanes]);
  
  const handleRemoveChatPane = useCallback((id: string) => {
    // логика
  }, [setChatPanes]);
  
  // остальные методы
  
  return {
    handleAddChatPane,
    handleRemoveChatPane,
    handleClearChatPane,
    handleTogglePausePane,
    handleReorderChatPanes
  };
};
```

---

## 📈 Итоговая статистика

### Текущее состояние
| Категория | Строк |
|-----------|-------|
| Отрефакторено | 4400 → 1700 (-61%) |
| Средний приоритет | 1000 → 600 (-40%) |
| Низкий приоритет | ~1000 (без изменений) |
| **ИТОГО** | **~6400 → ~3300 (-48%)** |

### После полного рефакторинга
- **Основные файлы:** -61% кода
- **Дополнительные файлы:** -40% кода
- **Общее уменьшение:** ~48% кода
- **Создано компонентов:** 13
- **Создано хуков:** 8-10
- **Создано утилит:** 3

---

## ✅ Чек-лист

### Выполнено ✅
- [x] ChatArea.tsx - разбит на 7 компонентов
- [x] Sidebar.tsx - разбит на 3 компонента
- [x] SettingsView.tsx - разбит на 3 компонента
- [x] Создано 3 файла констант
- [x] Создано 3 файла утилит
- [x] Написана документация

### Рекомендуется 🟡
- [ ] App.tsx - вынести 3 хука
- [ ] DashboardView.tsx - вынести 2 хука

### Опционально 🟢
- [ ] Проверить AutoModQueue.tsx
- [ ] Покрыть компоненты тестами
- [ ] Добавить Storybook

---

## 🎯 Вывод

**Основная работа выполнена!** ✅

Три самых больших файла (4400 строк) успешно отрефакторены до 1700 строк (-61%).

**Дополнительно можно:**
- Вынести хуки из App.tsx и DashboardView.tsx
- Это даст еще -40% кода в этих файлах
- Но это уже опционально, текущее состояние приемлемо

**Приоритет:** Низкий, можно делать по желанию
