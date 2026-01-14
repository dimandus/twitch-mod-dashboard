import React, { useEffect, useRef, useState } from 'react';

// =====================================================
// Типы
// =====================================================

export interface ChatMessage {
  id: string;
  msgId?: string;
  userId?: string;
  text: string;
  userLogin: string;
  displayName: string;
  color?: string;
  badges: string[];
  badgeInfo?: Record<string, string>;
  badgeVersions?: Record<string, string>;
  self: boolean;
  timestamp: number;
  emotes?: Record<string, string[]>;
  mentionedSelf?: boolean;
  deleted?: boolean;
  isSystem?: boolean;
  canDelete?: boolean;
  cleared?: boolean;
  isRaider?: boolean;
  isFirstMessage?: boolean;
  sourceRoomId?: string;
}

export interface ChatPane {
  id: string;
  channel: string;
  paused: boolean;
  messages: ChatMessage[];
  buffer: ChatMessage[];
}

export type ModerationAction =
  | { type: 'deleteMessage'; channel: string; login: string; msgId: string }
  | {
      type: 'timeout';
      channel: string;
      login: string;
      durationSeconds: number;
      reason?: string;
    }
  | { type: 'ban'; channel: string; login: string; reason?: string }
  | { type: 'unban'; channel: string; login: string }
  | { type: 'clearChat'; channel: string };

type ChatModeKey = 'slow' | 'emote' | 'followers' | 'subs' | 'unique' | 'shield';

interface ChatModes {
  slow: boolean;
  slowDuration: number;
  emote: boolean;
  followers: boolean;
  followersDuration: number;
  subs: boolean;
  unique: boolean;
  shield: boolean;
}

const defaultModes: ChatModes = {
  slow: false,
  slowDuration: 0,
  emote: false,
  followers: false,
  followersDuration: -1,
  subs: false,
  unique: false,
  shield: false
};

const SLOW_MODE_OPTIONS = [
  { label: 'Выкл', value: 0 },
  { label: '3с', value: 3 },
  { label: '5с', value: 5 },
  { label: '10с', value: 10 },
  { label: '20с', value: 20 },
  { label: '30с', value: 30 },
  { label: '60с', value: 60 },
  { label: '120с', value: 120 }
];

const FOLLOWERS_MODE_OPTIONS = [
  { label: 'Выкл', value: -1 },
  { label: '0м', value: 0 },
  { label: '10м', value: 10 },
  { label: '30м', value: 30 },
  { label: '1ч', value: 60 },
  { label: '1д', value: 1440 },
  { label: '1н', value: 10080 },
  { label: '1мес', value: 43200 }
];

const TWITCH_COMMANDS = [
  { name: '/me', desc: 'Цветной текст' },
  { name: '/clear', desc: 'Очистить чат' },
  { name: '/slow', desc: 'Включить slowmode' },
  { name: '/slowoff', desc: 'Выключить slowmode' },
  { name: '/followers', desc: 'Только для фолловеров' },
  { name: '/followersoff', desc: 'Отключить только для фолловеров' },
  { name: '/subscribers', desc: 'Только для подписчиков' },
  { name: '/subscribersoff', desc: 'Отключить только для подписчиков' },
  { name: '/emoteonly', desc: 'Только эмодзи' },
  { name: '/emoteonlyoff', desc: 'Отключить только эмодзи' },
  { name: '/ban', desc: 'Бан пользователя' },
  { name: '/timeout', desc: 'Таймаут пользователя' },
  { name: '/unban', desc: 'Разбан пользователя' },
  { name: '/announce', desc: 'Объявление' },
  { name: '/uniquechat', desc: 'Уникальные сообщения' },
  { name: '/uniquechatoff', desc: 'Отключить уникальные сообщения' }
];

interface ChatAreaProps {
  selectedChannel: string | null;
  chatPanes: ChatPane[];
  onAddChat: (channel: string) => void;
  onRemoveChat: (id: string) => void;
  onClearChat: (id: string) => void;
  onTogglePause: (id: string) => void;
  onReorderChats: (next: ChatPane[]) => void;
  onSendMessage: (channel: string, text: string) => void;
  onModerationAction: (action: ModerationAction) => void;
  roomModes: Record<string, ChatModes>;
  onModeToggle: (channel: string, mode: ChatModeKey, value?: number) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;

  fontScale: number;
  globalScale: number;
  onFontScaleChange: (next: number) => void;
  onGlobalScaleChange: (next: number) => void;
  onSelectChannel: (channel: string) => void;
}

type EmoteSource = 'global' | 'user' | 'channel';

interface Emote {
  id: string;
  name: string;
  url1x: string;
  url2x: string;
  url4x: string;
  source: EmoteSource;
  ownerName?: string;
}

// =====================================================
// Компонент
// =====================================================

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedChannel,
  chatPanes,
  onAddChat,
  onRemoveChat,
  onClearChat,
  onTogglePause,
  onReorderChats,
  onSendMessage,
  onModerationAction,
  roomModes,
  onModeToggle,
  onOpenUserLog,
  onOpenUserProfile,
  fontScale,
  globalScale,
  onFontScaleChange,
  onGlobalScaleChange,
  onSelectChannel
}) => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);
  const [rows, setRows] = useState<1 | 2>(1);

  const [paneWidth, setPaneWidth] = useState(320);
  const [paneHeight, setPaneHeight] = useState(260);

  const scrollContainersRef = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const [mentionState, setMentionState] = useState<{
    paneId: string;
    query: string;
    suggestions: string[];
    selectedIndex: number;
    atIndex: number;
  } | null>(null);

  const [msgMenu, setMsgMenu] = useState<{
    x: number;
    y: number;
    channel: string;
    message: ChatMessage;
  } | null>(null);

  const [openDropdown, setOpenDropdown] = useState<{
    channel: string;
    type: 'slow' | 'followers';
  } | null>(null);

  const [badgeSets, setBadgeSets] = useState<Record<string, Record<string, any>>>({});

