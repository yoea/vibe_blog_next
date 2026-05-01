const isDev = process.env.NODE_ENV === 'development';
const timestamp = () => new Date().toISOString();

// 错误始终输出，其他日志仅在开发环境输出
export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) {
      console.log('[INFO]', `[${timestamp()}]`, ...args);
    }
  },
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn('[WARN]', `[${timestamp()}]`, ...args);
    }
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', `[${timestamp()}]`, ...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log('[DEBUG]', `[${timestamp()}]`, ...args);
    }
  },
};
