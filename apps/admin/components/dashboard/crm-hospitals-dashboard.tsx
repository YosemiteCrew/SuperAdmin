"use client";

import Link from "next/link";
import { CrmFeaturesDropoff } from "./crm-features-dropoff";
import { PracticeActivityOverview } from "./practice-activity-overview";

const HOSPITALS_STAT_CARDS = [
  {
    label: "Total Practices",
    value: "814",
    change: "+8%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "New Signups",
    value: "29",
    change: "-15%",
    trend: "down" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
  },
  {
    label: "Daily Active Users",
    value: "598",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    label: "Avg Appointments / Month",
    value: "85",
    change: "+42%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: "Churn Risk Count",
    value: "12",
    change: "-37%",
    trend: "down" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "Pending Verifications",
    value: "5",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Inactive Practices",
    value: "27",
    change: "-14%",
    trend: "down" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    label: "Monthly Recurring Revenue (MRR)",
    value: "$2569",
    change: "+54%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

const HOSPITALS_PENDING_ROWS = [
  { name: "Waggy Tails Vet", city: "London", country: "United Kingdom", completion: "95%", pending: "6 hrs" },
  { name: "Cozy Paws", city: "New York", country: "USA", completion: "78%", pending: "23 hrs" },
  { name: "UrbanPet Clinic", city: "Berlin", country: "Germany", completion: "86%", pending: "2 days" },
  { name: "Paw & Claws", city: "London", country: "United Kingdom", completion: "94%", pending: "4 days" },
  { name: "MediVet", city: "New Delhi", country: "India", completion: "79%", pending: "7 days" },
];

export function CrmHospitalsDashboard() {
  return (
    <div className="space-y-8">
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-[#302F2E]">Home</Link>
        <span className="mx-1.5">/</span>
        <Link href="/client-crm" className="hover:text-[#302F2E]">CRM</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#302F2E]">Hospitals</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-semibold text-[#302F2E]">CRM Dashboard - Hospitals</h1>
          <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            5 Practices Awaiting Verification
          </span>
        </div>
        <select className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#302F2E]">
          <option>Last 30 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {HOSPITALS_STAT_CARDS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-gray-200 text-[#302F2E]">
              {stat.icon}
            </div>
            <p className="text-sm font-normal text-gray-500">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-2xl font-semibold text-[#302F2E]">{stat.value}</p>
              <span
                className={`flex items-center text-sm font-medium ${
                  stat.trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {stat.trend === "up" ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                )}
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-xl font-semibold text-[#302F2E]">Pending Verifications</h3>
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
            5
          </span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
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
                {HOSPITALS_PENDING_ROWS.map((row) => (
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

      <PracticeActivityOverview />

      <CrmFeaturesDropoff />
    </div>
  );
}
