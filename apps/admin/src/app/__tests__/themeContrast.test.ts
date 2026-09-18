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

describe('dark theme contrast', () => {
  let darkTheme: string;

  beforeAll(() => {
    const source = readFileSync(GLOBALS, 'utf8');
    const match = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(source);
    if (!match) throw new Error('Dark theme token block not found');
    darkTheme = match[1];
  });

  function rawToken(name: string): string {
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(darkTheme);
    if (!match) throw new Error(`Dark theme token --${name} not found`);
    return match[1].trim();
  }

  function colorToken(name: string): string {
    const value = rawToken(name);
    const reference = /^var\(--([^)]+)\)$/.exec(value);
    if (reference) return colorToken(reference[1]);
    if (!/^#[\da-f]{6}$/i.test(value)) throw new Error(`--${name} is not a six-digit color`);
    return value.slice(1);
  }

  it.each([
    ['sidebar group labels', 'ink-faint2', 'screen-2'],
    ['search shortcut hint', 'ink-faint', 'pill-raised'],
    ['brand action links', 'color-text-brand', 'screen'],
  ])('%s meets WCAG AA', (_label, foreground, background) => {
    expect(contrast(colorToken(foreground), colorToken(background))).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['8b8173', '221d17'],
    ['9d9285', '383026'],
    ['007cf5', '2f271e'],
  ])('rejects the previous failing pair %s on %s', (foreground, background) => {
    expect(contrast(foreground, background)).toBeLessThan(4.5);
  });

  it('keeps the SuperTokens tertiary triplet aligned with ink-faint', () => {
    const hex = colorToken('ink-faint');
    const channels = hex.match(/../g)!.map((channel) => Number.parseInt(channel, 16));
    expect(rawToken('ink-3-rgb')).toBe(channels.join(', '));
  });
});
