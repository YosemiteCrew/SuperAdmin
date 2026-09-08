import { validateMetadata, withoutOverrideHeader } from '../../../../scripts/check-pnpm-overrides';

describe('pnpm override monitoring', () => {
  it('compares resolution without treating the expected override-header change as evidence', () => {
    const lockfile =
      "lockfileVersion: '6.0'\n\noverrides:\n  qs@<2: 2.0.0\n\nimporters:\n  .: {}\n\npackages:\n  /qs@2.0.0: {}\n";

    expect(withoutOverrideHeader(lockfile)).toBe(
      "lockfileVersion: '6.0'\n\nimporters:\n  .: {}\n\npackages:\n  /qs@2.0.0: {}\n"
    );
  });

  it('reports both undocumented overrides and reasons left behind after removal', () => {
    expect(
      validateMetadata(
        { active: '2', missing: '3' },
        { active: 'why', stale: 'old' },
        { active: true, staleEffect: false }
      )
    ).toEqual({
      missingReasons: ['missing'],
      staleReasons: ['stale'],
      missingEffects: ['missing'],
      staleEffects: ['staleEffect'],
    });
  });
});
