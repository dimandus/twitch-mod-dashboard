import React, { useEffect, useState, useRef } from 'react';
import type { ActiveChatter } from '../App';

// =====================================================
// Типы
// =====================================================

type ViewerRole =
  | 'broadcaster'
  | 'moderator'
  | 'vip'
  | 'staff'
  | 'admin'
  | 'global_mod'
  | 'viewer';

interface ViewerEntry {
  odaterId?: string;
  login: string;
  role: ViewerRole;
  isBot: boolean;
  avatarUrl?: string | null;
  displayName?: string | null;
  bannerUrl?: string | null;
}

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

const KNOWN_BOTS = new Set([
  'nightbot',
  'moobot',
  'streamelements',
  'fossabot',
  'deepbot',
  'phantombot',
  'streamlabs',
  'stay_hydrated_bot',
  'commanderroot',
  'wizebot'
]);

const roleOrder: ViewerRole[] = [
  'broadcaster',
  'moderator',
  'vip',
  'staff',
  'admin',
  'global_mod',
  'viewer'
];

type ChannelFilter = 'all' | 'mod';

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onChannelSelected: (channel: string | null) => void;
  onRemoveChannelFromApp: (channel: string) => void;
  onOpenChatForChannel: (channel: string) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;
  activeChatters: Record<string, Map<string, ActiveChatter>>;
}

// =====================================================
// Компонент Sidebar
// =====================================================

