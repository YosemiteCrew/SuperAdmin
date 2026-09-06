import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import {
  analyseClientBoundary,
  isTypeOnlyClause,
  leadingDirectives,
  readEdges,
  stripComments,
} from '../../../scripts/clientBoundary';

const REAL_SRC = resolve(__dirname, '..', '..');

describe('the client/server module boundary in this app', () => {
  const report = analyseClientBoundary(REAL_SRC);

  it('has no client module that reaches a server-only module at runtime', () => {
    // Each entry is the full import path, so a failure names every hop rather
    // than only the two ends.
    expect(report.leaks.map((leak) => leak.path.join(' -> '))).toEqual([]);
  });

  // A boundary guard that has quietly stopped scanning is worse than no guard,
  // because it is believed. These assertions fail if the walk goes vacuous.
  it('actually scanned this app, rather than reporting a clean empty set', () => {
    expect(report.modulesScanned).toBeGreaterThan(150);
    expect(report.clientEntries).toBeGreaterThan(20);
    expect(report.serverOnlyModules).toBeGreaterThan(20);
    expect(report.serverActionModules).toBeGreaterThan(5);
    expect(report.localEdgesResolved).toBeGreaterThan(300);
  });

  it('resolved every local import specifier it found', () => {
    // A resolver that resolves nothing returns a confident clean. If a path
    // alias or a file extension is added, this reddens before the walk silently
    // stops covering whatever it can no longer follow.
    expect(report.unresolvedLocalSpecifiers).toEqual([]);
  });
});

describe('analyseClientBoundary', () => {
  let root: string;

  const write = (relPath: string, source: string): void => {
    const full = join(root, relPath);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, source);
  };

  const serverOnlyModule =
    "import 'server-only';\n\nexport const readSecret = (): string => 'x';\n";

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'client-boundary-'));
    write('features/store.ts', serverOnlyModule);
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  const leakPaths = (): string[] =>
    analyseClientBoundary(root).leaks.map((leak) => leak.path.join(' -> '));

  it('reports a client module importing a server-only module directly', () => {
    write(
      'Panel.tsx',
      "'use client';\nimport { readSecret } from '@/features/store';\nexport const P = readSecret;\n"
    );
    expect(leakPaths()).toEqual(['Panel.tsx -> features/store.ts']);
  });

  it('reports the leak through an intermediate module that carries no directive', () => {
    write(
      'lib/util.ts',
      "import { readSecret } from '@/features/store';\nexport const u = readSecret;\n"
    );
    write('Panel.tsx', "'use client';\nimport { u } from '@/lib/util';\nexport const P = u;\n");
    expect(leakPaths()).toEqual(['Panel.tsx -> lib/util.ts -> features/store.ts']);
  });

  it('does not report a type-only import, which the compiler erases', () => {
    write(
      'Panel.tsx',
      "'use client';\nimport type { readSecret } from '@/features/store';\nexport type P = typeof readSecret;\n"
    );
    expect(leakPaths()).toEqual([]);
  });

  it('does not report a path through a server action, whose imports stay on the server', () => {
    write(
      'search.ts',
      "'use server';\nimport { readSecret } from '@/features/store';\nexport const search = async () => readSecret();\n"
    );
    write(
      'Panel.tsx',
      "'use client';\nimport { search } from '@/search';\nexport const P = search;\n"
    );
    expect(leakPaths()).toEqual([]);
  });

  it('reports a dynamic import, which is still bundled for the client', () => {
    write(
      'Panel.tsx',
      "'use client';\nexport const P = async () => (await import('@/features/store')).readSecret();\n"
    );
    expect(leakPaths()).toEqual(['Panel.tsx -> features/store.ts']);
  });

  it('does not read an import that only appears inside a comment', () => {
    // Deliberately a BLOCK comment. A `//` sits immediately before the `import`
    // keyword and the edge regex already refuses that line, so a line comment is
    // green whether or not comments are stripped at all. Inside a block comment
    // the import starts its own line, so this is the input that separates the two.
    write(
      'Panel.tsx',
      "'use client';\n/*\nimport { readSecret } from '@/features/store';\n*/\nexport const P = 1;\n"
    );
    expect(leakPaths()).toEqual([]);
  });

  it('starts only from client entries, so a server component may import freely', () => {
    write(
      'Page.tsx',
      "import { readSecret } from '@/features/store';\nexport default function Page() { return readSecret(); }\n"
    );
    expect(leakPaths()).toEqual([]);
  });

  it('follows a relative specifier and a directory index as well as the alias', () => {
    write('features/index.ts', "export { readSecret } from './store';\n");
    write(
      'Panel.tsx',
      "'use client';\nimport { readSecret } from './features';\nexport const P = readSecret;\n"
    );
    expect(leakPaths()).toEqual(['Panel.tsx -> features/index.ts -> features/store.ts']);
  });

  it('names a local specifier it could not resolve instead of dropping it', () => {
    write(
      'Panel.tsx',
      "'use client';\nimport { gone } from '@/features/notThere';\nexport const P = gone;\n"
    );
    expect(analyseClientBoundary(root).unresolvedLocalSpecifiers).toEqual([
      'Panel.tsx :: @/features/notThere',
    ]);
  });

  it('ignores tests and stories, which are not part of any shipped bundle', () => {
    write(
      'Panel.test.tsx',
      "'use client';\nimport { readSecret } from '@/features/store';\nexport const P = readSecret;\n"
    );
    write(
      '__tests__/other.ts',
      "'use client';\nimport { readSecret } from '@/features/store';\nexport const P = readSecret;\n"
    );
    expect(leakPaths()).toEqual([]);
  });
});

