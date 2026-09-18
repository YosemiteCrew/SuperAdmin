/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const GLOBALS = join(__dirname, '..', 'globals.css');

function luminance(hex: string): number {
  const channels = hex
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('theme contrast', () => {
  let lightTheme: string;
  let darkTheme: string;

  beforeAll(() => {
    const source = readFileSync(GLOBALS, 'utf8');
    const lightMatch = /:root\s*\{([\s\S]*?)\n\}/.exec(source);
    const darkMatch = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(source);
    if (!lightMatch) throw new Error('Light theme token block not found');
    if (!darkMatch) throw new Error('Dark theme token block not found');
    lightTheme = lightMatch[1];
    darkTheme = darkMatch[1];
  });

  function rawToken(theme: string, name: string): string {
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(theme);
    if (!match) throw new Error(`Theme token --${name} not found`);
    return match[1].trim();
  }

  function colorToken(theme: string, name: string): string {
    const value = rawToken(theme, name);
    const reference = /^var\(--([^)]+)\)$/.exec(value);
    if (reference) return colorToken(theme, reference[1]);
    if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`--${name} is not a six-digit color`);
    return value.slice(1);
  }

  it.each([
    ['sidebar group labels', 'ink-faint2', 'screen-2'],
    ['search shortcut hint', 'ink-faint', 'pill-raised'],
    ['brand action links', 'color-text-brand', 'screen'],
  ])('%s meets WCAG AA', (_label, foreground, background) => {
    expect(
      contrast(colorToken(darkTheme, foreground), colorToken(darkTheme, background))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['screen', 'screen'],
    ['page', 'page'],
  ])('light ink-faint on %s meets WCAG AA', (_label, background) => {
    expect(
      contrast(colorToken(lightTheme, 'ink-faint'), colorToken(lightTheme, background))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['8b8173', '221d17'],
    ['9d9285', '383026'],
    ['007cf5', '2f271e'],
  ])('rejects the previous failing pair %s on %s', (foreground, background) => {
    expect(contrast(foreground, background)).toBeLessThan(4.5);
  });

  it.each(['light', 'dark'])('keeps the %s SuperTokens tertiary triplet aligned', (name) => {
    const theme = name === 'light' ? lightTheme : darkTheme;
    const hex = colorToken(theme, 'ink-faint');
    const channels = hex.match(/../g)!.map((channel) => Number.parseInt(channel, 16));
    expect(rawToken(theme, 'ink-3-rgb')).toBe(channels.join(', '));
  });
});
