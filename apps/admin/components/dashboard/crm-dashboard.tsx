"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import {
  NewUserTrendChart,
  UserEngagementChart,
} from "./charts";
import { PracticeFunnelChart, PetParentFunnelChart } from "./crm-funnels";
import { CrmSupportSummary } from "./crm-support-summary";

const CRM_TABS = [
  { id: "all", label: "All" },
  { id: "hospitals", label: "Hospitals" },
  { id: "groomers", label: "Groomers" },
  { id: "breeders", label: "Breeders" },
  { id: "sitters", label: "Sitters" },
  { id: "pet-parents", label: "Pet Parents" },
  { id: "developers", label: "Developers" },
];

const PENDING_TABS = [
  { id: "hospitals", label: "Hospitals", count: 5 },
  { id: "groomers", label: "Groomers", count: 2 },
  { id: "breeders", label: "Breeders", count: 0 },
  { id: "sitters", label: "Sitters", count: 0 },
];

const STAT_CARDS = [
  {
    label: "Total Users",
    value: "2639",
    change: "+23%",
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
    value: "288",
    change: "-23%",
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
    value: "697",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  {
    label: "New Support Tickets",
    value: "113",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    label: "Profile Completion Rate",
    value: "90.6%",
    change: "+23%",
    trend: "up" as const,
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
    value: "7",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Inactive Practices",
    value: "113",
    change: "-23%",
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
    value: "$4197",
    change: "+23%",
    trend: "up" as const,
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

const PENDING_ROWS = [
  { name: "Happy Tails Vet", region: "Toronto, Canada", completion: "95%", pending: "6 hrs" },
  { name: "Cozy Paws", region: "New York, USA", completion: "78%", pending: "2 days" },
  { name: "UrbanPet Clinic", region: "Berlin, Germany", completion: "86%", pending: "7 days" },
];

const NEW_LEADS_ROWS = [
  { name: "Bella Paws Clinic", type: "Hospital", region: "Toronto Canada", email: "bella@pawclin...", source: "Website", created: "20 June 2025 2h ago", status: "New Lead", statusColor: "bg-purple-100 text-purple-700" },
  { name: "Groom & Bloom", type: "Groomer", region: "New York USA", email: "info@groombl...", source: "Social Media", created: "20 June 2025 4h ago", status: "Not Contacted", statusColor: "bg-red-100 text-red-700" },
  { name: "Pawsitive Pets", type: "Sitter", region: "Berlin Germany", email: "contact@chat....", source: "Referral", created: "19 June 2025 12h ago", status: "In Conversation", statusColor: "bg-blue-100 text-blue-700" },
  { name: "Healthy Tails Dev", type: "Developer", region: "Mumbai India", email: "info@groombl...", source: "Website", created: "17 June 2025 3d ago", status: "Demo Scheduled", statusColor: "bg-blue-100 text-blue-700" },
  { name: "The Cat Château", type: "Breeder", region: "Paris France", email: "contact@chat...", source: "Event Booth", created: "12 June 2025 8d ago", status: "Demo Given", statusColor: "bg-blue-100 text-blue-700" },
];

const PRACTICE_ACTIVITY_TABS = [
  { id: "hospitals", label: "Hospitals" },
  { id: "groomers", label: "Groomers" },
  { id: "breeders", label: "Breeders" },
  { id: "sitters", label: "Sitters" },
];

const PRACTICE_ROWS = [
  { name: "Happy Tails Vet", region: "Toronto Canada", appointments: 134, tickets: 25, staff: 56, lastActivity: "1h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
  { name: "Cozy Paws", region: "New York USA", appointments: 198, tickets: 10, staff: 93, lastActivity: "40d ago", status: "Dormant", statusColor: "bg-orange-100 text-orange-700" },
  { name: "UrbanPet Clinic", region: "Berlin Germany", appointments: 4, tickets: 2, staff: 14, lastActivity: "2d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
];

const PET_PARENT_ROWS = [
  { name: "Sarah M.", region: "Toronto Canada", pets: 2, appointments: 4, avgTime: "14m", score: 82, lastActivity: "2h ago", status: "Active", statusColor: "bg-green-100 text-green-700" },
  { name: "Leo D.", region: "New York USA", pets: 0, appointments: 0, avgTime: "3m", score: 26, lastActivity: "24d ago", status: "Churn Risk", statusColor: "bg-red-100 text-red-700" },
  { name: "Emily K.", region: "Berlin Germany", pets: 3, appointments: 2, avgTime: "8m", score: 54, lastActivity: "16d ago", status: "Inactive", statusColor: "bg-gray-100 text-gray-700" },
];

const SUPPORT_TICKET_STATUS_OPTIONS = [
  { id: "new", label: "New Ticket", color: "bg-purple-200 text-purple-800" },
  { id: "progress", label: "In Progress", color: "bg-blue-200 text-blue-800" },
  { id: "waiting", label: "Waiting", color: "bg-orange-200 text-orange-800" },
  { id: "escalated", label: "Escalated", color: "bg-red-200 text-red-800" },
  { id: "reopened", label: "Reopened", color: "bg-gray-200 text-gray-900" },
  { id: "closed", label: "Closed", color: "bg-green-200 text-green-800" },
];

const SUPPORT_TICKET_ROWS = [
  { id: "T204", email: "johndeo@gmail.com", category: "DSAR", message: "I can't log into my dashboard — it keeps saying 'user not found' even tho...", created: "26 June 2025 (3h ago)", status: "New Ticket", statusColor: "bg-purple-100 text-purple-700" },
  { id: "T217", email: "johndeo@gmail.com", category: "General", message: "Hi, we're trying to explore your platform before signing up. Can we schedule a...", created: "25 June 2025 (16h ago)", status: "Closed", statusColor: "bg-green-100 text-green-700" },
  { id: "T220", email: "johndeo@gmail.com", category: "General", message: "We're facing issues accessing the appointment booking feature via the li...", created: "25 June 2025 (22h ago)", status: "New Ticket", statusColor: "bg-purple-100 text-purple-700" },
  { id: "T239", email: "johndeo@gmail.com", category: "General", message: "I'm trying to update my clinic profile, but the Save button doesn't seem to w...", created: "23 June 2025 (3d ago)", status: "Escalated", statusColor: "bg-red-100 text-red-700" },
  { id: "T245", email: "johndeo@gmail.com", category: "General", message: "Our invoices are not generating correctly — the total amount looks off.", created: "21 June 2025 (5d ago)", status: "In Progress", statusColor: "bg-blue-100 text-blue-700" },
];

export function CrmDashboard() {
  const [activeTab, setActiveTab] = useState("all");
  const [pendingTab, setPendingTab] = useState("hospitals");
  const [practiceTab, setPracticeTab] = useState("hospitals");
  const [supportTab, setSupportTab] = useState<"professionals" | "pet-parents">("professionals");
  const [statusPopupTicketId, setStatusPopupTicketId] = useState<string | null>(null);
  const [statusPopupAnchor, setStatusPopupAnchor] = useState<{ top: number; left: number } | null>(null);
  const [ticketStatuses, setTicketStatuses] = useState<Record<string, string>>({});

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500">
        <Link href="/dashboard" className="hover:text-[#302F2E]">Home</Link>
        <span className="mx-1.5">/</span>
        <span className="text-[#302F2E]">CRM</span>
      </nav>

      {/* Title + badges */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-[#302F2E]">CRM Dashboard</h1>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            7 Practices Awaiting Verification
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            5 New Leads
          </span>
        </div>
      </div>

      {/* Tabs + date filter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1 overflow-x-auto">
          {CRM_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#3267D3] text-[#3267D3]"
                  : "border-transparent text-gray-500 hover:text-[#302F2E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#302F2E] focus:outline-none focus:ring-2 focus:ring-[#3267D3]/20">
          <option>Last 30 Days</option>
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
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

      {/* Pending Verifications */}
      <section>
        <h3 className="mb-4 text-xl font-semibold text-[#302F2E]">Pending Verifications</h3>
        <div className="mb-4 flex gap-1 overflow-x-auto">
          {PENDING_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPendingTab(tab.id)}
              className={`relative whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                pendingTab === tab.id
                  ? "border-[#3267D3] text-[#3267D3]"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
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
                {PENDING_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.region}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.completion}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.pending}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#302F2E]"
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

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            className="rounded-xl border-2 border-gray-900 bg-white px-8 py-3 text-sm font-medium text-[#302F2E] transition-colors hover:bg-gray-50"
          >
            See All
          </button>
        </div>
      </section>

      {/* New Leads Overview */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <h3 className="text-xl font-semibold text-[#302F2E]">New Leads Overview</h3>
          <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">5 New Leads</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Lead Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">User Type</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Region</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Lead Source</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Created on</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody>
                {NEW_LEADS_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.type}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.region}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.source}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.created}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.statusColor}`}>{row.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button type="button" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-[#302F2E]" title="Edit">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button type="button" className="rounded-xl border-2 border-gray-900 bg-white px-8 py-3 text-sm font-medium text-[#302F2E] transition-colors hover:bg-gray-50">See All</button>
        </div>
      </section>

      {/* Practice Activity Overview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#302F2E]">Practice Activity Overview</h3>
          <select className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#302F2E]">
            <option>Last 30 Days ▾</option>
          </select>
        </div>
        <div className="mb-4 flex gap-1">
          {PRACTICE_ACTIVITY_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setPracticeTab(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                practiceTab === tab.id ? "border-[#3267D3] text-[#3267D3]" : "border-transparent text-gray-500 hover:text-[#302F2E]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Practice Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Region</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Appointments</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Tickets Raised</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Active Staff Count</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Last Activity</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {PRACTICE_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.region}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.appointments}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.tickets}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.staff}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.lastActivity}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.statusColor}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button type="button" className="rounded-xl border-2 border-gray-900 bg-white px-8 py-3 text-sm font-medium text-[#302F2E] transition-colors hover:bg-gray-50">See All</button>
        </div>
      </section>

      {/* Pet Parent Activity Overview */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#302F2E]">Pet Parent Activity Overview</h3>
          <select className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#302F2E]">
            <option>Last 30 Days ▾</option>
          </select>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">User Name</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Region</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Pets Added</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Appointments</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Avg. Time Spent</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Feature Usage Score</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Last Activity</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {PET_PARENT_ROWS.map((row) => (
                  <tr key={row.name} className="border-b border-gray-100 last:border-0">
                    <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.region}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.pets}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.appointments}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.avgTime}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.score}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{row.lastActivity}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${row.statusColor}`}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button type="button" className="rounded-xl border-2 border-gray-900 bg-white px-8 py-3 text-sm font-medium text-[#302F2E] transition-colors hover:bg-gray-50">See All</button>
        </div>
      </section>

      {/* Support Tickets */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-[#302F2E]">Support Tickets</h3>
          <select className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-[#302F2E]">
            <option>Last 30 Days</option>
          </select>
        </div>
        <div className="mb-4 flex gap-1">
          <button
            onClick={() => setSupportTab("professionals")}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${supportTab === "professionals" ? "border-[#3267D3] text-[#3267D3]" : "border-transparent text-gray-500 hover:text-[#302F2E]"}`}
          >
            Professionals
          </button>
          <button
            onClick={() => setSupportTab("pet-parents")}
            className={`whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors ${supportTab === "pet-parents" ? "border-[#3267D3] text-[#3267D3]" : "border-transparent text-gray-500 hover:text-[#302F2E]"}`}
          >
            Pet Parents
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Ticket ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Email ID</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Category</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Message</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-600">Created On</th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {SUPPORT_TICKET_ROWS.map((row) => {
                  const displayStatus = ticketStatuses[row.id] ?? row.status;
                  const statusColorMap: Record<string, string> = {
                    "New Ticket": "bg-purple-100 text-purple-700",
                    "In Progress": "bg-blue-100 text-blue-700",
                    "Waiting": "bg-orange-100 text-orange-700",
                    Escalated: "bg-red-100 text-red-700",
                    Reopened: "bg-gray-100 text-gray-700",
                    Closed: "bg-green-100 text-green-700",
                  };
                  const displayColor = statusColorMap[displayStatus] ?? row.statusColor;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-6 py-4 text-sm font-medium text-[#302F2E]">{row.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.category}</td>
                      <td className="max-w-[200px] truncate px-6 py-4 text-sm text-gray-600" title={row.message}>{row.message}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{row.created}</td>
                      <td className="relative px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              if (statusPopupTicketId === row.id) {
                                setStatusPopupTicketId(null);
                                setStatusPopupAnchor(null);
                              } else {
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setStatusPopupAnchor({ top: rect.bottom + 4, left: rect.left });
                                setStatusPopupTicketId(row.id);
                              }
                            }}
                            className={`rounded-full px-3 py-1 text-xs font-medium transition-opacity hover:opacity-90 ${displayColor}`}
                          >
                            {displayStatus}
                          </button>
                          <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100" title="More">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                              <circle cx="12" cy="5" r="1.5" />
                              <circle cx="12" cy="12" r="1.5" />
                              <circle cx="12" cy="19" r="1.5" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-6 flex justify-center">
          <button type="button" className="rounded-xl border-2 border-gray-900 bg-white px-8 py-3 text-sm font-medium text-[#302F2E] transition-colors hover:bg-gray-50">See All</button>
        </div>
      </section>

      {/* New User Trend & User Engagement */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#302F2E]">New User Trend</h3>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-[#302F2E]">
              <option>All</option>
            </select>
          </div>
          <NewUserTrendChart />
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-semibold text-[#302F2E]">User Engagement</h3>
            <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-normal text-[#302F2E]">
              <option>Hospitals</option>
            </select>
          </div>
          <UserEngagementChart />
        </section>
      </div>

      {/* Practice Funnel & Pet Parent Funnel */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PracticeFunnelChart />
        <PetParentFunnelChart />
      </div>

      {/* Support Summary */}
      <CrmSupportSummary />

      {/* Update Status popup */}
      {statusPopupTicketId && statusPopupAnchor && (
        <StatusPopup
          anchor={statusPopupAnchor}
          onClose={() => {
            setStatusPopupTicketId(null);
            setStatusPopupAnchor(null);
          }}
          onSelect={(status) => {
            setTicketStatuses((prev) => ({ ...prev, [statusPopupTicketId]: status }));
            setStatusPopupTicketId(null);
            setStatusPopupAnchor(null);
          }}
        />
      )}
    </div>
  );
}

function StatusPopup({
  anchor,
  onClose,
  onSelect,
}: {
  anchor: { top: number; left: number };
  onClose: () => void;
  onSelect: (status: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" aria-hidden>
      <div
        ref={ref}
        className="absolute min-w-[140px] rounded-lg border border-gray-200 bg-white p-2 shadow-lg"
        style={{ top: anchor.top, left: anchor.left }}
      >
        <div className="mb-2 flex items-center gap-1.5 px-1">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-100">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            </svg>
          </span>
          <span className="text-xs font-medium text-[#302F2E]">Update Status</span>
        </div>
        <div className="space-y-1">
          {SUPPORT_TICKET_STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.label)}
              className={`flex w-full items-center justify-center rounded px-2 py-1.5 text-xs font-medium transition-opacity hover:opacity-90 ${opt.color}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
