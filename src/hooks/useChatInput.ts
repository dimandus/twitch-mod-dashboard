import { useState, useRef } from 'react';

export const useChatInput = () => {
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleInputChange = (paneId: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [paneId]: value }));
  };

  const clearInput = (paneId: string) => {
    setInputValues((prev) => ({ ...prev, [paneId]: '' }));
  };

  const getInputValue = (paneId: string) => inputValues[paneId] || '';

  const setInputRef = (paneId: string, ref: HTMLInputElement | null) => {
    inputRefs.current[paneId] = ref;
  };

  const getInputRef = (paneId: string) => inputRefs.current[paneId];

  const insertTextAtCursor = (paneId: string, text: string) => {
    const el = inputRefs.current[paneId];
    const current = inputValues[paneId] || '';

    if (!el) {
      const newValue = (current + ' ' + text).trimStart();
      setInputValues((prev) => ({ ...prev, [paneId]: newValue + ' ' }));
      return;
    }

    const start = el.selectionStart ?? current.length;
    const end = el.selectionEnd ?? current.length;
    const before = current.slice(0, start);
    const after = current.slice(end);
    const newValue = before + text + ' ' + after;

    setInputValues((prev) => ({ ...prev, [paneId]: newValue }));

    requestAnimationFrame(() => {
      const pos = before.length + text.length + 1;
      el.selectionStart = el.selectionEnd = pos;
      el.focus();
    });
  };

  return {
    inputValues,
    handleInputChange,
    clearInput,
    getInputValue,
    setInputRef,
    getInputRef,
    insertTextAtCursor
  };
};
