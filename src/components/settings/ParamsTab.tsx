import React from 'react';

interface ParamsTabProps {
  fontScaleMin: number;
  fontScaleMax: number;
  globalScaleMin: number;
  globalScaleMax: number;
  hoverPauseKey: string;
  onFontScaleMinChange: (value: number) => void;
  onFontScaleMaxChange: (value: number) => void;
  onGlobalScaleMinChange: (value: number) => void;
  onGlobalScaleMaxChange: (value: number) => void;
  onHoverPauseKeyChange: (value: string) => void;
  onSaveUiScaleLimits: () => void;
  onSaveHoverPauseKey: () => void;
}

export const ParamsTab: React.FC<ParamsTabProps> = ({
  fontScaleMin,
  fontScaleMax,
  globalScaleMin,
  globalScaleMax,
  hoverPauseKey,
  onFontScaleMinChange,
  onFontScaleMaxChange,
  onGlobalScaleMinChange,
  onGlobalScaleMaxChange,
  onHoverPauseKeyChange,
  onSaveUiScaleLimits,
  onSaveHoverPauseKey
}) => {
  return (
    <>
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>⚙️ Интерфейс чата</h3>
        <p style={hintStyle}>
          Настрой границы масштабирования шрифтов и глобального scale для области чатов.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Минимальный множитель шрифта:</label>
              <input
                type="number"
                step={0.1}
                value={fontScaleMin}
                onChange={(e) => onFontScaleMinChange(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Максимальный множитель шрифта:</label>
              <input
                type="number"
                step={0.1}
                value={fontScaleMax}
                onChange={(e) => onFontScaleMaxChange(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Минимальный глобальный scale:</label>
              <input
                type="number"
                step={0.1}
                value={globalScaleMin}
                onChange={(e) => onGlobalScaleMinChange(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={labelStyle}>Максимальный глобальный scale:</label>
              <input
                type="number"
                step={0.1}
                value={globalScaleMax}
                onChange={(e) => onGlobalScaleMaxChange(parseFloat(e.target.value))}
                style={inputStyle}
              />
            </div>
          </div>

          <button onClick={onSaveUiScaleLimits} style={buttonPrimaryStyle}>
            💾 Сохранить границы масштабирования
          </button>
        </div>
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>⌨️ Управление скроллом</h3>
        <p style={hintStyle}>
          Выбери клавишу, при зажатии которой наведение курсора на чат будет временно останавливать автоскролл.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Клавиша для паузы скролла при наведении:</label>
            <select
              value={hoverPauseKey}
              onChange={(e) => onHoverPauseKeyChange(e.target.value)}
              style={inputStyle}
            >
              <option value="Alt">Alt</option>
              <option value="Control">Ctrl</option>
              <option value="Shift">Shift</option>
              <option value="Meta">Meta (Win/Cmd)</option>
            </select>
          </div>

          <button onClick={onSaveHoverPauseKey} style={buttonPrimaryStyle}>
            💾 Сохранить кнопку
          </button>
        </div>
      </section>
    </>
  );
};

const sectionStyle: React.CSSProperties = {
  marginBottom: 24,
  padding: 16,
  background: 'var(--color-surface)',
  borderRadius: 8,
  border: '1px solid var(--color-border)'
};

const sectionTitleStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 16,
  fontWeight: 600
};

const hintStyle: React.CSSProperties = {
  margin: '0 0 12px 0',
  fontSize: 12,
  color: '#9ca3af'
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  color: '#9ca3af',
  marginBottom: 4
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid var(--color-border)',
  background: 'var(--color-chatBackground)',
  color: 'var(--color-text)',
  fontSize: 13
};

const buttonPrimaryStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 6,
  border: 'none',
  background: 'var(--color-primary)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer'
};
