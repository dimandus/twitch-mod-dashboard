import { useState, useEffect, useCallback } from 'react';

const DEFAULT_FONT_MIN = 0.7;
const DEFAULT_FONT_MAX = 1.5;
const DEFAULT_GLOBAL_MIN = 0.7;
const DEFAULT_GLOBAL_MAX = 1.5;

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

export const useUIScale = () => {
  const [fontScale, setFontScale] = useState(1);
  const [globalScale, setGlobalScale] = useState(1);

  const [fontScaleMin, setFontScaleMin] = useState(DEFAULT_FONT_MIN);
  const [fontScaleMax, setFontScaleMax] = useState(DEFAULT_FONT_MAX);
  const [globalScaleMin, setGlobalScaleMin] = useState(DEFAULT_GLOBAL_MIN);
  const [globalScaleMax, setGlobalScaleMax] = useState(DEFAULT_GLOBAL_MAX);

  // Загрузка настроек при старте
  useEffect(() => {
    (async () => {
      try {
        const [
          storedFont,
          storedGlobal,
          fsMinStored,
          fsMaxStored,
          gsMinStored,
          gsMaxStored
        ] = await Promise.all([
          window.electronAPI.config.get('ui.chat.fontScale'),
          window.electronAPI.config.get('ui.chat.globalScale'),
          window.electronAPI.config.get('ui.chat.fontScaleMin'),
          window.electronAPI.config.get('ui.chat.fontScaleMax'),
          window.electronAPI.config.get('ui.chat.globalScaleMin'),
          window.electronAPI.config.get('ui.chat.globalScaleMax')
        ]);

        const fsMin = typeof fsMinStored === 'number' ? fsMinStored : DEFAULT_FONT_MIN;
        const fsMax = typeof fsMaxStored === 'number' ? fsMaxStored : DEFAULT_FONT_MAX;
        const gsMin = typeof gsMinStored === 'number' ? gsMinStored : DEFAULT_GLOBAL_MIN;
        const gsMax = typeof gsMaxStored === 'number' ? gsMaxStored : DEFAULT_GLOBAL_MAX;

        setFontScaleMin(fsMin);
        setFontScaleMax(fsMax);
        setGlobalScaleMin(gsMin);
        setGlobalScaleMax(gsMax);

        if (typeof storedFont === 'number') {
          setFontScale(clamp(storedFont, fsMin, fsMax));
        }
        if (typeof storedGlobal === 'number') {
          setGlobalScale(clamp(storedGlobal, gsMin, gsMax));
        }
      } catch (err) {
        console.warn('[useUIScale] не удалось загрузить UI-настройки', err);
      }
    })();
  }, []);

  // Сохранение при изменении
  useEffect(() => {
    (async () => {
      try {
        await window.electronAPI.config.set('ui.chat.fontScale', fontScale);
        await window.electronAPI.config.set('ui.chat.globalScale', globalScale);
      } catch (err) {
        console.warn('[useUIScale] не удалось сохранить UI-scale', err);
      }
    })();
  }, [fontScale, globalScale]);

  const handleFontScaleChange = useCallback((next: number) => {
    setFontScale(clamp(next, fontScaleMin, fontScaleMax));
  }, [fontScaleMin, fontScaleMax]);

  const handleGlobalScaleChange = useCallback((next: number) => {
    setGlobalScale(clamp(next, globalScaleMin, globalScaleMax));
  }, [globalScaleMin, globalScaleMax]);

  return {
    fontScale,
    globalScale,
    handleFontScaleChange,
    handleGlobalScaleChange
  };
};
