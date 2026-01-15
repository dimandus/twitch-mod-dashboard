import { Theme, ThemeName } from './types';
import { darkTheme } from './dark';
import { lightTheme } from './light';
import { purpleTheme } from './purple';
import { blueTheme } from './blue';

export const themes: Record<ThemeName, Theme> = {
  dark: darkTheme,
  light: lightTheme,
  purple: purpleTheme,
  blue: blueTheme
};

export const defaultTheme: ThemeName = 'dark';

export * from './types';
export { darkTheme, lightTheme, purpleTheme, blueTheme };
