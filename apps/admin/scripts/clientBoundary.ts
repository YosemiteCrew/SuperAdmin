/**
 * Static analysis of the client/server module boundary.
 *
 * A `'use client'` module that imports a *runtime value* from a module which does
 * `import 'server-only'` compiles, type-checks, lints and passes jest, then returns
 * a 500 in the browser on first render — jest mocks `server-only` away, so no unit
 * test can reach it. This walks the import graph from every client entry and reports
 * the paths that arrive at a `server-only` module.
 *
 * Two edges are deliberately NOT followed, because following them would flag code
 * that works:
 *
 *   - `import type` / `export type`, which the compiler erases.
 *   - anything reached through a `'use server'` module, whose exports become RPC
 *     references and whose own imports never enter the client bundle.
 *
 * This lives under `scripts/` rather than `src/` on purpose: it reads the filesystem,
 * and a filesystem reader sitting in `src/app/lib` is one careless import away from
 * being the very defect this file exists to detect.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';

const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

/** Not part of any bundle Next ships, so not part of the boundary. */
const EXCLUDED_PATH_SEGMENTS = ['node_modules', '__tests__', 'jest.mocks'];
const EXCLUDED_FILE_PATTERN = /\.(test|spec|stories)\.[jt]sx?$/;

export interface BoundaryEdge {
  specifier: string;
  /** True when the compiler erases the import, which makes it harmless. */
  typeOnly: boolean;
}

export interface BoundaryLeak {
  /** Client entry first, `server-only` module last, every hop in between. */
  path: string[];
}

export interface BoundaryReport {
  modulesScanned: number;
  clientEntries: number;
  serverOnlyModules: number;
  serverActionModules: number;
  /** Local (relative or `@/`) specifiers that resolved to a scanned module. */
  localEdgesResolved: number;
  /** Local specifiers that did not, as `<file> :: <specifier>`. */
  unresolvedLocalSpecifiers: string[];
  leaks: BoundaryLeak[];
}

/**
 * One recursive `readdirSync` rather than a hand-rolled walk: the directory tree
 * is read in a single call, so no derived path is handed to a second filesystem
 * call to ask what it is.
 */
function listSourceFiles(root: string): string[] {
  return readdirSync(root, { recursive: true, encoding: 'utf8' })
    .map((entry) => entry.split(sep))
    .filter((segments) => {
      const name = segments[segments.length - 1];
      return (
        !segments.some((segment) => EXCLUDED_PATH_SEGMENTS.includes(segment)) &&
        SOURCE_EXTENSIONS.some((ext) => name.endsWith(ext)) &&
        !EXCLUDED_FILE_PATTERN.test(name)
      );
    })
    .map((segments) => join(root, ...segments));
}

/**
 * Blanks out comments while leaving string literals intact, so that a specifier
 * inside a comment is not read as an edge and a `//` inside a URL is not read as
 * the start of one.
 */
interface Consumed {
  text: string;
  next: number;
}

/** Copies a string or template literal verbatim, honouring backslash escapes. */
function consumeStringLiteral(source: string, start: number): Consumed {
  const quote = source[start];
  let text = quote;
  let i = start + 1;
  while (i < source.length && source[i] !== quote) {
    if (source[i] === '\\') {
      text += source.slice(i, i + 2);
      i += 2;
      continue;
    }
    text += source[i];
    i += 1;
  }
  return { text: text + (source[i] ?? ''), next: i + 1 };
}

/** Skips a block comment, keeping its newlines so line numbers do not shift. */
function consumeBlockComment(source: string, start: number): Consumed {
  let text = '';
  let i = start + 2;
  while (i < source.length && source.slice(i, i + 2) !== '*/') {
    if (source[i] === '\n') text += '\n';
    i += 1;
  }
  return { text, next: i + 2 };
}

function endOfLine(source: string, start: number): number {
  let i = start;
  while (i < source.length && source[i] !== '\n') i += 1;
  return i;
}

/**
 * Blanks out comments while leaving string literals intact, so that a specifier
 * inside a comment is not read as an edge and a `//` inside a URL is not read as
 * the start of one.
 */
