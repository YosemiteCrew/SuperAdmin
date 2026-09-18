/**
 * @jest-environment node
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APP = join(__dirname, '..');
const SRC = join(APP, '..');
const GLOBALS = join(APP, 'globals.css');

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

/**
 * Light is `:root` followed by `@theme` — Tailwind v4 emits `@theme` into
 * `:root`, so a token declared only there (`--color-text-brand`) is a light
 * value like any other. Lookups take the first match, so `:root` leads and wins
 * wherever both blocks declare the same token.
 */
function themeBlocks(source: string): { light: string; dark: string } {
  const theme = /@theme\s*\{([\s\S]*?)\n\}/.exec(source);
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(source);
  const dark = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(source);
  if (!theme) throw new Error('@theme token block not found');
  if (!root) throw new Error('Light theme token block not found');
  if (!dark) throw new Error('Dark theme token block not found');
  return { light: `${root[1]}\n${theme[1]}`, dark: dark[1] };
}

describe('theme contrast', () => {
  let lightTheme: string;
  let darkTheme: string;

  beforeAll(() => {
    const blocks = themeBlocks(readFileSync(GLOBALS, 'utf8'));
    lightTheme = blocks.light;
    darkTheme = blocks.dark;
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
    ['sidebar group labels', 'ink-faint', 'screen-2'],
    ['search shortcut hint', 'ink-faint', 'pill-raised'],
    ['brand action links', 'color-text-brand', 'screen'],
  ])('%s meets WCAG AA in dark', (_label, foreground, background) => {
    expect(
      contrast(colorToken(darkTheme, foreground), colorToken(darkTheme, background))
    ).toBeGreaterThanOrEqual(4.5);
  });

  // The same pairs in light. #517 asserted these in dark only, which is why a
  // light sidebar label at 2.10 and a light brand link at 3.65 both survived it:
  // a pair is a pair in both themes, and only one of the two was being read.
  it.each([
    ['sidebar group labels', 'ink-faint', 'screen-2'],
    ['search shortcut hint', 'ink-faint', 'pill-raised'],
    ['brand action links', 'blue-text', 'screen'],
    ['auth shell brand links', 'color-text-brand', 'auth-bg-2'],
  ])('%s meets WCAG AA in light', (_label, foreground, background) => {
    expect(
      contrast(colorToken(lightTheme, foreground), colorToken(lightTheme, background))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['screen', 'screen'],
    ['page', 'page'],
    ['inset', 'inset'],
    ['band', 'band'],
  ])('light ink-faint on %s meets WCAG AA', (_label, background) => {
    expect(
      contrast(colorToken(lightTheme, 'ink-faint'), colorToken(lightTheme, background))
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each([
    ['8b8173', '221d17'],
    ['9d9285', '383026'],
    ['007cf5', '2f271e'],
    // The light-mode values this file replaced, kept as the negative arm: each
    // is what the token held when the pairing below it was shipping under AA.
    ['6d6864', 'eae2d5'],
    ['a9a39e', 'fafafa'],
    ['257bed', 'f7f3ec'],
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

// ─────────────────────────────────────────────────────────────────────────────
// Rendered pairs, derived from the source rather than listed by hand.
//
// A token value is only a defect against the ground it actually renders on, so
// the list above can only ever cover pairings somebody remembered to add. This
// half reads every class string that names BOTH its ink and its ground and
// checks that pair in both themes — so a new call site is covered the moment it
// is written, and a pairing nobody has thought about cannot ship unmeasured.
// ─────────────────────────────────────────────────────────────────────────────

type Chunk = { text: string; at: number };
type ClassToken = { variant: string; token: string };
type Pair = {
  file: string;
  line: number;
  ink: string;
  inkVariant: string;
  ground: string;
  groundVariant: string;
  px: number | null;
  bold: boolean;
};

const INK = /(?:^|\s)((?:[a-z-]+:)*)text-\[color:var\(--([a-z\d-]+)\)\]/g;
const BG = /(?:^|\s)((?:[a-z-]+:)*)bg-\[var\(--([a-z\d-]+)\)\]/g;
const SIZE = /text-\[(\d+(?:\.\d+)?)px\]/;
const BOLD = /font-(bold|semibold|black|extrabold)/;

/** Index just past the `${ ... }` opening at `open`. */
function endOfInterpolation(text: string, open: number): number {
  let braces = 1;
  let i = open + 2;
  while (i < text.length && braces > 0) {
    if (text[i] === '{') braces++;
    else if (text[i] === '}') braces--;
    i++;
  }
  return i;
}

/** Reads the template literal opening at `start`; returns the index past its close. */
function readTemplate(
  text: string,
  start: number,
  depth: number,
  offset: number,
  out: Chunk[]
): number {
  let i = start + 1;
  let chunkStart = i;
  while (i < text.length && text[i] !== '`') {
    if (text[i] === '\\') {
      i += 2;
      continue;
    }
    // A ternary inside one template carries BOTH branches. Cutting at the
    // interpolation keeps the mutually exclusive class sets from being paired
    // with each other; the expression is then read on its own.
    if (text[i] === '$' && text[i + 1] === '{') {
      out.push({ text: text.slice(chunkStart, i), at: offset + chunkStart });
      const end = endOfInterpolation(text, i);
      classStrings(text.slice(i + 2, end - 1), depth + 1, offset + i + 2, out);
      i = end;
      chunkStart = end;
      continue;
    }
    i++;
  }
  out.push({ text: text.slice(chunkStart, i), at: offset + chunkStart });
  return i + 1;
}

/** Reads the quoted string opening at `start`; returns the index past its close. */
function readQuoted(text: string, start: number, offset: number, out: Chunk[]): number {
  const quote = text[start];
  let i = start + 1;
  while (i < text.length && text[i] !== quote && text[i] !== '\n') {
    i += text[i] === '\\' ? 2 : 1;
  }
  out.push({ text: text.slice(start + 1, i), at: offset + start + 1 });
  return i + 1;
}

/** Class strings, with a template literal's branches kept apart. */
function classStrings(text: string, depth = 0, offset = 0, out: Chunk[] = []): Chunk[] {
  if (depth > 8) return out;
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '`') i = readTemplate(text, i, depth, offset, out);
    else if (ch === "'" || ch === '"') i = readQuoted(text, i, offset, out);
    else i++;
  }
  return out;
}

function sourceFiles(dir: string, match: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== '__tests__' && entry !== 'node_modules') sourceFiles(path, match, out);
    } else if (match.test(path)) out.push(path);
  }
  return out;
}

function tokensIn(literal: string, pattern: RegExp): ClassToken[] {
  return [...` ${literal} `.matchAll(pattern)].map((m) => ({ variant: m[1], token: m[2] }));
}

/**
 * The ground an ink renders on: the one its own variant sets, else the base.
 */
function groundFor(ink: ClassToken, grounds: ClassToken[]): ClassToken | undefined {
  return grounds.find((g) => g.variant === ink.variant) ?? grounds.find((g) => g.variant === '');
}

function pairsInLiteral(literal: Chunk, file: string, text: string): Pair[] {
  const inks = tokensIn(literal.text, INK);
  const grounds = tokensIn(literal.text, BG);
  if (!inks.length || !grounds.length) return [];
  const size = SIZE.exec(literal.text);
  const shape = {
    file: file.slice(SRC.length + 1),
    line: text.slice(0, literal.at).split('\n').length,
    px: size ? Number(size[1]) : null,
    bold: BOLD.test(literal.text),
  };
  const found = new Map<string, Pair>();
  const add = (ink: ClassToken, ground: ClassToken) => {
    const key = `${ink.variant}|${ink.token}|${ground.variant}|${ground.token}`;
    if (found.has(key)) return;
    found.set(key, {
      ...shape,
      ink: ink.token,
      inkVariant: ink.variant,
      ground: ground.token,
      groundVariant: ground.variant,
    });
  };
  for (const ink of inks) {
    const ground = groundFor(ink, grounds);
    if (ground) add(ink, ground);
  }
  // A variant ground pairs with the base ink only when that variant does not
  // also change the ink — `hover:bg-x hover:text-y` never shows base ink on x.
  const baseInk = inks.find((ink) => ink.variant === '');
  if (baseInk) {
    for (const ground of grounds) {
      const overridden = ground.variant === '' || inks.some((i) => i.variant === ground.variant);
      if (!overridden) add(baseInk, ground);
    }
  }
  return [...found.values()];
}

function renderedPairs(): Pair[] {
  return sourceFiles(SRC, /\.tsx?$/).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return classStrings(text)
      .filter((literal) => literal.text.includes('var(--'))
      .flatMap((literal) => pairsInLiteral(literal, file, text));
  });
}

/**
 * Surfaces a translucent ground can be laid over. A pill's parent is not
 * knowable from its own class string, so every flat surface is tried and the
 * worst result is the one asserted: whichever surface it lands on, it passes.
 */
const SURFACES = ['screen', 'page', 'inset', 'screen-2', 'band', 'pill-raised'] as const;

describe('rendered ink/ground pairs meet WCAG AA', () => {
  let themes: Record<'light' | 'dark', string>;
  let pairs: Pair[];

  beforeAll(() => {
    themes = themeBlocks(readFileSync(GLOBALS, 'utf8'));
    pairs = renderedPairs();
  });

  function value(theme: string, name: string, seen = new Set<string>()): string | null {
    if (seen.has(name)) return null;
    seen.add(name);
    const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(theme);
    if (!match) return null;
    const raw = match[1].trim();
    const reference = /^var\(--([^)]+)\)$/.exec(raw);
    return reference ? value(theme, reference[1], seen) : raw;
  }

  function flat(theme: string, name: string): string | null {
    const raw = value(theme, name);
    return raw && /^#[\da-f]{6}$/i.test(raw) ? raw.slice(1) : null;
  }

  function translucent(theme: string, name: string): [number, number, number, number] | null {
    const raw = value(theme, name);
    if (!raw) return null;
    const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(
      raw
    );
    return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
  }

  function composite(rgba: [number, number, number, number], parent: string): string {
    const base = parent.match(/../g)!.map((c) => Number.parseInt(c, 16));
    return rgba
      .slice(0, 3)
      .map((channel, index) => Math.round(channel * rgba[3] + base[index] * (1 - rgba[3])))
      .map((channel) => channel.toString(16).padStart(2, '0'))
      .join('');
  }

  /** The lowest ratio this pair can render at, or null when it cannot be read. */
  function worstRatio(theme: string, pair: Pair): number | null {
    const ink = flat(theme, pair.ink);
    if (!ink) return null;
    const ground = flat(theme, pair.ground);
    if (ground) return contrast(ink, ground);
    const rgba = translucent(theme, pair.ground);
    if (!rgba) return null;
    const over = SURFACES.map((surface) => flat(theme, surface)).filter(
      (surface): surface is string => surface !== null
    );
    if (!over.length) return null;
    return Math.min(...over.map((surface) => contrast(ink, composite(rgba, surface))));
  }

  // WCAG 1.4.3: 3:1 for text at 24px, or 18.66px when bold. Everything else 4.5.
  const required = (pair: Pair): number =>
    pair.px !== null && (pair.px >= 24 || (pair.px >= 18.66 && pair.bold)) ? 3 : 4.5;

  it('reads enough pairs for the assertions below to be able to fail', () => {
    // Without this the suite passes just as cleanly when the scan finds nothing,
    // which is what a broken splitter or a moved source root looks like.
    expect(pairs.length).toBeGreaterThan(100);
    expect(new Set(pairs.map((pair) => pair.file)).size).toBeGreaterThan(20);
    expect(pairs.some((pair) => worstRatio(themes.light, pair) !== null)).toBe(true);
    expect(pairs.some((pair) => worstRatio(themes.dark, pair) !== null)).toBe(true);
  });

  it.each(['light', 'dark'] as const)('no %s pair is below its threshold', (name) => {
    const theme = themes[name];
    const failures = pairs
      .map((pair) => ({ pair, ratio: worstRatio(theme, pair) }))
      .filter(({ pair, ratio }) => ratio !== null && ratio < required(pair))
      .map(
        ({ pair, ratio }) =>
          `${pair.file}:${pair.line} --${pair.ink} on --${pair.ground} ` +
          `${ratio!.toFixed(2)} < ${required(pair)}`
      );
    expect(failures).toEqual([]);
  });

  it('can read every pair it found', () => {
    // A ground that resolves to neither a hex nor an rgba is a pair this gate
    // silently skips, so it has to be named here rather than dropped quietly.
    const unreadable = new Set<string>();
    for (const name of ['light', 'dark'] as const) {
      for (const pair of pairs) {
        if (worstRatio(themes[name], pair) === null) unreadable.add(`${name} --${pair.ground}`);
      }
    }
    expect([...unreadable].sort()).toEqual([]);
  });

  it('does not paint text in --ink-faint2, which no light surface can carry', () => {
    // Light --ink-faint2 is 2.39 against the lightest surface in the palette and
    // 1.90 against the darkest, so it fails as text wherever it is placed. It is
    // kept for non-text fills only.
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC, /\.(tsx?|css)$/)) {
      const text = readFileSync(file, 'utf8');
      text.split('\n').forEach((line, index) => {
        if (/text-\[color:var\(--ink-faint2\)\]|(?<!-)color:\s*var\(--ink-faint2\)/.test(line)) {
          offenders.push(`${file.slice(SRC.length + 1)}:${index + 1}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });
});

// The two rules the scan applies before it measures anything. Neither is
// exercised by the tree as it stands — every pairing at this head passes either
// way — so without these they are branches whose mutation goes unnoticed.
describe('how the scan reads a class string', () => {
  const FILE = join(SRC, 'synthetic.tsx');
  const pairsOf = (source: string) =>
    classStrings(source)
      .flatMap((literal) => pairsInLiteral(literal, FILE, source))
      .map((pair) => `${pair.inkVariant}${pair.ink} on ${pair.groundVariant}${pair.ground}`);

  it('keeps a hover ink on the hover ground, not on the base one', () => {
    expect(
      pairsOf(
        "'bg-[var(--inset)] text-[color:var(--ink)] " +
          "hover:bg-[var(--btn)] hover:text-[color:var(--btn-ink)]'"
      )
    ).toEqual(['ink on inset', 'hover:btn-ink on hover:btn']);
  });

  it('pairs the base ink with a hover ground when hover leaves the ink alone', () => {
    expect(pairsOf("'bg-[var(--inset)] text-[color:var(--ink)] hover:bg-[var(--btn)]'")).toEqual([
      'ink on inset',
      'ink on hover:btn',
    ]);
  });

  it('does not pair the two branches of a ternary with each other', () => {
    expect(
      pairsOf(
        '`rounded ${on ? ' +
          "'bg-[var(--btn)] text-[color:var(--btn-ink)]' : " +
          "'bg-[var(--inset)] text-[color:var(--ink-muted)]'}`"
      )
    ).toEqual(['btn-ink on btn', 'ink-muted on inset']);
  });
});
