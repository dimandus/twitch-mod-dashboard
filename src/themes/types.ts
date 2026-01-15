export interface Theme {
  name: string;
  colors: {
    // Основные
    background: string;
    surface: string;
    surfaceHover: string;
    border: string;
    
    // Текст
    text: string;
    textSecondary: string;
    textMuted: string;
    
    // Акценты
    primary: string;
    primaryHover: string;
    success: string;
    warning: string;
    error: string;
    
    // Чат
    chatBackground: string;
    chatMessage: string;
    chatMessageHover: string;
    chatMessageDeleted: string;
    chatMessageMention: string;
    chatMessageRaid: string;
    chatMessageFirst: string;
    chatSystem: string;
    
    // Кнопки
    buttonPrimary: string;
    buttonSecondary: string;
    buttonDanger: string;
    
    // Модерация
    modActive: string;
    modInactive: string;
  };
}

export type ThemeName = 'dark' | 'light' | 'purple' | 'blue';
