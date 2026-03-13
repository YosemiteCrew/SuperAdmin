"use client";

export type PendingVerificationRow = {
  name: string;
  city: string;
  country: string;
  completion: string;
  pending: string;
};

type CrmPendingVerificationsProps = {
  count: number;
  rows: PendingVerificationRow[];
};

export function CrmPendingVerifications({ count, rows }: CrmPendingVerificationsProps) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <h3 className="text-xl font-semibold text-[#302F2E]">Pending Verifications</h3>
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
          {count}
        </span>
      </div>
      <div className="overflow-hidden rounded-[25px] border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Practice Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Region</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Profile Completion</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Pending Since</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="block text-sm font-medium text-[#302F2E]">{row.city}</span>
                      <span className="block text-xs text-gray-500">{row.country}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.completion}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.pending}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-[#302F2E]"
                      title="View"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