const [commandState, setCommandState] = useState<{
  paneId: string;
  query: string;
  suggestions: typeof TWITCH_COMMANDS;
  selectedIndex: number;
  slashIndex: number;
} | null>(null);

  // масштабирование
  const [autoScale, setAutoScale] = useState(1);

  // Эмоты
  const [globalEmotes, setGlobalEmotes] = useState<Emote[]>([]);
  const [userEmotes, setUserEmotes] = useState<Emote[]>([]);
  const [channelEmotes, setChannelEmotes] = useState<Record<string, Emote[]>>({});
  const [emotePicker, setEmotePicker] = useState<{
    paneId: string;
    tab: EmoteSource;
  } | null>(null);

  // Использование эмотов
  const [emoteUsage, setEmoteUsage] = useState<Record<string, number>>({});

  // Загрузка глобальных бейджей через Helix
  useEffect(() => {
    (async () => {
      try {
        const json = await window.electronAPI.twitch.getGlobalBadges();
        const sets: Record<string, Record<string, any>> = {};
        for (const set of json.data || []) {
          const setId = set.set_id;
          const vers: Record<string, any> = {};
          for (const v of set.versions || []) {
            vers[v.id] = v;
          }
          sets[setId] = vers;
        }
        setBadgeSets(sets);
      } catch (err) {
        console.warn('[Badges] не удалось загрузить глобальные бейджи', err);
      }
    })();
  }, []);

  // Загрузка настроек раскладки (строки / размер панелей)
  useEffect(() => {
    (async () => {
      try {
        const [storedRows, storedWidth, storedHeight] = await Promise.all([
          window.electronAPI.config.get('ui.chat.rows'),
          window.electronAPI.config.get('ui.chat.paneWidth'),
          window.electronAPI.config.get('ui.chat.paneHeight')
        ]);

        if (storedRows === 1 || storedRows === 2) {
          setRows(storedRows);
        }

        if (typeof storedWidth === 'number') {
          setPaneWidth(clampWidth(storedWidth));
        }

        if (typeof storedHeight === 'number') {
          setPaneHeight(clampHeight(storedHeight));
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить настройки раскладки', err);
      }
    })();
  }, []);

  // Сохранение раскладки при изменении
  useEffect(() => {
    (async () => {
      try {
        await Promise.all([
          window.electronAPI.config.set('ui.chat.rows', rows),
          window.electronAPI.config.set('ui.chat.paneWidth', paneWidth),
          window.electronAPI.config.set('ui.chat.paneHeight', paneHeight)
        ]);
      } catch (err) {
        console.warn('[ChatArea] не удалось сохранить настройки раскладки', err);
      }
    })();
  }, [rows, paneWidth, paneHeight]);

  // Загрузка статистики по эмотам
  useEffect(() => {
    (async () => {
      try {
        const stored = await window.electronAPI.config.get('ui.chat.emoteUsage');
        if (stored && typeof stored === 'object') {
          setEmoteUsage(stored as Record<string, number>);
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить статистику смайлов', err);
      }
    })();
  }, []);

  // Сохранение статистики по эмотам
  useEffect(() => {
    (async () => {
      try {
        await window.electronAPI.config.set('ui.chat.emoteUsage', emoteUsage);
      } catch (err) {
        console.warn('[ChatArea] не удалось сохранить статистику смайлов', err);
      }
    })();
  }, [emoteUsage]);

  const incrementEmoteUsage = (code: string) => {
    setEmoteUsage((prev) => {
      const next = { ...prev, [code]: (prev[code] || 0) + 1 };
      return next;
    });
  };

  // Клик вне — закрывать меню/дропдауны
  useEffect(() => {
    const handleClick = () => {
      setOpenDropdown(null);
      setMsgMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Авто‑масштаб от размера окна
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

  const changePaneWidth = (delta: number) =>
    setPaneWidth((w) => clampWidth(w + delta));
  const changePaneHeight = (delta: number) =>
    setPaneHeight((h) => clampHeight(h + delta));

  const changeFontScale = (delta: number) =>
    onFontScaleChange(fontScale + delta);

  const changeGlobalScale = (delta: number) =>
    onGlobalScaleChange(globalScale + delta);

  // Эмоты: глобальные и «мои»
  useEffect(() => {
    (async () => {
      try {
        // Глобальные эмоты
        const rawGlobal = await window.electronAPI.twitch.getGlobalEmotes?.();
        if (Array.isArray(rawGlobal)) {
          setGlobalEmotes(
            rawGlobal.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'global',
                ownerName: e.owner_name
              } as Emote;
            })
          );
        }

        // Эмоты пользователя (через /chat/emotes/user)
        const rawUser = await window.electronAPI.twitch.getUserEmotes?.();
        if (Array.isArray(rawUser)) {
          setUserEmotes(
            rawUser.map((e: any) => {
              const urls = buildEmoteUrls(e.id);
              return {
                id: e.id,
                name: e.name,
                url1x: urls.url1x,
                url2x: urls.url2x,
                url4x: urls.url4x,
                source: 'user',
                ownerName: e.owner_name
              } as Emote;
            })
          );
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить эмоты (global/user)', err);
      }
    })();
  }, []);

  // Эмоты каналов
  useEffect(() => {
    (async () => {
      try {
        const current = channelEmotes;

        for (const pane of chatPanes) {
          const login = pane.channel.toLowerCase().trim();
          if (!login) continue;
          if (current[login]) continue;

          const raw = await window.electronAPI.twitch.getChannelEmotes?.(login);
          if (!Array.isArray(raw)) continue;

          const emotes: Emote[] = raw.map((e: any) => {
            const urls = buildEmoteUrls(e.id);
            return {
              id: e.id,
              name: e.name,
              url1x: urls.url1x,
              url2x: urls.url2x,
              url4x: urls.url4x,
              source: 'channel',
              ownerName: e.owner_name
            } as Emote;
          });

          setChannelEmotes((prev) => ({
            ...prev,
            [login]: emotes
          }));
        }
      } catch (err) {
        console.warn('[ChatArea] не удалось загрузить эмоты каналов', err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatPanes]);

  // Drag & Drop
  const handleContainerDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    const types = e.dataTransfer.types;
    if (!Array.from(types).includes('text/channel-login')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDropActive(true);
  };
  const handleContainerDragLeave: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDropActive(false);
  };
  const handleContainerDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!Array.from(e.dataTransfer.types).includes('text/channel-login')) return;
    e.preventDefault();
    setIsDropActive(false);
    const channel = e.dataTransfer.getData('text/channel-login');
    if (channel) onAddChat(channel);
  };
  const handlePaneDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    paneId: string
  ) => {
    setDraggingId(paneId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handlePaneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handlePaneDrop = (
    e: React.DragEvent<HTMLDivElement>,
    targetId: string
  ) => {
    e.preventDefault();
    if (!draggingId || draggingId === targetId) return;
    const fromIndex = chatPanes.findIndex((p) => p.id === draggingId);
    const toIndex = chatPanes.findIndex((p) => p.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;
    const next = [...chatPanes];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onReorderChats(next);
    setDraggingId(null);
  };
  const handlePaneDragEnd = () => setDraggingId(null);

  // Input
  const handleInputChange = (id: string, value: string) => {
    setInputValues((p) => ({ ...p, [id]: value }));
    updateMentionSuggestions(id, value);
	updateCommandSuggestions(id, value);
  };

  const handleSend = (pane: ChatPane) => {
    const text = (inputValues[pane.id] || '').trim();
    if (!pane.channel || !text) return;
    onSendMessage(pane.channel, text);
    setInputValues((p) => ({ ...p, [pane.id]: '' }));
    setMentionState((prev) => (prev?.paneId === pane.id ? null : prev));
  };

const updateCommandSuggestions = (paneId: string, value: string) => {
  const slashIndex = value.indexOf('/');
  if (slashIndex !== 0) {
    setCommandState(null);
    return;
  }

  // Если после команды уже есть пробел и что-то ещё — не показываем подсказку
  const firstSpace = value.indexOf(' ');
  if (firstSpace > 0) {
    setCommandState(null);
    return;
  }

  const query = value.slice(1).toLowerCase();
  const suggestions = TWITCH_COMMANDS.filter((cmd) =>
    cmd.name.slice(1).startsWith(query)
  );

  if (suggestions.length === 0) {
    setCommandState(null);
    return;
  }

  setCommandState({
    paneId,
    query,
    suggestions,
    selectedIndex: 0,
    slashIndex
  });
};

  const updateMentionSuggestions = (paneId: string, value: string) => {
    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionState(null);
      return;
    }

    if (atIndex > 0 && !/\s/.test(value[atIndex - 1])) {
      setMentionState(null);
      return;
    }

    const after = value.slice(atIndex + 1);
    if (after.includes(' ')) {
      setMentionState(null);
      return;
    }

    const query = after.toLowerCase();
    const pane = chatPanes.find((p) => p.id === paneId);
    if (!pane) {
      setMentionState(null);
      return;
    }

    const namesSet = new Set<string>();
    pane.messages.forEach((m) => {
      if (!m.userLogin) return;
      const name = m.displayName || m.userLogin;
      namesSet.add(name);
    });

    const allNames = Array.from(namesSet);
    const suggestions = allNames
      .filter((name) => name.toLowerCase().startsWith(query))
      .sort();

    if (suggestions.length === 0) {
      setMentionState(null);
      return;
    }

    setMentionState({
      paneId,
      query,
      suggestions,
      selectedIndex: 0,
      atIndex
    });
  };

  const applyMentionSuggestion = (paneId: string) => {
    setMentionState((prev) => {
      if (!prev || prev.paneId !== paneId) return prev;
      const { atIndex, suggestions, selectedIndex } = prev;
      const name = suggestions[selectedIndex];
      const current = inputValues[paneId] || '';

      const before = current.slice(0, atIndex);
      const newValue = before + '@' + name + ' ';

      setInputValues((p) => ({ ...p, [paneId]: newValue }));

      return null;
    });
  };

  const handleInputKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    pane: ChatPane
  ) => {
    if (mentionState && mentionState.paneId === pane.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionState((prev) =>
          !prev
            ? null
            : {
                ...prev,
                selectedIndex:
                  (prev.selectedIndex + 1) %
                  prev.suggestions.length
              }
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionState((prev) =>
          !prev
            ? null
            : {
                ...prev,
                selectedIndex:
                  (prev.selectedIndex - 1 + prev.suggestions.length) %
                  prev.suggestions.length
              }
        );
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMentionSuggestion(pane.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setMentionState(null);
        return;
      }
    }

  if (commandState && commandState.paneId === pane.id) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCommandState((prev) =>
        !prev
          ? null
          : {
              ...prev,
              selectedIndex:
                (prev.selectedIndex + 1) %
                prev.suggestions.length
            }
      );
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCommandState((prev) =>
        !prev
          ? null
          : {
              ...prev,
              selectedIndex:
                (prev.selectedIndex - 1 + prev.suggestions.length) %
                prev.suggestions.length
            }
      );
      return;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      applyCommandSuggestion(pane.id);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setCommandState(null);
      return;
    }
  }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend(pane);
    }
  };

const applyCommandSuggestion = (paneId: string) => {
  setCommandState((prev) => {
    if (!prev || prev.paneId !== paneId) return prev;
    const { suggestions, selectedIndex } = prev;
    const cmd = suggestions[selectedIndex].name;
    setInputValues((p) => ({ ...p, [paneId]: cmd + ' ' }));
    return null;
  });
};

  const insertEmoteToInput = (paneId: string, code: string) => {
    incrementEmoteUsage(code);

    const el = inputRefs.current[paneId];
    const current = inputValues[paneId] || '';

    if (!el) {
      const newValue = (current + ' ' + code).trimStart();
      setInputValues((prev) => ({ ...prev, [paneId]: newValue + ' ' }));
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;

    const before = current.slice(0, start);
    const after = current.slice(end);

    const newValue = before + code + ' ' + after;

    setInputValues((prev) => ({ ...prev, [paneId]: newValue }));

    requestAnimationFrame(() => {
      const pos = before.length + code.length + 1;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  };

  // Auto-scroll
  useEffect(() => {
    chatPanes.forEach((pane) => {
      if (pane.paused) return;
      const el = scrollContainersRef.current[pane.id];
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [chatPanes]);

  // Context Menu
  const handleMessageContextMenu = (
    e: React.MouseEvent,
    channel: string,
    message: ChatMessage
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (message.isSystem) return;

    const MENU_WIDTH = 260;
    const MENU_HEIGHT = 260;
    const { innerWidth, innerHeight } = window;
    let x = e.clientX;
    let y = e.clientY;

    if (x + MENU_WIDTH > innerWidth) {
      x = innerWidth - MENU_WIDTH - 8;
    }
    if (y + MENU_HEIGHT > innerHeight) {
      y = innerHeight - MENU_HEIGHT - 8;
    }
    if (x < 0) x = 0;
    if (y < 0) y = 0;

    setMsgMenu({ x, y, channel, message });
  };

  const closeMsgMenu = () => setMsgMenu(null);

  const handleModerationClick = (
    type: 'deleteMessage' | 'timeout' | 'ban' | 'unban',
    duration?: number
  ) => {
    if (!msgMenu) return;
    const { channel, message } = msgMenu;
    const login = message.userLogin;

    try {
      switch (type) {
        case 'deleteMessage':
          if (!message.msgId) return;
          onModerationAction({
            type: 'deleteMessage',
            channel,
            login,
            msgId: message.msgId
          });
          break;
        case 'ban':
          onModerationAction({ type: 'ban', channel, login });
          break;
        case 'unban':
          onModerationAction({ type: 'unban', channel, login });
          break;
        case 'timeout':
          onModerationAction({
            type: 'timeout',
            channel,
            login,
            durationSeconds: duration ?? 600
          });
          break;
      }
    } catch (e) {
      console.error(e);
    }
    closeMsgMenu();
  };

  const handleClearGlobal = (pane: ChatPane) =>
    onModerationAction({ type: 'clearChat', channel: pane.channel });

  // Dropdown (slow / followers)
  const handleDropdownClick = (
    e: React.MouseEvent,
    channel: string,
    type: 'slow' | 'followers'
  ) => {
    e.stopPropagation();
    setOpenDropdown((prev) =>
      prev?.channel === channel && prev?.type === type
        ? null
        : { channel, type }
    );
  };
  const handleSlowModeSelect = (channel: string, seconds: number) => {
    onModeToggle(channel, 'slow', seconds);
    setOpenDropdown(null);
  };
  const handleFollowersModeSelect = (channel: string, minutes: number) => {
    onModeToggle(channel, 'followers', minutes);
    setOpenDropdown(null);
  };

  const isTwoRows = rows === 2;

  // итоговые множители
  const combinedScale = globalScale * autoScale;
  const textScale = fontScale * combinedScale;
  const scaledPaneWidth = paneWidth * combinedScale;
  const scaledPaneHeight = paneHeight * combinedScale;

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid #27272f',
        width: '100%',
        overflowX: 'hidden'
      }}
      onDragOver={handleContainerDragOver}
      onDrop={handleContainerDrop}
      onDragLeave={handleContainerDragLeave}
      onClick={() => {
        closeMsgMenu();
        setOpenDropdown(null);
      }}
    >
      <div style={topPanelStyle}>
        <div>
          <div style={{ fontSize: 13 * textScale, color: '#9ca3af' }}>Область чатов</div>
          <div style={{ fontSize: 11 * textScale, color: '#6b7280' }}>
            ПКМ по каналу или перетащи сюда
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {selectedChannel && (
            <div style={{ fontSize: 11 * textScale, color: '#9ca3af' }}>
              Канал:{' '}
              <strong style={{ color: '#e5e7eb' }}>
                {selectedChannel}
              </strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: '#9ca3af' }}>Строки:</span>
            <button
              onClick={() => setRows(1)}
              style={rowButtonStyle(rows === 1)}
            >
              1
            </button>
            <button
              onClick={() => setRows(2)}
              style={rowButtonStyle(rows === 2)}
            >
              2
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: '#9ca3af' }}>Размер:</span>
            <button
              onClick={() => changePaneWidth(-20)}
              style={sizeButtonStyle}
            >
              W-
            </button>
            <button
              onClick={() => changePaneWidth(20)}
              style={sizeButtonStyle}
            >
              W+
            </button>
            <button
              onClick={() => changePaneHeight(-20)}
              style={sizeButtonStyle}
            >
              H-
            </button>
            <button
              onClick={() => changePaneHeight(20)}
              style={sizeButtonStyle}
            >
              H+
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: '#9ca3af' }}>Шрифт:</span>
            <button
              onClick={() => changeFontScale(-0.1)}
              style={sizeButtonStyle}
            >
              A-
            </button>
            <button
              onClick={() => changeFontScale(0.1)}
              style={sizeButtonStyle}
            >
              A+
            </button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: '#9ca3af' }}>Scale:</span>
            <button
              onClick={() => changeGlobalScale(-0.1)}
              style={sizeButtonStyle}
            >
              S-
            </button>
            <button
              onClick={() => changeGlobalScale(0.1)}
              style={sizeButtonStyle}
            >
              S+
            </button>
          </div>
        </div>
      </div>

      <div style={chatsContainerStyle(isTwoRows)}>
        <div style={chatsGridStyle(isTwoRows)}>
          {chatPanes.length === 0 && (
            <div style={emptyStateStyle(isDropActive)}>
              {isDropActive ? 'Отпусти здесь' : 'Нет открытых чатов.'}
            </div>
          )}

          {chatPanes.map((pane) => {
            const inputValue = inputValues[pane.id] || '';
            const canSend = !!pane.channel && inputValue.trim().length > 0;
            const isSelected =
              selectedChannel?.toLowerCase() ===
              pane.channel.toLowerCase();
            const modes =
              roomModes[pane.channel.toLowerCase()] || defaultModes;
            const isSlowDropdownOpen =
              openDropdown?.channel === pane.channel &&
              openDropdown?.type === 'slow';
            const isFollowersDropdownOpen =
              openDropdown?.channel === pane.channel &&
              openDropdown?.type === 'followers';

            return (
              <div
                key={pane.id}
                onClick={() => onSelectChannel(pane.channel)}
                onDragOver={handlePaneDragOver}
                onDrop={(e) => handlePaneDrop(e, pane.id)}
                style={chatPaneStyle(
                  scaledPaneWidth,
                  scaledPaneHeight,
                  draggingId === pane.id,
                  isSelected
                )}
              >
                {/* HEADER */}
                <div
                  draggable
                  onDragStart={(e) => handlePaneDragStart(e, pane.id)}
                  onDragEnd={handlePaneDragEnd}
                  style={paneHeaderStyle}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 12 * textScale,
                        color: '#9ca3af',
                        textTransform: 'uppercase'
                      }}
                    >
                      Канал
                    </div>
                    <div
                      style={{
                        fontSize: 14 * textScale,
                        fontWeight: 500
                      }}
                    >
                      {pane.channel}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearChat(pane.id);
                      }}
                      title="Очистить локально"
                      style={iconButtonStyle}
                    >
                      ⌫
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePause(pane.id);
                      }}
                      title={pane.paused ? 'Продолжить' : 'Пауза'}
                      style={iconButtonStyle}
                    >
                      {pane.paused ? '▶' : '⏸'}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveChat(pane.id);
                      }}
                      title="Закрыть"
                      style={iconButtonStyle}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* MODES BAR */}
                <div style={modesBarStyle}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'shield');
                    }}
                    style={modeButtonStyle(modes.shield, '#ef4444')}
                    title="Защитный режим"
                  >
                    🛡️
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) =>
                        handleDropdownClick(e, pane.channel, 'slow')
                      }
                      style={modeButtonStyle(modes.slow)}
                      title="Медленный режим"
                    >
                      Slow{' '}
                      {modes.slow && modes.slowDuration > 0
                        ? `(${modes.slowDuration}с)`
                        : ''}{' '}
                      <span style={{ marginLeft: 2, fontSize: 8 }}>▼</span>
                    </button>
                    {isSlowDropdownOpen && (
                      <div
                        style={dropdownMenuStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {SLOW_MODE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleSlowModeSelect(pane.channel, opt.value)
                            }
                            style={dropdownItemStyle(
                              opt.value === 0
                                ? !modes.slow
                                : modes.slow &&
                                    modes.slowDuration === opt.value
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'emote');
                    }}
                    style={modeButtonStyle(modes.emote)}
                    title="Только эмодзи"
                  >
                    Emote
                  </button>

                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) =>
                        handleDropdownClick(e, pane.channel, 'followers')
                      }
                      style={modeButtonStyle(modes.followers)}
                      title="Только фолловеры"
                    >
                      Foll{' '}
                      {modes.followers
                        ? `(${formatFollowersDuration(
                            modes.followersDuration
                          )})`
                        : ''}{' '}
                      <span style={{ marginLeft: 2, fontSize: 8 }}>▼</span>
                    </button>
                    {isFollowersDropdownOpen && (
                      <div
                        style={dropdownMenuStyle}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {FOLLOWERS_MODE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() =>
                              handleFollowersModeSelect(
                                pane.channel,
                                opt.value
                              )
                            }
                            style={dropdownItemStyle(
                              opt.value === -1
                                ? !modes.followers
                                : modes.followers &&
                                    modes.followersDuration === opt.value
                            )}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'subs');
                    }}
                    style={modeButtonStyle(modes.subs)}
                    title="Только подписчики"
                  >
                    Subs
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onModeToggle(pane.channel, 'unique');
                    }}
                    style={modeButtonStyle(modes.unique)}
                    title="Уникальные сообщения"
                  >
                    Uniq
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearGlobal(pane);
                    }}
                    style={{
                      ...modeButtonStyle(false),
                      borderColor: '#f97316',
                      color: '#f97316'
                    }}
                    title="Очистить чат"
                  >
                    Clear
                  </button>
                </div>

                {/* MESSAGES */}
                <div
                  ref={(el) => {
                    scrollContainersRef.current[pane.id] = el;
                  }}
                  style={messagesContainerStyle}
                >
                  {pane.messages.length === 0 ? (
                    <div style={{ fontSize: 12 * textScale, color: '#6b7280' }}>
                      Сообщений пока нет.
                    </div>
                  ) : (
                    pane.messages.map((m) => {
                      if (m.isSystem) {
                        return (
                          <div key={m.id} style={systemMessageStyle(textScale)}>
                            {m.text}
                          </div>
                        );
                      }

                      const isDeleted = !!m.deleted;
                      const isCleared = !!m.cleared && !isDeleted;
                      const isMentionedSelf = !!m.mentionedSelf;
                      const isRaider = !!m.isRaider;
                      const isFirstMessage = !!m.isFirstMessage;
                      const isSharedChat = m.sourceRoomId && m.sourceRoomId !== pane.channel;

                      return (
                        <div
                          key={m.msgId || m.id}
                          onContextMenu={(e) =>
                            handleMessageContextMenu(
                              e,
                              pane.channel,
                              m
                            )
                          }
                          data-msg-id={m.msgId}
                          style={messageStyle(
                            isDeleted,
                            isCleared,
                            isMentionedSelf,
                            textScale,
                            isRaider,
                            isFirstMessage
                          )}
                        >
                          <div
                            style={{
                              display: 'flex',
                              gap: 2,
                              flexShrink: 0
                            }}
                          >
                            {renderBadges(
                              m.badges,
                              m.badgeVersions,
                              m.badgeInfo,
                              badgeSets
                            )}
                          </div>
                          <span
                            style={usernameStyle(
                              isDeleted,
                              isCleared,
                              m.color,
                              textScale
                            )}
                          >
                            {m.displayName || m.userLogin}:
                          </span>
                          {isSharedChat && (
                            <span
                              style={{
                                fontSize: 9 * textScale,
                                color: '#a78bfa',
                                backgroundColor: '#2e1065',
                                padding: '1px 4px',
                                borderRadius: 3,
                                fontWeight: 600,
                                marginRight: 4
                              }}
                              title={`Сообщение из другого канала (room-id: ${m.sourceRoomId})`}
                            >
                              🔗
                            </span>
                          )}
                          <span
                            style={messageTextStyle(
                              isDeleted,
                              isCleared,
                              textScale
                            )}
                          >
                            {renderMessageWithEmotes(m.text, m.emotes)}
                          </span>
                          {isDeleted && (
                            <span style={deletedLabelStyle}>
                              [удалено]
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Упоминания */}
                {mentionState && mentionState.paneId === pane.id && (
                  <div style={mentionBoxStyle(textScale)}>
                    {mentionState.suggestions.map((name, idx) => (
                      <div
                        key={name}
                        style={mentionItemStyle(idx === mentionState.selectedIndex)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setMentionState((prev) =>
                            prev ? { ...prev, selectedIndex: idx } : prev
                          );
                          applyMentionSuggestion(pane.id);
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}

{commandState && commandState.paneId === pane.id && (
  <div style={commandBoxStyle}>
    {commandState.suggestions.map((cmd, idx) => (
      <div
        key={cmd.name}
        style={commandItemStyle(idx === commandState.selectedIndex)}
        onMouseDown={(e) => {
          e.preventDefault();
          setCommandState((prev) =>
            prev ? { ...prev, selectedIndex: idx } : prev
          );
          applyCommandSuggestion(pane.id);
        }}
      >
        <span style={{ fontWeight: 600 }}>{cmd.name}</span>
        <span style={{ color: '#9ca3af', marginLeft: 8, fontSize: 11 }}>
          {cmd.desc}
        </span>
      </div>
    ))}
  </div>
)}

                {/* ПИКЕР ЭМОТОВ */}
                {emotePicker && emotePicker.paneId === pane.id && (
                  <div style={emotePickerStyle}>
                    <div style={emoteTabsStyle}>
                      <button
                        style={emoteTabButtonStyle(emotePicker.tab === 'channel')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmotePicker((prev) =>
                            prev ? { ...prev, tab: 'channel' } : prev
                          );
                        }}
                      >
                        Канал
                      </button>
                      <button
                        style={emoteTabButtonStyle(emotePicker.tab === 'user')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmotePicker((prev) =>
                            prev ? { ...prev, tab: 'user' } : prev
                          );
                        }}
                      >
                        Мои
                      </button>
                      <button
                        style={emoteTabButtonStyle(emotePicker.tab === 'global')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEmotePicker((prev) =>
                            prev ? { ...prev, tab: 'global' } : prev
                          );
                        }}
                      >
                        Глобальные
                      </button>
                    </div>

                    <div style={emoteGridStyle}>
                      {(() => {
                        const chan = pane.channel.toLowerCase();
                        const channelList = channelEmotes[chan] || [];

                        let list: Emote[] = [];
                        if (emotePicker.tab === 'channel') list = channelList;
                        else if (emotePicker.tab === 'user') list = userEmotes;
                        else if (emotePicker.tab === 'global') list = globalEmotes;

                        if (!list.length) {
                          return (
                            <div style={{ fontSize: 11 * textScale, color: '#9ca3af', padding: 4 }}>
                              Нет эмотов для этой вкладки.
                            </div>
                          );
                        }

                        const sorted = [...list].sort((a, b) => {
                          const ua = emoteUsage[a.name] || 0;
                          const ub = emoteUsage[b.name] || 0;
                          if (ua !== ub) return ub - ua;
                          return a.name.localeCompare(b.name);
                        });

                        return sorted.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              insertEmoteToInput(pane.id, e.name);
                            }}
                            style={emoteButtonStyle}
                            title={e.ownerName ? `${e.name} (${e.ownerName})` : e.name}
                          >
                            <img
                              src={e.url1x}
                              alt={e.name}
                              style={{ width: 24, height: 24 }}
                            />
                          </button>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* INPUT */}
                <div style={inputContainerStyle}>
                  <input
                    type="text"
                    placeholder="Сообщение..."
                    disabled={!pane.channel}
                    value={inputValue}
                    onChange={(e) =>
                      handleInputChange(pane.id, e.target.value)
                    }
                    onKeyDown={(e) => handleInputKeyDown(e, pane)}
                    style={inputStyle(textScale)}
                    ref={(el) => {
                      inputRefs.current[pane.id] = el;
                    }}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEmotePicker((prev) =>
                        prev && prev.paneId === pane.id
                          ? null
                          : { paneId: pane.id, tab: 'channel' }
                      );
                    }}
                    style={emojiButtonStyle}
                    title="Вставить эмодзи"
                  >
                    😊
                  </button>
                  <button
                    disabled={!canSend}
                    onClick={() => handleSend(pane)}
                    style={sendButtonStyle(canSend)}
                  >
                    ►
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CONTEXT MENU для сообщения */}
      {msgMenu && (
        <div
          style={contextMenuStyle(msgMenu.x, msgMenu.y)}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={contextMenuHeaderStyle}>
            {msgMenu.message.displayName || msgMenu.message.userLogin}
          </div>
          <button
            onClick={() => {
              onOpenUserProfile(msgMenu.message.userLogin);
              closeMsgMenu();
            }}
            style={menuItemStyle}
          >
            👤 Профиль
          </button>
          <button
            onClick={() => {
              onOpenUserLog(msgMenu.message.userLogin);
              closeMsgMenu();
            }}
            style={menuItemStyle}
          >
            📜 Лог сообщений
          </button>
          {msgMenu.message.msgId && (
            <button
              onClick={() => handleModerationClick('deleteMessage')}
              style={{ ...menuItemStyle, color: '#fca5a5' }}
            >
              🗑️ Удалить
            </button>
          )}
          <div style={menuDividerStyle} />
          <button
            onClick={() => handleModerationClick('timeout', 60)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 1м
          </button>
          <button
            onClick={() => handleModerationClick('timeout', 600)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 10м
          </button>
          <button
            onClick={() => handleModerationClick('timeout', 3600)}
            style={menuItemStyle}
          >
            ⏱️ Таймаут 1ч
          </button>
          <div style={menuDividerStyle} />
          <button
            onClick={() => handleModerationClick('ban')}
            style={{ ...menuItemStyle, color: '#fca5a5' }}
          >
            ⛔ Бан
          </button>
          <button
            onClick={() => handleModerationClick('unban')}
            style={{ ...menuItemStyle, color: '#86efac' }}
          >
            ✅ Разбан
          </button>
        </div>
      )}
    </section>
  );
};

export default ChatArea;

// =====================================================
// Styles
// =====================================================

const topPanelStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderBottom: '1px solid #27272f',
  background: '#111827',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexShrink: 0
};

const chatsContainerStyle = (isTwoRows: boolean): React.CSSProperties => ({
  flex: 1,
  background: '#020617',
  padding: 8,
  overflowX: isTwoRows ? 'hidden' : 'auto',
  overflowY: isTwoRows ? 'auto' : 'hidden'
});

const chatsGridStyle = (isTwoRows: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'row',
  flexWrap: isTwoRows ? 'wrap' : 'nowrap',
  alignContent: 'flex-start',
  alignItems: 'flex-start',
  gap: 8,
  minHeight: '100%'
});

const emptyStateStyle = (isDropActive: boolean): React.CSSProperties => ({
  flex: 1,
  borderRadius: 8,
  border: isDropActive
    ? '1px dashed #4ade80'
    : '1px dashed #374151',
  background: '#020617',
  color: '#6b7280',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 200
});

const chatPaneStyle = (
  width: number,
  height: number,
  isDragging: boolean,
  isSelected: boolean
): React.CSSProperties => ({
  position: 'relative',
  flex: `0 0 ${width}px`,
  width,
  maxWidth: width,
  height,
  maxHeight: height,
  display: 'flex',
  flexDirection: 'column',
  borderRadius: 8,
  border: `1px solid ${
    isDragging ? '#fbbf24' : isSelected ? '#4ade80' : '#27272f'
  }`,
  background: '#020617',
  overflow: 'hidden'
});

const paneHeaderStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'move',
  flexShrink: 0
};

const modesBarStyle: React.CSSProperties = {
  padding: '2px 4px',
  borderBottom: '1px solid #27272f',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  flexShrink: 0,
  flexWrap: 'wrap'
};

const messagesContainerStyle: React.CSSProperties = {
  flex: 1,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  gap: 4
};

const inputContainerStyle: React.CSSProperties = {
  borderTop: '1px solid #27272f',
  padding: 6,
  display: 'flex',
  gap: 6,
  flexShrink: 0
};

const inputStyle = (fontScale: number): React.CSSProperties => ({
  flex: 1,
  padding: '4px 6px',
  borderRadius: 6,
  border: '1px solid #374151',
  background: '#020617',
  color: '#e5e7eb',
  fontSize: 12 * fontScale,
  userSelect: 'text'
});

const sendButtonStyle = (canSend: boolean): React.CSSProperties => ({
  padding: '4px 10px',
  borderRadius: 6,
  border: '1px solid #4b5563',
  background: canSend ? '#4b5563' : '#1f2933',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: canSend ? 'pointer' : 'default',
  opacity: canSend ? 1 : 0.6
});

const emojiButtonStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: 6,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 12,
  cursor: 'pointer'
};

const iconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
};

const sizeButtonStyle: React.CSSProperties = {
  width: 26,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: '#1f2933',
  color: '#e5e7eb',
  fontSize: 10,
  cursor: 'pointer',
  padding: 0
};

const rowButtonStyle = (active: boolean): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: active ? '#4b5563' : '#1f2933',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
});

