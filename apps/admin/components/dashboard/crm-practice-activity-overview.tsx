"use client";

import { useState } from "react";

export type PracticeActivityColumn = {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => React.ReactNode;
};

export type PracticeActivityRow = Record<string, unknown> & {
  name: string;
  city: string;
  country: string;
  lastActivity: string;
  status: string;
  statusColor: string;
};

type CrmPracticeActivityOverviewProps = {
  rows: PracticeActivityRow[];
  totalCount: number;
  columns: PracticeActivityColumn[];
  searchPlaceholder?: string;
};

export function CrmPracticeActivityOverview({
  rows,
  totalCount,
  columns,
  searchPlaceholder = "Search practices",
}: CrmPracticeActivityOverviewProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <section className="relative">
      <div className="sticky top-0 z-10 -mx-1 -mt-1 border-b border-transparent bg-white/95 px-1 pb-4 pt-1 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-xl font-semibold text-[#302F2E]">Practice Activity Overview</h3>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-gray-200 py-2 pl-3 pr-10 text-sm text-[#302F2E] placeholder-gray-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>
            <select className="rounded-xl border-0 bg-gray-50 px-4 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
              <option>Status</option>
            </select>
            <select className="rounded-xl border-0 bg-gray-50 px-4 py-2 text-sm text-[#302F2E] outline-none focus:outline-none focus:ring-0">
              <option>30D</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Practice Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Region</th>
                {columns.map((col) => (
                  <th key={col.key} className="px-6 py-4 text-left text-sm font-medium text-gray-600">
                    {col.label}
                  </th>
                ))}
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Last Activity</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.name}-${i}`} className="border-b border-gray-100 last:border-0">
                  <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                  <td className="px-6 py-4">
                    <div>
                      <span className="block text-sm font-medium text-[#302F2E]">{row.city}</span>
                      <span className="block text-xs text-gray-500">{row.country}</span>
                    </div>
                  </td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm font-medium text-[#302F2E]">
                      {col.render ? col.render(row) : String(row[col.key] ?? "")}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.lastActivity}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${row.statusColor}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm text-gray-600">Showing {start}–{end} of {totalCount}</span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </section>
  );
}
