# Тестирование

## Установка зависимостей

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

## Запуск тестов

```bash
# Запуск в watch режиме
npm test

# Запуск один раз
npm run test:run

# Запуск с UI (требует установки @vitest/ui)
npm run test:ui
```

## Структура тестов

```
src/
├── utils/
│   ├── chatSystemMessages.ts
│   └── chatSystemMessages.test.ts
├── stores/
│   ├── chatStore.ts
│   └── chatStore.test.ts
└── test/
    └── setup.ts
```

## Что протестировано

### ✅ Utils
- `chatSystemMessages.ts` - создание системных сообщений, форматирование

### ✅ Stores
- `chatStore.ts` - управление состоянием чатов, сообщений, режимов

## Следующие шаги

1. Добавить тесты для `userStore.ts`
2. Добавить тесты для `moderationStore.ts`
3. Добавить тесты для `errorHandler.ts`
4. Добавить интеграционные тесты для компонентов
5. Добавить E2E тесты с Playwright

## Coverage

Для проверки покрытия кода тестами:

```bash
npm install -D @vitest/coverage-v8
npm test -- --coverage
```