const dropdownMenuStyle: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 100,
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  minWidth: 80,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
};

const mentionBoxStyle = (fontScale: number): React.CSSProperties => ({
  position: 'absolute',
  bottom: 72,
  left: 6,
  right: 6,
  maxHeight: 150,
  overflowY: 'auto',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  zIndex: 2000,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  fontSize: 12 * fontScale
});

const mentionItemStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 8px',
  cursor: 'pointer',
  background: active ? '#4b5563' : 'transparent',
  color: '#e5e7eb'
});

const dropdownItemStyle = (selected: boolean): React.CSSProperties => ({
  width: '100%',
  textAlign: 'left',
  padding: '4px 8px',
  borderRadius: 4,
  border: 'none',
  background: selected ? '#4b5563' : 'transparent',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer',
  marginBottom: 2
});

function modeButtonStyle(
  active: boolean,
  activeColor = '#4ade80'
): React.CSSProperties {
  return {
    padding: '1px 4px',
    borderRadius: 4,
    border: `1px solid ${active ? activeColor : '#4b5563'}`,
    background: active
      ? activeColor === '#ef4444'
        ? '#7f1d1d'
        : '#166534'
      : '#1f2933',
    color: active
      ? activeColor === '#ef4444'
        ? '#fecaca'
        : '#bbf7d0'
      : '#e5e7eb',
    fontSize: 9,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center'
  };
}

