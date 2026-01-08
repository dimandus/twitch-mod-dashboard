import React, { useEffect, useState } from 'react';

// Список необходимых scopes для полной функциональности
const REQUIRED_SCOPES = [
  'chat:read',
  'chat:edit',
  'moderation:read',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'moderator:manage:chat_settings',
  'moderator:manage:announcements',
  'moderator:read:chatters',
  'user:read:moderated_channels'
];

type SettingsTab = 'auth' | 'params' | 'design';

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
        gsMax
      ] = await Promise.all([
        window.electronAPI.config.get('twitch.clientId'),
        window.electronAPI.config.get('twitch.clientSecret'),
        window.electronAPI.twitch.getCurrentUser(),
        window.electronAPI.config.get('twitch.scopes'),
        window.electronAPI.config.get('twitch.authMode'),
        window.electronAPI.config.get('ui.chat.fontScaleMin'),
        window.electronAPI.config.get('ui.chat.fontScaleMax'),
        window.electronAPI.config.get('ui.chat.globalScaleMin'),
        window.electronAPI.config.get('ui.chat.globalScaleMax')
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
    } catch (err) {
      console.error('Ошибка загрузки настроек', err);
    }
  };

  // =====================================================
  // Проверка scopes
  // =====================================================

  const missingScopes = REQUIRED_SCOPES.filter(
    (scope) => !currentScopes.includes(scope)
  );

  const hasModerationScopes = [
    'moderator:manage:banned_users',
    'moderator:manage:chat_messages',
    'moderator:manage:chat_settings'
  ].every((s) => currentScopes.includes(s));

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
    <div style={containerStyle}>
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
      </div>

      {/* Вкладка: Авторизация */}
      {tab === 'auth' && (
        <>
          {/* Twitch API */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>🔑 Twitch API</h3>
            <p style={hintStyle}>
              Получить ключи можно на{' '}
              <a
                href="https://dev.twitch.tv/console/apps"
                target="_blank"
                rel="noopener noreferrer"
                style={linkStyle}
              >
                dev.twitch.tv/console/apps
              </a>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>Client ID:</label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Например: abc123xyz..."
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Client Secret:</label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Секретный ключ"
                  style={inputStyle}
                />
              </div>

              <button onClick={saveCreds} style={buttonPrimaryStyle}>
                💾 Сохранить API ключи
              </button>
            </div>
          </section>

          {/* Twitch аккаунт */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>👤 Twitch аккаунт</h3>

            <div style={statusBoxStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: login ? '#22c55e' : '#ef4444'
                  }}
                />
                <span>
                  {login ? (
                    <>
                      Вход выполнен как <strong>{login}</strong>
                      {authMode && (
                        <span style={{ color: '#9ca3af', marginLeft: 8 }}>
                          ({authMode === 'dimandus' ? 'через Dimandus' : 'прямой OAuth'})
                        </span>
                      )}
                    </>
                  ) : (
                    'Не залогинен'
                  )}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              <button
                onClick={handleLogin}
                disabled={loadingLogin}
                style={buttonPrimaryStyle}
              >
                {loadingLogin ? '⏳ Ожидаем...' : '🔐 Войти (прямой OAuth)'}
              </button>

              <button
                onClick={handleLoginViaDimandus}
                disabled={loadingLogin}
                style={buttonSecondaryStyle}
              >
                {loadingLogin ? '⏳ Ожидаем...' : '🌐 Войти через Dimandus'}
              </button>

              {login && (
                <button onClick={handleLogout} style={buttonDangerStyle}>
                  🚪 Выйти
                </button>
              )}
            </div>
          </section>

          {/* Права доступа (Scopes) */}
          {login && (
            <section style={sectionStyle}>
              <h3 style={sectionTitleStyle}>🔒 Права доступа (Scopes)</h3>

              {!hasModerationScopes && (
                <div style={warningBoxStyle}>
                  <strong>⚠️ Недостаточно прав для модерации!</strong>
                  <p style={{ margin: '8px 0 0 0' }}>
                    Для работы функций модерации (бан, таймаут, удаление сообщений, управление режимами чата)
                    необходимо перелогиниться, чтобы получить новые права.
                  </p>
                  <button
                    onClick={handleLogout}
                    style={{ ...buttonDangerStyle, marginTop: 8 }}
                  >
                    Выйти и войти заново
                  </button>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                  Текущие права ({currentScopes.length}):
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {REQUIRED_SCOPES.map((scope) => {
                    const hasScope = currentScopes.includes(scope);
                    return (
                      <span
                        key={scope}
                        style={{
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          background: hasScope ? '#166534' : '#7f1d1d',
                          color: hasScope ? '#bbf7d0' : '#fecaca',
                          border: `1px solid ${hasScope ? '#22c55e' : '#ef4444'}`
                        }}
                      >
                        {hasScope ? '✓' : '✗'} {scope}
                      </span>
                    );
                  })}
                </div>

                {missingScopes.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 12, color: '#fca5a5' }}>
                    Отсутствуют: {missingScopes.join(', ')}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Информация */}
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>ℹ️ Информация</h3>
            <div style={{ fontSize: 13, color: '#9ca3af' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Прямой OAuth</strong> — требует свои Client ID и Secret. 
                Полный контроль, но нужно создать приложение на Twitch.
              </p>
              <p style={{ margin: 0 }}>
                <strong>Через Dimandus</strong> — использует общий сервер авторизации. 
                Быстрый старт без создания приложения.
              </p>
            </div>
          </section>
        </>
      )}

      {/* Вкладка: Параметры */}
      {tab === 'params' && (
        <>
          <section style={sectionStyle}>
            <h3 style={sectionTitleStyle}>⚙️ Интерфейс чата</h3>
            <p style={hintStyle}>
              Настрой границы масштабирования шрифтов и глобального scale для области чатов.
              Эти значения используются при изменении размеров в Dashboard (кнопки A-/A+, S-/S+).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={labelStyle}>Минимальный множитель шрифта:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={fontScaleMin}
                    onChange={(e) => setFontScaleMin(parseFloat(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={labelStyle}>Максимальный множитель шрифта:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={fontScaleMax}
                    onChange={(e) => setFontScaleMax(parseFloat(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={labelStyle}>Минимальный глобальный scale:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={globalScaleMin}
                    onChange={(e) => setGlobalScaleMin(parseFloat(e.target.value))}
                    style={inputStyle}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <label style={labelStyle}>Максимальный глобальный scale:</label>
                  <input
                    type="number"
                    step={0.1}
                    value={globalScaleMax}
                    onChange={(e) => setGlobalScaleMax(parseFloat(e.target.value))}
                    style={inputStyle}
                  />
                </div>
              </div>

              <button onClick={saveUiScaleLimits} style={buttonPrimaryStyle}>
                💾 Сохранить границы масштабирования
              </button>
            </div>
          </section>
        </>
      )}

      {/* Вкладка: Дизайн */}
      {tab === 'design' && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>🎨 Дизайн</h3>
          <p style={{ ...hintStyle, marginBottom: 0 }}>
            Здесь в будущем появятся настройки темы, цветов и отдельных элементов UI.
          </p>
        </section>
      )}

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

const containerStyle: React.CSSProperties = {
  padding: 24,
  maxWidth: 700,
  color: '#e5e7eb'
};

const tabsContainerStyle: React.CSSProperties = {
  display: 'flex',
  gap: 8,
  marginBottom: 16
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  background: '#111827',
  borderRadius: 8,
  border: '1px solid #27272f'
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 16,
  fontWeight: 600
};

const hintStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 12,
  color: '#9ca3af'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#9ca3af',
  marginBottom: 4
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: '#020617',
  color: '#e5e7eb',
  fontSize: 13
};

const linkStyle: React.CSSProperties = {
  color: '#60a5fa',
  textDecoration: 'underline'
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: '#9147ff',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #4b5563',
  background: '#1f2937',
  color: '#e5e7eb',
  fontSize: 13,
  cursor: 'pointer'
};

const buttonDangerStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid #ef4444',
  background: 'transparent',
  color: '#fca5a5',
  fontSize: 13,
  cursor: 'pointer'
};

const statusBoxStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: '#020617',
  borderRadius: 6,
  border: '1px solid #374151'
};

const warningBoxStyle: React.CSSProperties = {
  padding: 12,
  background: '#7f1d1d33',
  borderRadius: 6,
  border: '1px solid #ef4444',
  color: '#fecaca',
  fontSize: 13
};

const messageStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  right: 24,
  padding: '10px 16px',
  background: '#111827',
  border: '1px solid #4b5563',
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
      border: '1px solid #4b5563',
      background: active ? '#4b5563' : 'transparent',
      color: '#e5e7eb',
      fontSize: 12,
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
);

export default SettingsView;