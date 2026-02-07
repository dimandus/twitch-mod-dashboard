import { useState, useEffect, useRef } from 'react';
import { clampWidth, clampHeight, clampAutoScale, clampLineHeight, clampMessageSpacing } from '../utils/chatHelpers';
import { logger } from '../utils/logger';
import type { ChatMessage } from '../types/chat';

export const useChatAreaUI = () => {
  const [rows, setRows] = useState<1 | 2>(1);
  const [paneWidth, setPaneWidth] = useState(320);
  const [paneHeight, setPaneHeight] = useState(260);
  const [autoScale, setAutoScale] = useState(1);
  const [lineHeightScale, setLineHeightScale] = useState(1.2);
  const [messageSpacing, setMessageSpacing] = useState(4); // px, default 4
  
  const isInitialMount = useRef(true);
  
  const [hoveredPaneId, setHoveredPaneId] = useState<string | null>(null);
  const [hoverPauseKeyPressed, setHoverPauseKeyPressed] = useState(false);
  const [hoverPauseKey, setHoverPauseKey] = useState('Alt');
  
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

  // Загрузка клавиши паузы
  useEffect(() => {
    (async () => {
      try {
        const key = await window.electronAPI.config.get('ui.chat.hoverPauseKey');
        if (typeof key === 'string') setHoverPauseKey(key);
      } catch (err) {
        logger.warn('[useChatAreaUI] не удалось загрузить клавишу паузы', err);
      }
    })();
  }, []);

  // Отслеживание клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === hoverPauseKey) setHoverPauseKeyPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === hoverPauseKey) {
        setHoverPauseKeyPressed(false);
        setHoveredPaneId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [hoverPauseKey]);

  // Загрузка бейджей
  useEffect(() => {
    (async () => {
      try {
        const json = await window.electronAPI.twitch.getGlobalBadges();
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
        console.warn('[useChatAreaUI] не удалось загрузить бейджи', err);
      }
    })();
  }, []);

  // Загрузка настроек раскладки
  useEffect(() => {
    (async () => {
      try {
        const [storedRows, storedWidth, storedHeight, storedLineHeight, storedMessageSpacing] = await Promise.all([
          window.electronAPI.config.get('ui.chat.rows'),
          window.electronAPI.config.get('ui.chat.paneWidth'),
          window.electronAPI.config.get('ui.chat.paneHeight'),
          window.electronAPI.config.get('ui.chat.lineHeightScale'),
          window.electronAPI.config.get('ui.chat.messageSpacing')
        ]);
        console.log('[useChatAreaUI] Загружены настройки:', { storedRows, storedWidth, storedHeight, storedLineHeight, storedMessageSpacing });
        if (storedRows === 1 || storedRows === 2) setRows(storedRows);
        if (typeof storedWidth === 'number') setPaneWidth(clampWidth(storedWidth));
        if (typeof storedHeight === 'number') setPaneHeight(clampHeight(storedHeight));
        if (typeof storedLineHeight === 'number') setLineHeightScale(clampLineHeight(storedLineHeight));
        if (typeof storedMessageSpacing === 'number') setMessageSpacing(clampMessageSpacing(storedMessageSpacing));
        isInitialMount.current = false;
      } catch (err) {
        console.warn('[useChatAreaUI] не удалось загрузить настройки', err);
        isInitialMount.current = false;
      }
    })();
  }, []);

  // Сохранение раскладки
  useEffect(() => {
    if (isInitialMount.current) return;
    (async () => {
      try {
        await Promise.all([
          window.electronAPI.config.set('ui.chat.rows', rows),
          window.electronAPI.config.set('ui.chat.paneWidth', paneWidth),
          window.electronAPI.config.set('ui.chat.paneHeight', paneHeight),
          window.electronAPI.config.set('ui.chat.lineHeightScale', lineHeightScale),
          window.electronAPI.config.set('ui.chat.messageSpacing', messageSpacing)
        ]);
      } catch (err) {
        console.warn('[useChatAreaUI] не удалось сохранить настройки', err);
      }
    })();
  }, [rows, paneWidth, paneHeight, lineHeightScale]);

  // Закрытие меню при клике
  useEffect(() => {
    const handleClick = () => {
      setOpenDropdown(null);
      setMsgMenu(null);
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Авто-масштаб
  useEffect(() => {
    const updateAutoScale = () => {
      const wScale = window.innerWidth / 1920;
      const hScale = window.innerHeight / 1080;
      setAutoScale(clampAutoScale(Math.min(wScale, hScale)));
    };
    updateAutoScale();
    window.addEventListener('resize', updateAutoScale);
    return () => window.removeEventListener('resize', updateAutoScale);
  }, []);

  const changePaneWidth = (delta: number) => setPaneWidth((w) => clampWidth(w + delta));
  const changePaneHeight = (delta: number) => setPaneHeight((h) => clampHeight(h + delta));
  const changeLineHeightScale = (delta: number) =>
    setLineHeightScale((value) => clampLineHeight(value + delta));
  const changeMessageSpacing = (delta: number) =>
    setMessageSpacing((value) => clampMessageSpacing(value + delta));

  return {
    rows,
    setRows,
    paneWidth,
    paneHeight,
    changePaneWidth,
    changePaneHeight,
    lineHeightScale,
    setLineHeightScale: (value: number) => setLineHeightScale(clampLineHeight(value)),
    changeLineHeightScale,
    messageSpacing,
    setMessageSpacing: (value: number) => setMessageSpacing(clampMessageSpacing(value)),
    changeMessageSpacing,
    autoScale,
    hoveredPaneId,
    setHoveredPaneId,
    hoverPauseKeyPressed,
    hoverPauseKey,
    msgMenu,
    setMsgMenu,
    openDropdown,
    setOpenDropdown,
    badgeSets
  };
};
