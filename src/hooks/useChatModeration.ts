import type { ChatMessage, ModerationAction, ChatPane } from '../types/chat';

export const useChatModeration = (
  onModerationAction: (action: ModerationAction) => void,
  msgMenu: { x: number; y: number; channel: string; message: ChatMessage } | null,
  setMsgMenu: (menu: { x: number; y: number; channel: string; message: ChatMessage } | null) => void
) => {
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

    if (x + MENU_WIDTH > innerWidth) x = innerWidth - MENU_WIDTH - 8;
    if (y + MENU_HEIGHT > innerHeight) y = innerHeight - MENU_HEIGHT - 8;
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
          onModerationAction({ type: 'deleteMessage', channel, login, msgId: message.msgId });
          break;
        case 'ban':
          onModerationAction({ type: 'ban', channel, login });
          break;
        case 'unban':
          onModerationAction({ type: 'unban', channel, login });
          break;
        case 'timeout':
          onModerationAction({ type: 'timeout', channel, login, durationSeconds: duration ?? 600 });
          break;
      }
    } catch (e) {
      console.error(e);
    }
    closeMsgMenu();
  };

  const handleClearGlobal = (pane: ChatPane) =>
    onModerationAction({ type: 'clearChat', channel: pane.channel });

  return {
    handleMessageContextMenu,
    closeMsgMenu,
    handleModerationClick,
    handleClearGlobal
  };
};
