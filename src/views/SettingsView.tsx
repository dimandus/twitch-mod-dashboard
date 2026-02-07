import React, { useEffect, useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import { AuthTab } from '../components/settings/AuthTab';
import { ParamsTab } from '../components/settings/ParamsTab';
import { DesignTab } from '../components/settings/DesignTab';
import { AutoModTab } from '../components/settings/AutoModTab';

type SettingsTab = 'auth' | 'params' | 'design' | 'automod';

const SettingsView: React.FC = () => {
  // Текущая вкладка настроек
  const [tab, setTab] = useState<SettingsTab>('auth');

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [login, setLogin] = useState<string | null>(null);
  const [currentScopes, setCurrentScopes] = useState<string[]>([]);
  const [authMode, setAuthMode] = useState<string | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' } | null>(null);

  // Границы масштабов UI (Параметры)
  const [fontScaleMin, setFontScaleMin] = useState<number>(0.7);
  const [fontScaleMax, setFontScaleMax] = useState<number>(1.5);
  const [globalScaleMin, setGlobalScaleMin] = useState<number>(0.7);
  const [globalScaleMax, setGlobalScaleMax] = useState<number>(1.5);
  
  // Кнопка для временной паузы скролла
  const [hoverPauseKey, setHoverPauseKey] = useState<string>('Alt');
  
  // Тема
  const { currentTheme, setTheme, theme } = useThemeStore();

  // =====================================================
  // Загрузка настроек
  // =====================================================

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [
        cid,
        cs,
        currentUser,
        scopes,
        mode,
        fsMin,
        fsMax,
        gsMin,
        gsMax,
        hpKey
      ] = await Promise.all([
        window.electronAPI.config.get('twitch.clientId'),
        window.electronAPI.config.get('twitch.clientSecret'),
        window.electronAPI.twitch.getCurrentUser(),
        window.electronAPI.config.get('twitch.scopes'),
        window.electronAPI.config.get('twitch.authMode'),
        window.electronAPI.config.get('ui.chat.fontScaleMin'),
        window.electronAPI.config.get('ui.chat.fontScaleMax'),
        window.electronAPI.config.get('ui.chat.globalScaleMin'),
        window.electronAPI.config.get('ui.chat.globalScaleMax'),
        window.electronAPI.config.get('ui.chat.hoverPauseKey')
      ]);

      if (cid) setClientId(cid);
      if (cs) setClientSecret(cs);
      if (currentUser?.login) setLogin(currentUser.login);
      if (Array.isArray(scopes)) setCurrentScopes(scopes);
      if (mode) setAuthMode(mode);

      if (typeof fsMin === 'number') setFontScaleMin(fsMin);
      if (typeof fsMax === 'number') setFontScaleMax(fsMax);
      if (typeof gsMin === 'number') setGlobalScaleMin(gsMin);
      if (typeof gsMax === 'number') setGlobalScaleMax(gsMax);
      if (typeof hpKey === 'string') setHoverPauseKey(hpKey);
    } catch (err) {
      console.error('Ошибка загрузки настроек', err);
    }
  };

  // =====================================================
  // Проверка scopes
  // =====================================================

  // =====================================================
  // Handlers
  // =====================================================

  const showMessage = (text: string, type: 'info' | 'success' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const saveCreds = async () => {
    try {
      await window.electronAPI.config.set('twitch.clientId', clientId.trim());
      await window.electronAPI.config.set('twitch.clientSecret', clientSecret.trim());
      showMessage('API ключи сохранены', 'success');
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка сохранения API ключей', 'error');
    }
  };

  const saveHoverPauseKey = async () => {
    try {
      await window.electronAPI.config.set('ui.chat.hoverPauseKey', hoverPauseKey);
      showMessage('Кнопка для паузы скролла сохранена', 'success');
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка сохранения кнопки', 'error');
    }
  };

  const saveUiScaleLimits = async () => {
    try {
      const fMin = Number.isFinite(fontScaleMin) ? fontScaleMin : 0.1;
      const fMax = Number.isFinite(fontScaleMax) ? fontScaleMax : 3;
      const gMin = Number.isFinite(globalScaleMin) ? globalScaleMin : 0.1;
      const gMax = Number.isFinite(globalScaleMax) ? globalScaleMax : 3;

      if (fMin >= fMax) {
        showMessage('Минимальный множитель шрифта должен быть меньше максимального', 'error');
        return;
      }
      if (gMin >= gMax) {
        showMessage('Минимальный глобальный scale должен быть меньше максимального', 'error');
        return;
      }

      await Promise.all([
        window.electronAPI.config.set('ui.chat.fontScaleMin', fMin),
        window.electronAPI.config.set('ui.chat.fontScaleMax', fMax),
        window.electronAPI.config.set('ui.chat.globalScaleMin', gMin),
        window.electronAPI.config.set('ui.chat.globalScaleMax', gMax)
      ]);

      showMessage('Границы масштабирования UI сохранены', 'success');
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка сохранения границ масштабирования', 'error');
    }
  };

  const refreshScopes = async () => {
    try {
      const scopes = await window.electronAPI.config.get('twitch.scopes');
      if (Array.isArray(scopes)) setCurrentScopes(scopes);
      else setCurrentScopes([]);
      showMessage('Список прав обновлен', 'success');
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка обновления прав', 'error');
    }
  };

  const handleLogin = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      showMessage('Сначала введите и сохраните Client ID и Client Secret', 'error');
      return;
    }

    setLoadingLogin(true);
    setMessage(null);
    
    try {
      const res = await window.electronAPI.twitch.login();
      if (res?.login) {
        setLogin(res.login);
        showMessage(`Залогинен как ${res.login}`, 'success');
        await loadSettings();
      } else {
        showMessage('Логин завершён, но данные пользователя не получены', 'error');
      }
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка логина', 'error');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLoginViaDimandus = async () => {
    setLoadingLogin(true);
    setMessage(null);
    
    try {
      const res = await window.electronAPI.twitch.loginViaDimandus();
      if (res?.login) {
        setLogin(res.login);
        showMessage(`Залогинен через Dimandus как ${res.login}`, 'success');
        await loadSettings();
      } else {
        showMessage('Логин завершён, но данные пользователя не получены', 'error');
      }
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка логина через Dimandus', 'error');
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleLogout = async () => {
    try {
      await window.electronAPI.twitch.logout();
      setLogin(null);
      setCurrentScopes([]);
      setAuthMode(null);
      showMessage('Вы вышли из Twitch', 'info');
    } catch (err: any) {
      showMessage(err?.message || 'Ошибка выхода', 'error');
    }
  };

  // =====================================================
  // Render
  // =====================================================

  return (
    <div style={getContainerStyle(theme.colors.text)}>
      <h2 style={{ marginTop: 0 }}>Настройки</h2>

      {/* Вкладки настроек */}
      <div style={tabsContainerStyle}>
        <SettingsTabButton active={tab === 'auth'} onClick={() => setTab('auth')}>
          Авторизация
        </SettingsTabButton>
        <SettingsTabButton active={tab === 'params'} onClick={() => setTab('params')}>
          Параметры
        </SettingsTabButton>
        <SettingsTabButton active={tab === 'design'} onClick={() => setTab('design')}>
          Дизайн
        </SettingsTabButton>
        <SettingsTabButton active={tab === 'automod'} onClick={() => setTab('automod')}>
          Автомодерация
        </SettingsTabButton>
      </div>

      {/* Вкладка: Авторизация */}
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
          onRefreshScopes={refreshScopes}
        />
      )}

      {/* Вкладка: Параметры */}
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

      {/* Вкладка: Дизайн */}
      {tab === 'design' && (
        <DesignTab
          currentTheme={currentTheme}
          onThemeChange={setTheme}
        />
      )}

      {/* Вкладка: Автомодерация */}
      {tab === 'automod' && <AutoModTab />}

      {/* Сообщение */}
      {message && (
        <div
          style={{
            ...messageStyle,
            borderColor:
              message.type === 'error'
                ? '#ef4444'
                : message.type === 'success'
                ? '#22c55e'
                : '#4b5563'
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
};

// =====================================================
// Styles
// =====================================================

const getContainerStyle = (textColor: string): React.CSSProperties => ({
  padding: 24,
  maxWidth: 700,
  color: textColor,
  height: '100%',
  overflowY: 'auto'
});

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 16
};



const messageStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  padding: '10px 16px',
  background: 'var(--color-surface)',
  border: '1px solid var(--color-border)',
  borderRadius: 6,
  fontSize: 13,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  zIndex: 1000
};

// Кнопка вкладки настроек
interface SettingsTabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const SettingsTabButton: React.FC<SettingsTabButtonProps> = ({
  active,
  onClick,
  children
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 12px',
      borderRadius: 999,
      border: '1px solid var(--color-border)',
      background: active ? 'var(--color-primary)' : 'transparent',
      color: active ? '#fff' : 'var(--color-text)',
      fontSize: 12,
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

export default SettingsView;