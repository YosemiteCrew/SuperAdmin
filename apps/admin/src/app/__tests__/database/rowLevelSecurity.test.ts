/**
 * @jest-environment node
 */
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Every table this panel owns must have row level security enabled by a
 * migration, still enabled once every later migration has run, and covered by no
 * policy.
 *
 * RLS is not what keeps this data private today - the REST roles have no grant
 * on the panel's schema at all - so nothing breaks the day it is missing, and
 * nothing tells anyone either. It is the second control behind a single
 * mistaken GRANT, on tables holding marketing leads, the consent ledger and
 * GDPR data-subject requests. A defence that is only ever load bearing after
 * someone else's error is exactly the kind that rots unnoticed, so it gets a
 * test rather than a note in a document.
 *
 * The project-level guard cannot do this job: it is a Postgres event trigger
 * scoped to the `public` schema, and every table here is created in the panel's
 * own schema, so it has never fired for us. This test is the guard that does
 * fire - on the next model, in review, before it reaches a database.
 */

const PRISMA_DIR = join(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '..',
  'packages',
  'database',
  'prisma'
);
const MIGRATIONS_DIR = join(PRISMA_DIR, 'migrations');

const ALTER_PREFIX = 'ALTER TABLE ';
const ENABLE_SUFFIX = ' ENABLE ROW LEVEL SECURITY';
const DISABLE_SUFFIX = ' DISABLE ROW LEVEL SECURITY';
// In the order Postgres accepts them: ALTER TABLE [ IF EXISTS ] [ ONLY ] name.
const TABLE_MODIFIERS = ['IF EXISTS ', 'ONLY '];
const POLICY_STATEMENT = /\b(?:CREATE|ALTER) POLICY\b/;

function unquote(identifier: string): string {
  return identifier.replaceAll('"', '').trim();
}

/**
 * Drop `--` line comments.
 *
 * Statements are split on `;`, so without this the leading comment block of a
 * migration is glued to its first statement and that statement stops looking
 * like an `ALTER TABLE` - which is exactly how this check first reported a
 * table as unprotected while the migration protecting it sat two lines below.
 */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .map((line) => {
      const comment = line.indexOf('--');
      return comment === -1 ? line : line.slice(0, comment);
    })
    .join('\n');
}

/**
 * Table names declared by the Prisma schema, honouring `@@map`.
 *
 * Parsed line by line rather than with a block regex: the file is small, and a
 * lazy multi-line pattern is both harder to read and the shape the repo's
 * `sonarjs/slow-regex` rule exists to keep out.
 */
export function tableNamesFromSchema(schema: string): string[] {
  const tables: string[] = [];
  let modelName: string | null = null;
  let mappedName: string | null = null;

  for (const raw of schema.split('\n')) {
    const line = raw.trim();

    if (modelName === null) {
      if (line.startsWith('model ')) {
        modelName = line.slice('model '.length).split(' ')[0];
        mappedName = null;
      }
      continue;
    }

    if (line.startsWith('@@map(')) {
      const first = line.indexOf('"');
      const last = line.lastIndexOf('"');
      if (first !== -1 && last > first) {
        mappedName = line.slice(first + 1, last);
      }
      continue;
    }

    if (line === '}') {
      tables.push(mappedName ?? modelName);
      modelName = null;
      mappedName = null;
    }
  }

  return tables.sort((a, b) => a.localeCompare(b));
}

/** Statements of a migration, comments dropped and whitespace collapsed. */
function statements(sql: string): string[] {
  return stripComments(sql)
    .split(';')
    .map((statement) => statement.replace(/\s+/g, ' ').trim())
    .filter((statement) => statement.length > 0);
}

/**
 * The table an ALTER TABLE names: its first identifier after the modifiers, with
 * quotes and any schema qualifier dropped. Only the first token is read, so an
 * RLS action that ends a multi-action ALTER TABLE still resolves to its table.
 */
function alteredTable(afterAlter: string): string {
  let rest = afterAlter;
  for (const modifier of TABLE_MODIFIERS) {
    if (rest.toUpperCase().startsWith(modifier)) {
      rest = rest.slice(modifier.length);
    }
  }
  const name = unquote(rest.split(' ')[0]);
  return name.slice(name.lastIndexOf('.') + 1);
}

/**
 * The row level security switch a statement makes, if any.
 *
 * Deliberately lopsided, so that a misreading errs toward reporting a table. An
 * ENABLE counts only as a whole `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
 * statement. A DISABLE counts wherever an ALTER TABLE ends in one, including
 * inside a DO block.
 */
function rlsSwitch(statement: string): { table: string; enabled: boolean } | null {
  const upper = statement.toUpperCase();

  if (upper.startsWith(ALTER_PREFIX) && upper.endsWith(ENABLE_SUFFIX)) {
    return { table: alteredTable(statement.slice(ALTER_PREFIX.length)), enabled: true };
  }

  const alter = upper.lastIndexOf(ALTER_PREFIX);
  if (alter !== -1 && upper.endsWith(DISABLE_SUFFIX)) {
    return { table: alteredTable(statement.slice(alter + ALTER_PREFIX.length)), enabled: false };
  }

  return null;
}

