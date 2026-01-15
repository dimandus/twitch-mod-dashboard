import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

/**
 * Хук для применения темы через CSS переменные
 * Применяется глобально к :root
 */
export const useApplyTheme = () => {
  const { theme } = useThemeStore();
  
  useEffect(() => {
    const root = document.documentElement;
    
    // Применяем все цвета темы как CSS переменные
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  }, [theme]);
};
