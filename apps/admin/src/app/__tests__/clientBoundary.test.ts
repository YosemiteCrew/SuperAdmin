import {
  analyseClientBoundary,
  analyseSources,
  isScannableModule,
  isTypeOnlyClause,
  leadingDirectives,
  normalisePath,
  readEdges,
  stripComments,
  type SourceFile,
} from '../../../scripts/clientBoundary';

describe('the client/server module boundary in this app', () => {
  const report = analyseClientBoundary();

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

describe('analyseSources', () => {
  const serverOnly: SourceFile = {
    path: 'features/store.ts',
    source: "import 'server-only';\n\nexport const readSecret = (): string => 'x';\n",
  };

  const leakPaths = (...files: SourceFile[]): string[] =>
    analyseSources([serverOnly, ...files]).leaks.map((leak) => leak.path.join(' -> '));

  it('reports a client module importing a server-only module directly', () => {
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source:
          "'use client';\nimport { readSecret } from '@/features/store';\nexport const P = readSecret;\n",
      })
    ).toEqual(['Panel.tsx -> features/store.ts']);
  });

  it('reports a client entry that imports server-only itself', () => {
    // The most direct instance of the class, and the one a graph walk cannot see:
    // `server-only` is a package specifier, so no edge is ever created for it.
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source: "'use client';\nimport 'server-only';\nexport const P = 1;\n",
      })
    ).toEqual(['Panel.tsx']);
  });

  it('is silent on the same file when it is not a client entry', () => {
    // The control for the case above: a server module may import server-only.
    expect(
      leakPaths({ path: 'Panel.tsx', source: "import 'server-only';\nexport const P = 1;\n" })
    ).toEqual([]);
  });

  it('reports a client entry that imports server-only itself even when nothing imports it', () => {
    // A leaf client component rendered by a server page is reachable from no client
    // entry but its own, which is exactly when the walk alone goes quiet.
    const report = analyseSources([
      serverOnly,
      { path: 'Leaf.tsx', source: "'use client';\nimport 'server-only';\nexport const L = 1;\n" },
      {
        path: 'Page.tsx',
        source: "import { L } from './Leaf';\nexport default function Page() { return L; }\n",
      },
    ]);
    expect(report.leaks.map((leak) => leak.path.join(' -> '))).toEqual(['Leaf.tsx']);
  });

  it('reads an import clause that spans several lines', () => {
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source:
          "'use client';\nimport {\n  readSecret,\n} from '@/features/store';\nexport const P = readSecret;\n",
      })
    ).toEqual(['Panel.tsx -> features/store.ts']);
  });

  it('reports the leak through an intermediate module that carries no directive', () => {
    expect(
      leakPaths(
        {
          path: 'lib/util.ts',
          source: "import { readSecret } from '@/features/store';\nexport const u = readSecret;\n",
        },
        {
          path: 'Panel.tsx',
          source: "'use client';\nimport { u } from '@/lib/util';\nexport const P = u;\n",
        }
      )
    ).toEqual(['Panel.tsx -> lib/util.ts -> features/store.ts']);
  });

  it('does not report a type-only import, which the compiler erases', () => {
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source:
          "'use client';\nimport type { readSecret } from '@/features/store';\nexport type P = typeof readSecret;\n",
      })
    ).toEqual([]);
  });

  it('does not report a path through a server action, whose imports stay on the server', () => {
    expect(
      leakPaths(
        {
          path: 'search.ts',
          source:
            "'use server';\nimport { readSecret } from '@/features/store';\nexport const search = async () => readSecret();\n",
        },
        {
          path: 'Panel.tsx',
          source: "'use client';\nimport { search } from '@/search';\nexport const P = search;\n",
        }
      )
    ).toEqual([]);
  });

  it('reports a dynamic import, which is still bundled for the client', () => {
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source:
          "'use client';\nexport const P = async () => (await import('@/features/store')).readSecret();\n",
      })
    ).toEqual(['Panel.tsx -> features/store.ts']);
  });

  it('does not read an import that only appears inside a comment', () => {
    // Deliberately a BLOCK comment. A `//` sits immediately before the `import`
    // keyword and the edge regex already refuses that line, so a line comment is
    // green whether or not comments are stripped at all. Inside a block comment
    // the import starts its own line, so this is the input that separates the two.
    expect(
      leakPaths({
        path: 'Panel.tsx',
        source:
          "'use client';\n/*\nimport { readSecret } from '@/features/store';\n*/\nexport const P = 1;\n",
      })
    ).toEqual([]);
  });

  it('starts only from client entries, so a server component may import freely', () => {
    expect(
      leakPaths({
        path: 'Page.tsx',
        source:
          "import { readSecret } from '@/features/store';\nexport default function Page() { return readSecret(); }\n",
      })
    ).toEqual([]);
  });

  it('follows a relative specifier and a directory index as well as the alias', () => {
    expect(
      leakPaths(
        { path: 'features/index.ts', source: "export { readSecret } from './store';\n" },
        {
          path: 'Panel.tsx',
          source:
            "'use client';\nimport { readSecret } from './features';\nexport const P = readSecret;\n",
        }
      )
    ).toEqual(['Panel.tsx -> features/index.ts -> features/store.ts']);
  });

  it('resolves a relative specifier that climbs out of its own directory', () => {
    expect(
      leakPaths({
        path: 'ui/panels/Panel.tsx',
        source:
          "'use client';\nimport { readSecret } from '../../features/store';\nexport const P = readSecret;\n",
      })
    ).toEqual(['ui/panels/Panel.tsx -> features/store.ts']);
  });

  it('resolves a source file whose own name contains a dot', () => {
    expect(
      leakPaths(
        { path: 'features/store.legacy.ts', source: serverOnly.source },
        {
          path: 'Panel.tsx',
          source:
            "'use client';\nimport { readSecret } from './features/store.legacy';\nexport const P = readSecret;\n",
        }
      )
    ).toEqual(['Panel.tsx -> features/store.legacy.ts']);
  });

  it('does not call a stylesheet import an unresolved module', () => {
    const report = analyseSources([
      serverOnly,
      {
        path: 'Panel.tsx',
        source: "'use client';\nimport './Panel.module.css';\nexport const P = 1;\n",
      },
    ]);
    expect(report.unresolvedLocalSpecifiers).toEqual([]);
  });

  it('names a local specifier it could not resolve instead of dropping it', () => {
    const report = analyseSources([
      serverOnly,
      {
        path: 'Panel.tsx',
        source:
          "'use client';\nimport { gone } from '@/features/notThere';\nexport const P = gone;\n",
      },
    ]);
    expect(report.unresolvedLocalSpecifiers).toEqual(['Panel.tsx :: @/features/notThere']);
  });
});

describe('isScannableModule', () => {
  it.each([
    ['app/ui/Panel.tsx', true],
    ['app/lib/util.ts', true],
    ['app/legacy/thing.js', true],
  ])('scans %s', (path, expected) => {
    expect(isScannableModule(path)).toBe(expected);
  });

  it.each([
    // Not part of any bundle Next ships.
    ['app/__tests__/panel.test.ts', false],
    ['app/ui/Panel.test.tsx', false],
    ['app/ui/Panel.stories.tsx', false],
    ['app/jest.mocks/nextNavigation.ts', false],
    ['app/globals.css', false],
  ])('skips %s', (path, expected) => {
    expect(isScannableModule(path)).toBe(expected);
  });
});

describe('normalisePath', () => {
  it.each([
    ['app/ui/../lib/util', 'app/lib/util'],
    ['./app/./ui/Panel', 'app/ui/Panel'],
    ['app/ui/panels/../../features/store', 'app/features/store'],
  ])('folds %s', (path, expected) => {
    expect(normalisePath(path)).toBe(expected);
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
