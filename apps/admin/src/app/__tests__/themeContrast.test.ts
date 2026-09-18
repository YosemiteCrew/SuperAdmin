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
  const light = `${root[1]}\n${theme[1]}`;
  // A token the dark block does not redeclare still resolves — it falls through
  // to `:root`. Reading dark as the dark block alone makes every ramp value look
  // undefined there, which a scan then skips instead of measuring.
  return { light, dark: `${dark[1]}\n${light}` };
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

  it.each(['light', 'dark'])('%s erase confirmation meets WCAG AA at rest and hover', (name) => {
    const theme = name === 'light' ? lightTheme : darkTheme;
    const panel = colorToken(theme, 'screen');
    const dangerBackground = translucent(rawToken(theme, 'danger-bg'));
    if (!dangerBackground) throw new Error('--danger-bg is not an rgba color');
    const buttonHover = composite(dangerBackground, panel);
    const dangerText = colorToken(theme, 'danger-text');

    expect(contrast(dangerText, panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(dangerText, buttonHover)).toBeGreaterThanOrEqual(4.5);
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

  // ───────────────────────────────────────────────────────────────────────────
  // Status banners: a detail line dimmed with `opacity`.
  //
  // `opacity` on the text composites it against its own tint, so it changes the
  // rendered pair without naming a token. The source scan further down cannot
  // see it either — that scan reads ink and ground from one class literal, and
  // a dimmed `<span>` names neither. Each tone's ink sits close to 4.5 on its
  // own tint, so any resting dim on these surfaces lands under AA in light.
  // ───────────────────────────────────────────────────────────────────────────

  /** The tone's ink, and the tint it renders on over the page ground. */
  function bannerPair(theme: string, ink: string, ground: string): [string, string] {
    const rgba = translucent(rawToken(theme, ground));
    const surface = rgba ? composite(rgba, colorToken(theme, 'page')) : colorToken(theme, ground);
    return [colorToken(theme, ink), surface];
  }

  const TONES = [
    { tone: 'broken', ink: 'danger-text', ground: 'danger-bg' },
    { tone: 'partial', ink: 'warn-text', ground: 'warn-bg' },
    { tone: 'verified', ink: 'avatar-green-ink', ground: 'avatar-green-bg' },
  ];

  it.each(['light', 'dark'].flatMap((mode) => TONES.map((entry) => ({ ...entry, mode }))))(
    '$mode $tone banner detail meets WCAG AA undimmed',
    ({ mode, ink, ground }) => {
      const theme = mode === 'light' ? lightTheme : darkTheme;
      const [text, surface] = bannerPair(theme, ink, ground);
      expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5);
    }
  );

  // The negative arm: what the removed `opacity-90` and `opacity-80` measured.
  it.each([
    { tone: 'broken', ink: 'danger-text', ground: 'danger-bg', alpha: 0.9 },
    { tone: 'partial', ink: 'warn-text', ground: 'warn-bg', alpha: 0.9 },
    { tone: 'pending verification', ink: 'warn-text', ground: 'warn-bg', alpha: 0.8 },
  ])('rejects the light $tone banner detail dimmed to $alpha', ({ ink, ground, alpha }) => {
    const [text, surface] = bannerPair(lightTheme, ink, ground);
    expect(contrast(dimmed(text, alpha, surface), surface)).toBeLessThan(4.5);
  });

  /**
   * The arithmetic above only holds while nothing dims these two banners again,
   * and a reintroduced `opacity-90` would be invisible to every other check in
   * this file. A `disabled:` or `hover:` variant is a different state and is not
   * what this guards.
   */
  it.each([
    ['AuditIntegrityBanner', 'app/features/audit/AuditIntegrityBanner.tsx', null],
    ['PendingBanner', 'app/(routes)/(dashboard)/organizations/page.tsx', 'PendingBanner'],
  ])('%s carries no resting opacity', (_label, relative, fn) => {
    const source = readFileSync(join(SRC, relative), 'utf8');
    let scope = source;
    if (fn) {
      const start = source.indexOf(`function ${fn}(`);
      expect(start).toBeGreaterThan(-1);
      const end = source.indexOf('\n}', start);
      expect(end).toBeGreaterThan(start);
      scope = source.slice(start, end);
      // Cutting at the first column-0 brace can narrow past the span this
      // guards, and a scope that no longer contains it passes for the wrong
      // reason. Anchor on the detail copy so the narrowing fails instead.
      expect(scope).toContain('verify to make them visible to pet parents');
    }
    const resting = [...scope.matchAll(/(?:^|["'`\s])((?:[a-z-]+:)*)(opacity-\d+)/g)]
      .filter((match) => match[1] === '')
      .map((match) => match[2]);
    expect(resting).toEqual([]);
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

/**
 * Surfaces an auth-shell rule can sit on, on top of the app surfaces. The
 * sign-in screen has its own backdrop, so a translucent ground declared there
 * composites over these as well.
 */
const CSS_SURFACES = [...SURFACES, 'auth-bg-1', 'auth-bg-2', 'field-bg'] as const;

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

function translucent(raw: string | null): [number, number, number, number] | null {
  if (!raw) return null;
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/i.exec(raw);
  return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null;
}

/** `text` rendered at `alpha` opacity over `surface`. */
function dimmed(text: string, alpha: number, surface: string): string {
  const [r, g, b] = text.match(/../g)!.map((channel) => Number.parseInt(channel, 16));
  return composite([r, g, b, alpha], surface);
}

function composite(rgba: [number, number, number, number], parent: string): string {
  const base = parent.match(/../g)!.map((c) => Number.parseInt(c, 16));
  return rgba
    .slice(0, 3)
    .map((channel, index) => Math.round(channel * rgba[3] + base[index] * (1 - rgba[3])))
    .map((channel) => channel.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The lowest ratio `ink` can render at over `groundRaw`, or null when the
 * ground resolves to neither a hex nor an rgba. A translucent ground is tried
 * over every surface and the worst result is the one returned.
 */
function worstOver(
  theme: string,
  ink: string,
  groundRaw: string | null,
  surfaces: readonly string[] = SURFACES
): number | null {
  if (!groundRaw) return null;
  if (/^#[\da-f]{6}$/i.test(groundRaw)) return contrast(ink, groundRaw.slice(1));
  const rgba = translucent(groundRaw);
  if (!rgba) return null;
  const over = surfaces
    .map((surface) => flat(theme, surface))
    .filter((surface): surface is string => surface !== null);
  return over.length ? Math.min(...over.map((s) => contrast(ink, composite(rgba, s)))) : null;
}

// WCAG 1.4.3: 3:1 for text at 24px, or 18.66px when bold. Everything else 4.5.
function requiredFor(px: number | null, bold: boolean): number {
  return px !== null && (px >= 24 || (px >= 18.66 && bold)) ? 3 : 4.5;
}

/** The lowest ratio this pair can render at, or null when it cannot be read. */
function worstRatio(theme: string, pair: Pair): number | null {
  const ink = flat(theme, pair.ink);
  return ink === null ? null : worstOver(theme, ink, value(theme, pair.ground));
}

describe('rendered ink/ground pairs meet WCAG AA', () => {
  let themes: Record<'light' | 'dark', string>;
  let pairs: Pair[];

  beforeAll(() => {
    themes = themeBlocks(readFileSync(GLOBALS, 'utf8'));
    pairs = renderedPairs();
  });

  const required = (pair: Pair): number => requiredFor(pair.px, pair.bold);

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

// ─────────────────────────────────────────────────────────────────────────────
// CSS rules that name their own ground.
//
// The scan above reads class strings, so a pairing written as a CSS rule is
// invisible to it — which is how the sign-in stylesheet kept three sub-AA inks
// after every Tailwind site had been raised. A rule declaring `color:` and
// `background:` together names its own pair with no ancestor lookup needed, so
// it is measurable on exactly the same terms. A rule whose ground sits on an
// ancestor is NOT in scope: that needs class-composition analysis across files,
// and `can read every rule it found` below refuses to paper over the gap.
// ─────────────────────────────────────────────────────────────────────────────

type CssPair = {
  file: string;
  line: number;
  selector: string;
  ink: string;
  ground: string;
  px: number | null;
  bold: boolean;
};

// `(?<!-)` keeps `background-color:`, `border-color:` and a `--…-color:` custom
// property declaration out of the ink pattern.
const CSS_INK = /(?<!-)\bcolor:\s*var\(--([a-z\d-]+)\)\s*;/g;
const CSS_BG = /\bbackground(?:-color)?:\s*(var\(--[a-z\d-]+\)|rgba?\([^)]*\))\s*;/;
const CSS_SIZE = /font-size:\s*([\d.]+)(rem|px)\s*;/;
const CSS_BOLD = /font-weight:\s*(?:700|800|900|bold)\s*;/;

/**
 * Grounds for rules that paint text without declaring a background. The ground
 * is the one thing a rule cannot always state about itself, so it is named here
 * — but the INK still comes from the source, which is what keeps the rule under
 * the gate when somebody changes the colour it uses. `every declared ground
 * still matches a rule` below fails if one of these selectors is renamed away.
 */
const DECLARED_GROUNDS: ReadonlyArray<{ selector: string; grounds: string[] }> = [
  // The floating label sits on the input, and overhangs onto the card behind it.
  { selector: '.yc-auth-field-label', grounds: ['field-bg', 'auth-bg-2'] },
];

/** The grounds a rule renders on: its own background, else a declared one. */
function groundsOf(body: string, selector: string): string[] {
  const own = CSS_BG.exec(body);
  if (own) return [own[1]];
  return DECLARED_GROUNDS.filter((entry) => selector.includes(entry.selector)).flatMap((entry) =>
    entry.grounds.map((ground) => `var(--${ground})`)
  );
}

function pairsInRule(rule: RegExpExecArray, file: string, text: string): CssPair[] {
  const body = rule[2];
  const selector = rule[1].trim();
  const grounds = groundsOf(body, selector);
  const inks = [...body.matchAll(CSS_INK)];
  if (!grounds.length || !inks.length) return [];
  const size = CSS_SIZE.exec(body);
  let px: number | null = null;
  if (size) px = Number(size[1]) * (size[2] === 'rem' ? 16 : 1);
  const shape = {
    file: file.slice(SRC.length + 1),
    line: text.slice(0, rule.index).split('\n').length,
    selector: selector.split('\n').pop()!.trim(),
    px,
    bold: CSS_BOLD.test(body),
  };
  return grounds.flatMap((ground) => inks.map((ink) => ({ ...shape, ground, ink: ink[1] })));
}

/** Declaration blocks carrying both an ink and a ground, one entry per ink. */
function cssPairs(): CssPair[] {
  return sourceFiles(SRC, /\.css$/).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    // `[^{}]*` cannot span a brace, so an at-rule wrapper is skipped and the
    // rules nested inside it are read on their own.
    return [...text.matchAll(/([^{}]*)\{([^{}]*)\}/g)].flatMap((rule) =>
      pairsInRule(rule as unknown as RegExpExecArray, file, text)
    );
  });
}

function cssRatio(theme: string, pair: CssPair): number | null {
  const ink = flat(theme, pair.ink);
  if (ink === null) return null;
  const reference = /^var\(--([a-z\d-]+)\)$/.exec(pair.ground);
  const ground = reference ? value(theme, reference[1]) : pair.ground;
  return worstOver(theme, ink, ground, CSS_SURFACES);
}

describe('CSS rules that name their own ground meet WCAG AA', () => {
  let themes: Record<'light' | 'dark', string>;
  let pairs: CssPair[];

  beforeAll(() => {
    themes = themeBlocks(readFileSync(GLOBALS, 'utf8'));
    pairs = cssPairs();
  });

  it('reads enough rules for the assertions below to be able to fail', () => {
    // A stylesheet root that stops resolving, or a block splitter that stops
    // splitting, both look exactly like a clean sweep without this.
    expect(pairs.length).toBeGreaterThan(10);
    expect(pairs.some((pair) => pair.ground.startsWith('rgb'))).toBe(true);
    expect(pairs.some((pair) => cssRatio(themes.light, pair) !== null)).toBe(true);
    expect(pairs.some((pair) => cssRatio(themes.dark, pair) !== null)).toBe(true);
  });

  it.each(['light', 'dark'] as const)('no %s CSS rule is below its threshold', (name) => {
    const theme = themes[name];
    const failures = pairs
      .map((pair) => ({ pair, ratio: cssRatio(theme, pair) }))
      .filter(({ pair, ratio }) => ratio !== null && ratio < requiredFor(pair.px, pair.bold))
      .map(
        ({ pair, ratio }) =>
          `${pair.file}:${pair.line} ${pair.selector} --${pair.ink} on ${pair.ground} ` +
          `${ratio!.toFixed(2)} < ${requiredFor(pair.px, pair.bold)}`
      );
    expect(failures).toEqual([]);
  });

  it('keeps the floating auth label under the gate', () => {
    // DECLARED_GROUNDS is the only thing putting this rule in the scan: it
    // paints text without declaring a background, so emptying or renaming the
    // list takes it out silently. Asserted on the pairs rather than on the list,
    // because a guard that maps over the list passes vacuously when it is empty.
    const label = pairs.filter((pair) => pair.selector.includes('.yc-auth-field-label'));
    // `--surface` is the resting label's own background, so that rule is in the
    // scan on its own terms; the other two are the ones the list supplies.
    expect([...new Set(label.map((pair) => pair.ground))].sort()).toEqual([
      'var(--auth-bg-2)',
      'var(--field-bg)',
      'var(--surface)',
    ]);
  });

  it('every declared ground still matches a rule', () => {
    // The general form of the arm above, for entries added later. Reported as
    // the selectors that matched nothing.
    expect(DECLARED_GROUNDS.length).toBeGreaterThan(0);
    const orphaned = DECLARED_GROUNDS.map((entry) => entry.selector).filter(
      (selector) => !pairs.some((pair) => pair.selector.includes(selector))
    );
    expect(orphaned).toEqual([]);
  });

  it('reads a dark override ahead of the light value it shadows', () => {
    // The dark theme is the dark block followed by the light one, and `value`
    // takes the first match — so the concatenation ORDER is what decides whether
    // dark is measured with dark values. Reversed, dark silently becomes a
    // second copy of light and every dark assertion above passes for free.
    const source = readFileSync(GLOBALS, 'utf8');
    const block = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(source)![1];
    const overridden = [...block.matchAll(/--([a-z\d-]+):\s*(#[\da-f]{6});/gi)];
    expect(overridden.length).toBeGreaterThan(10);
    const shadowed = overridden
      .filter(([, name, hex]) => value(themes.dark, name) !== hex)
      .map(([, name]) => name);
    expect(shadowed).toEqual([]);

    // And the other direction: a token the dark block does not redeclare still
    // resolves there, which is what the cascade does and what stops a ramp
    // colour being skipped instead of measured.
    const names = [...themes.light.matchAll(/--([a-z\d-]+):\s*#[\da-f]{6};/gi)].map((m) => m[1]);
    const inherited = names.filter((name) => !new RegExp(`--${name}:`).test(block));
    expect(inherited.length).toBeGreaterThan(0);
    const lost = inherited.filter((name) => value(themes.dark, name) !== value(themes.light, name));
    expect(lost).toEqual([]);
  });

  it('can read every rule it found', () => {
    const unreadable = new Set<string>();
    for (const name of ['light', 'dark'] as const) {
      for (const pair of pairs) {
        if (cssRatio(themes[name], pair) === null) {
          unreadable.add(`${name} ${pair.file}:${pair.line} --${pair.ink} on ${pair.ground}`);
        }
      }
    }
    expect([...unreadable].sort()).toEqual([]);
  });
});

// `required` decides what every assertion above is compared against, and until
// this block existed nothing in the tree depended on its large-text branch:
// widening `? 3 : 4.5` to `? 4.5 : 4.5` left the whole file green.
describe('the threshold a pair is held to', () => {
  it.each([
    ['body text', 13, false, 4.5],
    ['text with no declared size', null, false, 4.5],
    ['24px text', 24, false, 3],
    ['bold text at 18.66px', 18.66, true, 3],
    ['unbold text at 18.66px', 18.66, false, 4.5],
    ['bold text just under 18.66px', 18, true, 4.5],
  ])('holds %s to its WCAG 1.4.3 threshold', (_label, px, bold, expected) => {
    expect(requiredFor(px as number | null, bold as boolean)).toBe(expected);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Resting `opacity` — the fourth colour neither scan above can read.
//
// Both scans take an ink and a ground out of ONE class literal and measure that
// pair at full strength. `opacity` changes what the ink renders as without
// naming a token, and it can sit in a different literal from the ink entirely —
// on the element itself, or on any ancestor between the ink and the ground. So
// a pairing the gate has already passed still ships under AA. Measured at
// `df450f5`, light mode, on the ground each site actually sits on:
//
//   admins row `opacity-60`   email 4.34, name 2.44, Disabled badge 2.74
//   filter count `opacity-65` unselected pill 2.78 on --page
//
// There is no arithmetic fix from a class literal alone: the ground the dimmed
// ink lands on is exactly the thing that literal does not state. So this
// refuses the construct rather than trying to measure it, and exempts the one
// case WCAG 1.4.3 does — an inactive component, which in this tree is spelled
// `cursor-not-allowed`. A future decorative dim needs its own shape-keyed rule
// here, not a filename in a list: an exemption carrying an unchecked claim is
// the cheapest place for this defect to come back.
//
// It reads every quoted or backticked run in the file, with no `var(--` filter,
// so naming one of these classes inside quotes in a COMMENT is reported as a
// call site. That is the tolerable direction: the failure names the line and is
// fixed by rewording, whereas a parser taught to skip prose is a parser that can
// be talked out of reading a real class.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The spellings a resting dim can be written in — ONE alphabet, read twice.
 * The gate below prefixes it with a variant chain; the canary searches it
 * plainly. Until #530 the two patterns each spelled `opacity-<n>` themselves,
 * so a construct outside that spelling was missing from BOTH at once: they
 * agreed with each other and said nothing, and a planted `opacity-[0.6]` left
 * the suite green at `8db6486`. A partition can only partition what its
 * alphabet admits, so the alphabet is the thing that has to be shared.
 *
 * `samples` are not documentation. Every sample is driven through both patterns
 * by the arm below, so a widening that lands without a working sample fails
 * there rather than going quiet. It is a LIST because the review of #533 found
 * two more spellings that multiply rather than add: the alpha can be numeric or
 * arbitrary, and it can sit on a bracketed literal or a plain token. One sample
 * per row would have left three of those four combinations unread — the arm has
 * to be per sample, not per row.
 *
 * Deliberately narrow, each pinned by a negative fixture below:
 *   `text-[13px]/5`, `text-sm/6`   line-height modifiers, not alphas
 *   `text-(length:--s)/6`          the same, in the var-shorthand spelling
 *   `border-[var(--success)]/40`   a GROUND, not an ink
 *   `bg-surface/72`, `bg-(--s)/72` the same, in the plain and shorthand spellings
 * Grounds are a different defect with a different fix and are not claimed here.
 */

/**
 * The forms an alpha value can take: `65`, `[0.65]`, or the v4 CSS-variable
 * shorthand `(--fade)`. Held as a list so the arm below can require every form
 * to reach a sample — a form nothing is written in is a widening that no arm
 * reads, which is how `(--fade)` sat unread in BOTH positions at `a2a989c`.
 */
const ALPHA_FORMS = ['\\d+', '\\[[^\\]]+\\]', '\\(--[\\w-]+\\)'] as const;

const ALPHA = `(?:${ALPHA_FORMS.join('|')})`;

/** The bare type scale, where `/<n>` is a line height and not an alpha at all. */
const TYPE_SCALE = '(?:xs|sm|base|lg|\\d*xl)';

const DIM_SPELLINGS = [
  {
    label: 'an opacity utility',
    source: `opacity-${ALPHA}`,
    samples: ['opacity-65', 'opacity-[0.6]', 'opacity-(--fade)'],
  },
  {
    label: 'an alpha modifier on a bracketed colour literal',
    source: `text-\\[(?:color:|var\\()[^\\]]*\\]/${ALPHA}`,
    samples: [
      'text-[color:var(--btn-ink)]/65',
      'text-[var(--ink)]/[0.65]',
      'text-[color:var(--ink)]/(--fade)',
    ],
  },
  {
    label: 'an alpha modifier on a plain colour token',
    source: `text-(?!${TYPE_SCALE}/)[a-z\\d-]+/${ALPHA}`,
    samples: ['text-white/70', 'text-ink-3/[0.65]', 'text-white/(--fade)'],
  },
  {
    // `color:` or a bare `--`, never `length:` — `text-(length:--s)/6` is a
    // line height in the shorthand spelling, the same construct `TYPE_SCALE`
    // already excludes on the plain token.
    label: 'an alpha modifier on a var-shorthand colour',
    source: `text-\\((?:color:)?--[\\w-]+\\)/${ALPHA}`,
    samples: [
      'text-(--ink)/60',
      'text-(--ink)/[0.6]',
      'text-(color:--ink)/65',
      'text-(--ink)/(--fade)',
    ],
  },
] as const;

/** One arm per SAMPLE. A row whose `samples` is empty would vanish silently. */
const DIM_SAMPLES = DIM_SPELLINGS.flatMap((spelling) =>
  spelling.samples.map((sample) => ({ label: spelling.label, spelling, sample }))
);

const DIM = `(?:${DIM_SPELLINGS.map((spelling) => spelling.source).join('|')})`;

/** A class literal starts at the quote or after whitespace, never mid-token. */
const BOUNDARY = '(?:^|["\'`\\s])';

/** Every dim in a class literal, with the variant chain that gates it. */
const OPACITY = new RegExp(`${BOUNDARY}((?:[a-z-]+:)*)(${DIM})`, 'g');

/** The same alphabet with no variant parsing: the canary's independent read. */
const ANY_DIM = new RegExp(DIM, 'g');

/** Utilities that put the element outside WCAG 1.4.3 for as long as they apply. */
const INACTIVE = 'cursor-not-allowed';

type Dim = { variant: string; className: string };

function dimsIn(literal: string): Dim[] {
  return [...` ${literal} `.matchAll(OPACITY)].map((match) => ({
    variant: match[1],
    className: `${match[1]}${match[2]}`,
  }));
}

/**
 * The dims in a literal that apply to the resting render of live content: no
 * variant chain gating them, and not on an inactive control.
 */
function restingDims(literal: string): string[] {
  if (literal.includes(INACTIVE)) return [];
  return dimsIn(literal)
    .filter((dim) => dim.variant === '')
    .map((dim) => dim.className);
}

/** Literals from every source file, carrying the file and line they came from. */
function sourceLiterals(): { file: string; line: number; text: string }[] {
  return sourceFiles(SRC, /\.tsx?$/).flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    return classStrings(text).map((literal) => ({
      file: file.slice(SRC.length + 1),
      line: text.slice(0, literal.at).split('\n').length,
      text: literal.text,
    }));
  });
}

describe('no resting opacity dims text the gate has already measured', () => {
  let literals: ReturnType<typeof sourceLiterals>;

  beforeAll(() => {
    literals = sourceLiterals();
  });

  it('accounts for every dim it can see', () => {
    // The canary, and it is a partition rather than a floor: `dimsIn` has to
    // explain every dim a plain substring search finds, so a pattern that stops
    // matching one spelling fails here instead of going quiet in the assertion
    // below. The substring count comes from the file text, which is the one
    // input the pattern has no say in.
    //
    // It is independent of how the gate PARSES — drop the variant group and this
    // fails by name — but not of what the gate can SPELL, which is why both now
    // read `DIM_SPELLINGS` and the arm below drives every entry through each.
    const files = sourceFiles(SRC, /\.tsx?$/);
    expect(files.length).toBeGreaterThan(50);
    const occurrences = literals.flatMap((literal) => literal.text.match(ANY_DIM) ?? []);
    expect(occurrences.length).toBeGreaterThan(30);
    expect(literals.flatMap((literal) => dimsIn(literal.text)).length).toBe(occurrences.length);
    // And the variants are the bulk of them, so the filter below is doing work.
    expect(
      literals.flatMap((literal) => dimsIn(literal.text)).filter((dim) => dim.variant !== '').length
    ).toBeGreaterThan(30);
  });

  it('drives every spelling in the alphabet through the arm below', () => {
    // `flatMap` over `samples` means a row with an empty list contributes no
    // arms and fails nothing — the row would be in the gate and out of the
    // tests at the same time. So the arms have to account for every row.
    expect(new Set(DIM_SAMPLES.map((entry) => entry.label)).size).toBe(DIM_SPELLINGS.length);
  });

  it.each(ALPHA_FORMS)('writes an alpha in the %s form somewhere in the samples', (form) => {
    // The other half of the same hazard, and the one `a2a989c` was missing:
    // `ALPHA` is shared by every row, so a form added to it with no sample is
    // in all four patterns and read by none of them. The alpha is the tail of
    // the sample — after the slash, or after `opacity-`.
    const tail = new RegExp(`[/-](?:${form})$`);
    expect(DIM_SAMPLES.filter((entry) => tail.test(entry.sample)).length).toBeGreaterThan(0);
  });

  it.each(DIM_SAMPLES)('reads $sample as $label through both patterns', (entry) => {
    // The divergence arm. A widening that reaches one pattern and not the other
    // is the whole defect of #530, and both patterns are built from `source`,
    // so this reads the alphabet entry rather than a copy of it.
    expect(restingDims(`tabular-nums ${entry.sample}`)).toEqual([entry.sample]);
    expect(`tabular-nums ${entry.sample}`.match(ANY_DIM)).toEqual([entry.sample]);
    // And the variant chain has to parse this spelling too, or a new entry
    // arrives refusing `disabled:` states the gate is supposed to allow.
    expect(restingDims(`rounded-full disabled:${entry.sample}`)).toEqual([]);
    // The sample has to exercise ITS OWN spelling. Without this a lazy sample
    // caught by an earlier entry gives a passing arm that never reads the new
    // pattern at all — an arm per spelling that is not an arm per spelling.
    const matched = DIM_SPELLINGS.filter((other) =>
      new RegExp(`^(?:${other.source})$`).test(entry.sample)
    );
    expect(matched).toEqual([entry.spelling]);
  });

  it('finds no resting dim outside an inactive control', () => {
    const offenders = literals.flatMap((literal) =>
      restingDims(literal.text).map((className) => `${literal.file}:${literal.line} ${className}`)
    );
    expect(offenders).toEqual([]);
  });

  it.each([
    ['cursor-not-allowed', 'inline-flex cursor-not-allowed text-ink-3 opacity-60', []],
    ['disabled:', 'rounded-full disabled:opacity-60', []],
    ['hover:', 'transition-opacity hover:opacity-90', []],
    ['group-hover:', 'group-hover:opacity-0', []],
    ['a bare dim', 'tabular-nums opacity-65', ['opacity-65']],
    ['a dim beside a variant one', 'opacity-80 disabled:opacity-60', ['opacity-80']],
    ['a dim at the start of the literal', 'opacity-90 text-sm', ['opacity-90']],
    // The spellings #530 added, and the constructs they must not swallow.
    ['an arbitrary-value dim', 'tabular-nums opacity-[0.6]', ['opacity-[0.6]']],
    ['a variant arbitrary-value dim', 'rounded-full disabled:opacity-[0.6]', []],
    [
      'an alpha on a colour literal',
      'tabular-nums text-[color:var(--btn-ink)]/65',
      ['text-[color:var(--btn-ink)]/65'],
    ],
    ['an alpha on a bare var colour literal', 'text-[var(--ink)]/60', ['text-[var(--ink)]/60']],
    ['a variant alpha on a colour literal', 'hover:text-[color:var(--ink)]/60', []],
    // The two spellings the review of #533 found, both green against a red
    // `opacity-[0.6]` control before this: a plain-token alpha, and an
    // arbitrary alpha value that `/\d+` could not reach.
    ['an alpha on a plain colour token', 'tabular-nums text-white/70', ['text-white/70']],
    ['a variant alpha on a plain colour token', 'hover:text-white/70', []],
    [
      'an arbitrary alpha on a colour literal',
      'tabular-nums text-[color:var(--ink)]/[0.65]',
      ['text-[color:var(--ink)]/[0.65]'],
    ],
    ['an arbitrary alpha on a plain colour token', 'text-ink-3/[0.65]', ['text-ink-3/[0.65]']],
    // The residual the review of #535 found, measured wider here: the v4
    // CSS-variable shorthand `(--x)` was missing from the alphabet in BOTH
    // positions — as the colour the utility takes, and as the alpha itself.
    // All six were green at `a2a989c` against a red `opacity-[0.6]` control.
    ['an alpha on a var-shorthand colour', 'tabular-nums text-(--ink)/60', ['text-(--ink)/60']],
    [
      'a typed alpha on a var-shorthand colour',
      'text-(color:--ink)/65 font-normal',
      ['text-(color:--ink)/65'],
    ],
    [
      'an arbitrary alpha on a var-shorthand colour',
      'text-(--ink)/[0.6] tabular-nums',
      ['text-(--ink)/[0.6]'],
    ],
    ['a variant alpha on a var-shorthand colour', 'hover:text-(--ink)/60', []],
    ['a var alpha on an opacity utility', 'tabular-nums opacity-(--fade)', ['opacity-(--fade)']],
    ['a var alpha on a plain colour token', 'text-white/(--fade)', ['text-white/(--fade)']],
    [
      'a var alpha on a colour literal',
      'text-[color:var(--ink)]/(--fade)',
      ['text-[color:var(--ink)]/(--fade)'],
    ],
    ['a var alpha on a var-shorthand colour', 'text-(--ink)/(--fade)', ['text-(--ink)/(--fade)']],
    ['a variant var alpha', 'disabled:opacity-(--fade)', []],
    // `text-[13px]/5` and `text-sm/6` are line-height modifiers and `border-…/40`,
    // `bg-surface/72` dim a GROUND, not an ink. Reading either as a dim would
    // report lines this gate has no measurement for, so the `color:`/`var(`
    // discriminator, the type-scale exclusion and the `text-` prefix are all
    // pinned here.
    ['a line-height modifier on a bracketed size', 'text-[13px]/5 font-semibold', []],
    ['a line-height modifier on the type scale', 'text-sm/6 font-semibold', []],
    ['a line-height modifier on a numbered type scale', 'text-2xl/8 tracking-tight', []],
    ['an alpha on a border literal', 'border border-[var(--success)]/40 px-4', []],
    ['an alpha on a bare ground utility', 'rounded-2xl bg-surface/72 backdrop-blur-md', []],
    ['an arbitrary alpha on a bare ground utility', 'bg-surface/[0.72] px-3', []],
    ['a line-height modifier on a var-shorthand size', 'text-(length:--s)/6 font-bold', []],
    ['an alpha on a var-shorthand ground', 'rounded-2xl bg-(--surface)/72 px-3', []],
    ['an alpha on a var-shorthand border', 'border border-(--success)/40 px-4', []],
  ])('reads %s correctly', (_label, literal, expected) => {
    expect(restingDims(literal as string)).toEqual(expected);
    // `transition-opacity` and `duration-200` are not dims; the partition arm
    // above depends on the gate never counting them. Read through `ANY_DIM` so
    // this stays the canary's question — do both patterns see the same thing —
    // rather than a second hand-written copy of the alphabet.
    expect(dimsIn(literal as string).length).toBe(
      ((literal as string).match(ANY_DIM) ?? []).length
    );
  });
});

// The arithmetic the three removals above rest on. Held as a negative arm, the
// same shape #526 used for the banner details: each is what the site measured
// while it was shipping, so a token change that would make the dim survivable
// has to retire these deliberately rather than quietly.
describe('the resting dims removed for #525', () => {
  let themes: Record<'light' | 'dark', string>;

  beforeAll(() => {
    themes = themeBlocks(readFileSync(GLOBALS, 'utf8'));
  });

  const ADMIN_ROW = [
    { cell: 'account email', ink: 'ink' },
    { cell: 'display name', ink: 'ink-faint' },
    { cell: 'last sign-in', ink: 'ink-muted' },
  ];

  it.each(ADMIN_ROW)('the admins $cell clears AA undimmed on the card', ({ ink }) => {
    for (const name of ['light', 'dark'] as const) {
      const surface = flat(themes[name], 'screen')!;
      expect(contrast(flat(themes[name], ink)!, surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(ADMIN_ROW)('rejects the admins $cell at the row dim of 0.6', ({ ink }) => {
    // Light is the binding theme; dark fails on two of the three, and asserting
    // it here would pin a number that is allowed to move.
    const surface = flat(themes.light, 'screen')!;
    const text = dimmed(flat(themes.light, ink)!, 0.6, surface);
    expect(contrast(text, surface)).toBeLessThan(4.5);
  });

  it.each(['light', 'dark'] as const)(
    'rejects the %s filter-pill count at 0.65 on an unselected pill',
    (name) => {
      // Unselected, so the count renders in --ink-muted straight onto the page.
      const surface = flat(themes[name], 'page')!;
      const ink = flat(themes[name], 'ink-muted')!;
      expect(contrast(ink, surface)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(dimmed(ink, 0.65, surface), surface)).toBeLessThan(4.5);
    }
  );

  it.each(['light', 'dark'] as const)(
    'the %s selected pill would have survived the same dim',
    (name) => {
      // The control arm: the dim is not uniformly fatal, so the removals above
      // are about the unselected state rather than about opacity as such.
      const surface = flat(themes[name], 'cta')!;
      const ink = flat(themes[name], 'cta-text')!;
      expect(contrast(dimmed(ink, 0.65, surface), surface)).toBeGreaterThanOrEqual(4.5);
    }
  );
});
