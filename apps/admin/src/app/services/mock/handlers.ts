import {
  mockLeads,
  mockBusinesses,
  mockTickets,
  mockTeamMembers,
  mockUsers,
  mockDevelopers,
  mockDeveloperApps,
  mockGrants,
  mockAuditEntries,
  mockAnalytics,
} from "./data";

import type { LeadStatus } from "@/app/types/lead";
import type { BusinessStatus } from "@/app/types/business";
import type { TicketStatus, TicketPriority } from "@/app/types/ticket";
import type { TeamRole } from "@/app/types/team";
import type { GrantScope } from "@/app/types/break-glass";
import type { AnalyticsSummary } from "@/app/types/analytics";

const delay = (ms = 50) => new Promise((r) => setTimeout(r, ms));

// ── Leads ──────────────────────────────────────────────

export async function getLeads() {
  await delay();
  return [...mockLeads];
}

export async function getLeadById(id: string) {
  await delay();
  return mockLeads.find((l) => l.id === id);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  await delay();
  const lead = mockLeads.find((l) => l.id === id);
  if (!lead) return undefined;
  lead.status = status;
  lead.updatedAt = new Date().toISOString();
  return { ...lead };
}

export async function assignLead(
  id: string,
  assigneeId: string,
  assigneeName: string
) {
  await delay();
  const lead = mockLeads.find((l) => l.id === id);
  if (!lead) return undefined;
  lead.assigneeId = assigneeId;
  lead.assigneeName = assigneeName;
  lead.updatedAt = new Date().toISOString();
  return { ...lead };
}

// ── Businesses ─────────────────────────────────────────

export async function getBusinesses() {
  await delay();
  return [...mockBusinesses];
}

export async function getBusinessById(id: string) {
  await delay();
  return mockBusinesses.find((b) => b.id === id);
}

export async function updateBusinessStatus(
  id: string,
  status: BusinessStatus
) {
  await delay();
  const biz = mockBusinesses.find((b) => b.id === id);
  if (!biz) return undefined;
  biz.status = status;
  if (status === "active" && !biz.approvedAt) {
    biz.approvedAt = new Date().toISOString();
  }
  return { ...biz };
}

// ── Tickets ────────────────────────────────────────────

export async function getTickets() {
  await delay();
  return [...mockTickets];
}

export async function getTicketById(id: string) {
  await delay();
  return mockTickets.find((t) => t.id === id);
}

export async function updateTicketStatus(id: string, status: TicketStatus) {
  await delay();
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return undefined;
  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  return { ...ticket };
}

export async function updateTicketPriority(
  id: string,
  priority: TicketPriority
) {
  await delay();
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return undefined;
  ticket.priority = priority;
  ticket.updatedAt = new Date().toISOString();
  return { ...ticket };
}

export async function assignTicket(
  id: string,
  assigneeId: string,
  assigneeName: string
) {
  await delay();
  const ticket = mockTickets.find((t) => t.id === id);
  if (!ticket) return undefined;
  ticket.assigneeId = assigneeId;
  ticket.assigneeName = assigneeName;
  ticket.updatedAt = new Date().toISOString();
  return { ...ticket };
}

// ── Team ───────────────────────────────────────────────

export async function getTeamMembers() {
  await delay();
  return [...mockTeamMembers];
}

export async function addTeamMember(
  name: string,
  email: string,
  role: TeamRole
) {
  await delay();
  const member = {
    id: `team-${mockTeamMembers.length + 1}`,
    name,
    email,
    role,
    status: "active" as const,
    joinedAt: new Date().toISOString(),
  };
  mockTeamMembers.push(member);
  return { ...member };
}

export async function removeTeamMember(id: string) {
  await delay();
  const idx = mockTeamMembers.findIndex((m) => m.id === id);
  if (idx === -1) return false;
  mockTeamMembers.splice(idx, 1);
  return true;
}

// ── Users ──────────────────────────────────────────────

export async function getUsers() {
  await delay();
  return [...mockUsers];
}

export async function getUserById(id: string) {
  await delay();
  return mockUsers.find((u) => u.id === id);
}

// ── Developers ─────────────────────────────────────────

export async function getDevelopers() {
  await delay();
  return [...mockDevelopers];
}

export async function getDeveloperById(id: string) {
  await delay();
  return mockDevelopers.find((d) => d.id === id);
}

export async function getDeveloperApps(developerId: string) {
  await delay();
  return mockDeveloperApps.filter((a) => a.developerId === developerId);
}

export async function getAllDeveloperApps() {
  await delay();
  return [...mockDeveloperApps];
}

// ── Break Glass ────────────────────────────────────────

export async function getBreakGlassGrants() {
  await delay();
  return [...mockGrants];
}

export async function createBreakGlassGrant(params: {
  grantedTo: string;
  grantedToName: string;
  grantedBy: string;
  grantedByName: string;
  reason: string;
  ticketId: string;
  scope: GrantScope;
  durationHours: number;
}) {
  await delay();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + params.durationHours * 60 * 60 * 1000
  );
  const grant = {
    id: `grant-${mockGrants.length + 1}`,
    grantedTo: params.grantedTo,
    grantedToName: params.grantedToName,
    grantedBy: params.grantedBy,
    grantedByName: params.grantedByName,
    reason: params.reason,
    ticketId: params.ticketId,
    scope: params.scope,
    status: "active" as const,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    revokedAt: null,
    revokedBy: null,
  };
  mockGrants.push(grant);
  return { ...grant };
}

export async function revokeBreakGlassGrant(id: string, revokedBy: string) {
  await delay();
  const grant = mockGrants.find((g) => g.id === id);
  if (!grant) return undefined;
  grant.status = "revoked";
  grant.revokedAt = new Date().toISOString();
  grant.revokedBy = revokedBy;
  return { ...grant };
}

// ── Audit ──────────────────────────────────────────────

export async function getAuditEntries() {
  await delay();
  return [...mockAuditEntries];
}

// ── Analytics ──────────────────────────────────────────

export async function getAnalytics(): Promise<AnalyticsSummary> {
  await delay();
  return { ...mockAnalytics };
}
