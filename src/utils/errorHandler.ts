export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: ErrorSeverity = 'error',
    public context?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function handleError(error: unknown, context: string): AppError {
  let appError: AppError;

  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof Error) {
    appError = new AppError(error.message, 'UNKNOWN_ERROR', 'error', context);
  } else {
    appError = new AppError(String(error), 'UNKNOWN_ERROR', 'error', context);
  }

  console.error(`[${context}]`, appError);

  if (typeof window !== 'undefined' && window.electronAPI?.showNotification) {
    window.electronAPI.showNotification({
      type: appError.severity,
      message: appError.message,
      context: appError.context
    });
  }

  return appError;
}

export const ErrorCodes = {
  AUTH_FAILED: 'AUTH_FAILED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_SCOPES: 'INSUFFICIENT_SCOPES',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  CHAT_CONNECTION_FAILED: 'CHAT_CONNECTION_FAILED',
  MODERATION_FAILED: 'MODERATION_FAILED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  CHANNEL_NOT_FOUND: 'CHANNEL_NOT_FOUND'
} as const;