const messageStyle = (
  isDeleted: boolean = false,
  isCleared: boolean = false,
  isMentionedSelf: boolean = false,
  fontScale: number = 1,
  isRaider: boolean = false,
  isFirstMessage: boolean = false
): React.CSSProperties => ({
  fontSize: 12 * fontScale,
  background: isDeleted
    ? '#291415'
    : isMentionedSelf
    ? '#bd8700'
    : isRaider
    ? '#1e3a5f'
    : '#111827',
  borderRadius: 4,
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'baseline',
  gap: 4,
  opacity: isDeleted ? 0.7 : isCleared ? 0.6 : 1,
  cursor: 'context-menu',
  borderLeft: isDeleted ? '3px solid #ef4444' : isRaider ? '3px solid #3b82f6' : '3px solid transparent',
  textDecoration: 'none',
  outline: isFirstMessage ? '1px solid #eab308' : 'none'
});

const usernameStyle = (
  isDeleted: boolean,
  isCleared: boolean,
  color: string | undefined,
  fontScale: number = 1
): React.CSSProperties => ({
  fontWeight: 600,
  fontSize: 12 * fontScale,
  color: isDeleted
    ? '#9ca3af'
    : isCleared
    ? '#6b7280'
    : color || '#e5e7eb',
  marginRight: 4,
  textDecoration: 'none',
  flexShrink: 0
});

