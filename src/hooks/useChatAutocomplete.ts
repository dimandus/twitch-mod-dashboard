import { useState } from 'react';
import { TWITCH_COMMANDS } from '../constants/chatConstants';
import type { ChatPane } from '../views/ChatArea';

interface MentionState {
  paneId: string;
  query: string;
  suggestions: string[];
  selectedIndex: number;
  atIndex: number;
}

interface CommandState {
  paneId: string;
  query: string;
  suggestions: typeof TWITCH_COMMANDS;
  selectedIndex: number;
  slashIndex: number;
}

export const useChatAutocomplete = (chatPanes: ChatPane[]) => {
  const [mentionState, setMentionState] = useState<MentionState | null>(null);
  const [commandState, setCommandState] = useState<CommandState | null>(null);

  const updateMentionSuggestions = (paneId: string, value: string) => {
    const atIndex = value.lastIndexOf('@');
    if (atIndex === -1) {
      setMentionState(null);
      return;
    }

    if (atIndex > 0 && !/\s/.test(value[atIndex - 1])) {
      setMentionState(null);
      return;
    }

    const after = value.slice(atIndex + 1);
    if (after.includes(' ')) {
      setMentionState(null);
      return;
    }

    const query = after.toLowerCase();
    const pane = chatPanes.find((p) => p.id === paneId);
    if (!pane) {
      setMentionState(null);
      return;
    }

    const namesSet = new Set<string>();
    pane.messages.forEach((m) => {
      if (!m.userLogin) return;
      const name = m.displayName || m.userLogin;
      namesSet.add(name);
    });

    const suggestions = Array.from(namesSet)
      .filter((name) => name.toLowerCase().startsWith(query))
      .sort();

    if (suggestions.length === 0) {
      setMentionState(null);
      return;
    }

    setMentionState({ paneId, query, suggestions, selectedIndex: 0, atIndex });
  };

  const updateCommandSuggestions = (paneId: string, value: string) => {
    const slashIndex = value.indexOf('/');
    if (slashIndex !== 0) {
      setCommandState(null);
      return;
    }

    const firstSpace = value.indexOf(' ');
    if (firstSpace > 0) {
      setCommandState(null);
      return;
    }

    const query = value.slice(1).toLowerCase();
    const suggestions = TWITCH_COMMANDS.filter((cmd) =>
      cmd.name.slice(1).startsWith(query)
    );

    if (suggestions.length === 0) {
      setCommandState(null);
      return;
    }

    setCommandState({ paneId, query, suggestions, selectedIndex: 0, slashIndex });
  };

  const applyMentionSuggestion = (
    paneId: string,
    inputValue: string,
    onApply: (value: string) => void
  ) => {
    if (!mentionState || mentionState.paneId !== paneId) return;

    const { atIndex, suggestions, selectedIndex } = mentionState;
    const name = suggestions[selectedIndex];
    const before = inputValue.slice(0, atIndex);
    const newValue = before + '@' + name + ' ';

    onApply(newValue);
    setMentionState(null);
  };

  const applyCommandSuggestion = (
    paneId: string,
    onApply: (value: string) => void
  ) => {
    if (!commandState || commandState.paneId !== paneId) return;

    const { suggestions, selectedIndex } = commandState;
    const cmd = suggestions[selectedIndex].name;
    onApply(cmd + ' ');
    setCommandState(null);
  };

  const moveMentionSelection = (direction: 'up' | 'down') => {
    setMentionState((prev) => {
      if (!prev) return null;
      const delta = direction === 'down' ? 1 : -1;
      const newIndex =
        (prev.selectedIndex + delta + prev.suggestions.length) %
        prev.suggestions.length;
      return { ...prev, selectedIndex: newIndex };
    });
  };

  const moveCommandSelection = (direction: 'up' | 'down') => {
    setCommandState((prev) => {
      if (!prev) return null;
      const delta = direction === 'down' ? 1 : -1;
      const newIndex =
        (prev.selectedIndex + delta + prev.suggestions.length) %
        prev.suggestions.length;
      return { ...prev, selectedIndex: newIndex };
    });
  };

  return {
    mentionState,
    commandState,
    updateMentionSuggestions,
    updateCommandSuggestions,
    applyMentionSuggestion,
    applyCommandSuggestion,
    moveMentionSelection,
    moveCommandSelection,
    clearMentionState: () => setMentionState(null),
    clearCommandState: () => setCommandState(null)
  };
};
