/**
 * Retry функция с экспоненциальной задержкой
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Не retry на 401/403 (проблемы с авторизацией)
      if (error?.status === 401 || error?.status === 403) {
        throw error;
      }
      
      // Последняя попытка - бросаем ошибку
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // Экспоненциальная задержка: 1s, 2s, 4s
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
