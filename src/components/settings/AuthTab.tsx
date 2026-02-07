import React from 'react';

const REQUIRED_SCOPES = [
  'chat:read',
  'chat:edit',
  'moderation:read',
  'moderator:manage:banned_users',
  'moderator:manage:chat_messages',
  'moderator:manage:chat_settings',
  'moderator:manage:announcements',
  'moderator:manage:shield_mode',
  'moderator:read:shield_mode',
  'moderator:read:chatters',
  'moderator:read:followers',
  'user:read:moderated_channels',
  'user:read:follows',
  'user:write:chat',
  'user:read:emotes',
  'moderator:manage:automod',
  'moderator:read:automod_settings',
  'moderator:manage:automod_settings'
];

interface AuthTabProps {
  clientId: string;
  clientSecret: string;
  login: string | null;
  authMode: string | null;
  currentScopes: string[];
  loadingLogin: boolean;
  onClientIdChange: (value: string) => void;
  onClientSecretChange: (value: string) => void;
  onSaveCreds: () => void;
  onLogin: () => void;
  onLoginViaDimandus: () => void;
  onLogout: () => void;
  onRefreshScopes: () => void;
}

export const AuthTab: React.FC<AuthTabProps> = ({
  clientId,
  clientSecret,
  login,
  authMode,
  currentScopes,
  loadingLogin,
  onClientIdChange,
  onClientSecretChange,
  onSaveCreds,
  onLogin,
  onLoginViaDimandus,
  onLogout,
  onRefreshScopes
}) => {
  const missingScopes = REQUIRED_SCOPES.filter((scope) => !currentScopes.includes(scope));
  const hasModerationScopes = [
    'moderator:manage:banned_users',
    'moderator:manage:chat_messages',
    'moderator:manage:chat_settings'
  ].every((s) => currentScopes.includes(s));

  return (
    <>
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>🔑 Twitch API</h3>
        <p style={hintStyle}>
          Получить ключи можно на{' '}
          <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            dev.twitch.tv/console/apps
          </a>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Client ID:</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => onClientIdChange(e.target.value)}
              placeholder="Например: abc123xyz..."
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Client Secret:</label>
            <input
              type="password"
              value={clientSecret}
              onChange={(e) => onClientSecretChange(e.target.value)}
              placeholder="Секретный ключ"
              style={inputStyle}
            />
          </div>

          <button onClick={onSaveCreds} style={buttonPrimaryStyle}>
            💾 Сохранить API ключи
          </button>
        </div>
      </section>

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
          <button onClick={onLogin} disabled={loadingLogin} style={buttonPrimaryStyle}>
            {loadingLogin ? '⏳ Ожидаем...' : '🔐 Войти (прямой OAuth)'}
          </button>

          <button onClick={onLoginViaDimandus} disabled={loadingLogin} style={buttonSecondaryStyle}>
            {loadingLogin ? '⏳ Ожидаем...' : '🌐 Войти через Dimandus'}
          </button>

          {login && (
            <button onClick={onLogout} style={buttonDangerStyle}>
              🚪 Выйти
            </button>
          )}
        </div>
      </section>

      {login && (
        <section style={sectionStyle}>
          <h3 style={sectionTitleStyle}>🔒 Права доступа (Scopes)</h3>

          {!hasModerationScopes && (
            <div style={warningBoxStyle}>
              <strong>⚠️ Недостаточно прав для модерации!</strong>
              <p style={{ margin: '8px 0 0 0' }}>
                Для работы функций модерации необходимо перелогиниться.
              </p>
              <button onClick={onLogout} style={{ ...buttonDangerStyle, marginTop: 8 }}>
                Выйти и войти заново
              </button>
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
              Текущие права ({currentScopes.length}):
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {currentScopes.map((scope) => (
                <span
                  key={scope}
                  style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: '#1f2937',
                    color: '#e5e7eb',
                    border: '1px solid #374151'
                  }}
                >
                  {scope}
                </span>
              ))}
              {currentScopes.length === 0 && (
                <span style={{ fontSize: 12, color: '#9ca3af' }}>
                  Нет данных о правах
                </span>
              )}
            </div>

            <button onClick={onRefreshScopes} style={buttonSecondaryStyle}>
              ↻ Обновить список прав
            </button>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
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

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>ℹ️ Информация</h3>
        <div style={{ fontSize: 13, color: '#9ca3af' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>Прямой OAuth</strong> — требует свои Client ID и Secret.
          </p>
          <p style={{ margin: 0 }}>
            <strong>Через Dimandus</strong> — использует общий сервер авторизации.
          </p>
        </div>
      </section>
    </>
  );
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  background: 'var(--color-surface)',
  borderRadius: 8,
  border: '1px solid var(--color-border)'
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
  border: '1px solid var(--color-border)',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-text)',
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
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-buttonSecondary)',
  color: 'var(--color-text)',
  fontSize: 13,
  cursor: 'pointer'
};

const buttonDangerStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: '1px solid var(--color-error)',
  background: 'transparent',
  color: 'var(--color-error)',
  fontSize: 13,
  cursor: 'pointer'
};

const statusBoxStyle: React.CSSProperties = {
  padding: '10px 12px',
  background: 'var(--color-chatBackground)',
  borderRadius: 6,
  border: '1px solid var(--color-border)'
};

const warningBoxStyle: React.CSSProperties = {
  padding: 12,
  background: '#7f1d1d33',
  borderRadius: 6,
  border: '1px solid var(--color-error)',
  color: '#fecaca',
  fontSize: 13
};
