import React from 'react';
import { Virtuoso } from 'react-virtuoso';
import type { ChatPane as ChatPaneType, ChatMessage, ChatModes } from '../views/ChatArea';
import { ChatMessageItem } from './chat/ChatMessageItem';
import { EmotePicker, Emote, EmoteSource } from './chat/EmotePicker';
import { MentionAutocomplete, CommandAutocomplete } from './chat/Autocomplete';
import { TWITCH_COMMANDS } from '../constants/chatConstants';

interface ChatPaneProps {
  pane: ChatPaneType;
  modes: ChatModes;
  textScale: number;
  lineHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  isDragging: boolean;
  isSelected: boolean;
  badgeSets: Record<string, Record<string, any>>;
  inputValue: string;
  canSend: boolean;
  hoveredPaneId: string | null;
  hoverPauseKeyPressed: boolean;
  
  // Emotes
  emotePicker: { paneId: string; tab: EmoteSource } | null;
  globalEmotes: Emote[];
  userEmotes: Emote[];
  channelEmotes: Record<string, Emote[]>;
  emoteUsage: Record<string, number>;
  
  // Autocomplete
  mentionState: any;
  commandState: any;
  
  // Callbacks
  onSelectChannel: (channel: string) => void;
  onClearChat: (id: string) => void;
  onTogglePause: (id: string) => void;
  onRemoveChat: (id: string) => void;
  onInputChange: (id: string, value: string) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, pane: ChatPaneType) => void;
  onSend: (pane: ChatPaneType) => void;
  onMessageContextMenu: (e: React.MouseEvent, channel: string, message: ChatMessage) => void;
  onEmotePickerToggle: (paneId: string) => void;
  onEmotePickerTabChange: (tab: EmoteSource) => void;
  onEmoteSelect: (paneId: string, code: string) => void;
  onMentionSelect: (idx: number) => void;
  onMentionApply: (paneId: string) => void;
  onCommandSelect: (idx: number) => void;
  onCommandApply: (paneId: string) => void;
  setInputRef: (paneId: string, ref: HTMLInputElement | null) => void;
  setHoveredPaneId: (id: string | null) => void;
  
  // Drag & Drop
  onDragStart: (e: React.DragEvent, paneId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  messageSpacing?: number; // Added messageSpacing prop
  onDrop: (e: React.DragEvent, paneId: string) => void;
  onDragEnd: () => void;
  
  // Modes bar (inline for now)
  renderModesBar: () => React.ReactNode;
}