export function stripComments(source: string): string {
  let out = '';
  let i = 0;
  while (i < source.length) {
    const two = source.slice(i, i + 2);
    if (two === '//') {
      i = endOfLine(source, i);
    } else if (two === '/*') {
      const consumed = consumeBlockComment(source, i);
      out += consumed.text;
      i = consumed.next;
    } else if (source[i] === '"' || source[i] === "'" || source[i] === '`') {
      const consumed = consumeStringLiteral(source, i);
      out += consumed.text;
      i = consumed.next;
    } else {
      out += source[i];
      i += 1;
    }
  }
  return out;
}

/** Directives that lead the file, ahead of any statement. */
export function leadingDirectives(sourceWithoutComments: string): Set<string> {
  const directives = new Set<string>();
  const leader = /^\s*((?:['"]use [a-z-]+['"]\s*;?\s*)+)/.exec(sourceWithoutComments);
  if (!leader) return directives;
  for (const match of leader[1].matchAll(/['"](use [a-z-]+)['"]/g)) directives.add(match[1]);
  return directives;
}

/**
 * `true` only when every binding is erased: a bare `import type`/`export type`, or
 * a brace list in which each entry carries its own `type` keyword. A default or
 * namespace binding alongside them keeps the import at runtime.
 */
export function isTypeOnlyClause(clause: string): boolean {
  const trimmed = clause.trim();
  if (/^type\s/.test(trimmed)) return true;
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return false;
  const bindings = trimmed
    .slice(1, -1)
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  if (bindings.length === 0) return false;
  return bindings.every((b) => /^type\s+\S/.test(b));
}

const STATIC_IMPORT = /(?:^|[\n;])\s*(?:import|export)\s+([\s\S]*?)\s*from\s*['"]([^'"]+)['"]/g;
const SIDE_EFFECT_IMPORT = /(?:^|[\n;])\s*import\s*['"]([^'"]+)['"]/g;
const DYNAMIC_IMPORT = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

export function readEdges(sourceWithoutComments: string): BoundaryEdge[] {
  const edges: BoundaryEdge[] = [];
  for (const m of sourceWithoutComments.matchAll(STATIC_IMPORT)) {
    edges.push({ specifier: m[2], typeOnly: isTypeOnlyClause(m[1]) });
  }
  for (const m of sourceWithoutComments.matchAll(SIDE_EFFECT_IMPORT)) {
    edges.push({ specifier: m[1], typeOnly: false });
  }
  // A dynamic import inside a client module is still bundled for the client.
  for (const m of sourceWithoutComments.matchAll(DYNAMIC_IMPORT)) {
    edges.push({ specifier: m[1], typeOnly: false });
  }
  return edges;
}

const PACKAGE_SPECIFIER = Symbol('package');

/**
 * Resolves against the set of files already listed rather than against the disk.
 * That keeps resolution and scanning in step — a specifier that resolves to a file
 * the walk never read would otherwise count as resolved and then be silently
 * dropped — and it means no derived path is ever handed to the filesystem.
 */
function resolveSpecifier(
  specifier: string,
  fromFile: string,
  srcRoot: string,
  known: Set<string>
): string | null | typeof PACKAGE_SPECIFIER {
  let base: string;
  if (specifier.startsWith('@/')) base = join(srcRoot, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(fromFile), specifier);
  else return PACKAGE_SPECIFIER;

  const candidates = [
    ...SOURCE_EXTENSIONS.map((ext) => resolve(base + ext)),
    ...SOURCE_EXTENSIONS.map((ext) => resolve(join(base, `index${ext}`))),
    resolve(base),
  ];
  const hit = candidates.find((candidate) => known.has(candidate));
  if (hit) return hit;

  // A specifier that names an extension of its own and still matched nothing is a
  // stylesheet or an asset, not a module this walk can follow. Checked after the
  // candidates so that a source file whose name merely contains a dot still wins.
  const named = /\.[^./\\]+$/.exec(specifier)?.[0];
  if (named && !SOURCE_EXTENSIONS.includes(named)) return PACKAGE_SPECIFIER;
  return null;
}

interface ModuleFacts {
  isClientEntry: boolean;
  isServerAction: boolean;
  importsServerOnly: boolean;
  edges: BoundaryEdge[];
}

interface ResolvedEdge {
  target: string;
  typeOnly: boolean;
}

interface ResolvedGraph {
  edges: Map<string, ResolvedEdge[]>;
  localEdgesResolved: number;
  unresolvedLocalSpecifiers: string[];
}

function readModules(root: string): Map<string, ModuleFacts> {
  const modules = new Map<string, ModuleFacts>();
  for (const file of listSourceFiles(root)) {
    const source = stripComments(readFileSync(file, 'utf8'));
    const directives = leadingDirectives(source);
    const edges = readEdges(source);
    modules.set(resolve(file), {
      isClientEntry: directives.has('use client'),
      isServerAction: directives.has('use server'),
      importsServerOnly: edges.some((e) => e.specifier === 'server-only' && !e.typeOnly),
      edges,
    });
  }
  return modules;
}

/** Resolves every specifier once, so the walk never touches the disk again. */
function resolveGraph(
  modules: Map<string, ModuleFacts>,
  root: string,
  asRelative: (file: string) => string
): ResolvedGraph {
  const known = new Set(modules.keys());
  const edges = new Map<string, ResolvedEdge[]>();
  const unresolvedLocalSpecifiers: string[] = [];
  let localEdgesResolved = 0;

  for (const [file, facts] of modules) {
    const resolvedEdges: ResolvedEdge[] = [];
    for (const edge of facts.edges) {
      const target = resolveSpecifier(edge.specifier, file, root, known);
      if (target === PACKAGE_SPECIFIER) continue;
      if (target === null) {
        unresolvedLocalSpecifiers.push(`${asRelative(file)} :: ${edge.specifier}`);
        continue;
      }
      localEdgesResolved += 1;
      resolvedEdges.push({ target, typeOnly: edge.typeOnly });
    }
    edges.set(file, resolvedEdges);
  }
  return { edges, localEdgesResolved, unresolvedLocalSpecifiers };
}

/** Every `server-only` module reachable from one client entry, with the route taken. */
function leaksFromEntry(
  entry: string,
  modules: Map<string, ModuleFacts>,
  graph: ResolvedGraph,
  asRelative: (file: string) => string
): BoundaryLeak[] {
  const found: BoundaryLeak[] = [];
  const seen = new Set<string>([entry]);
  const queue: Array<{ file: string; path: string[] }> = [{ file: entry, path: [entry] }];

  while (queue.length > 0) {
    const current = queue.shift() as { file: string; path: string[] };
    for (const edge of graph.edges.get(current.file) ?? []) {
      const target = modules.get(edge.target);
      // A server action is the boundary: what it imports stays on the server.
      if (edge.typeOnly || seen.has(edge.target) || !target || target.isServerAction) continue;
      seen.add(edge.target);
      const path = [...current.path, edge.target];
      if (target.importsServerOnly) found.push({ path: path.map(asRelative) });
      else queue.push({ file: edge.target, path });
    }
  }
  return found;
}

export function analyseClientBoundary(srcRoot: string): BoundaryReport {
  const root = resolve(srcRoot);
  const asRelative = (file: string): string => relative(root, file).split(sep).join('/');
  const modules = readModules(root);
  const graph = resolveGraph(modules, root, asRelative);

  const leaks: BoundaryLeak[] = [];
  for (const [entry, facts] of modules) {
    if (facts.isClientEntry) leaks.push(...leaksFromEntry(entry, modules, graph, asRelative));
  }

  const count = (predicate: (f: ModuleFacts) => boolean): number =>
    [...modules.values()].filter(predicate).length;

  return {
    modulesScanned: modules.size,
    clientEntries: count((f) => f.isClientEntry),
    serverOnlyModules: count((f) => f.importsServerOnly),
    serverActionModules: count((f) => f.isServerAction),
    localEdgesResolved: graph.localEdgesResolved,
    unresolvedLocalSpecifiers: graph.unresolvedLocalSpecifiers,
    leaks,
  };
}
