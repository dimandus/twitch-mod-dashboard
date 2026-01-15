import React from 'react';
import type { ActiveChatter } from '../App';
import { ChannelList } from '../components/sidebar/ChannelList';
import { ViewersList } from '../components/sidebar/ViewersList';
import { AddChannelModal } from '../components/sidebar/AddChannelModal';
import { useSidebarUI } from '../hooks/useSidebarUI';
import { useSidebarChannels } from '../hooks/useSidebarChannels';
import { useSidebarViewers } from '../hooks/useSidebarViewers';
import * as styles from '../styles/sidebar.styles';

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
  const ui = useSidebarUI();
  const viewersHook = useSidebarViewers(selectedChannel, activeChatters);
  const channelsHook = useSidebarChannels(
    onChannelSelected,
    onRemoveChannelFromApp,
    selectedChannel,
    viewersHook.setViewers,
    viewersHook.setViewersError,
    ui.channelStatus,
    ui.setChannelStatus,
    ui.lastLiveRef,
    ui.addToast
  );

  const handleImportModeratedChannels = async () => {
    ui.setModChannelsLoading(true);
    ui.setImportError(null);
    try {
      const list = await window.electronAPI.twitch.getModeratedChannels();
      if (!list || list.length === 0) {
        ui.setImportError('Нет каналов');
        return;
      }
      const newLogins = list.map((ch: any) => ch.broadcaster_login.toLowerCase());
      const added = channelsHook.mergeChannels(newLogins);
      ui.setModeratedLogins((prev) => Array.from(new Set([...prev, ...newLogins])));
      if (added === 0) ui.addToast('Все уже добавлены', 'info');
      else ui.addToast(`Добавлено ${added} каналов`, 'success');
    } catch (err: any) {
      ui.setImportError(err?.message || 'Ошибка');
    } finally {
      ui.setModChannelsLoading(false);
    }
  };

  const handleImportFollowedChannels = async () => {
    ui.setFollowedChannelsLoading(true);
    ui.setImportError(null);
    try {
      const list = await window.electronAPI.twitch.getFollowedChannels();
      if (!list || list.length === 0) {
        ui.setImportError('Нет подписок');
        return;
      }
      const newLogins = list.map((ch: any) => ch.broadcaster_login.toLowerCase());
      const added = channelsHook.mergeChannels(newLogins);
      if (added === 0) ui.addToast('Все уже добавлены', 'info');
      else ui.addToast(`Добавлено ${added} каналов`, 'success');
    } catch (err: any) {
      ui.setImportError(err?.message || 'Ошибка');
    } finally {
      ui.setFollowedChannelsLoading(false);
    }
  };

  const handleAddChannel = async () => {
    const result = await channelsHook.handleAddChannel(ui.newChannelName);
    if (result.error) {
      ui.setAddChannelError(result.error);
      return;
    }
    ui.setIsAddChannelOpen(false);
    ui.setAddChannelError(null);
  };

  const handleChannelContextMenu = (e: React.MouseEvent, channelLogin: string) => {
    e.preventDefault();
    ui.setChannelContextMenu({ visible: true, x: e.clientX, y: e.clientY, channelLogin });
  };

  const handleViewerContextMenu = (e: React.MouseEvent, viewer: any) => {
    e.preventDefault();
    ui.setViewerContextMenu({ visible: true, x: e.clientX, y: e.clientY, viewer });
  };

  const handleViewerModeration = async (action: 'timeout' | 'ban' | 'unban', duration?: number) => {
    const viewer = ui.viewerContextMenu.viewer;
    if (!viewer || !selectedChannel) return;
    try {
      switch (action) {
        case 'timeout':
          await window.electronAPI.twitch.timeoutUser(selectedChannel, viewer.login, duration || 600);
          ui.addToast(`⏱️ ${viewer.login} таймаут`, 'success');
          break;
        case 'ban':
          await window.electronAPI.twitch.banUser(selectedChannel, viewer.login);
          ui.addToast(`⛔ ${viewer.login} забанен`, 'success');
          break;
        case 'unban':
          await window.electronAPI.twitch.unbanUser(selectedChannel, viewer.login);
          ui.addToast(`✅ ${viewer.login} разбанен`, 'success');
          break;
      }
    } catch (err: any) {
      ui.addToast(`❌ ${err?.message || 'Ошибка'}`, 'error');
    }
    ui.setViewerContextMenu({ visible: false, x: 0, y: 0, viewer: null });
  };

  const moderatedSet = new Set(ui.moderatedLogins.map((l) => l.toLowerCase()));
  const filteredChannels = ui.channelFilter === 'all' ? channelsHook.channels : channelsHook.channels.filter((ch) => moderatedSet.has(ch.toLowerCase()));
  const sortedChannels = [...filteredChannels].sort((a, b) => {
    const stA = ui.channelStatus[a.toLowerCase()];
    const stB = ui.channelStatus[b.toLowerCase()];
    if (stA?.isLive !== stB?.isLive) return stA?.isLive ? -1 : 1;
    const yA = stA?.modCount ?? Number.MAX_SAFE_INTEGER;
    const yB = stB?.modCount ?? Number.MAX_SAFE_INTEGER;
    if (yA !== yB) return yA - yB;
    return a.localeCompare(b);
  });

  const isModeratorMode = !!selectedChannel && ((!viewersHook.usingFallback && viewersHook.viewers.length > 0) || moderatedSet.has(selectedChannel.toLowerCase()));
  const textScale = fontScale * globalScale * ui.autoScale;

  return (
    <>
      <aside style={styles.sidebarStyle(collapsed)}>
        <div style={styles.sidebarHeaderStyle(collapsed)}>
          {!collapsed && <span style={{ fontSize: 12 * textScale, textTransform: 'uppercase', color: 'var(--color-textSecondary)' }}>Навигация</span>}
          <button onClick={onToggleCollapse} style={{ ...styles.collapseButtonStyle, fontSize: 10 * textScale }}>{collapsed ? '▶' : '◀'}</button>
        </div>

        {!collapsed && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={styles.sectionStyle}>
              <div style={{ ...styles.sectionHeaderStyle, fontSize: 12 * textScale }}>
                <span>Каналы ({filteredChannels.length}{ui.channelFilter === 'mod' ? ` / ${channelsHook.channels.length}` : ''})</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => { ui.setNewChannelName(''); ui.setAddChannelError(null); ui.setIsAddChannelOpen(true); }} style={{ ...styles.iconButtonStyle, fontSize: 12 * textScale }} title="Добавить">+</button>
                  <button onClick={handleImportModeratedChannels} disabled={ui.modChannelsLoading} style={{ ...styles.iconButtonStyle, fontSize: 12 * textScale, color: 'var(--color-success)', opacity: ui.modChannelsLoading ? 0.5 : 1 }} title="Модерируемые">{ui.modChannelsLoading ? '...' : 'M'}</button>
                  <button onClick={handleImportFollowedChannels} disabled={ui.followedChannelsLoading} style={{ ...styles.iconButtonStyle, fontSize: 12 * textScale, color: '#a855f7', opacity: ui.followedChannelsLoading ? 0.5 : 1 }} title="Подписки">{ui.followedChannelsLoading ? '...' : '♥'}</button>
                  <button onClick={channelsHook.handleClearAllChannels} style={{ ...styles.iconButtonStyle, fontSize: 12 * textScale, color: '#ef4444' }} title="Очистить список">🗑</button>
                </div>
              </div>

              <div style={{ padding: '2px 8px 4px', display: 'flex', gap: 4 }}>
                <button style={{ ...styles.channelFilterButtonStyle(ui.channelFilter === 'all'), fontSize: 10 * textScale }} onClick={() => ui.setChannelFilter('all')}>Все</button>
                <button style={{ ...styles.channelFilterButtonStyle(ui.channelFilter === 'mod'), fontSize: 10 * textScale }} onClick={() => ui.setChannelFilter('mod')}>Где я мод</button>
              </div>

              <div style={styles.scrollListStyle}>
                <ChannelList channels={sortedChannels} selectedChannel={selectedChannel} channelStatus={ui.channelStatus} onChannelSelect={channelsHook.handleSelectChannel} onChannelRemove={channelsHook.removeChannel} onChannelContextMenu={handleChannelContextMenu} textScale={textScale} />
                {ui.importError && <div style={{ color: '#fecaca', fontSize: 11 * textScale, padding: 4 }}>{ui.importError}</div>}
              </div>
            </div>

            <div style={styles.sectionStyle}>
              <div style={{ ...styles.sectionHeaderStyle, fontSize: 12 * textScale }}>
                <span>
                  Зрители{' '}
                  {selectedChannel && <span style={{ marginLeft: 4, fontSize: 10 * textScale, color: isModeratorMode ? 'var(--color-success)' : 'var(--color-textSecondary)' }}>{isModeratorMode ? 'Модер. режим' : 'Юзерский режим'}</span>}
                  {!isModeratorMode && viewersHook.usingFallback && <span style={{ marginLeft: 4, fontSize: 10 * textScale, color: '#f59e0b' }}>(из чата)</span>}
                </span>
                {selectedChannel && !viewersHook.viewersLoading && <span style={{ fontSize: 11 * textScale, color: '#6b7280' }}>{viewersHook.viewers.length}</span>}
              </div>
              <div style={styles.scrollListStyle}>
                {!selectedChannel && <div style={{ color: '#6b7280', fontSize: 12 * textScale }}>Выбери канал</div>}
                {selectedChannel && viewersHook.viewersLoading && <div style={{ color: '#6b7280', fontSize: 12 * textScale }}>Загрузка...</div>}
                {selectedChannel && viewersHook.viewersError && !viewersHook.viewersLoading && <div style={{ color: '#fca5a5', fontSize: 12 * textScale }}>{viewersHook.viewersError}</div>}
                {selectedChannel && !viewersHook.viewersLoading && !viewersHook.viewersError && viewersHook.viewers.length === 0 && <div style={{ color: '#6b7280', fontSize: 12 * textScale }}>Зрителей нет</div>}
                {selectedChannel && !viewersHook.viewersLoading && !viewersHook.viewersError && viewersHook.viewers.length > 0 && <ViewersList viewers={viewersHook.viewers} badgeSets={ui.badgeSets} onViewerContextMenu={handleViewerContextMenu} textScale={textScale} />}
              </div>
            </div>
          </div>
        )}
      </aside>

      <AddChannelModal isOpen={ui.isAddChannelOpen} channelName={ui.newChannelName} error={ui.addChannelError} onChannelNameChange={ui.setNewChannelName} onAdd={handleAddChannel} onClose={() => ui.setIsAddChannelOpen(false)} textScale={textScale} />

      {ui.channelContextMenu.visible && ui.channelContextMenu.channelLogin && (
        <div style={styles.contextMenuStyle(ui.channelContextMenu.x, ui.channelContextMenu.y)} onClick={(e) => e.stopPropagation()}>
          <button onClick={() => { onOpenChatForChannel(ui.channelContextMenu.channelLogin!); ui.setChannelContextMenu({ visible: false, x: 0, y: 0, channelLogin: null }); }} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale }}>💬 Открыть чат</button>
          <button onClick={() => { channelsHook.removeChannel(ui.channelContextMenu.channelLogin!); ui.setChannelContextMenu({ visible: false, x: 0, y: 0, channelLogin: null }); }} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale, color: '#fecaca' }}>🗑️ Удалить</button>
        </div>
      )}

      {ui.viewerContextMenu.visible && ui.viewerContextMenu.viewer && (
        <div style={styles.contextMenuStyle(ui.viewerContextMenu.x, ui.viewerContextMenu.y)} onClick={(e) => e.stopPropagation()}>
          <div style={{ ...styles.contextMenuHeaderStyle, fontSize: 12 * textScale }}>{ui.viewerContextMenu.viewer.displayName || ui.viewerContextMenu.viewer.login}</div>
          <button onClick={() => { onOpenUserProfile(ui.viewerContextMenu.viewer!.login); ui.setViewerContextMenu({ visible: false, x: 0, y: 0, viewer: null }); }} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale }}>👤 Профиль</button>
          <button onClick={() => { onOpenUserLog(ui.viewerContextMenu.viewer!.login); ui.setViewerContextMenu({ visible: false, x: 0, y: 0, viewer: null }); }} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale }}>📜 Лог сообщений</button>
          <div style={styles.menuDividerStyle} />
          <button onClick={() => handleViewerModeration('timeout', 60)} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale }}>⏱️ Таймаут 1м</button>
          <button onClick={() => handleViewerModeration('timeout', 600)} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale }}>⏱️ Таймаут 10м</button>
          <div style={styles.menuDividerStyle} />
          <button onClick={() => handleViewerModeration('ban')} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale, color: '#fca5a5' }}>⛔ Бан</button>
          <button onClick={() => handleViewerModeration('unban')} style={{ ...styles.menuItemStyle, fontSize: 12 * textScale, color: '#86efac' }}>✅ Разбан</button>
        </div>
      )}

      {ui.toasts.length > 0 && (
        <div style={styles.toastContainerStyle}>
          {ui.toasts.map((t) => (
            <div key={t.id} style={{ ...styles.toastStyle, fontSize: 12 * textScale, borderColor: t.type === 'error' ? '#ef4444' : t.type === 'success' ? 'var(--color-success)' : '#4b5563' }}>{t.text}</div>
          ))}
        </div>
      )}
    </>
  );
};

export default Sidebar;