describe('isTypeOnlyClause', () => {
  it.each([
    ['type { Hit }', true],
    ['type Hit', true],
    ['{ type Hit }', true],
    ['{ type Hit, type Miss }', true],
  ])('erases %s', (clause, expected) => {
    expect(isTypeOnlyClause(clause)).toBe(expected);
  });

  it.each([
    // `typeahead` starts with the four letters of `type` and is a value.
    ['{ typeahead }', false],
    ['{ type Hit, value }', false],
    ['Store, { type Hit }', false],
    ['* as store', false],
    ['{}', false],
  ])('keeps %s at runtime', (clause, expected) => {
    expect(isTypeOnlyClause(clause)).toBe(expected);
  });
});

describe('stripComments', () => {
  it('leaves a // inside a string literal alone', () => {
    const source = "const u = 'https://example.test/a'; // trailing\n";
    expect(stripComments(source)).toBe("const u = 'https://example.test/a'; \n");
  });

  it('removes a block comment but keeps the line count', () => {
    expect(stripComments('a\n/* one\ntwo */b\n')).toBe('a\n\nb\n');
  });

  it('does not end a string at an escaped quote', () => {
    expect(stripComments("const q = 'a\\'// b'; // gone\n")).toBe("const q = 'a\\'// b'; \n");
  });
});

describe('leadingDirectives and readEdges', () => {
  it('reads a directive that a licence comment precedes', () => {
    expect([
      ...leadingDirectives(stripComments("/* licence */\n'use client';\nexport const a = 1;\n")),
    ]).toEqual(['use client']);
  });

  it('does not read a use-client string that follows a statement', () => {
    expect([...leadingDirectives("const mode = 'use client';\n")]).toEqual([]);
  });

  it('reads a side-effect import as a runtime edge', () => {
    expect(readEdges("import 'server-only';\n")).toEqual([
      { specifier: 'server-only', typeOnly: false },
    ]);
  });

  it('reads a re-export as a runtime edge and a type re-export as erased', () => {
    expect(readEdges("export { a } from './a';\nexport type { B } from './b';\n")).toEqual([
      { specifier: './a', typeOnly: false },
      { specifier: './b', typeOnly: true },
    ]);
  });
});
