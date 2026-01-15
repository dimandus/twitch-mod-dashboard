# Рефакторинг SettingsView.tsx

## ✅ Что уже создано

### Компоненты вкладок
- ✅ `src/components/settings/AuthTab.tsx` - авторизация и scopes
- ✅ `src/components/settings/ParamsTab.tsx` - параметры UI
- ✅ `src/components/settings/DesignTab.tsx` - выбор темы

## 📝 Следующие шаги

### 1. Обновить импорты в SettingsView.tsx

```typescript
import { AuthTab } from '../components/settings/AuthTab';
import { ParamsTab } from '../components/settings/ParamsTab';
import { DesignTab } from '../components/settings/DesignTab';
```

### 2. Удалить дублирующийся код

Удалить из SettingsView.tsx:
- Константу REQUIRED_SCOPES (перенесена в AuthTab)
- Все inline стили для секций (перенесены в компоненты вкладок)

### 3. Заменить рендеринг вкладок компонентами

#### Вкладка Авторизация:
```typescript
// Было:
{tab === 'auth' && (
  <>
    <section>...</section>
    <section>...</section>
    {/* много кода */}
  </>
)}

// Стало:
{tab === 'auth' && (
  <AuthTab
    clientId={clientId}
    clientSecret={clientSecret}
    login={login}
    authMode={authMode}
    currentScopes={currentScopes}
    loadingLogin={loadingLogin}
    onClientIdChange={setClientId}
    onClientSecretChange={setClientSecret}
    onSaveCreds={saveCreds}
    onLogin={handleLogin}
    onLoginViaDimandus={handleLoginViaDimandus}
    onLogout={handleLogout}
  />
)}
```

#### Вкладка Параметры:
```typescript
// Было:
{tab === 'params' && (
  <>
    <section>...</section>
    <section>...</section>
  </>
)}

// Стало:
{tab === 'params' && (
  <ParamsTab
    fontScaleMin={fontScaleMin}
    fontScaleMax={fontScaleMax}
    globalScaleMin={globalScaleMin}
    globalScaleMax={globalScaleMax}
    hoverPauseKey={hoverPauseKey}
    onFontScaleMinChange={setFontScaleMin}
    onFontScaleMaxChange={setFontScaleMax}
    onGlobalScaleMinChange={setGlobalScaleMin}
    onGlobalScaleMaxChange={setGlobalScaleMax}
    onHoverPauseKeyChange={setHoverPauseKey}
    onSaveUiScaleLimits={saveUiScaleLimits}
    onSaveHoverPauseKey={saveHoverPauseKey}
  />
)}
```

#### Вкладка Дизайн:
```typescript
// Было:
{tab === 'design' && (
  <section>
    {/* код выбора темы */}
  </section>
)}

// Стало:
{tab === 'design' && (
  <DesignTab
    currentTheme={currentTheme}
    onThemeChange={setTheme}
  />
)}
```

### 4. Упростить основной компонент

После рефакторинга SettingsView.tsx будет содержать только:
- State management
- Обработчики событий
- Переключение вкладок
- Отображение сообщений

### 5. Удалить неиспользуемые стили

После замены компонентами удалить:
- containerStyle
- sectionStyle
- sectionTitleStyle
- hintStyle
- labelStyle
- inputStyle
- linkStyle
- buttonPrimaryStyle
- buttonSecondaryStyle
- buttonDangerStyle
- statusBoxStyle
- warningBoxStyle

Оставить только:
- getContainerStyle (для обертки)
- tabsContainerStyle (для переключателя вкладок)
- messageStyle (для уведомлений)

## 📊 Результат

После рефакторинга SettingsView.tsx уменьшится с ~700 строк до ~250-300 строк.

Код станет:
- ✅ Более модульным
- ✅ Легче читаемым
- ✅ Проще поддерживаемым
- ✅ Каждая вкладка - отдельный компонент

## 🎯 Преимущества

1. **Модульность** - каждая вкладка независима
2. **Переиспользование** - стили вкладок можно переиспользовать
3. **Тестируемость** - вкладки можно тестировать отдельно
4. **Расширяемость** - легко добавить новую вкладку

## 📝 Пример добавления новой вкладки

Чтобы добавить новую вкладку:

1. Создать `src/components/settings/NewTab.tsx`
2. Добавить тип в `type SettingsTab = 'auth' | 'params' | 'design' | 'new'`
3. Добавить кнопку в tabsContainer
4. Добавить рендеринг: `{tab === 'new' && <NewTab />}`

Готово! Вся логика изолирована в компоненте.