const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  onToggleCollapse,
  onChannelSelected,
  onRemoveChannelFromApp,
  onOpenChatForChannel,
  onOpenUserLog,
  onOpenUserProfile,
  activeChatters
}) => {
  const [channels, setChannels] = useState<string[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

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

  // Загрузка сохранённых каналов
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

  // Загрузка списка мод-каналов (для фильтра "Где я мод")
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

  // Загрузка глобальных бейджей через Helix
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

  // Закрытие контекстных меню
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
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
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
  const handleSelectChannel = async (channelLogin: string) => {
    setSelectedChannel(channelLogin);
    onChannelSelected(channelLogin);
    setViewers([]);
    setViewersError(null);
    setViewersLoading(true);
    setUsingFallback(false);
    try {
      const { viewers: list, fallback } =
        await fetchChattersForChannel(
          channelLogin,
          activeChatters[channelLogin.toLowerCase()]
        );
      setViewers(list);
      setUsingFallback(fallback);
    } catch (err: any) {
      setViewersError(err?.message || 'Ошибка загрузки зрителей');
    } finally {
      setViewersLoading(false);
    }
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
    void handleSelectChannel(raw);
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
      setSelectedChannel(null);
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
      setSelectedChannel(null);
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

  // Фильтрация каналов
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

  return (
    <>
      <aside style={sidebarStyle(collapsed)}>
        <div style={sidebarHeaderStyle(collapsed)}>
          {!collapsed && (
            <span
              style={{
                fontSize: 12,
                textTransform: 'uppercase',
                color: '#9ca3af'
              }}
            >
              Навигация
            </span>
          )}
          <button
            onClick={onToggleCollapse}
            style={collapseButtonStyle}
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
              <div style={sectionHeaderStyle}>
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
                    style={iconButtonStyle}
                    title="Добавить"
                  >
                    +
                  </button>
                  <button
                    onClick={handleImportModeratedChannels}
                    disabled={modChannelsLoading}
                    style={{
                      ...iconButtonStyle,
                      color: '#22c55e',
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
                  style={channelFilterButtonStyle(
                    channelFilter === 'all'
                  )}
                  onClick={() => setChannelFilter('all')}
                >
                  Все
                </button>
                <button
                  style={channelFilterButtonStyle(
                    channelFilter === 'mod'
                  )}
                  onClick={() => setChannelFilter('mod')}
                >
                  Где я мод
                </button>
              </div>

              <div style={scrollListStyle}>
                {channels.length === 0 && (
                  <div
                    style={{
                      color: '#6b7280',
                      fontSize: 12,
                      padding: '8px 4px'
                    }}
                  >
                    Нет каналов. Нажми +, M или ♥
                  </div>
                )}

                {sortedChannels.map((ch) => {
                  const st =
                    channelStatus[ch.toLowerCase()] ||
                    ({} as ChannelStatus);
                  const dotColor =
                    st.isLive === undefined
                      ? '#4b5563'
                      : st.isLive
                      ? '#22c55e'
                      : '#ef4444';
                  return (
                    <button
                      key={ch}
                      style={channelButtonStyle(
                        selectedChannel === ch
                      )}
                      onClick={() => handleSelectChannel(ch)}
                      onContextMenu={(e) =>
                        handleChannelContextMenu(e, ch)
                      }
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'text/channel-login',
                          ch
                        );
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      draggable
                      title={
                        st.isLive
                          ? `${ch} онлайн: ${
                              st.title || ''
                            }`
                          : `${ch} оффлайн`
                      }
                    >
                      <span
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          width: '100%'
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '999px',
                            background: dotColor,
                            flexShrink: 0
                          }}
                        />
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {ch}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: '#9ca3af',
                            marginLeft: 'auto',
                            flexShrink: 0
                          }}
                        >
                          ({st.viewerCount ?? 0}/
                          {st.modCount ?? '?'})
                        </span>
                        <span
                          style={channelRemoveButtonStyle}
                          title="Удалить канал из списка"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            void removeChannel(ch);
                          }}
                        >
                          ✕
                        </span>
                      </span>
                    </button>
                  );
                })}
                {importError && (
                  <div
                    style={{
                      color: '#fecaca',
                      fontSize: 11,
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
              <div style={sectionHeaderStyle}>
                <span>
                  Зрители{' '}
                  {usingFallback && (
                    <span
                      style={{
                        color: '#f59e0b',
                        marginLeft: 4
                      }}
                    >
                      (из чата)
                    </span>
                  )}
                </span>
                {selectedChannel && !viewersLoading && (
                  <span
                    style={{
                      fontSize: 11,
                      color: '#6b7280'
                    }}
                  >
                    {viewers.length}
                  </span>
                )}
              </div>
              <div style={scrollListStyle}>
                {!selectedChannel && (
                  <div style={{ color: '#6b7280' }}>
                    Выбери канал
                  </div>
                )}
                {selectedChannel && viewersLoading && (
                  <div style={{ color: '#6b7280' }}>
                    Загрузка...
                  </div>
                )}
                {selectedChannel &&
                  viewersError &&
                  !viewersLoading && (
                    <div style={{ color: '#fca5a5' }}>
                      {viewersError}
                    </div>
                  )}
                {selectedChannel &&
                  !viewersLoading &&
                  !viewersError &&
                  viewers.length === 0 && (
                    <div style={{ color: '#6b7280' }}>
                      Зрителей нет
                    </div>
                  )}
                {selectedChannel &&
                  !viewersLoading &&
                  !viewersError &&
                  viewers.length > 0 && (
                    <div>
                      {viewers.map((v) => {
                        const isModOrBroadcastor =
                          v.role === 'broadcaster' ||
                          v.role === 'moderator';
                        const bgStyle = isModOrBroadcastor
                          ? {
                              background:
                                'rgba(255,255,255,0.05)',
                              borderLeft:
                                '3px solid #9147ff'
                            }
                          : {};
                        return (
                          <div
                            key={v.login + v.role}
                            onContextMenu={(e) =>
                              handleViewerContextMenu(e, v)
                            }
                            style={{
                              ...viewerItemStyle,
                              ...bgStyle,
                              cursor: 'context-menu'
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                width: '100%'
                              }}
                            >
                              {v.avatarUrl && (
                                <img
                                  src={v.avatarUrl}
                                  alt={v.login}
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: '50%',
                                    flexShrink: 0
                                  }}
                                />
                              )}
                              <ViewerRoleBadge
                                role={v.role}
                                isBot={v.isBot}
                                badgeSets={badgeSets}
                              />
                              <span
                                style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  fontWeight: isModOrBroadcastor
                                    ? 'bold'
                                    : 'normal'
                                }}
                              >
                                {v.displayName || v.login}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Модалка добавления канала */}
      {isAddChannelOpen && (
        <div
          style={modalOverlayStyle}
          onClick={() => setIsAddChannelOpen(false)}
        >
          <div
            style={modalContentStyle}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 8,
                fontSize: 16
              }}
            >
              Добавить канал
            </h3>
            <input
              type="text"
              value={newChannelName}
              onChange={(e) =>
                setNewChannelName(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddChannel();
              }}
              placeholder="Логин канала"
              style={inputStyle}
              autoFocus
            />
            {addChannelError && (
              <div
                style={{
                  color: '#fecaca',
                  fontSize: 12,
                  marginTop: 4
                }}
              >
                {addChannelError}
              </div>
            )}
            <div
              style={{
                marginTop: 12,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 8
              }}
            >
              <button
                onClick={() => setIsAddChannelOpen(false)}
                style={buttonSecondaryStyle}
              >
                Отмена
              </button>
              <button
                onClick={handleAddChannel}
                style={buttonPrimaryStyle}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

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
              style={menuItemStyle}
            >
              💬 Открыть чат
            </button>
            <button
              onClick={handleRemoveChannelFromContextMenu}
              style={{ ...menuItemStyle, color: '#fecaca' }}
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
            <div style={contextMenuHeaderStyle}>
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
              style={menuItemStyle}
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
              style={menuItemStyle}
            >
              📜 Лог сообщений
            </button>
            <div style={menuDividerStyle} />
            <button
              onClick={() =>
                handleViewerModeration('timeout', 60)
              }
              style={menuItemStyle}
            >
              ⏱️ Таймаут 1м
            </button>
            <button
              onClick={() =>
                handleViewerModeration('timeout', 600)
              }
              style={menuItemStyle}
            >
              ⏱️ Таймаут 10м
            </button>
            <div style={menuDividerStyle} />
            <button
              onClick={() => handleViewerModeration('ban')}
              style={{ ...menuItemStyle, color: '#fca5a5' }}
            >
              ⛔ Бан
            </button>
            <button
              onClick={() => handleViewerModeration('unban')}
              style={{ ...menuItemStyle, color: '#86efac' }}
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
                borderColor:
                  t.type === 'error'
                    ? '#ef4444'
                    : t.type === 'success'
                    ? '#22c55e'
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
// ViewerRoleBadge — теперь с реальными иконками, если есть badgeSets
// =====================================================

const ViewerRoleBadge: React.FC<{
  role: ViewerRole;
  isBot: boolean;
  badgeSets: Record<string, Record<string, any>>;
}> = ({ role, isBot, badgeSets }) => {
  // Боты: отдельный бейдж
  if (isBot) {
    return (
      <span
        title="Bot"
        style={{
          minWidth: 14,
          height: 14,
          borderRadius: 4,
          fontSize: 9,
          lineHeight: '14px',
          textAlign: 'center',
          background: '#eab308',
          color: '#020617',
          fontWeight: 700,
          padding: '0 2px'
        }}
      >
        B
      </span>
    );
  }

  const roleToSetId: Record<ViewerRole, string | null> = {
    broadcaster: 'broadcaster',
    moderator: 'moderator',
    vip: 'vip',
    staff: 'staff',
    admin: 'admin',
    global_mod: 'global_mod',
    viewer: null
  };

  const setId = roleToSetId[role];

  if (
    setId &&
    badgeSets &&
    Object.keys(badgeSets).length > 0 &&
    badgeSets[setId]
  ) {
    const versions = badgeSets[setId];
    const verData =
      versions['1'] || (Object.values(versions)[0] as any);
    if (verData) {
      const url =
        verData.image_url_1x ||
        verData.image_url_2x ||
        verData.image_url_4x;
      if (url) {
        return (
          <img
            src={url}
            alt={role}
            title={verData.title || role}
            style={{
              width: 16,
              height: 16,
              borderRadius: 4,
              flexShrink: 0
            }}
          />
        );
      }
    }
  }

  // Fallback: цветные бейджи, как раньше
  const mapping: Record<
    ViewerRole,
    { label: string; color: string } | null
  > = {
    broadcaster: { label: 'S', color: '#a855f7' },
    moderator: { label: 'M', color: '#22c55e' },
    vip: { label: 'V', color: '#ec4899' },
    staff: { label: 'T', color: '#f97316' },
    admin: { label: 'T', color: '#f97316' },
    global_mod: { label: 'T', color: '#f97316' },
    viewer: null
  };

  const info = mapping[role];
  if (info) {
    return (
      <span
        title={role}
        style={{
          minWidth: 14,
          height: 14,
          borderRadius: 4,
          fontSize: 9,
          lineHeight: '14px',
          textAlign: 'center',
          background: info.color,
          color: '#020617',
          fontWeight: 700,
          padding: '0 2px'
        }}
      >
        {info.label}
      </span>
    );
  }

  // Обычный зритель без роли
  return (
    <span
      style={{
        width: 8,
        height: 8,
        borderRadius: '999px',
        background: '#4b5563',
        display: 'inline-block'
      }}
    />
  );
};

// =====================================================
// Styles
// =====================================================

const sidebarStyle = (collapsed: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  borderRight: '1px solid #27272f',
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
  borderBottom: '1px solid #27272f',
  background: '#111827',
  flexShrink: 0
});

const collapseButtonStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 10,
  cursor: 'pointer'
};

const sectionStyle: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px solid #27272f',
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0
};

const sectionHeaderStyle: React.CSSProperties = {
  padding: '6px 8px',
  fontSize: 12,
  textTransform: 'uppercase',
  color: '#9ca3af',
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
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const channelButtonStyle = (
  active: boolean
): React.CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  padding: '4px 6px',
  marginBottom: 4,
  borderRadius: 6,
  border: 'none',
  background: active ? '#4b5563' : 'transparent',
  color: '#e5e7eb',
  fontSize: 13,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
  overflow: 'hidden'
});

const channelRemoveButtonStyle: React.CSSProperties = {
  marginLeft: 4,
  padding: '0 4px',
  borderRadius: 4,
  fontSize: 11,
  color: '#9ca3af',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  flexShrink: 0
};

const channelFilterButtonStyle = (
  active: boolean
): React.CSSProperties => ({
  padding: '2px 6px',
  borderRadius: 999,
  border: `1px solid ${active ? '#9147ff' : '#4b5563'}`,
  background: active ? '#1f2937' : 'transparent',
  color: '#e5e7eb',
  fontSize: 10,
  cursor: 'pointer'
});

const viewerItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '4px 6px',
  borderRadius: 6,
  marginBottom: 2
};

