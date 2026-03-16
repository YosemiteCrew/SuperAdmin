const isDev = process.env.NODE_ENV === "development";
const isTest = process.env.NODE_ENV === "test";

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev || isTest) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev || isTest) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (!isTest) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (!isTest) console.error(...args);
  },
};
