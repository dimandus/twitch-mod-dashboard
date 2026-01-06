import React, { useEffect, useState } from 'react';

interface UserProfileModalProps {
  login: string;
  onClose: () => void;
}

interface TwitchUserDetails {
  id: string;
  login: string;
  display_name: string;
  type: string;
  broadcaster_type: string;
  description: string;
  profile_image_url: string;
  offline_image_url: string;
  view_count: number;
  created_at: string;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ login, onClose }) => {
  const [data, setData] = useState<TwitchUserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const user = await window.electronAPI.twitch.getUserDetails(login);
        if (!cancelled) setData(user);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Ошибка загрузки профиля');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [login]);

  const openOnTwitch = () => {
    const url = `https://twitch.tv/${data?.login || login}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const createdAt = data
    ? new Date(data.created_at).toLocaleString('ru-RU')
    : '';

  const viewCount = data ? data.view_count.toLocaleString('ru-RU') : '';

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {data?.profile_image_url && (
              <img
                src={data.profile_image_url}
                alt={data.display_name}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  objectFit: 'cover'
                }}
              />
            )}
            <div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16
                }}
              >
                {data?.display_name || login}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#9ca3af'
                }}
              >
                @{data?.login || login}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={closeButtonStyle}>
            ✕
          </button>
        </div>

        {/* BANNER */}
        {data?.offline_image_url && (
          <div
            style={{
              height: 120,
              backgroundImage: `url(${data.offline_image_url})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '6px',
              margin: '8px 16px 0'
            }}
          />
        )}

        <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
          {loading && (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Загрузка...</div>
          )}
          {error && !loading && (
            <div style={{ color: '#fecaca', fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && data && (
            <>
              {/* БАЗОВАЯ ИНФОРМАЦИЯ */}
              <section style={{ marginBottom: 12 }}>
                <div style={sectionTitleStyle}>Основное</div>
                <div style={rowStyle}>
                  <span style={labelStyle}>ID:</span>
                  <span style={valueStyle}>{data.id}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Тип аккаунта:</span>
                  <span style={valueStyle}>
                    {data.type || 'обычный'} /{' '}
                    {data.broadcaster_type || 'без статуса'}
                  </span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Создан:</span>
                  <span style={valueStyle}>{createdAt}</span>
                </div>
                <div style={rowStyle}>
                  <span style={labelStyle}>Просмотры канала:</span>
                  <span style={valueStyle}>{viewCount}</span>
                </div>
              </section>

              {/* ОПИСАНИЕ */}
              {data.description && (
                <section style={{ marginBottom: 12 }}>
                  <div style={sectionTitleStyle}>Описание</div>
                  <div
                    style={{
                      fontSize: 13,
                      color: '#e5e7eb',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {data.description}
                  </div>
                </section>
              )}

              {/* ССЫЛКИ */}
              <section style={{ marginBottom: 12 }}>
                <div style={sectionTitleStyle}>Ссылки</div>
                <button onClick={openOnTwitch} style={linkButtonStyle}>
                  Открыть канал на Twitch
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 3500
};

const modalStyle: React.CSSProperties = {
  background: '#111827',
  borderRadius: 8,
  width: '90%',
  maxWidth: 520,
  height: '80%',
  maxHeight: 600,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  border: '1px solid #374151',
  boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
};

const headerStyle: React.CSSProperties = {
  padding: '10px 16px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const closeButtonStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 4,
  border: 'none',
  background: '#374151',
  color: '#e5e7eb',
  fontSize: 14,
  cursor: 'pointer'
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: 'uppercase',
  color: '#9ca3af',
  marginBottom: 4
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 13,
  marginBottom: 2
};

const labelStyle: React.CSSProperties = {
  width: 120,
  color: '#9ca3af',
  flexShrink: 0
};

const valueStyle: React.CSSProperties = {
  color: '#e5e7eb',
  wordBreak: 'break-all'
};

const linkButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2937',
  color: '#e5e7eb',
  fontSize: 13,
  cursor: 'pointer'
};

export default UserProfileModal;