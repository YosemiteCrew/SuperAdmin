/**
 * Reads wall-clock time outside React's render analysis.
 *
 * Server pages use this boundary for time-window calculations. Keeping the
 * impure read here avoids treating it as a render-time value in each page.
 */
export function getServerTimestamp(): number {
  return Date.now();
}
