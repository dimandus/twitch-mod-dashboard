import { useState } from 'react';
import type { ChatPane } from '../types/chat';

export const useChatDragDrop = (
  chatPanes: ChatPane[],
  onAddChat: (channel: string) => void,
  onReorderChats: (next: ChatPane[]) => void
) => {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isDropActive, setIsDropActive] = useState(false);

  const handleContainerDragOver: React.DragEventHandler<HTMLDivElement> = (e) => {
    if (!Array.from(e.dataTransfer.types).includes('text/channel-login')) return;
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

  const handlePaneDragStart = (e: React.DragEvent<HTMLDivElement>, paneId: string) => {
    setDraggingId(paneId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handlePaneDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handlePaneDrop = (e: React.DragEvent<HTMLDivElement>, targetId: string) => {
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

  return {
    draggingId,
    isDropActive,
    handleContainerDragOver,
    handleContainerDragLeave,
    handleContainerDrop,
    handlePaneDragStart,
    handlePaneDragOver,
    handlePaneDrop,
    handlePaneDragEnd
  };
};
