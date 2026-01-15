export interface ChannelStatus {
  login: string;
  isLive: boolean;
  title: string | null;
  viewerCount: number | null;
  modCount: number | null;
}

export interface Toast {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'error';
}

export type ChannelFilter = 'all' | 'mod';

export interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
}

export interface ChannelContextMenu extends ContextMenu {
  channelLogin: string | null;
}

export interface ViewerContextMenu extends ContextMenu {
  viewer: import('../utils/viewersHelpers').ViewerEntry | null;
}
