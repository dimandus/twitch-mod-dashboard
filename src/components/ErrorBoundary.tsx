import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Поймана ошибка:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle}>
          <div style={cardStyle}>
            <h1 style={titleStyle}>⚠️ Что-то пошло не так</h1>
            <p style={messageStyle}>
              Приложение столкнулось с неожиданной ошибкой.
            </p>
            {this.state.error && (
              <pre style={errorStyle}>{this.state.error.message}</pre>
            )}
            <button onClick={this.handleReload} style={buttonStyle}>
              Перезагрузить приложение
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const containerStyle: React.CSSProperties = {
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#18181b',
  color: '#fff'
};

const cardStyle: React.CSSProperties = {
  background: '#27272f',
  padding: '32px',
  borderRadius: '8px',
  maxWidth: '500px',
  textAlign: 'center'
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  margin: '0 0 16px 0'
};

const messageStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#adadb8',
  marginBottom: '16px'
};

const errorStyle: React.CSSProperties = {
  background: '#18181b',
  padding: '12px',
  borderRadius: '4px',
  fontSize: '12px',
  textAlign: 'left',
  overflow: 'auto',
  marginBottom: '16px',
  color: '#ff6b6b'
};

const buttonStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: '#9147ff',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 'bold'
};
