/**
 * @jest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const REPO_ROOT = path.resolve(__dirname, '../../../../../..');
const WORKFLOW_DIR = path.join(REPO_ROOT, '.github/workflows');
const AMPLIFY_SPEC = path.join(REPO_ROOT, 'amplify.yml');
const NVMRC = path.join(REPO_ROOT, '.nvmrc');
const WORKSPACE_DIRS = ['apps', 'packages'] as const;

// Literal pins only. `node-version: ${{ env.NODE_VERSION }}` carries no version
// of its own — the value it resolves to is collected from its own declaration.
const LITERAL_PIN = /^\s*(?:node-version|NODE_VERSION):\s*'?(\d+)(?:\.\d+)*'?\s*$/;
const NVM_USE = /^\s*-\s*nvm use (\d+)(?:\.\d+)*\s*\|\|\s*nvm install \d+(?:\.\d+)*\s*$/;

// At least one pin per workflow that installs Node, so a regex that silently
// stops matching cannot pass as agreement between nothing and nothing.
const MINIMUM_WORKFLOW_PINS = 8;

type Pin = { readonly site: string; readonly major: string };

function pinsInFile(relativePath: string, pattern: RegExp): Pin[] {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')
    .split('\n')
    .flatMap((line, index) => {
      const match = pattern.exec(line);
      return match ? [{ site: `${relativePath}:${index + 1}`, major: match[1] }] : [];
    });
}

function workflowPins(): Pin[] {
  return readdirSync(WORKFLOW_DIR)
    .filter((name) => /\.ya?ml$/.test(name))
    .sort()
    .flatMap((name) => pinsInFile(`.github/workflows/${name}`, LITERAL_PIN));
}

function amplifyPins(): Pin[] {
  return pinsInFile('amplify.yml', NVM_USE);
}

function nodeTypePins(): Pin[] {
  return WORKSPACE_DIRS.flatMap((workspaceDir) =>
    readdirSync(path.join(REPO_ROOT, workspaceDir), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const relativePath = `${workspaceDir}/${entry.name}/package.json`;
        const manifest = JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        const specifier =
          manifest.dependencies?.['@types/node'] ?? manifest.devDependencies?.['@types/node'];

        return specifier
          ? [{ site: `${relativePath} @types/node`, major: declaredMajor(specifier) }]
          : [];
      })
  );
}

function declaredMajor(specifier: string): string {
  const match = /(\d+)/.exec(specifier);
  if (!match) throw new Error(`no major in specifier ${specifier}`);
  return match[1];
}

describe('Node version pins', () => {
  it('reads every kind of pin it is meant to compare', () => {
    // Without these floors an agreement check passes on an empty set.
    expect(workflowPins().length).toBeGreaterThanOrEqual(MINIMUM_WORKFLOW_PINS);
    expect(amplifyPins()).toHaveLength(1);
    expect(nodeTypePins().length).toBeGreaterThanOrEqual(2);
    expect(readFileSync(NVMRC, 'utf8').trim()).toMatch(/^\d+(\.\d+)*$/);
    expect(readdirSync(WORKFLOW_DIR).length).toBeGreaterThan(0);
    expect(readFileSync(AMPLIFY_SPEC, 'utf8')).toContain('nvm use');
  });

  it('names one Node major in .nvmrc, amplify.yml, every workflow and @types/node', () => {
    const expected = declaredMajor(readFileSync(NVMRC, 'utf8').trim());

    const pins: Pin[] = [...workflowPins(), ...amplifyPins(), ...nodeTypePins()];

    expect(
      pins.filter((pin) => pin.major !== expected).map((pin) => `${pin.site} pins ${pin.major}`)
    ).toEqual([]);
  });
});
