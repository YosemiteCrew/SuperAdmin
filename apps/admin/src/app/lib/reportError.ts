import { logger } from './logger';

type ErrorContext = {
  digest?: string;
  route?: string;
  source?: 'global' | 'route' | 'action' | 'api';
  userId?: string;
  [key: string]: unknown;
};

export function reportError(error: unknown, context?: ErrorContext): void {
  const normalized =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { message: String(error) };

  logger.error('Unhandled error', {
    ...normalized,
    ...context,
  });

  // Future: forward to Sentry / Bugsnag / etc. here.
  // The structured shape above already matches most providers' ingest format.
}
