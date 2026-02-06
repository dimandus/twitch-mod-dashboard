import React, { useEffect, useRef } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { ChatMessageItem } from '../components/chat/ChatMessageItem';
import { ChatModesBar } from '../components/chat/ChatModesBar';
import { EmotePicker } from '../components/chat/EmotePicker';
import { MentionAutocomplete, CommandAutocomplete } from '../components/chat/Autocomplete';
import { ChatContextMenu } from '../components/chat/ChatContextMenu';
import { useChatInput } from '../hooks/useChatInput';
import { useChatAutocomplete } from '../hooks/useChatAutocomplete';
import { useChatEmotes } from '../hooks/useChatEmotes';
import { useChatAreaUI } from '../hooks/useChatAreaUI';
import { useChatDragDrop } from '../hooks/useChatDragDrop';
import { useChatModeration } from '../hooks/useChatModeration';
import type { ChatPane, ChatModeKey, ChatModes, ModerationAction } from '../types/chat';
import { defaultModes } from '../types/chat';
import * as styles from '../styles/chatArea.styles';

interface ChatAreaProps {
  selectedChannel: string | null;
  chatPanes: ChatPane[];
  onAddChat: (channel: string) => void;
  onRemoveChat: (id: string) => void;
  onClearChat: (id: string) => void;
  onTogglePause: (id: string) => void;
  onReorderChats: (next: ChatPane[]) => void;
  onSendMessage: (channel: string, text: string) => void;
  onModerationAction: (action: ModerationAction) => void;
  roomModes: Record<string, ChatModes>;
  onModeToggle: (channel: string, mode: ChatModeKey, value?: number) => void;
  onOpenUserLog: (userLogin: string) => void;
  onOpenUserProfile: (userLogin: string) => void;
  fontScale: number;
  globalScale: number;
  onFontScaleChange: (next: number) => void;
  onGlobalScaleChange: (next: number) => void;
  onSelectChannel: (channel: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  selectedChannel,
  chatPanes,
  onAddChat,
  onRemoveChat,
  onClearChat,
  onTogglePause,
  onReorderChats,
  onSendMessage,
  onModerationAction,
  roomModes,
  onModeToggle,
  onOpenUserLog,
  onOpenUserProfile,
  fontScale,
  globalScale,
  onFontScaleChange,
  onGlobalScaleChange,
  onSelectChannel
}) => {
  const chatInput = useChatInput();
  const chatAutocomplete = useChatAutocomplete(chatPanes);
  const chatEmotes = useChatEmotes(chatPanes);
  const ui = useChatAreaUI();
  const dragDrop = useChatDragDrop(chatPanes, onAddChat, onReorderChats);
  const moderation = useChatModeration(onModerationAction, ui.msgMenu, ui.setMsgMenu);

  const scrollContainersRef = useRef<Record<string, HTMLDivElement | null>>({});

  const handleInputChange = (id: string, value: string) => {
    chatInput.handleInputChange(id, value);
    chatAutocomplete.updateMentionSuggestions(id, value);
    chatAutocomplete.updateCommandSuggestions(id, value);
  };

  const handleSend = (pane: ChatPane) => {
    const text = chatInput.getInputValue(pane.id).trim();
    if (!pane.channel || !text) return;
    onSendMessage(pane.channel, text);
    chatInput.clearInput(pane.id);
    chatAutocomplete.clearMentionState();
    chatEmotes.setEmotePicker((prev) => (prev && prev.paneId === pane.id ? null : prev));
  };

  const applyMentionSuggestion = (paneId: string) => {
    const inputValue = chatInput.getInputValue(paneId);
    chatAutocomplete.applyMentionSuggestion(paneId, inputValue, (newValue) => {
      chatInput.handleInputChange(paneId, newValue);
    });
  };

  const applyCommandSuggestion = (paneId: string) => {
    chatAutocomplete.applyCommandSuggestion(paneId, (newValue) => {
      chatInput.handleInputChange(paneId, newValue);
    });
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, pane: ChatPane) => {
    const { mentionState, commandState } = chatAutocomplete;
    
    if (mentionState && mentionState.paneId === pane.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        chatAutocomplete.moveMentionSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        chatAutocomplete.moveMentionSelection('up');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyMentionSuggestion(pane.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        chatAutocomplete.clearMentionState();
        return;
      }
    }

    if (commandState && commandState.paneId === pane.id) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        chatAutocomplete.moveCommandSelection('down');
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        chatAutocomplete.moveCommandSelection('up');
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applyCommandSuggestion(pane.id);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        chatAutocomplete.clearCommandState();
        return;
      }
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend(pane);
    }
  };

  const insertEmoteToInput = (paneId: string, code: string) => {
    chatEmotes.incrementEmoteUsage(code);
    chatInput.insertTextAtCursor(paneId, code);
  };

  const handleDropdownClick = (e: React.MouseEvent, channel: string, type: 'slow' | 'followers') => {
    e.stopPropagation();
    ui.setOpenDropdown((prev) => prev?.channel === channel && prev?.type === type ? null : { channel, type });
  };
  
  const handleSlowModeSelect = (channel: string, seconds: number) => {
    onModeToggle(channel, 'slow', seconds);
    ui.setOpenDropdown(null);
  };
  
  const handleFollowersModeSelect = (channel: string, minutes: number) => {
    onModeToggle(channel, 'followers', minutes);
    ui.setOpenDropdown(null);
  };

  useEffect(() => {
    const handlePauseKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!ui.hoverPauseKey || e.key !== ui.hoverPauseKey) return;

      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if (!selectedChannel) return;
      const active = chatPanes.find(
        (pane) => pane.channel.toLowerCase() === selectedChannel.toLowerCase()
      );
      if (!active) return;

      onTogglePause(active.id);
    };

    window.addEventListener('keydown', handlePauseKey);
    return () => window.removeEventListener('keydown', handlePauseKey);
  }, [ui.hoverPauseKey, selectedChannel, chatPanes, onTogglePause]);

  const isTwoRows = ui.rows === 2;
  const combinedScale = globalScale * ui.autoScale;
  const textScale = fontScale * combinedScale;
  const scaledPaneWidth = ui.paneWidth * combinedScale;
  const scaledPaneHeight = ui.paneHeight * combinedScale;

  return (
    <section
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--color-border)',
        width: '100%',
        overflowX: 'hidden'
      }}
      onDragOver={dragDrop.handleContainerDragOver}
      onDrop={dragDrop.handleContainerDrop}
      onDragLeave={dragDrop.handleContainerDragLeave}
      onClick={() => {
        moderation.closeMsgMenu();
        ui.setOpenDropdown(null);
      }}
    >
      <div style={styles.topPanelStyle}>
        <div>
          <div style={{ fontSize: 13 * textScale, color: 'var(--color-textSecondary)' }}>Область чатов</div>
          <div style={{ fontSize: 11 * textScale, color: 'var(--color-textMuted)' }}>
            ПКМ по каналу или перетащи сюда
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {selectedChannel && (
            <div style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>
              Канал: <strong style={{ color: 'var(--color-text)' }}>{selectedChannel}</strong>
            </div>
          )}

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Строки:</span>
            <button onClick={() => ui.setRows(1)} style={styles.rowButtonStyle(ui.rows === 1)}>1</button>
            <button onClick={() => ui.setRows(2)} style={styles.rowButtonStyle(ui.rows === 2)}>2</button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Размер:</span>
            <button onClick={() => ui.changePaneWidth(-20)} style={styles.sizeButtonStyle}>W-</button>
            <button onClick={() => ui.changePaneWidth(20)} style={styles.sizeButtonStyle}>W+</button>
            <button onClick={() => ui.changePaneHeight(-20)} style={styles.sizeButtonStyle}>H-</button>
            <button onClick={() => ui.changePaneHeight(20)} style={styles.sizeButtonStyle}>H+</button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Шрифт:</span>
            <button onClick={() => onFontScaleChange(fontScale - 0.1)} style={styles.sizeButtonStyle}>A-</button>
            <button onClick={() => onFontScaleChange(fontScale + 0.1)} style={styles.sizeButtonStyle}>A+</button>
          </div>

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: 11 * textScale, color: 'var(--color-textSecondary)' }}>Scale:</span>
            <button onClick={() => onGlobalScaleChange(globalScale - 0.1)} style={styles.sizeButtonStyle}>S-</button>
            <button onClick={() => onGlobalScaleChange(globalScale + 0.1)} style={styles.sizeButtonStyle}>S+</button>
          </div>
        </div>
      </div>

      <div style={styles.chatsContainerStyle(isTwoRows)}>
        <div style={styles.chatsGridStyle(isTwoRows)}>
          {chatPanes.length === 0 && (
            <div style={styles.emptyStateStyle(dragDrop.isDropActive)}>
              {dragDrop.isDropActive ? 'Отпусти здесь' : 'Нет открытых чатов.'}
            </div>
          )}

          {chatPanes.map((pane) => {
            const inputValue = chatInput.getInputValue(pane.id);
            const canSend = !!pane.channel && inputValue.trim().length > 0;
            const isSelected = selectedChannel?.toLowerCase() === pane.channel.toLowerCase();
            const modes = roomModes[pane.channel.toLowerCase()] || defaultModes;

            return (
              <div
                key={pane.id}
                onClick={() => onSelectChannel(pane.channel)}
                onDragOver={dragDrop.handlePaneDragOver}
                onDrop={(e) => dragDrop.handlePaneDrop(e, pane.id)}
                onMouseEnter={() => ui.setHoveredPaneId(pane.id)}
                onMouseLeave={() => ui.setHoveredPaneId(null)}
                style={styles.chatPaneStyle(scaledPaneWidth, scaledPaneHeight, dragDrop.draggingId === pane.id, isSelected)}
              >
                <div
                  draggable
                  onDragStart={(e) => dragDrop.handlePaneDragStart(e, pane.id)}
                  onDragEnd={dragDrop.handlePaneDragEnd}
                  style={styles.paneHeaderStyle}
                >
                  <div>
                    <div style={{ fontSize: 12 * textScale, color: 'var(--color-textSecondary)', textTransform: 'uppercase' }}>
                      Канал
                    </div>
                    <div style={{ fontSize: 14 * textScale, fontWeight: 500 }}>{pane.channel}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={(e) => { e.stopPropagation(); onClearChat(pane.id); }} title="Очистить локально" style={styles.iconButtonStyle}>⌫</button>
                    <button onClick={(e) => { e.stopPropagation(); onTogglePause(pane.id); }} title={pane.paused ? 'Продолжить' : 'Пауза'} style={styles.iconButtonStyle}>{pane.paused ? '▶' : '⏸'}</button>
                    {pane.paused && (
                      <span style={{
                        alignSelf: 'center',
                        fontSize: 10 * textScale,
                        color: '#f59e0b',
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid rgba(245, 158, 11, 0.5)',
                        borderRadius: 4,
                        padding: '1px 4px',
                        fontWeight: 600
                      }}>
                        Пауза
                      </span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); onRemoveChat(pane.id); }} title="Закрыть" style={styles.iconButtonStyle}>✕</button>
                  </div>
                </div>

                <ChatModesBar
                  channel={pane.channel}
                  modes={modes}
                  textScale={textScale}
                  onModeToggle={onModeToggle}
                  onClearChat={() => moderation.handleClearGlobal(pane)}
                  openDropdown={ui.openDropdown}
                  onDropdownClick={handleDropdownClick}
                  onSlowModeSelect={handleSlowModeSelect}
                  onFollowersModeSelect={handleFollowersModeSelect}
                />

                <Virtuoso
                  ref={(el) => { if (el) scrollContainersRef.current[pane.id] = el as any; }}
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'hidden'
                  }}
                  data={pane.messages}
                  followOutput={pane.paused || (ui.hoverPauseKeyPressed && ui.hoveredPaneId === pane.id) ? false : 'auto'}
                  atBottomThreshold={80}
                  itemContent={(index, m) => (
                    <div style={{ padding: '4px 18px 4px 8px' }}>
                      <ChatMessageItem
                        message={m}
                        textScale={textScale}
                        badgeSets={ui.badgeSets}
                        onContextMenu={(e) => moderation.handleMessageContextMenu(e, pane.channel, m)}
                      />
                    </div>
                  )}
                />

                {chatAutocomplete.mentionState && chatAutocomplete.mentionState.paneId === pane.id && (
                  <MentionAutocomplete
                    suggestions={chatAutocomplete.mentionState.suggestions}
                    selectedIndex={chatAutocomplete.mentionState.selectedIndex}
                    onSelect={(idx) => chatAutocomplete.moveMentionSelection(idx === chatAutocomplete.mentionState!.selectedIndex + 1 ? 'down' : 'up')}
                    onApply={() => applyMentionSuggestion(pane.id)}
                    textScale={textScale}
                  />
                )}

                {chatAutocomplete.commandState && chatAutocomplete.commandState.paneId === pane.id && (
                  <CommandAutocomplete
                    suggestions={chatAutocomplete.commandState.suggestions}
                    selectedIndex={chatAutocomplete.commandState.selectedIndex}
                    onSelect={(idx) => chatAutocomplete.moveCommandSelection(idx === chatAutocomplete.commandState!.selectedIndex + 1 ? 'down' : 'up')}
                    onApply={() => applyCommandSuggestion(pane.id)}
                    textScale={textScale}
                  />
                )}

                {chatEmotes.emotePicker && chatEmotes.emotePicker.paneId === pane.id && (
                  <EmotePicker
                    paneId={pane.id}
                    tab={chatEmotes.emotePicker.tab}
                    onTabChange={(tab) => chatEmotes.setEmotePicker(prev => prev ? {...prev, tab} : null)}
                    globalEmotes={chatEmotes.globalEmotes}
                    userEmotes={chatEmotes.userEmotes}
                    channelEmotes={chatEmotes.channelEmotes[pane.channel.toLowerCase()] || []}
                    emoteUsage={chatEmotes.emoteUsage}
                    onEmoteSelect={(code) => insertEmoteToInput(pane.id, code)}
                    textScale={textScale}
                  />
                )}

                <div style={styles.inputContainerStyle}>
                  <input
                    type="text"
                    placeholder="Сообщение..."
                    disabled={!pane.channel}
                    value={inputValue}
                    onChange={(e) => handleInputChange(pane.id, e.target.value)}
                    onKeyDown={(e) => handleInputKeyDown(e, pane)}
                    style={styles.inputStyle(textScale)}
                    ref={(el) => chatInput.setInputRef(pane.id, el)}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      chatEmotes.setEmotePicker((prev) => prev && prev.paneId === pane.id ? null : { paneId: pane.id, tab: 'channel' });
                    }}
                    style={styles.emojiButtonStyle}
                    title="Вставить эмодзи"
                  >
                    😊
                  </button>
                  <button disabled={!canSend} onClick={() => handleSend(pane)} style={styles.sendButtonStyle(canSend)}>►</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {ui.msgMenu && (
        <ChatContextMenu
          x={ui.msgMenu.x}
          y={ui.msgMenu.y}
          message={ui.msgMenu.message}
          onClose={moderation.closeMsgMenu}
          onOpenProfile={() => { onOpenUserProfile(ui.msgMenu!.message.userLogin); moderation.closeMsgMenu(); }}
          onOpenLog={() => { onOpenUserLog(ui.msgMenu!.message.userLogin); moderation.closeMsgMenu(); }}
          onDeleteMessage={() => moderation.handleModerationClick('deleteMessage')}
          onTimeout={(duration) => moderation.handleModerationClick('timeout', duration)}
          onBan={() => moderation.handleModerationClick('ban')}
          onUnban={() => moderation.handleModerationClick('unban')}
        />
      )}
    </section>
  );
};

export default ChatArea;
