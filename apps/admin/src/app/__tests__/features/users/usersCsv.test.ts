import { usersToCsv, type UserCsvRow } from '@/app/features/users/usersCsv';

function row(over: Partial<UserCsvRow> = {}): UserCsvRow {
  return {
    email: 'a@x.com',
    methods: 'emailpassword',
    tenants: 'public',
    joined: '2026-01-02T03:04:05.000Z',
    userId: 'u-1',
    ...over,
  };
}

describe('usersToCsv', () => {
  it('emits just the header row when there are no users', () => {
    expect(usersToCsv([])).toBe('Email,Login methods,Tenants,Joined,User ID');
  });

  it('emits one row per user', () => {
    const csv = usersToCsv([row(), row({ email: 'b@x.com', userId: 'u-2' })]);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe('a@x.com,emailpassword,public,2026-01-02T03:04:05.000Z,u-1');
    expect(lines[2]).toContain('b@x.com');
  });
});
