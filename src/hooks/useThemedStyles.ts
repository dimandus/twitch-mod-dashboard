import { useThemeStore } from '../stores/themeStore';
import { Theme } from '../themes';

/**
 * Хук для получения стилей с учётом темы
 */
export const useThemedStyles = () => {
  const { theme } = useThemeStore();
  
  return {
    theme,
    
    // Общие стили
    container: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
      background: theme.colors.background,
      color: theme.colors.text,
      ...additionalStyles
    }),
    
    surface: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
      background: theme.colors.surface,
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      ...additionalStyles
    }),
    
    input: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
      background: theme.colors.chatBackground,
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      ...additionalStyles
    }),
    
    button: {
      primary: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
        background: theme.colors.primary,
        color: '#fff',
        border: 'none',
        ...additionalStyles
      }),
      
      secondary: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
        background: theme.colors.buttonSecondary,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        ...additionalStyles
      }),
      
      danger: (additionalStyles?: React.CSSProperties): React.CSSProperties => ({
        background: theme.colors.buttonDanger,
        color: theme.colors.error,
        border: `1px solid ${theme.colors.error}`,
        ...additionalStyles
      })
    },
    
    // Чат стили
    chat: {
      message: (deleted?: boolean, mentioned?: boolean, raid?: boolean): React.CSSProperties => ({
        background: deleted 
          ? theme.colors.chatMessageDeleted
          : mentioned
          ? theme.colors.chatMessageMention
          : raid
          ? theme.colors.chatMessageRaid
          : theme.colors.chatMessage,
        color: theme.colors.text
      }),
      
      system: (): React.CSSProperties => ({
        background: theme.colors.chatSystem,
        color: theme.colors.textSecondary
      })
    }
  };
};
