import readline from 'node:readline';
import { pathToFileURL } from 'node:url';

const MAX_ROWS = 10_000;
const SUBJECTS = new Map([
  ['GENERAL_ENQUIRY', 'General Enquiry'],
  ['FEATURE_REQUEST', 'Feature Request'],
  ['DSAR', 'Data Subject Access Request'],
  ['COMPLAINT', 'Complaint'],
]);

function requiredString(value, field, max) {
  if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > max) {
    throw new TypeError(`${field} must be a non-empty string of at most ${max} characters.`);
  }
  return value.trim();
}

function optionalString(value, field, max) {
  if (value === null || value === undefined || value === '') return null;
  return requiredString(value, field, max);
}

function isValidEmail(value) {
  if (/\s/u.test(value)) return false;
  const at = value.indexOf('@');
  if (at <= 0 || at !== value.lastIndexOf('@')) return false;
  const domain = value.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return domain.length >= 3 && dot > 0 && dot < domain.length - 1;
}

export function parseRow(value) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Each input line must be a JSON object.');
  }

  const sourceRequestId = requiredString(value.sourceRequestId, 'sourceRequestId', 100);
  const email = requiredString(value.email, 'email', 254).toLowerCase();
  if (!isValidEmail(email)) throw new TypeError('email must be valid.');

  const type = requiredString(value.type, 'type', 50);
  const subject = SUBJECTS.get(type);
  if (!subject) throw new TypeError('type is not a supported contact request type.');

  const createdAt = new Date(requiredString(value.createdAt, 'createdAt', 100));
  if (Number.isNaN(createdAt.getTime())) throw new TypeError('createdAt must be an ISO timestamp.');

  return {
    sourceRequestId,
    email,
    name: optionalString(value.name, 'name', 200),
    phone: optionalString(value.phone, 'phone', 50),
    subject,
    message: requiredString(value.message, 'message', 5000),
    createdAt,
  };
}

export async function readRows(input) {
  const rows = [];
  const seen = new Set();
  const lines = readline.createInterface({ input, crlfDelay: Infinity });

  for await (const line of lines) {
    if (line.trim().length === 0) continue;
    if (rows.length >= MAX_ROWS) throw new RangeError(`Input exceeds the ${MAX_ROWS}-row limit.`);

    let value;
    try {
      value = JSON.parse(line);
    } catch {
      throw new TypeError(`Line ${rows.length + 1} is not valid JSON.`);
    }
    const row = parseRow(value);
    if (seen.has(row.sourceRequestId)) {
      throw new TypeError(`Duplicate sourceRequestId at line ${rows.length + 1}.`);
    }
    seen.add(row.sourceRequestId);
    rows.push(row);
  }

  if (rows.length === 0) throw new TypeError('No contact requests were provided on stdin.');
  return rows;
}

export function sameImportedRequest(existing, row) {
  return (
    existing.lead.email === row.email &&
    existing.subject === row.subject &&
    existing.message === row.message &&
    existing.createdAt.getTime() === row.createdAt.getTime()
  );
}

export async function importRow(prisma, row) {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.contactLead.upsert({
      where: { email: row.email },
      create: {
        email: row.email,
        name: row.name,
        phone: row.phone,
        newsletterConsent: false,
        createdAt: row.createdAt,
      },
      update: {},
    });

    await tx.contactLead.updateMany({
      where: { id: lead.id, createdAt: { gt: row.createdAt } },
      data: { createdAt: row.createdAt },
    });
    if (row.name) {
      await tx.contactLead.updateMany({
        where: { id: lead.id, name: null },
        data: { name: row.name },
      });
    }
    if (row.phone) {
      await tx.contactLead.updateMany({
        where: { id: lead.id, phone: null },
        data: { phone: row.phone },
      });
    }

    // Prisma emits INSERT ... ON CONFLICT DO NOTHING for skipDuplicates. The
    // unique sourceRequestId therefore closes the concurrent-rerun race rather
    // than relying on a check followed by an insert.
    const inserted = await tx.contactRequest.createMany({
      data: [
        {
          sourceRequestId: row.sourceRequestId,
          leadId: lead.id,
          subject: row.subject,
          message: row.message,
          createdAt: row.createdAt,
        },
      ],
      skipDuplicates: true,
    });

    const stored = await tx.contactRequest.findUnique({
      where: { sourceRequestId: row.sourceRequestId },
      include: { lead: true },
    });
    if (!stored || !sameImportedRequest(stored, row)) {
      throw new Error(`Source request ${row.sourceRequestId} already exists with different data.`);
    }
    return inserted.count === 1 ? 'created' : 'skipped';
  });
}

export async function importRows(prisma, rows) {
  const result = { created: 0, skipped: 0 };
  for (const row of rows) {
    result[await importRow(prisma, row)] += 1;
  }
  return result;
}

async function main() {
  const apply = process.argv.slice(2).includes('--apply');
  const unexpected = process.argv.slice(2).filter((arg) => arg !== '--apply');
  if (unexpected.length > 0) throw new TypeError(`Unknown argument: ${unexpected[0]}`);

  const rows = await readRows(process.stdin);
  if (!apply) {
    console.log(
      `Validated ${rows.length} contact request(s); no database writes made. Pass --apply to import.`
    );
    return;
  }

  const { PrismaClient } = await import('../../../packages/database/src/generated/client/index.js');
  const prisma = new PrismaClient();
  try {
    const result = await importRows(prisma, rows);
    console.log(
      `Contact backfill complete: ${result.created} created, ${result.skipped} already present.`
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Contact backfill failed.');
    process.exitCode = 1;
  });
}