const messageTextStyle = (
  isDeleted: boolean,
  isCleared: boolean,
  fontScale: number = 1
): React.CSSProperties => ({
  fontSize: 12 * fontScale,
  color: isDeleted ? '#9ca3af' : isCleared ? '#6b7280' : '#e5e7eb',
  textDecoration: isDeleted ? 'line-through' : 'none',
  wordBreak: 'break-word'
});

const deletedLabelStyle: React.CSSProperties = {
  fontSize: 10,
  color: '#ef4444',
  marginLeft: 'auto',
  flexShrink: 0,
  fontStyle: 'italic',
  fontWeight: 'bold'
};

const contextMenuStyle = (x: number, y: number): React.CSSProperties => ({
  position: 'fixed',
  top: y,
  left: x,
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  padding: 4,
  zIndex: 3000,
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

const systemMessageStyle = (fontScale: number): React.CSSProperties => ({
  textAlign: 'center',
  color: '#9ca3af',
  fontSize: 11 * fontScale,
  padding: '4px 0',
  borderTop: '1px solid #374151',
  borderBottom: '1px solid #374151',
  margin: '8px 0',
  background: '#1f2937',
  fontStyle: 'italic'
});

const emotePickerStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 72,
  left: 6,
  right: 6,
  maxHeight: 230,
  overflowY: 'auto',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  zIndex: 1900,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  padding: 4
};

const emoteTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  marginBottom: 4
};

const emoteTabButtonStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '2px 4px',
  borderRadius: 4,
  border: '1px solid #4b5563',
  background: active ? '#4b5563' : '#1f2933',
  color: '#e5e7eb',
  fontSize: 11,
  cursor: 'pointer'
});

const emoteGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 4
};

const emoteButtonStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 4,
  border: 'none',
  background: '#1f2933',
  padding: 2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};

const commandBoxStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 72,
  left: 6,
  right: 6,
  maxHeight: 150,
  overflowY: 'auto',
  background: '#111827',
  border: '1px solid #374151',
  borderRadius: 6,
  zIndex: 2100,
  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
  fontSize: 12
};

const commandItemStyle = (active: boolean): React.CSSProperties => ({
  padding: '4px 8px',
  cursor: 'pointer',
  background: active ? '#4b5563' : 'transparent',
  color: '#e5e7eb',
  display: 'flex',
  alignItems: 'center'
});

// =====================================================
// Helpers
// =====================================================

function clampWidth(w: number): number {
  return Math.min(600, Math.max(220, w));
}

function clampHeight(h: number): number {
  return Math.min(600, Math.max(180, h));
}

function clampAutoScale(value: number): number {
  const min = 0.7;
  const max = 1.5;
  if (Number.isNaN(value)) return 1;
  return Math.min(max, Math.max(min, value));
}

