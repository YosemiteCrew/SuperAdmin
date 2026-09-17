import fs from 'node:fs';
import path from 'node:path';

import { stripComments } from '../../../scripts/clientBoundary';

/**
 * Every page under `(routes)/(dashboard)` must call `requireSuperAdmin` in its
 * own component body.
 *
 * The shared dashboard layout already calls it, and that is not sufficient. In
 * the App Router a `redirect()` raised by a layout does not stop React
 * rendering the page beside it, and Next serialises whatever rendered into the
 * BODY of the 3xx response. Measured against a running panel, signed in on an
 * account holding no super-admin role: `GET /audit` answered `307 -> /forbidden`
 * with a 43 KB body carrying an audit entry's actor email and target email. The
 * pages that called the guard themselves answered the same 307 with no row data
 * in the body. So the layout call is defence in depth and the page call is the
 * boundary.
 *
 * Nothing else in this suite looks at it. Each page's own test mocks
 * `@/app/config/backend`, so a page that never calls the guard renders happily
 * there; tsc, eslint and the a11y sweep are all blind to it; and the symptom is
 * invisible in a browser, which follows the redirect and never shows the body.
 *
 * What this checks and what it does not: it reads each page's default export
 * body from source and requires a `requireSuperAdmin(` call inside it. That
 * catches the regression that actually happened - a new page relying on the
 * layout - and it cannot prove the call precedes every read. The end-to-end
 * proof is the request above; this is the tripwire that keeps a page added
 * tomorrow from reopening the hole silently.
 */

const DASHBOARD_DIR = path.join(__dirname, '..', '(routes)', '(dashboard)');
const GUARD_CALL = 'requireSuperAdmin(';

/** Every `page.tsx` under the dashboard route group, relative to that group. */
function findPages(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return findPages(path.join(dir, entry.name), rel);
      return entry.name === 'page.tsx' ? [rel] : [];
    })
    .sort();
}

const QUOTES = new Set(['"', "'", '`']);

/** Index just past the string or template literal opening at `start`. */
function pastStringLiteral(source: string, start: number): number {
  const quote = source[start];
  let i = start + 1;
  while (i < source.length && source[i] !== quote) {
    i += source[i] === '\\' ? 2 : 1;
  }
  return i + 1;
}

/**
 * Index just past the `{` that opens the component body, given a position
 * inside its parameter list. The parameter list may carry an inline type with
 * braces of its own, so the body is the first `{` seen at paren depth zero.
 */
function bodyStart(source: string, from: number): number {
  let i = from;
  let parens = 1;
  while (i < source.length) {
    const ch = source[i];
    if (QUOTES.has(ch)) {
      i = pastStringLiteral(source, i);
      continue;
    }
    if (ch === '{' && parens === 0) return i + 1;
    if (ch === '(') parens += 1;
    if (ch === ')') parens -= 1;
    i += 1;
  }
  return -1;
}

/** Index of the `}` closing the block that opened just before `from`. */
function blockEnd(source: string, from: number): number {
  let i = from;
  let depth = 1;
  while (i < source.length) {
    const ch = source[i];
    if (QUOTES.has(ch)) {
      i = pastStringLiteral(source, i);
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
    i += 1;
  }
  return -1;
}

/**
 * The body of the default-exported component, brace matched from its opening
 * `{`. String and template literals are skipped so a brace inside one cannot
 * unbalance the count; comments are already gone.
 */
export function defaultExportBody(sourceWithoutComments: string): string | null {
  const signature = /export\s+default\s+async\s+function\s+\w+\s*\(/.exec(sourceWithoutComments);
  if (!signature) return null;

  const start = bodyStart(sourceWithoutComments, signature.index + signature[0].length);
  if (start === -1) return null;

  const end = blockEnd(sourceWithoutComments, start);
  return end === -1 ? null : sourceWithoutComments.slice(start, end);
}

const PAGES = findPages(DASHBOARD_DIR);
const BODIES = new Map<string, string | null>(
  PAGES.map((rel) => [
    rel,
    defaultExportBody(stripComments(fs.readFileSync(path.join(DASHBOARD_DIR, rel), 'utf8'))),
  ])
);

describe('every (dashboard) page authorises itself', () => {
  // Vacuity controls first. Every assertion below is driven by `PAGES` and
  // `BODIES`; an empty walk or a parser that returned nothing would make the
  // file pass by finding nothing to object to, which is the exact failure this
  // file exists to prevent.
  it('found the dashboard pages on disk', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(20);
    expect(PAGES).toEqual(
      expect.arrayContaining([
        'audit/page.tsx',
        'dashboard/page.tsx',
        'users/page.tsx',
        'privacy/requests/page.tsx',
      ])
    );
  });

  it('parsed a component body out of every page it found', () => {
    const unparsed = PAGES.filter((rel) => !BODIES.get(rel));
    expect(unparsed).toEqual([]);
    // A parser that returns a one-character body would satisfy the line above.
    const shortest = Math.min(...PAGES.map((rel) => (BODIES.get(rel) as string).length));
    expect(shortest).toBeGreaterThan(100);
  });

  it('rejects a component body that does not call the guard', () => {
    // The predicate has to be able to come out the other way, or every result
    // below is a tautology. Same parser, same check, a body without the call.
    const body = defaultExportBody(
      stripComments(
        'export default async function Page() {\n' +
          '  // requireSuperAdmin( in a comment must not count\n' +
          '  const rows = await listEverything();\n' +
          '  return rows.length;\n' +
          '}\n'
      )
    );
    expect(body).not.toBeNull();
    expect(body as string).not.toContain(GUARD_CALL);
  });

  it('accepts a component body that does call the guard', () => {
    const body = defaultExportBody(
      stripComments(
        'export default async function Page({ searchParams }: Readonly<{ x: { y: 1 } }>) {\n' +
          "  await requireSuperAdmin('page');\n" +
          '  return searchParams;\n' +
          '}\n'
      )
    );
    expect(body as string).toContain(GUARD_CALL);
  });

  it.each(PAGES)('%s calls requireSuperAdmin in its own component body', (rel) => {
    expect(BODIES.get(rel) as string).toContain(GUARD_CALL);
  });
});
