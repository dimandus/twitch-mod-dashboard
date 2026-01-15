import React, { useEffect, useState, useRef } from 'react';
import type { ActiveChatter } from '../App';
import { KNOWN_BOTS, roleOrder } from '../constants/sidebarConstants';
import { fetchChattersForChannel, ViewerEntry } from '../utils/viewersHelpers';
import { ChannelList } from '../components/sidebar/ChannelList';
import { ViewersList } from '../components/sidebar/ViewersList';
import { AddChannelModal } from '../components/sidebar/AddChannelModal';

// =====================================================
// Типы
// =====================================================

interface ChannelStatus {
  login: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  modCount: number | null;
}

interface Toast {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error';
}

type ChannelFilter = 'all' | 'mod';

interface SidebarProps {
  collapsed: boolean;
  selectedChannel: string | null;
  onToggleCollapse: () => void;
  onChannelSelected: (channel: string | null) => void;
  onRemoveChannelFromApp: (channel: string) => void;
  onOpenChatForChannel: (channel: string) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;
  activeChatters: Record<string, Map<string, ActiveChatter>>;
  fontScale: number;
  globalScale: number;
}

// =====================================================
// Компонент Sidebar
// =====================================================

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  selectedChannel,
  onToggleCollapse,
  onChannelSelected,
  onRemoveChannelFromApp,
  onOpenChatForChannel,
  onOpenUserLog,
  onOpenUserProfile,
  activeChatters,
  fontScale,
  globalScale
}) => {
  const [channels, setChannels] = useState<string[]>([]);

  const [viewers, setViewers] = useState<ViewerEntry[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [viewersError, setViewersError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  const [isAddChannelOpen, setIsAddChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [addChannelError, setAddChannelError] = useState<string | null>(null);

  const [modChannelsLoading, setModChannelsLoading] = useState(false);
  const [followedChannelsLoading, setFollowedChannelsLoading] =
    useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const [channelContextMenu, setChannelContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    channelLogin: string | null;
  }>({ visible: false, x: 0, y: 0, channelLogin: null });

  const [viewerContextMenu, setViewerContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    viewer: ViewerEntry | null;
  }>({ visible: false, x: 0, y: 0, viewer: null });

  const [channelStatus, setChannelStatus] = useState<
    Record<string, ChannelStatus>
  >({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [channelFilter, setChannelFilter] =
    useState<ChannelFilter>('all');
  const [moderatedLogins, setModeratedLogins] = useState<string[]>([]);

  const [badgeSets, setBadgeSets] = useState<
    Record<string, Record<string, any>>
  >({});

  const lastLiveRef = useRef<Record<string, boolean>>({});

  const [autoScale, setAutoScale] = useState(1);

  // Toast
  const addToast = (
    text: string,
    type: Toast['type'] = 'info'
  ) => {
    const id = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(
      () =>
        setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000
    );
  };

  // Сохранённые каналы
  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.config.get(
          'settings.channels'
        );
        if (Array.isArray(stored)) setChannels(stored);
      } catch (err) {
        console.error(err);
      }
    })();
  }, []);

  // Мод-каналы для фильтра
  useEffect(() => {
    (async () => {
      try {
        const list =
          await window.electronAPI.twitch.getModeratedChannels();
        if (!list) return;
        const logins = list.map(
          (ch: any) => ch.broadcaster_login.toLowerCase()
        );
        setModeratedLogins(logins);
      } catch (err) {
        console.warn(
          '[Sidebar] не удалось получить список мод-каналов',
          (err as any)?.message || err
        );
      }
    })();
  }, []);

  // Глобальные бейджи
  useEffect(() => {
    (async () => {
      try {
        const json =
          await window.electronAPI.twitch.getGlobalBadges();
        const sets: Record<string, Record<string, any>> = {};
        for (const set of json.data || []) {
          const vers: Record<string, any> = {};
          for (const v of set.versions || []) {
            vers[v.id] = v;
          }
          sets[set.set_id] = vers;
        }
        setBadgeSets(sets);
      } catch (err) {
        console.warn(
          '[Sidebar Badges] не удалось загрузить глобальные бейджи',
          err
        );
      }
    })();
  }, []);

  // Авто-скейл от окна
  useEffect(() => {
    const BASE_WIDTH = 1920;
    const BASE_HEIGHT = 1080;

    const updateAutoScale = () => {
      const wScale = window.innerWidth / BASE_WIDTH;
      const hScale = window.innerHeight / BASE_HEIGHT;
      const next = Math.min(wScale, hScale);
      const clamped = clampAutoScale(next);
      setAutoScale(clamped);
    };

    updateAutoScale();
    window.addEventListener('resize', updateAutoScale);
    return () => window.removeEventListener('resize', updateAutoScale);
  }, []);

  // Закрытие контекстных меню только по клику
  useEffect(() => {
    const close = () => {
      setChannelContextMenu((prev) =>
        prev.visible
          ? { ...prev, visible: false, channelLogin: null }
          : prev
      );
      setViewerContextMenu((prev) =>
        prev.visible
          ? { ...prev, visible: false, viewer: null }
          : prev
      );
    };
    window.addEventListener('click', close);
    return () => {
      window.removeEventListener('click', close);
    };
  }, []);

  // Автообновление зрителей
  useEffect(() => {
    if (!selectedChannel) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const { viewers: list, fallback } =
          await fetchChattersForChannel(
            selectedChannel,
            activeChatters[selectedChannel.toLowerCase()]
          );
        if (!cancelled) {
          setViewers(list);
          setViewersError(null);
          setUsingFallback(fallback);
        }
      } catch (err: any) {
        if (!cancelled)
          setViewersError(err?.message || 'Ошибка');
      }
    };

    refresh();
    const intervalId = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [selectedChannel, activeChatters]);

  // Опрос статуса каналов
  useEffect(() => {
    if (!channels.length) {
      setChannelStatus({});
      lastLiveRef.current = {};
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const statuses =
          await window.electronAPI.twitch.getChannelsLiveStatus(
            channels
          );
        if (cancelled || !statuses) return;
        setChannelStatus(() => {
          const next: Record<string, ChannelStatus> = {};
          const last = lastLiveRef.current;
          const newLast: Record<string, boolean> = {};
          for (const st of statuses) {
            const key = st.login.toLowerCase();
            const was = last[key];
            const now = st.isLive;
            next[key] = st;
            newLast[key] = now;
            if (was !== undefined && was !== now) {
              addToast(
                `${st.login} ${
                  now ? '🟢 онлайн' : '🔴 оффлайн'
                }`,
                now ? 'success' : 'info'
              );
            }
          }
          lastLiveRef.current = newLast;
          return next;
        });
      } catch (err) {
        console.error(err);
      }
    };
    poll();
    const intervalId = setInterval(poll, 30000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [channels]);

  // Выбор канала
const handleSelectChannel = (channelLogin: string) => {
  onChannelSelected(channelLogin);
};

  // Добавление канала
  const openAddChannel = () => {
    setNewChannelName('');
    setAddChannelError(null);
    setIsAddChannelOpen(true);
  };
  const handleAddChannel = async () => {
    const raw = newChannelName.trim().toLowerCase();
    if (!raw) {
      setAddChannelError('Укажи логин канала');
      return;
    }
    if (channels.some((ch) => ch.toLowerCase() === raw)) {
      setAddChannelError('Канал уже есть');
      return;
    }
    const updated = [...channels, raw];
    setChannels(updated);
    try {
      await window.electronAPI.config.set('settings.channels', updated);
    } catch {}
    setIsAddChannelOpen(false);
    setAddChannelError(null);
    handleSelectChannel(raw);
  };

  // Импорт мод-каналов
  const handleImportModeratedChannels = async () => {
    setModChannelsLoading(true);
    setImportError(null);
    try {
      const list =
        await window.electronAPI.twitch.getModeratedChannels();
      if (!list || list.length === 0) {
        setImportError('Нет каналов');
        return;
      }
      const newLogins = list.map((ch: any) =>
        ch.broadcaster_login.toLowerCase()
      );
      const added = mergeChannels(newLogins);
      setModeratedLogins((prev) =>
        Array.from(new Set([...prev, ...newLogins]))
      );
      if (added === 0) addToast('Все уже добавлены', 'info');
      else addToast(`Добавлено ${added} каналов`, 'success');
    } catch (err: any) {
      setImportError(err?.message || 'Ошибка');
    } finally {
      setModChannelsLoading(false);
    }
  };

  // Импорт подписок
  const handleImportFollowedChannels = async () => {
    setFollowedChannelsLoading(true);
    setImportError(null);
    try {
      const list =
        await window.electronAPI.twitch.getFollowedChannels();
      if (!list || list.length === 0) {
        setImportError('Нет подписок');
        return;
      }
      const newLogins = list.map((ch: any) =>
        ch.broadcaster_login.toLowerCase()
      );
      const added = mergeChannels(newLogins);
      if (added === 0) addToast('Все уже добавлены', 'info');
      else addToast(`Добавлено ${added} каналов`, 'success');
    } catch (err: any) {
      setImportError(err?.message || 'Ошибка');
    } finally {
      setFollowedChannelsLoading(false);
    }
  };

  const mergeChannels = (newLogins: string[]): number => {
    const existing = new Set(channels.map((c) => c.toLowerCase()));
    const toAdd: string[] = [];
    for (const login of newLogins) {
      if (!existing.has(login)) {
        toAdd.push(login);
        existing.add(login);
      }
    }
    if (toAdd.length === 0) return 0;
    const merged = [...channels, ...toAdd];
    setChannels(merged);
    window.electronAPI.config
      .set('settings.channels', merged)
      .catch(console.error);
    return toAdd.length;
  };

  // Удаление одного канала
  const removeChannel = async (login: string) => {
    const lower = login.toLowerCase();
    const updated = channels.filter(
      (ch) => ch.toLowerCase() !== lower
    );
    setChannels(updated);
    try {
      await window.electronAPI.config.set('settings.channels', updated);
    } catch {}

if (selectedChannel?.toLowerCase() === lower) {
  setViewers([]);
  setViewersError(null);
  onChannelSelected(null);
}

    onRemoveChannelFromApp(login);
  };

  // Очистить весь список каналов
  const handleClearAllChannels = async () => {
    if (channels.length === 0) return;
    const prevList = [...channels];
    setChannels([]);
    try {
      await window.electronAPI.config.set('settings.channels', []);
    } catch {}
if (selectedChannel) {
  setViewers([]);
  setViewersError(null);
  onChannelSelected(null);
}
    prevList.forEach((login) => onRemoveChannelFromApp(login));
  };

  const handleChannelContextMenu = (
    e: React.MouseEvent,
    channelLogin: string
  ) => {
    e.preventDefault();
    setChannelContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      channelLogin
    });
  };

  const handleOpenChatFromContextMenu = () => {
    if (channelContextMenu.channelLogin) {
      onOpenChatForChannel(channelContextMenu.channelLogin);
    }
    setChannelContextMenu({
      visible: false,
      x: 0,
      y: 0,
      channelLogin: null
    });
  };

  const handleRemoveChannelFromContextMenu = () => {
    const login = channelContextMenu.channelLogin;
    if (!login) return;
    void removeChannel(login);
    setChannelContextMenu({
      visible: false,
      x: 0,
      y: 0,
      channelLogin: null
    });
  };

  const handleViewerContextMenu = (
    e: React.MouseEvent,
    viewer: ViewerEntry
  ) => {
    e.preventDefault();
    setViewerContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      viewer
    });
  };

  const handleViewerModeration = async (
    action: 'timeout' | 'ban' | 'unban',
    duration?: number
  ) => {
    const viewer = viewerContextMenu.viewer;
    if (!viewer || !selectedChannel) return;
    try {
      switch (action) {
        case 'timeout':
          await window.electronAPI.twitch.timeoutUser(
            selectedChannel,
            viewer.login,
            duration || 600
          );
          addToast(`⏱️ ${viewer.login} таймаут`, 'success');
          break;
        case 'ban':
          await window.electronAPI.twitch.banUser(
            selectedChannel,
            viewer.login
          );
          addToast(`⛔ ${viewer.login} забанен`, 'success');
          break;
        case 'unban':
          await window.electronAPI.twitch.unbanUser(
            selectedChannel,
            viewer.login
          );
          addToast(`✅ ${viewer.login} разбанен`, 'success');
          break;
      }
    } catch (err: any) {
      addToast(`❌ ${err?.message || 'Ошибка'}`, 'error');
    }
    setViewerContextMenu({
      visible: false,
      x: 0,
      y: 0,
      viewer: null
    });
  };

  // Фильтрация каналов и мод-режим
  const moderatedSet = new Set(
    moderatedLogins.map((l) => l.toLowerCase())
  );

  const filteredChannels =
    channelFilter === 'all'
      ? channels
      : channels.filter((ch) => moderatedSet.has(ch.toLowerCase()));

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const stA = channelStatus[a.toLowerCase()];
    const stB = channelStatus[b.toLowerCase()];
    if (stA?.isLive !== stB?.isLive) return stA?.isLive ? -1 : 1;
    const yA = stA?.modCount ?? Number.MAX_SAFE_INTEGER;
    const yB = stB?.modCount ?? Number.MAX_SAFE_INTEGER;
    if (yA !== yB) return yA - yB;
    return a.localeCompare(b);
  });

  const isModeratorMode =
    !!selectedChannel &&
    (
      (!usingFallback && viewers.length > 0) ||
      moderatedSet.has(selectedChannel.toLowerCase())
    );

  const textScale = fontScale * globalScale * autoScale;

  return (
    <>
      <aside style={sidebarStyle(collapsed)}>
        <div style={sidebarHeaderStyle(collapsed)}>
          {!collapsed && (
            <span
              style={{
                fontSize: 12 * textScale,
                textTransform: 'uppercase',
                color: 'var(--color-textSecondary)'
              }}
            >
              Навигация
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            style={{ ...collapseButtonStyle, fontSize: 10 * textScale }}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {!collapsed && (
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Секция каналов */}
            <div style={sectionStyle}>
              <div style={{ ...sectionHeaderStyle, fontSize: 12 * textScale }}>
                <span>
                  Каналы ({filteredChannels.length}
                  {channelFilter === 'mod'
                    ? ` / ${channels.length}`
                    : ''}
                  )
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    onClick={openAddChannel}
                    style={{
                      ...iconButtonStyle,
                      fontSize: 12 * textScale
                    }}
                    title="Добавить"
                  >
                    +
                  </button>
                  <button
                    onClick={handleImportModeratedChannels}
                    disabled={modChannelsLoading}
                    style={{
                      ...iconButtonStyle,
                      fontSize: 12 * textScale,
                      color: 'var(--color-success)',
                      opacity: modChannelsLoading ? 0.5 : 1
                    }}
                    title="Модерируемые"
                  >
                    {modChannelsLoading ? '...' : 'M'}
                  </button>
                  <button
                    onClick={handleImportFollowedChannels}
                    disabled={followedChannelsLoading}
                    style={{
                      ...iconButtonStyle,
                      fontSize: 12 * textScale,
                      color: '#a855f7',
                      opacity: followedChannelsLoading ? 0.5 : 1
                    }}
                    title="Подписки"
                  >
                    {followedChannelsLoading ? '...' : '♥'}
                  </button>
                  <button
                    onClick={handleClearAllChannels}
                    style={{
                      ...iconButtonStyle,
                      fontSize: 12 * textScale,
                      color: '#ef4444'
                    }}
                    title="Очистить список каналов"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Фильтры каналов */}
              <div
                style={{
                  padding: '2px 8px 4px',
                  display: 'flex',
                  gap: 4
                }}
              >
                <button
                  style={{
                    ...channelFilterButtonStyle(
                      channelFilter === 'all'
                    ),
                    fontSize: 10 * textScale
                  }}
                  onClick={() => setChannelFilter('all')}
                >
                  Все
                </button>
                <button
                  style={{
                    ...channelFilterButtonStyle(
                      channelFilter === 'mod'
                    ),
                    fontSize: 10 * textScale
                  }}
                  onClick={() => setChannelFilter('mod')}
                >
                  Где я мод
                </button>
              </div>

              <div style={scrollListStyle}>
                <ChannelList
                  channels={sortedChannels}
                  selectedChannel={selectedChannel}
                  channelStatus={channelStatus}
                  onChannelSelect={handleSelectChannel}
                  onChannelRemove={removeChannel}
                  onChannelContextMenu={handleChannelContextMenu}
                  textScale={textScale}
                />
                {importError && (
                  <div
                    style={{
                      color: '#fecaca',
                      fontSize: 11 * textScale,
                      padding: 4
                    }}
                  >
                    {importError}
                  </div>
                )}
              </div>
            </div>

            {/* Секция зрителей */}
            <div style={sectionStyle}>
              <div style={{ ...sectionHeaderStyle, fontSize: 12 * textScale }}>
                <span>
                  Зрители{' '}
                  {selectedChannel && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10 * textScale,
                        color: isModeratorMode ? 'var(--color-success)' : 'var(--color-textSecondary)'
                      }}
                    >
                      {isModeratorMode
                        ? 'Модер. режим'
                        : 'Юзерский режим'}
                    </span>
                  )}
                  {!isModeratorMode && usingFallback && (
                    <span
                      style={{
                        marginLeft: 4,
                        fontSize: 10 * textScale,
                        color: '#f59e0b'
                      }}
                    >
                      (из чата)
                    </span>
                  )}
                </span>
                {selectedChannel && !viewersLoading && (
                  <span
                    style={{
                      fontSize: 11 * textScale,
                      color: '#6b7280'
                    }}
                  >
                    {viewers.length}
                  </span>
                )}
              </div>
              <div style={scrollListStyle}>
                {!selectedChannel && (
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: 12 * textScale
                    }}
                  >
                    Выбери канал
                  </div>
                )}
                {selectedChannel && viewersLoading && (
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: 12 * textScale
                    }}
                  >
                    Загрузка...
                  </div>
                )}
                {selectedChannel &&
                  viewersError &&
                  !viewersLoading && (
                    <div
                      style={{
                        color: '#fca5a5',
                        fontSize: 12 * textScale
                      }}
                    >
                      {viewersError}
                    </div>
                  )}
                {selectedChannel &&
                  !viewersLoading &&
                  !viewersError &&
                  viewers.length === 0 && (
                    <div
                      style={{
                        color: '#6b7280',
                        fontSize: 12 * textScale
                      }}
                    >
                      Зрителей нет
                    </div>
                  )}
                {selectedChannel &&
                  !viewersLoading &&
                  !viewersError &&
                  viewers.length > 0 && (
                    <ViewersList
                      viewers={viewers}
                      badgeSets={badgeSets}
                      onViewerContextMenu={handleViewerContextMenu}
                      textScale={textScale}
                    />
                  )}
              </div>
            </div>
          </div>
        )}
      </aside>

      <AddChannelModal
        isOpen={isAddChannelOpen}
        channelName={newChannelName}
        error={addChannelError}
        onChannelNameChange={setNewChannelName}
        onAdd={handleAddChannel}
        onClose={() => setIsAddChannelOpen(false)}
        textScale={textScale}
      />

      {/* Контекстное меню каналов */}
      {channelContextMenu.visible &&
        channelContextMenu.channelLogin && (
          <div
            style={contextMenuStyle(
              channelContextMenu.x,
              channelContextMenu.y
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleOpenChatFromContextMenu}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale
              }}
            >
              💬 Открыть чат
            </button>
            <button
              onClick={handleRemoveChannelFromContextMenu}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale,
                color: '#fecaca'
              }}
            >
              🗑️ Удалить
            </button>
          </div>
        )}

      {/* Контекстное меню зрителя */}
      {viewerContextMenu.visible &&
        viewerContextMenu.viewer && (
          <div
            style={contextMenuStyle(
              viewerContextMenu.x,
              viewerContextMenu.y
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                ...contextMenuHeaderStyle,
                fontSize: 12 * textScale
              }}
            >
              {viewerContextMenu.viewer.displayName ||
                viewerContextMenu.viewer.login}
            </div>
            <button
              onClick={() => {
                onOpenUserProfile(
                  viewerContextMenu.viewer!.login
                );
                setViewerContextMenu({
                  visible: false,
                  x: 0,
                  y: 0,
                  viewer: null
                });
              }}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale
              }}
            >
              👤 Профиль
            </button>
            <button
              onClick={() => {
                onOpenUserLog(viewerContextMenu.viewer!.login);
                setViewerContextMenu({
                  visible: false,
                  x: 0,
                  y: 0,
                  viewer: null
                });
              }}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale
              }}
            >
              📜 Лог сообщений
            </button>
            <div style={menuDividerStyle} />
            <button
              onClick={() =>
                handleViewerModeration('timeout', 60)
              }
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale
              }}
            >
              ⏱️ Таймаут 1м
            </button>
            <button
              onClick={() =>
                handleViewerModeration('timeout', 600)
              }
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale
              }}
            >
              ⏱️ Таймаут 10м
            </button>
            <div style={menuDividerStyle} />
            <button
              onClick={() => handleViewerModeration('ban')}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale,
                color: '#fca5a5'
              }}
            >
              ⛔ Бан
            </button>
            <button
              onClick={() => handleViewerModeration('unban')}
              style={{
                ...menuItemStyle,
                fontSize: 12 * textScale,
                color: '#86efac'
              }}
            >
              ✅ Разбан
            </button>
          </div>
        )}

      {/* Тосты */}
      {toasts.length > 0 && (
        <div style={toastContainerStyle}>
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{
                ...toastStyle,
                fontSize: 12 * textScale,
                borderColor:
                  t.type === 'error'
                    ? '#ef4444'
                    : t.type === 'success'
                    ? 'var(--color-success)'
                    : '#4b5563'
              }}
            >
              {t.text}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

// =====================================================
// Styles
// =====================================================

const sidebarStyle = (collapsed: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid var(--color-border)',
  transition: 'width 0.2s ease',
  width: collapsed ? 36 : '20%',
  minWidth: collapsed ? 36 : 220,
  maxWidth: collapsed ? 36 : 420,
  overflow: 'hidden',
  height: '100%'
});