function formatFollowersDuration(minutes: number): string {
  if (minutes < 0 || isNaN(minutes)) return '';
  if (minutes === 0) return '0м';
  if (minutes < 60) return `${minutes}м`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}ч`;
  if (minutes < 10080) return `${Math.floor(minutes / 1440)}д`;
  if (minutes < 43200) return `${Math.floor(minutes / 10080)}н`;
  return `${Math.floor(minutes / 43200)}мес`;
}

// Построение URL для эмота по CDN-шаблону (поддерживает анимацию, если есть)
function buildEmoteUrls(id: string): { url1x: string; url2x: string; url4x: string } {
  const base = `https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark`;
  return {
    url1x: `${base}/1.0`,
    url2x: `${base}/2.0`,
    url4x: `${base}/3.0`
  };
}

function badgeTitle(setId: string, months?: string): string {
  switch (setId) {
    case 'broadcaster':
      return 'Стример';
    case 'moderator':
      return 'Модератор';
    case 'vip':
      return 'VIP';
    case 'subscriber':
      return months ? `Подписчик (${months} мес.)` : 'Подписчик';
    case 'staff':
      return 'Twitch Staff';
    case 'admin':
      return 'Twitch Admin';
    case 'global_mod':
      return 'Global Moderator';
    default:
      return setId;
  }
}

function renderBadges(
  badges: string[],
  badgeVersions?: Record<string, string>,
  badgeInfo?: Record<string, string>,
  badgeSets?: Record<string, Record<string, any>>
) {
  if (!badges.length) return null;

  if (badgeSets && Object.keys(badgeSets).length > 0) {
    return badges.map((setId, i) => {
      const set = badgeSets[setId];
      if (!set) return null;

      const versionId = badgeVersions?.[setId] || '1';
      const verData =
        set[versionId] || Object.values(set)[0];

      if (!verData) return null;

      const url =
        verData.image_url_1x ||
        verData.image_url_2x ||
        verData.image_url_4x;
      if (!url) return null;

      const months = badgeInfo?.[setId];
      const title =
        verData.title || badgeTitle(setId, months);

      return (
        <img
          key={setId + i}
          src={url}
          alt={setId}
          title={title}
          style={{
            width: 18,
            height: 18,
            marginRight: 2,
            flexShrink: 0
          }}
        />
      );
    });
  }

  const mapping: Record<string, { label: string; color: string }> = {
    broadcaster: { label: 'S', color: '#a855f7' },
    moderator: { label: 'M', color: '#22c55e' },
    vip: { label: 'V', color: '#0ea5e9' },
    subscriber: { label: 'Sub', color: '#f97316' },
    staff: { label: 'T', color: '#f97316' },
    admin: { label: 'T', color: '#f97316' },
    global_mod: { label: 'T', color: '#f97316' }
  };

  return badges.map((setId, i) => {
    const info = mapping[setId];
    if (!info) return null;

    const months = badgeInfo?.[setId];
    const title = badgeTitle(setId, months);

    return (
      <span
        key={setId + i}
        title={title}
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
          padding: '0 2px',
          marginRight: 2,
          flexShrink: 0
        }}
      >
        {info.label}
      </span>
    );
  });
}

function renderMessageWithEmotes(
  text: string,
  emotes?: Record<string, string[]>
): React.ReactNode {
  if (!emotes || Object.keys(emotes).length === 0) return text;
  type EmoteToken = { start: number; end: number; id: string };
  const tokens: EmoteToken[] = [];
  for (const [id, ranges] of Object.entries(emotes)) {
    for (const r of ranges) {
      const [s, e] = r.split('-').map((n) => parseInt(n, 10));
      if (!Number.isNaN(s) && !Number.isNaN(e) && s <= e) {
        tokens.push({ start: s, end: e, id });
      }
    }
  }
  if (!tokens.length) return text;
  tokens.sort((a, b) => a.start - b.start);
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  tokens.forEach((t, idx) => {
    if (t.start > lastIndex) {
      result.push(
        <span key={`t-${idx}-${lastIndex}`}>
          {text.slice(lastIndex, t.start)}
        </span>
      );
    }
    const emoteCode = text.slice(t.start, t.end + 1);
    const url = `https://static-cdn.jtvnw.net/emoticons/v2/${t.id}/default/dark/1.0`;
    result.push(
      <img
        key={`e-${idx}-${t.id}`}
        src={url}
        alt={emoteCode}
        style={{
          verticalAlign: 'middle',
          margin: '0 1px',
          maxHeight: '1.2em'
        }}
      />
    );
    lastIndex = t.end + 1;
  });
  if (lastIndex < text.length) {
    result.push(
      <span key={'t-tail'}>{text.slice(lastIndex)}</span>
    );
  }
  return result;
}