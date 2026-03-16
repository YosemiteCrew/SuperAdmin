"use client";
import { create } from "zustand";
import type { Lead } from "@/app/types/lead";
import type { SupportTicket } from "@/app/types/ticket";
import {
  getLeads,
  getBusinesses,
  getTickets,
  getTeamMembers,
} from "@/app/services/mock";

type DashboardStats = {
  totalLeads: number;
  activeBusinesses: number;
  openTickets: number;
  teamMembers: number;
};

type DashboardState = {
  loading: boolean;
  stats: DashboardStats | null;
  recentLeads: Lead[];
  recentTickets: SupportTicket[];
  fetchDashboard: () => Promise<void>;
};

export const useDashboardStore = create<DashboardState>()((set) => ({
  loading: false,
  stats: null,
  recentLeads: [],
  recentTickets: [],

  fetchDashboard: async () => {
    set({ loading: true });
    const [leads, businesses, tickets, team] = await Promise.all([
      getLeads(),
      getBusinesses(),
      getTickets(),
      getTeamMembers(),
    ]);

    const stats: DashboardStats = {
      totalLeads: leads.length,
      activeBusinesses: businesses.filter((b) => b.status === "active").length,
      openTickets: tickets.filter(
        (t) => t.status === "open" || t.status === "in_progress"
      ).length,
      teamMembers: team.length,
    };

    const recentLeads = [...leads]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    const recentTickets = [...tickets]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 5);

    set({ stats, recentLeads, recentTickets, loading: false });
  },
}));