/**
 * Tables that still have row level security on after the given migrations run,
 * in the order given.
 *
 * The last ENABLE or DISABLE of a table wins, so a later migration that turns it
 * off takes the table back out. Matches on the whole statement, so `DISABLE ROW
 * LEVEL SECURITY` is never read as an enable.
 */
export function rlsEnabledTables(migrationSql: string[]): string[] {
  const enabled = new Map<string, boolean>();

  for (const sql of migrationSql) {
    for (const statement of statements(sql)) {
      const change = rlsSwitch(statement);
      if (change) {
        enabled.set(change.table, change.enabled);
      }
    }
  }

  return [...enabled]
    .filter(([, on]) => on)
    .map(([table]) => table)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Statements that create or change a row level security policy.
 *
 * The design has none. RLS with no policy denies every role that neither owns
 * the table nor bypasses RLS, and a single permissive policy undoes that while
 * RLS stays on, which is invisible to the enable check above. Matched anywhere
 * in a statement, so one inside a DO block is still reported.
 * `packages/database/scripts/assert-rls.sql` asserts the same of the database.
 */
export function policyStatements(migrationSql: string[]): string[] {
  return migrationSql
    .flatMap(statements)
    .filter((statement) => POLICY_STATEMENT.test(statement.toUpperCase()));
}

export function tablesMissingRls(schema: string, migrationSql: string[]): string[] {
  const enabled = new Set(rlsEnabledTables(migrationSql));
  return tableNamesFromSchema(schema).filter((table) => !enabled.has(table));
}

/**
 * Each migration's SQL, in the order Prisma applies them: by directory name.
 * The last switch per table wins, so the order is part of the answer, and it is
 * sorted here rather than left to whatever order `readdirSync` returns.
 */
export function readMigrationSql(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => Number(a > b) - Number(a < b))
    .map((name) => readFileSync(join(dir, name, 'migration.sql'), 'utf8'));
}

const schemaSource = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8');
const migrationSql = readMigrationSql(MIGRATIONS_DIR);

describe('row level security coverage', () => {
  // Identity checks first. Without them a parser that silently returned an
  // empty list would make the coverage assertion below pass by finding nothing
  // to be missing, which is the failure mode this whole file exists to prevent.
  it('reads the models declared in the Prisma schema', () => {
    // Deliberately a subset, not an exact list: adding a model should fail the
    // coverage assertion below and nothing else, so the failure names the real
    // problem instead of two tests disagreeing about a name.
    const known = [
      'APDirectoryListing',
      'APLicenseToken',
      'ConsentEvent',
      'ConsentSubject',
      'ContactLead',
      'ContactRequest',
      'DataRequest',
    ];
    const declared = tableNamesFromSchema(schemaSource);
    expect(declared).toEqual(expect.arrayContaining(known));
    expect(declared.length).toBeGreaterThanOrEqual(known.length);
  });

  it('reads the migration directory', () => {
    expect(migrationSql.length).toBeGreaterThan(0);
    expect(rlsEnabledTables(migrationSql).length).toBeGreaterThan(0);
  });

  it('enables row level security on every table the schema declares', () => {
    expect(tablesMissingRls(schemaSource, migrationSql)).toEqual([]);
  });

  it('creates and alters no row level security policy', () => {
    expect(policyStatements(migrationSql)).toEqual([]);
  });

  it('prevents row mutation and truncation of the audit log', () => {
    const sql = migrationSql.join('\n');
    expect(sql).toMatch(/BEFORE UPDATE OR DELETE ON "AuditEvent"/);
    expect(sql).toMatch(/BEFORE TRUNCATE ON "AuditEvent"/);
  });
});

describe('the coverage check itself', () => {
  const ONE_MODEL = 'model Widget {\n  id String @id\n}\n';

  it('reports a model that no migration protects', () => {
    expect(tablesMissingRls(ONE_MODEL, ['ALTER TABLE "Other" ENABLE ROW LEVEL SECURITY;'])).toEqual(
      ['Widget']
    );
  });

  it('accepts a model that a migration protects', () => {
    expect(
      tablesMissingRls(ONE_MODEL, ['ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;'])
    ).toEqual([]);
  });

  it('does not count DISABLE ROW LEVEL SECURITY as protection', () => {
    expect(
      tablesMissingRls(ONE_MODEL, ['ALTER TABLE "Widget" DISABLE ROW LEVEL SECURITY;'])
    ).toEqual(['Widget']);
  });

  it('honours @@map, which renames the table without renaming the model', () => {
    const mapped = 'model Widget {\n  id String @id\n\n  @@map("widgets")\n}\n';
    expect(tablesMissingRls(mapped, ['ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;'])).toEqual([
      'widgets',
    ]);
    expect(tablesMissingRls(mapped, ['ALTER TABLE "widgets" ENABLE ROW LEVEL SECURITY;'])).toEqual(
      []
    );
  });

  it('accepts unquoted identifiers, IF EXISTS and statements split over lines', () => {
    expect(
      tablesMissingRls(ONE_MODEL, ['ALTER TABLE IF EXISTS Widget\n  ENABLE ROW LEVEL\n  SECURITY;'])
    ).toEqual([]);
  });

  it('sees a statement that a comment block precedes', () => {
    expect(
      tablesMissingRls(ONE_MODEL, [
        '-- why this table is protected\n-- and a second line\nALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;',
      ])
    ).toEqual([]);
  });

  it('does not read a table name out of a comment', () => {
    expect(
      tablesMissingRls(ONE_MODEL, ['-- ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;'])
    ).toEqual(['Widget']);
  });

  it('ignores unrelated statements in the same file', () => {
    expect(
      tablesMissingRls(ONE_MODEL, [
        'CREATE TABLE "Widget" ("id" TEXT NOT NULL);\nALTER TABLE "Widget" ADD COLUMN "name" TEXT;',
      ])
    ).toEqual(['Widget']);
  });
});

