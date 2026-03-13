"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardStats,
  getRequest,
  listRequests,
  updateRequestStatus,
} from "../../../lib/api/contact-us";
import type {
  ContactUsRequest,
  DashboardStats,
  RequestStatus,
  RequestType,
} from "../../../types/contact-us";
import { RoundedDropdown } from "../../ui/rounded-dropdown";

const STATUS_COLORS: Record<RequestStatus, string> = {
  OPEN: "bg-purple-100 text-purple-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<RequestStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const TYPE_LABELS: Record<RequestType, string> = {
  GENERAL_ENQUIRY: "General Enquiry",
  FEATURE_REQUEST: "Feature Request",
  DSAR: "DSAR",
  COMPLAINT: "Complaint",
};

const SOURCE_LABELS: Record<string, string> = {
  MOBILE_APP: "Mobile App",
  PMS_WEB: "PMS Web",
  MARKETING_SITE: "Marketing Site",
};

function formatDate(s: string) {
  try {
    const d = new Date(s);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return s;
  }
}

function formatShortId(id: string) {
  return id.length > 10 ? `${id.slice(-8)}` : id;
}

type DetailModalProps = {
  id: string | null;
  onClose: () => void;
  onStatusUpdated: () => void;
};

function SupportRequestDetailModal({
  id,
  onClose,
  onStatusUpdated,
}: DetailModalProps) {
  const [req, setReq] = useState<ContactUsRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) {
      setReq(null);
      return;
    }
    setLoading(true);
    setError(null);
    getRequest(id)
      .then(setReq)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = useCallback(
    (newStatus: RequestStatus) => {
      if (!id || !req) return;
      setUpdating(true);
      updateRequestStatus(id, newStatus)
        .then((updated) => {
          setReq(updated);
          onStatusUpdated();
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Update failed"))
        .finally(() => setUpdating(false));
    },
    [id, req, onStatusUpdated]
  );

  if (!id) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[25px] border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <h3 className="text-xl font-semibold text-[#302F2E]">Request Details</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[25px] p-2 text-gray-500 hover:bg-gray-100 hover:text-[#302F2E]"
            aria-label="Close"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-6 sm:p-8">
          {loading && (
            <p className="py-8 text-center text-gray-500">Loading…</p>
          )}
          {error && (
            <p className="rounded-[25px] bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
          )}
          {req && !loading && (
            <div className="space-y-8">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Type</p>
                  <p className="text-sm font-medium text-[#302F2E]">{TYPE_LABELS[req.type] ?? req.type}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Source</p>
                  <p className="text-sm font-medium text-[#302F2E]">{SOURCE_LABELS[req.source] ?? req.source}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Status</p>
                  <div className="mt-1">
                    <RoundedDropdown
                      value={req.status}
                      onChange={(s) => handleStatusChange(s)}
                      options={(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
                        value: s,
                        label: STATUS_LABELS[s],
                      }))}
                      disabled={updating}
                      className={`px-3 py-1.5 text-xs font-medium ${STATUS_COLORS[req.status]}`}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Email</p>
                  <a href={`mailto:${req.email}`} className="text-sm font-medium text-[#3267D3] hover:underline">
                    {req.email}
                  </a>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Subject</p>
                <p className="text-base font-medium text-[#302F2E]">{req.subject}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Message</p>
                <p className="whitespace-pre-wrap rounded-[25px] border border-gray-100 bg-gray-50/80 p-4 text-sm leading-relaxed text-[#302F2E]">
                  {req.message}
                </p>
              </div>

              {req.dsarDetails && (
                <div className="rounded-[25px] border border-gray-200 bg-amber-50/30 p-4">
                  <h4 className="mb-3 text-sm font-semibold text-[#302F2E]">DSAR Details</h4>
                  <div className="grid gap-2 text-sm">
                    <p>
                      <span className="font-medium text-gray-600">Requester Type:</span>{" "}
                      {req.dsarDetails.requesterType}
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Law Basis:</span>{" "}
                      {req.dsarDetails.lawBasis}
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Rights Requested:</span>{" "}
                      {Array.isArray(req.dsarDetails.rightsRequested)
                        ? req.dsarDetails.rightsRequested.join(", ")
                        : String(req.dsarDetails.rightsRequested)}
                    </p>
                    <p>
                      <span className="font-medium text-gray-600">Declaration Accepted:</span>{" "}
                      {req.dsarDetails.declarationAccepted ? "Yes" : "No"}
                    </p>
                    {req.dsarDetails.declarationAcceptedAt && (
                      <p>
                        <span className="font-medium text-gray-600">Accepted At:</span>{" "}
                        {formatDate(req.dsarDetails.declarationAcceptedAt)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {req.attachments && req.attachments.length > 0 && (
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Attachments</p>
                  <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                    {req.attachments.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid gap-4 text-sm text-gray-500 sm:grid-cols-2">
                <p>
                  <span className="font-medium">Created:</span> {formatDate(req.createdAt)}
                </p>
                <p>
                  <span className="font-medium">Updated:</span> {formatDate(req.updatedAt)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function CrmSupportTicketsDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [requests, setRequests] = useState<ContactUsRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<RequestType | "">("");
  const [statusFilter, setStatusFilter] = useState<RequestStatus | "">("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    const params: { from?: string; to?: string } = {};
    if (dateFrom) params.from = dateFrom;
    if (dateTo) params.to = dateTo;
    getDashboardStats(Object.keys(params).length ? params : undefined)
      .then(setStats)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load stats"));
  }, [dateFrom, dateTo]);

  const fetchRequests = useCallback(async () => {
    setRequestsLoading(true);
    const params: { type?: RequestType; status?: RequestStatus } = {};
    if (typeFilter) params.type = typeFilter as RequestType;
    if (statusFilter) params.status = statusFilter as RequestStatus;
    listRequests(Object.keys(params).length ? params : undefined)
      .then(setRequests)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load requests"))
      .finally(() => setRequestsLoading(false));
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchStats()
      .finally(() => setLoading(false));
  }, [fetchStats]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const refreshAll = useCallback(() => {
    fetchStats();
    fetchRequests();
  }, [fetchStats, fetchRequests]);

  const statusPieData = stats
    ? Object.entries(stats.total.byStatus ?? {})
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_LABELS[k as RequestStatus] ?? k, value: v }))
    : [];

  const typeBarData = stats
    ? (Object.entries(stats.byType ?? {}) as [RequestType, { count: number }][]).map(
        ([type, data]) => ({ label: TYPE_LABELS[type] ?? type, value: data.count })
      )
    : [];

  const sourceBarData = stats
    ? Object.entries(stats.bySource ?? {}).map(([k, v]) => ({
        label: SOURCE_LABELS[k] ?? k,
        value: v,
      }))
    : [];

  const byStatusBarData = stats?.total.byStatus
    ? (["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const)
        .map((s) => ({ label: STATUS_LABELS[s], value: stats.total.byStatus[s] ?? 0 }))
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="mb-2 text-sm text-gray-500">
            <Link href="/dashboard" className="hover:text-[#302F2E]">Home</Link>
            <span className="mx-1.5">/</span>
            <Link href="/client-crm" className="hover:text-[#302F2E]">CRM</Link>
            <span className="mx-1.5">/</span>
            <span className="text-[#302F2E]">Support Tickets</span>
          </nav>
          <h1 className="text-2xl font-semibold tracking-tight text-[#302F2E] sm:text-3xl">Support Tickets</h1>
          <p className="mt-1 text-sm text-gray-500">Manage contact requests and view support analytics</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-[25px] bg-gray-50/80 p-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-[25px] border-0 bg-white px-3 py-2 text-sm text-[#302F2E] shadow-sm outline-none focus:outline-none focus:ring-0"
            placeholder="From"
          />
          <span className="text-gray-400">→</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-[25px] border-0 bg-white px-3 py-2 text-sm text-[#302F2E] shadow-sm outline-none focus:outline-none focus:ring-0"
            placeholder="To"
          />
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              fetchStats();
            }}
            className="rounded-[25px] bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-100"
          >
            Clear
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-[25px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-[25px] border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <p className="text-sm font-medium text-gray-500">Total</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[#302F2E]">
            {loading ? "—" : stats?.total?.count ?? 0}
          </p>
        </div>
        {(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((status) => (
          <div
            key={status}
            className="rounded-[25px] border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <p className="text-sm font-medium text-gray-500">{STATUS_LABELS[status]}</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-[#302F2E]">
              {loading ? "—" : (stats?.total?.byStatus?.[status] ?? 0)}
            </p>
          </div>
        ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-gray-500">Analytics</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">Requests by Status</h4>
          <div className="h-48">
            {statusPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((_, i) => (
                      <Cell key={i} fill={["#3267D3", "#302F2E", "#10B981", "#6B7280"][i % 4]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">
                No data
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">Requests by Type</h4>
          <div className="h-48">
            {typeBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeBarData} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    width={100}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                  />
                  <Bar dataKey="value" fill="#302F2E" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">
                No data
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">Requests by Source</h4>
          <div className="h-48">
            {sourceBarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} margin={{ left: 0, right: 0, bottom: 0, top: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <Bar dataKey="value" fill="#3267D3" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">
                No data
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[25px] border border-gray-100 bg-white p-6 shadow-sm">
          <h4 className="mb-4 text-base font-semibold text-[#302F2E]">Status Distribution</h4>
          <div className="h-48">
            {byStatusBarData.some((d) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byStatusBarData} margin={{ left: 0, right: 0, bottom: 0, top: 0 }}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B7280", fontSize: 11 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 11 }} />
                  <Bar dataKey="value" fill="#302F2E" radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-gray-500">
                No data
              </p>
            )}
          </div>
        </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#302F2E]">Requests</h2>
            <p className="mt-0.5 text-sm text-gray-500">Browse and filter support requests</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoundedDropdown<string>
              value={typeFilter || "all"}
              onChange={(v) => setTypeFilter(v === "all" ? "" : (v as RequestType))}
              options={[
                { value: "all", label: "All Types" },
                ...(["GENERAL_ENQUIRY", "FEATURE_REQUEST", "DSAR", "COMPLAINT"] as const).map((t) => ({
                  value: t,
                  label: TYPE_LABELS[t],
                })),
              ]}
              className="bg-gray-50 px-4 py-2 text-sm text-[#302F2E]"
            />
            <RoundedDropdown<string>
              value={statusFilter || "all"}
              onChange={(v) => setStatusFilter(v === "all" ? "" : (v as RequestStatus))}
              options={[
                { value: "all", label: "All Statuses" },
                ...(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => ({
                  value: s,
                  label: STATUS_LABELS[s],
                })),
              ]}
              className="bg-gray-50 px-4 py-2 text-sm text-[#302F2E]"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-[25px] border border-gray-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Source</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Subject</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {requestsLoading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      Loading…
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r._id} className="border-b border-gray-50 transition-colors hover:bg-gray-50/50 last:border-0">
                      <td className="px-6 py-4 font-mono text-xs text-[#302F2E]">{formatShortId(r._id)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{TYPE_LABELS[r.type] ?? r.type}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{SOURCE_LABELS[r.source] ?? r.source}</td>
                      <td className="max-w-[180px] truncate px-6 py-4 text-sm text-gray-600" title={r.subject}>
                        {r.subject}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{r.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(r.createdAt)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-700"}`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailId(r._id)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#302F2E]"
                          title="View"
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <SupportRequestDetailModal
        id={detailId}
        onClose={() => setDetailId(null)}
        onStatusUpdated={refreshAll}
      />
    </div>
  );
}
