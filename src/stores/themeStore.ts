import { create } from 'zustand';
import { Theme, ThemeName, themes, defaultTheme } from '../themes';

interface ThemeStore {
  currentTheme: ThemeName;
  theme: Theme;
  setTheme: (themeName: ThemeName) => void;
  loadTheme: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  currentTheme: defaultTheme,
  theme: themes[defaultTheme],
  
  setTheme: async (themeName: ThemeName) => {
    const theme = themes[themeName];
    set({ currentTheme: themeName, theme });
    
    // Сохраняем в конфиг
    try {
      await window.electronAPI.config.set('ui.theme', themeName);
    } catch (err) {
      console.error('[ThemeStore] Ошибка сохранения темы:', err);
    }
  },
  
  loadTheme: async () => {
    try {
      const saved = await window.electronAPI.config.get('ui.theme');
      if (saved && themes[saved as ThemeName]) {
        const themeName = saved as ThemeName;
        set({ currentTheme: themeName, theme: themes[themeName] });
      }
    } catch (err) {
      console.error('[ThemeStore] Ошибка загрузки темы:', err);
    }
  }
}));
