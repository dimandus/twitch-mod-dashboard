import React, { useState } from 'react';
import { useAutoModerationStore } from '../../stores/autoModerationStore';

export const AutoModTab: React.FC = () => {
  const { enabled, triggers, setEnabled, addTrigger, removeTrigger, toggleTrigger, duplicateTrigger } =
    useAutoModerationStore();

  const [newTriggerType, setNewTriggerType] = useState<'word' | 'regex'>('word');
  const [newTriggerValue, setNewTriggerValue] = useState('');

  const handleAddTrigger = () => {
    const value = newTriggerValue.trim();
    if (!value) return;

    // Валидация регулярного выражения
    if (newTriggerType === 'regex') {
      try {
        new RegExp(value);
      } catch (err) {
        alert('Невалидное регулярное выражение. Проверьте синтаксис.');
        return;
      }
    }

    addTrigger({
      type: newTriggerType,
      value,
      enabled: true
    });

    setNewTriggerValue('');
  };

  const handleExport = () => {
    const data = JSON.stringify(triggers, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automod-triggers-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          if (Array.isArray(data)) {
            data.forEach((trigger) => {
              if (trigger.type && trigger.value) {
                addTrigger({
                  type: trigger.type,
                  value: trigger.value,
                  enabled: trigger.enabled ?? true
                });
              }
            });
            alert(`Импортировано ${data.length} триггеров`);
          }
        } catch (err) {
          alert('Ошибка импорта. Проверьте формат файла.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div>
      <h3 style={{ marginTop: 0 }}>Автомодерация</h3>
      <p style={{ fontSize: 13, color: 'var(--color-textSecondary)', marginBottom: 16 }}>
        Подсвечивает сообщения желтой рамкой и значком ⚠️, если они содержат указанные слова или соответствуют
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>
            Триггеры ({triggers.filter(t => t.enabled).length} / {triggers.length})
          </h4>
          {triggers.length > 0 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleExport}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                ↓ Экспорт
              </button>
              <button
                onClick={handleImport}
                style={{
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-text)',
                  fontSize: 11,
                  cursor: 'pointer'
                }}
              >
                ↑ Импорт
              </button>
            </div>
          )}
        </div>
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
                  onClick={() => duplicateTrigger(trigger.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 4,
                    border: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text)',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                  title="Дублировать"
                >
                  ⎘
                </button>
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
