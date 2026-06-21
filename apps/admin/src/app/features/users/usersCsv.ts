import { rowsToCsv } from '@/app/lib/csv';

export interface UserCsvRow {
  email: string;
  methods: string;
  tenants: string;
  joined: string;
  userId: string;
}

const HEADERS = ['Email', 'Login methods', 'Tenants', 'Joined', 'User ID'] as const;

/** Serialises user rows into a CSV string with a header row. */
export function usersToCsv(rows: UserCsvRow[]): string {
  return rowsToCsv(
    HEADERS,
    rows.map((row) => [row.email, row.methods, row.tenants, row.joined, row.userId])
  );
}
