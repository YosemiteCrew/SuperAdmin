import type { Metadata } from 'next';

import { requireSuperAdmin } from '@/app/config/backend';
import { getDataRequestStats, listDataRequests } from '@/app/features/dataRequests/store';
import { RequestsTable } from './RequestsTable';

export const metadata: Metadata = {
  title: 'Data Requests',
};

export default async function PrivacyRequestsPage() {
  await requireSuperAdmin();

  // Fix a single "now" so the deadline badges and the overdue count are
  // computed against the same instant (no SSR/client hydration drift).
  const now = new Date();
  const [requests, stats] = await Promise.all([listDataRequests(), getDataRequestStats(now)]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Data requests</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track GDPR data-subject requests (access, erasure, rectification, objection) against the
          one-month statutory response deadline.
        </p>
      </div>

      <div className="flex gap-4">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Open</p>
          <p className="mt-1 text-2xl font-semibold text-blue-700">{stats.open}</p>
        </div>
        <div
          className={`rounded-lg border px-4 py-3 ${
            stats.overdue > 0 ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white'
          }`}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Overdue</p>
          <p
            className={`mt-1 text-2xl font-semibold ${
              stats.overdue > 0 ? 'text-red-700' : 'text-gray-900'
            }`}
          >
            {stats.overdue}
          </p>
        </div>
      </div>

      <RequestsTable requests={requests} nowMs={now.getTime()} />
    </div>
  );
}