const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1500
};

const modalContentStyle: React.CSSProperties = {
  background: '#111827',
  padding: '16px 20px',
  borderRadius: 8,
  width: 320,
  boxShadow: '0 10px 25px rgba(0,0,0,0.7)'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: '#020617',
  color: '#e5e7eb',
  fontSize: 13
};

const buttonSecondaryStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 13,
  cursor: 'pointer'
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 6,
  border: 'none',
  background: '#9147ff',
  color: '#fff',
  fontSize: 13,
  cursor: 'pointer'
};

const contextMenuStyle = (
  x: number,
  y: number
): React.CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  background: '#111827',
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
  color: '#9ca3af',
  borderBottom: '1px solid #27272f',
  marginBottom: 4
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  textAlign: 'left',
  padding: '5px 10px',
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const menuDividerStyle: React.CSSProperties = {
  borderTop: '1px solid #27272f',
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
  background: '#111827',
  border: '1px solid #4b5563',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 12,
  color: '#e5e7eb',
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

// =====================================================
// Helpers
// =====================================================

async function fetchChattersForChannel(
  channelLogin: string,
  fallbackChatters?: Map<string, ActiveChatter>
): Promise<{ viewers: ViewerEntry[]; fallback: boolean }> {
  const login = channelLogin.toLowerCase().trim();
  if (!login) return { viewers: [], fallback: false };

  try {
    const result =
      await window.electronAPI.twitch.getChannelChatters(login);
    if (result) {
      const { broadcasterId, moderatorIds, chatters } = result;
      const modsSet = new Set(moderatorIds);
      let viewers: ViewerEntry[] = chatters.map((c: any) => {
        let role: ViewerRole = 'viewer';
        if (c.user_id === broadcasterId) role = 'broadcaster';
        else if (modsSet.has(c.user_id)) role = 'moderator';
        return {
          odaterId: c.user_id,
          login: c.user_login,
          role,
          isBot: KNOWN_BOTS.has(c.user_login.toLowerCase())
        };
      });
      // Сортировка
      viewers.sort((a, b) => {
        const aIdx = roleOrder.indexOf(a.role);
        const bIdx = roleOrder.indexOf(b.role);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return a.login.localeCompare(b.login);
      });
      // Аватарки
      try {
        const logins = viewers.map((v) => v.login);
        const infos =
          await window.electronAPI.twitch.getUsersInfo(logins);
        const infoMap = new Map(
          infos.map((i: any) => [i.login.toLowerCase(), i])
        );
        viewers = viewers.map((v) => {
          const info = infoMap.get(v.login.toLowerCase());
          return {
            ...v,
            avatarUrl: info?.avatarUrl || null,
            displayName: info?.displayName || v.login
          };
        });
      } catch {}
      return { viewers, fallback: false };
    }
  } catch (err: any) {
    console.warn('[fetchChatters] Helix error:', err);
    // Fallback logic
    if (fallbackChatters && fallbackChatters.size > 0) {
      const viewers: ViewerEntry[] = Array.from(
        fallbackChatters.values()
      ).map((c: any) => ({
        login: c.userName,
        role: c.isBroadcaster
          ? 'broadcaster'
          : c.isMod
          ? 'moderator'
          : c.isVip
          ? 'vip'
          : 'viewer',
        isBot: KNOWN_BOTS.has(c.userName.toLowerCase()),
        displayName: c.displayName,
        avatarUrl: null
      }));
      return { viewers, fallback: true };
    }
    return { viewers: [], fallback: false };
  }
  return { viewers: [], fallback: false };
}

export default Sidebar;