export const ChatPane: React.FC<ChatPaneProps> = ({
  pane,
  modes,
  textScale,
  lineHeight,
  scaledWidth,
  scaledHeight,
  isDragging,
  isSelected,
  badgeSets,
  inputValue,
  canSend,
  hoveredPaneId,
  hoverPauseKeyPressed,
  emotePicker,
  globalEmotes,
  userEmotes,
  channelEmotes,
  emoteUsage,
  mentionState,
  commandState,
  onSelectChannel,
  onClearChat,
  onTogglePause,
  onRemoveChat,
  onInputChange,
  onInputKeyDown,
  onSend,
  onMessageContextMenu,
  onEmotePickerToggle,
  onEmotePickerTabChange,
  onEmoteSelect,
  onMentionSelect,
  onMentionApply,
  onCommandSelect,
  onCommandApply,
  setInputRef,
  setHoveredPaneId,
  messageSpacing = 4, // Default value for messageSpacing
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  renderModesBar
}) => {
  return (
    <div
      onClick={() => onSelectChannel(pane.channel)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, pane.id)}
      onMouseEnter={() => setHoveredPaneId(pane.id)}
      onMouseLeave={() => setHoveredPaneId(null)}
      style={{
        position: 'relative',
        flex: `0 0 ${scaledWidth}px`,
        width: scaledWidth,
        maxWidth: scaledWidth,
        height: scaledHeight,
        maxHeight: scaledHeight,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 8,
        border: `1px solid ${
          isDragging ? '#fbbf24' : isSelected ? '#4ade80' : 'var(--color-border)'
        }`,
        background: 'var(--color-chatBackground)',
        overflow: 'hidden'
      }}
    >
      {/* HEADER */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, pane.id)}
        onDragEnd={onDragEnd}
        style={{
          padding: '4px 8px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'move',
          flexShrink: 0
        }}
      >
        <div>
          <div style={{ fontSize: 12 * textScale, color: 'var(--color-textSecondary)', textTransform: 'uppercase' }}>
            Канал
          </div>
          <div style={{ fontSize: 14 * textScale, fontWeight: 500 }}>{pane.channel}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearChat(pane.id);
            }}
            title="Очистить локально"
            style={iconButtonStyle}
          >
            ⌫
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTogglePause(pane.id);
            }}
            title={pane.paused ? 'Продолжить' : 'Пауза'}
            style={iconButtonStyle}
          >
            {pane.paused ? '▶' : '⏸'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveChat(pane.id);
            }}
            title="Закрыть"
            style={iconButtonStyle}
          >
            ✕
          </button>
        </div>
      </div>

      {/* MODES BAR */}
      {renderModesBar()}

      {/* MESSAGES */}
      <Virtuoso
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
        data={pane.messages}
        followOutput={pane.paused || (hoverPauseKeyPressed && hoveredPaneId === pane.id) ? false : 'auto'}
        atBottomThreshold={80}
        itemContent={(index, m) => (
          <div style={{ padding: '4px 18px 4px 8px' }}>
            <ChatMessageItem
              message={m}
              textScale={textScale}
              lineHeight={lineHeight}
              badgeSets={badgeSets}
              onContextMenu={(e) => onMessageContextMenu(e, pane.channel, m)}
            />
          </div>
        )}
      />

      {/* AUTOCOMPLETE */}
      {mentionState && mentionState.paneId === pane.id && (
        <MentionAutocomplete
          suggestions={mentionState.suggestions}
          selectedIndex={mentionState.selectedIndex}
          onSelect={onMentionSelect}
          onApply={() => onMentionApply(pane.id)}
          textScale={textScale}
        />
      )}

      {commandState && commandState.paneId === pane.id && (
        <CommandAutocomplete
          suggestions={commandState.suggestions}
          selectedIndex={commandState.selectedIndex}
          onSelect={onCommandSelect}
          onApply={() => onCommandApply(pane.id)}
          textScale={textScale}
        />
      )}

      {/* EMOTE PICKER */}
      {emotePicker && emotePicker.paneId === pane.id && (
        <EmotePicker
          paneId={pane.id}
          tab={emotePicker.tab}
          onTabChange={onEmotePickerTabChange}
          globalEmotes={globalEmotes}
          userEmotes={userEmotes}
          channelEmotes={channelEmotes[pane.channel.toLowerCase()] || []}
          emoteUsage={emoteUsage}
          onEmoteSelect={(code) => onEmoteSelect(pane.id, code)}
          textScale={textScale}
        />
      )}

      {/* INPUT */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: 6,
        display: 'flex',
        gap: 6,
        flexShrink: 0
      }}>
        <input
          type="text"
          placeholder="Сообщение..."
          disabled={!pane.channel}
          value={inputValue}
          onChange={(e) => onInputChange(pane.id, e.target.value)}
          onKeyDown={(e) => onInputKeyDown(e, pane)}
          style={{
            flex: 1,
            padding: '4px 6px',
            borderRadius: 6,
            border: '1px solid #374151',
            background: 'var(--color-chatBackground)',
            color: 'var(--color-text)',
            fontSize: 12 * textScale,
            userSelect: 'text'
          }}
          ref={(el) => setInputRef(pane.id, el)}
        />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEmotePickerToggle(pane.id);
          }}
          style={{
            padding: '4px 8px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: 'var(--color-modInactive)',
            color: 'var(--color-text)',
            fontSize: 12,
            cursor: 'pointer'
          }}
          title="Вставить эмодзи"
        >
          😊
        </button>
        <button
          disabled={!canSend}
          onClick={() => onSend(pane)}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--color-border)',
            background: canSend ? 'var(--color-border)' : 'var(--color-modInactive)',
            color: 'var(--color-text)',
            fontSize: 12,
            cursor: canSend ? 'pointer' : 'default',
            opacity: canSend ? 1 : 0.6
          }}
        >
          ►
        </button>
      </div>
    </div>
  );
};

const iconButtonStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  border: '1px solid var(--color-border)',
  background: 'var(--color-modInactive)',
  color: 'var(--color-text)',
  fontSize: 11,
  cursor: 'pointer',
  padding: 0
};