const sidebarHeaderStyle = (
  collapsed: boolean
): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: collapsed ? 'center' : 'space-between',
  padding: '6px 8px',
  borderBottom: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  flexShrink: 0
});

const collapseButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: 'var(--color-text)',
  fontSize: 10,
  cursor: 'pointer'
};

const sectionStyle: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px solid var(--color-border)',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  textTransform: 'uppercase',
  color: 'var(--color-textSecondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 4,
  flexShrink: 0
};

const scrollListStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 4px 8px 4px',
  minHeight: 0
};

const iconButtonStyle: React.CSSProperties = {
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};



const channelFilterButtonStyle = (
  active: boolean
): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: 999,
  border: `1px solid ${active ? 'var(--color-primary)' : '#4b5563'}`,
  background: active ? '#1f2937' : 'transparent',
  color: 'var(--color-text)',
  fontSize: 10,
  cursor: 'pointer'
});



const contextMenuStyle = (
  x: number,
  y: number
): React.CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  background: 'var(--color-surface)',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  zIndex: 2000,
  width: 'max-content',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
});

const contextMenuHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 12,
  color: 'var(--color-textSecondary)',
  borderBottom: '1px solid var(--color-border)',
  marginBottom: 4
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '5px 10px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: 'var(--color-text)',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const menuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border)',
  margin: '4px 0'
};

const toastContainerStyle: React.CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 2500,
  display: 'flex',
  flexDirection: 'column',
  gap: 8
};

const toastStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  border: '1px solid #4b5563',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: 'var(--color-text)',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

function clampAutoScale(value: number): number {
  const min = 0.7;
  const max = 1.5;
  if (Number.isNaN(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

export default Sidebar;
