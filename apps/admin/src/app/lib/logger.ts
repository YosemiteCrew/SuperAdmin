type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

function format(level: LogLevel, message: string, context?: LogContext): string {
  if (isProd) {
    return JSON.stringify({
      level,
      message,
      timestamp: new Date().toISOString(),
      ...context,
    });
  }
  const ctx = context ? ` ${JSON.stringify(context)}` : '';
  return `[${level.toUpperCase()}] ${message}${ctx}`;
}

function emit(level: LogLevel, message: string, context?: LogContext): void {
  if (isTest) return;
  const line = format(level, message, context);
  switch (level) {
    case 'error':
      console.error(line);
      return;
    case 'warn':
      console.warn(line);
      return;
    case 'info':
      console.info(line);
      return;
    case 'debug':
      console.debug(line);
      return;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit('debug', message, context),
  info: (message: string, context?: LogContext) => emit('info', message, context),
  warn: (message: string, context?: LogContext) => emit('warn', message, context),
  error: (message: string, context?: LogContext) => emit('error', message, context),
};