describe('the check across migrations', () => {
  const ONE_MODEL = 'model Widget {\n  id String @id\n}\n';
  const ENABLE = 'ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;';
  const DISABLE = 'ALTER TABLE "Widget" DISABLE ROW LEVEL SECURITY;';

  it('reports a table that a later migration disables again', () => {
    expect(tablesMissingRls(ONE_MODEL, [ENABLE, DISABLE])).toEqual(['Widget']);
  });

  it('accepts a table that a later migration enables again', () => {
    expect(tablesMissingRls(ONE_MODEL, [ENABLE, DISABLE, ENABLE])).toEqual([]);
  });

  it('reads the last switch within one migration too', () => {
    expect(tablesMissingRls(ONE_MODEL, [`${ENABLE}\n${DISABLE}`])).toEqual(['Widget']);
  });

  it('reads a DISABLE inside a DO block', () => {
    expect(
      tablesMissingRls(ONE_MODEL, [
        ENABLE,
        'DO $$ BEGIN\n  ALTER TABLE "Widget" DISABLE ROW LEVEL SECURITY;\nEND $$;',
      ])
    ).toEqual(['Widget']);
  });

  it('reads a DISABLE that is schema-qualified, uses ONLY, or ends a multi-action ALTER', () => {
    expect(
      tablesMissingRls(ONE_MODEL, [
        ENABLE,
        'ALTER TABLE IF EXISTS ONLY "superadmin"."Widget" ADD COLUMN "x" TEXT, DISABLE ROW LEVEL SECURITY;',
      ])
    ).toEqual(['Widget']);
  });

  it('counts an ENABLE only as a whole statement, never from inside a DO block', () => {
    expect(
      tablesMissingRls(ONE_MODEL, [
        'DO $$ BEGIN\n  ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;\nEND $$;',
      ])
    ).toEqual(['Widget']);
  });

  describe('read from a migrations directory', () => {
    let dir: string;

    const writeMigration = (name: string, sql: string) => {
      mkdirSync(join(dir, name));
      writeFileSync(join(dir, name, 'migration.sql'), sql);
    };

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'rls-migrations-'));
      writeFileSync(join(dir, 'migration_lock.toml'), 'provider = "postgresql"\n');
    });

    afterEach(() => {
      rmSync(dir, { recursive: true, force: true });
    });

    // Written newest first in both cases, so the answer comes from the names.
    it('applies a later DISABLE after the ENABLE it follows', () => {
      writeMigration('20260102_disable', DISABLE);
      writeMigration('20260101_enable', ENABLE);
      expect(tablesMissingRls(ONE_MODEL, readMigrationSql(dir))).toEqual(['Widget']);
    });

    it('applies a later ENABLE after the DISABLE it follows', () => {
      writeMigration('20260102_enable', ENABLE);
      writeMigration('20260101_disable', DISABLE);
      expect(tablesMissingRls(ONE_MODEL, readMigrationSql(dir))).toEqual([]);
    });
  });
});

describe('the policy check', () => {
  it.each([
    ['a CREATE POLICY', 'CREATE POLICY "open" ON "Widget" USING (true);'],
    ['an ALTER POLICY', 'ALTER POLICY "open" ON "Widget" USING (true);'],
    [
      'a lower-case policy over several lines',
      'create\n  policy "open"\n  on "Widget" using (true);',
    ],
    [
      'a policy inside a DO block',
      'DO $$ BEGIN\n  CREATE POLICY "open" ON "Widget" USING (true);\nEND $$;',
    ],
  ])('reports %s', (_label, sql) => {
    expect(
      policyStatements([`ALTER TABLE "Widget" ENABLE ROW LEVEL SECURITY;\n${sql}`])
    ).toHaveLength(1);
  });

  it('does not read a policy out of a comment, a column name or a DROP POLICY', () => {
    expect(
      policyStatements([
        '-- CREATE POLICY "open" ON "Widget" USING (true);\n' +
          'ALTER TABLE "Widget" ADD COLUMN "policyVersion" TEXT;\n' +
          'DROP POLICY IF EXISTS "open" ON "Widget";',
      ])
    ).toEqual([]);
  });
});
