import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

import { leadingDirectives, stripComments } from '../../../scripts/clientBoundary';

const APP_DIR = path.join(__dirname, '..');
const ALLOWLIST = new Map([
  [
    '(routes)/accept-invite/actions.ts#acceptInviteAction',
    'The caller is an invitee who does not hold the super-admin role yet.',
  ],
]);

interface ActionFunction {
  body: ts.ConciseBody;
  exported: boolean;
  name: string;
}

interface ActionModule {
  functions: Map<string, ActionFunction>;
  path: string;
}

function findSourceFiles(dir: string, prefix = ''): string[] {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) return findSourceFiles(path.join(dir, entry.name), relativePath);
      return /\.[jt]sx?$/.test(entry.name) ? [relativePath] : [];
    })
    .sort();
}

function hasModifier(node: ts.Node, kind: ts.SyntaxKind): boolean {
  return (
    ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((item) => item.kind === kind) === true
  );
}

function isAsync(node: ts.Node): boolean {
  return hasModifier(node, ts.SyntaxKind.AsyncKeyword);
}

function parseFunctions(source: string, fileName: string): Map<string, ActionFunction> {
  const sourceFile = ts.createSourceFile(
    fileName,
    stripComments(source),
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const functions = new Map<string, ActionFunction>();

  for (const statement of sourceFile.statements) {
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      statement.body &&
      isAsync(statement)
    ) {
      functions.set(statement.name.text, {
        body: statement.body,
        exported: hasModifier(statement, ts.SyntaxKind.ExportKeyword),
        name: statement.name.text,
      });
      continue;
    }
    if (!ts.isVariableStatement(statement)) continue;

    const exported = hasModifier(statement, ts.SyntaxKind.ExportKeyword);
    for (const declaration of statement.declarationList.declarations) {
      if (
        !ts.isIdentifier(declaration.name) ||
        !declaration.initializer ||
        (!ts.isArrowFunction(declaration.initializer) &&
          !ts.isFunctionExpression(declaration.initializer)) ||
        !isAsync(declaration.initializer)
      ) {
        continue;
      }
      functions.set(declaration.name.text, {
        body: declaration.initializer.body,
        exported,
        name: declaration.name.text,
      });
    }
  }
  return functions;
}

function firstAwait(body: ts.ConciseBody): ts.AwaitExpression | null {
  let found: ts.AwaitExpression | null = null;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (node !== body && ts.isFunctionLike(node)) return;
    if (ts.isAwaitExpression(node)) {
      found = node;
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(body);
  return found;
}

function plainCall(expression: ts.Expression): ts.CallExpression | null {
  return ts.isCallExpression(expression) &&
    !expression.questionDotToken &&
    ts.isIdentifier(expression.expression)
    ? expression
    : null;
}

function returnedHelper(body: ts.ConciseBody): string | null {
  let expression: ts.Expression | undefined;
  if (ts.isBlock(body)) {
    if (body.statements.length !== 1 || !ts.isReturnStatement(body.statements[0])) return null;
    expression = body.statements[0].expression;
  } else {
    expression = body;
  }
  const call = expression && plainCall(expression);
  return call && ts.isIdentifier(call.expression) ? call.expression.text : null;
}

function isGuarded(
  name: string,
  functions: Map<string, ActionFunction>,
  visited = new Set<string>()
): boolean {
  if (visited.has(name)) return false;
  visited.add(name);

  const action = functions.get(name);
  if (!action) return false;
  const awaited = firstAwait(action.body);
  if (!awaited) {
    const helper = returnedHelper(action.body);
    return helper ? isGuarded(helper, functions, visited) : false;
  }

  const call = plainCall(awaited.expression);
  if (!call || !ts.isIdentifier(call.expression)) return false;
  if (call.expression.text === 'requireSuperAdmin') return call.arguments.length === 0;
  return isGuarded(call.expression.text, functions, visited);
}

function parseModule(relativePath: string, source: string): ActionModule {
  return { functions: parseFunctions(source, relativePath), path: relativePath };
}

const MODULES = findSourceFiles(APP_DIR)
  .map((relativePath) => ({
    relativePath,
    source: fs.readFileSync(path.join(APP_DIR, relativePath), 'utf8'),
  }))
  .filter(({ source }) => leadingDirectives(stripComments(source)).has('use server'))
  .map(({ relativePath, source }) => parseModule(relativePath, source));

const EXPORTS = MODULES.flatMap((actionModule) =>
  [...actionModule.functions.values()]
    .filter((action) => action.exported)
    .map((action) => ({ action, actionModule }))
);

describe('every server action authorises before its first await', () => {
  it('finds the server-action surface on disk', () => {
    expect(MODULES.length).toBeGreaterThanOrEqual(20);
    expect(EXPORTS.length).toBeGreaterThanOrEqual(44);
    expect(MODULES.map((module) => module.path)).toEqual(
      expect.arrayContaining([
        '(routes)/(dashboard)/users/[id]/actions.ts',
        '(routes)/(dashboard)/organizations/actions.ts',
        '(routes)/accept-invite/actions.ts',
        'ui/overlays/CommandPalette/searchAction.ts',
      ])
    );
  });

  it('documents the only action that intentionally has no super-admin guard', () => {
    expect(ALLOWLIST).toEqual(
      new Map([
        [
          '(routes)/accept-invite/actions.ts#acceptInviteAction',
          'The caller is an invitee who does not hold the super-admin role yet.',
        ],
      ])
    );
  });

  it.each([
    ['no guard', "'use server'; export async function action() { await write(); }"],
    [
      'guard after an awaited write',
      "'use server'; export async function action() { await write(); await requireSuperAdmin(); }",
    ],
    [
      'a swallowed guard',
      "'use server'; export async function action() { await requireSuperAdmin().catch(() => null); }",
    ],
    [
      'a transformed guard',
      "'use server'; export async function action() { await requireSuperAdmin().then(() => null); }",
    ],
    [
      'an optional guard',
      "'use server'; export async function action() { await requireSuperAdmin?.(); }",
    ],
  ])('rejects %s', (_name, source) => {
    const actionModule = parseModule('fixture.ts', source);
    expect(isGuarded('action', actionModule.functions)).toBe(false);
  });

  it('accepts a direct guard and a same-module guarded helper', () => {
    const direct = parseModule(
      'direct.ts',
      "'use server'; export async function action() { await requireSuperAdmin(); await write(); }"
    );
    const delegated = parseModule(
      'delegated.ts',
      "'use server'; async function guarded() { await requireSuperAdmin(); await write(); } export async function action() { return guarded(); }"
    );
    expect(isGuarded('action', direct.functions)).toBe(true);
    expect(isGuarded('action', delegated.functions)).toBe(true);
  });

  it.each(EXPORTS)('$actionModule.path#$action.name is guarded', ({ action, actionModule }) => {
    const key = `${actionModule.path}#${action.name}`;
    if (ALLOWLIST.has(key)) return;
    expect(isGuarded(action.name, actionModule.functions)).toBe(true);
  });
});
