/**
 * @jest-environment node
 */
import { Readable } from 'node:stream';

import { importRow, parseRow, readRows, sameImportedRequest } from '../import-contact-backfill.mjs';

const input = {
  sourceRequestId: '11111111-1111-4111-8111-111111111111',
  email: ' Person@Example.test ',
  name: 'Synthetic Person',
  phone: '+1 555 0100',
  type: 'COMPLAINT',
  message: 'A synthetic contact request.',
  createdAt: '2026-09-01T12:34:56.789Z',
};

describe('contact backfill parser', () => {
  it('normalizes a product contact row and preserves its timestamp', () => {
    expect(parseRow(input)).toEqual({
      sourceRequestId: input.sourceRequestId,
      email: 'person@example.test',
      name: input.name,
      phone: input.phone,
      subject: 'Complaint',
      message: input.message,
      createdAt: new Date(input.createdAt),
    });
  });

  it.each([
    [{ ...input, sourceRequestId: '' }, 'sourceRequestId'],
    [{ ...input, email: 'not-an-email' }, 'email'],
    [{ ...input, type: 'UNKNOWN' }, 'type'],
    [{ ...input, message: '' }, 'message'],
    [{ ...input, createdAt: 'not-a-date' }, 'createdAt'],
  ])('rejects malformed source data', (row, field) => {
    expect(() => parseRow(row)).toThrow(field);
  });

  it('rejects duplicate source ids before opening a database connection', async () => {
    const line = JSON.stringify(input);
    await expect(readRows(Readable.from(`${line}\n${line}\n`))).rejects.toThrow(
      'Duplicate sourceRequestId'
    );
  });
});

describe('contact backfill write', () => {
  function mockPrisma(insertedCount: number, storedOverrides = {}) {
    const row = parseRow(input);
    const tx = {
      contactLead: {
        upsert: jest.fn().mockResolvedValue({ id: 'lead-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contactRequest: {
        createMany: jest.fn().mockResolvedValue({ count: insertedCount }),
        findUnique: jest.fn().mockResolvedValue({
          lead: { email: row.email },
          subject: row.subject,
          message: row.message,
          createdAt: row.createdAt,
          ...storedOverrides,
        }),
      },
    };
    return {
      row,
      tx,
      prisma: { $transaction: (callback: (value: typeof tx) => unknown) => callback(tx) },
    };
  }

  it('uses conflict-safe insertion and reports a new row', async () => {
    const { prisma, row, tx } = mockPrisma(1);
    await expect(importRow(prisma, row)).resolves.toBe('created');
    expect(tx.contactRequest.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true })
    );
  });

  it('treats a byte-equivalent source row as an idempotent rerun', async () => {
    const { prisma, row } = mockPrisma(0);
    await expect(importRow(prisma, row)).resolves.toBe('skipped');
  });

  it('refuses a source-id collision carrying different data', async () => {
    const { prisma, row } = mockPrisma(0, { message: 'Different synthetic message.' });
    await expect(importRow(prisma, row)).rejects.toThrow('already exists with different data');
  });

  it('compares the fields that identify an imported request', () => {
    const row = parseRow(input);
    expect(
      sameImportedRequest(
        {
          lead: { email: row.email },
          subject: row.subject,
          message: row.message,
          createdAt: row.createdAt,
        },
        row
      )
    ).toBe(true);
  });
});
