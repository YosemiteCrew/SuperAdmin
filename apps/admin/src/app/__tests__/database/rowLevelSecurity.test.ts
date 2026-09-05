/**
 * @jest-environment node
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every table this panel owns must have row level security enabled by a
 * migration.
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
const IF_EXISTS = 'IF EXISTS ';

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

/**
 * Tables switched to row level security by the given migration SQL.
 *
 * Matches on the whole statement, so `DISABLE ROW LEVEL SECURITY` is not read
 * as an enable - a substring search would count it and report a table as
 * protected while a later migration had turned it off.
 */
export function rlsEnabledTables(migrationSql: string[]): string[] {
  const enabled = new Set<string>();

  for (const sql of migrationSql) {
    for (const statement of stripComments(sql).split(';')) {
      const flat = statement.replace(/\s+/g, ' ').trim();
      const upper = flat.toUpperCase();

      if (!upper.startsWith(ALTER_PREFIX) || !upper.endsWith(ENABLE_SUFFIX)) {
        continue;
      }

      let identifier = flat.slice(ALTER_PREFIX.length, flat.length - ENABLE_SUFFIX.length).trim();
      if (identifier.toUpperCase().startsWith(IF_EXISTS)) {
        identifier = identifier.slice(IF_EXISTS.length);
      }

      enabled.add(unquote(identifier));
    }
  }

  return [...enabled].sort((a, b) => a.localeCompare(b));
}

export function tablesMissingRls(schema: string, migrationSql: string[]): string[] {
  const enabled = new Set(rlsEnabledTables(migrationSql));
  return tableNamesFromSchema(schema).filter((table) => !enabled.has(table));
}

function readMigrationSql(): string[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(MIGRATIONS_DIR, entry.name, 'migration.sql'))
    .map((file) => readFileSync(file, 'utf8'));
}

const schemaSource = readFileSync(join(PRISMA_DIR, 'schema.prisma'), 'utf8');
const migrationSql = readMigrationSql();

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
