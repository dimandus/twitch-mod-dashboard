import React, { useState } from 'react';
import { useAutoModerationStore } from '../../stores/autoModerationStore';

export const AutoModTab: React.FC = () => {
  const { enabled, triggers, setEnabled, addTrigger, removeTrigger, toggleTrigger } =
    useAutoModerationStore();

  const [newTriggerType, setNewTriggerType] = useState<'word' | 'regex'>('word');
  const [newTriggerValue, setNewTriggerValue] = useState('');

  const handleAddTrigger = () => {
    const value = newTriggerValue.trim();
    if (!value) return;

    addTrigger({
      type: newTriggerType,
      value,
      enabled: true
    });

    setNewTriggerValue('');
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Автомодерация</h3>
      <p style={{ fontSize: 13, color: 'var(--color-textSecondary)', marginBottom: 16 }}>
        Подсвечивает сообщения желтым фоном, если они содержат указанные слова или соответствуют
        регулярным выражениям.
      </p>

      {/* Включение/выключение */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 14 }}>Включить автомодерацию</span>
        </label>
      </div>

      {/* Добавление триггера */}
      <div style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 8 }}>Добавить триггер</h4>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <select
            value={newTriggerType}
            onChange={(e) => setNewTriggerType(e.target.value as 'word' | 'regex')}
            style={{
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13
            }}
          >
            <option value="word">Слово</option>
            <option value="regex">Регулярное выражение</option>
          </select>
          <input
            type="text"
            value={newTriggerValue}
            onChange={(e) => setNewTriggerValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTrigger()}
            placeholder={
              newTriggerType === 'word' ? 'Введите слово...' : 'Введите регулярное выражение...'
            }
            style={{
              flex: 1,
              padding: '6px 8px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
              fontSize: 13
            }}
          />
          <button
            onClick={handleAddTrigger}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: '1px solid var(--color-border)',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Добавить
          </button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--color-textSecondary)', margin: 0 }}>
          {newTriggerType === 'word'
            ? 'Слово будет искаться с учетом границ слов (например, "test" найдет "test", но не "testing")'
            : 'Регулярное выражение (например, "test.*" найдет "test", "testing", "tester" и т.д.)'}
        </p>
      </div>

      {/* Список триггеров */}
      <div>
        <h4 style={{ marginBottom: 8 }}>
          Триггеры ({triggers.length})
        </h4>
        {triggers.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-textSecondary)' }}>
            Нет добавленных триггеров
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {triggers.map((trigger) => (
              <div
                key={trigger.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  opacity: trigger.enabled ? 1 : 0.5
                }}
              >
                <input
                  type="checkbox"
                  checked={trigger.enabled}
                  onChange={() => toggleTrigger(trigger.id)}
                  style={{ cursor: 'pointer' }}
                />
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--color-textSecondary)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    background: 'var(--color-surfaceHover)',
                    fontWeight: 600
                  }}
                >
                  {trigger.type === 'word' ? 'СЛОВО' : 'REGEX'}
                </span>
                <code
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: 'var(--color-text)',
                    fontFamily: 'monospace'
                  }}
                >
                  {trigger.value}
                </code>
                <button
                  onClick={() => removeTrigger(trigger.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-error)',
                    color: '#fff',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
