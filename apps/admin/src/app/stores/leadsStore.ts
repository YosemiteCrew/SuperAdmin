"use client";
import { create } from "zustand";
import type { Lead, LeadStatus } from "@/app/types/lead";
import {
  getLeads,
  getLeadById,
  updateLeadStatus,
  assignLead,
} from "@/app/services/mock";

type LeadsState = {
  leads: Lead[];
  selectedLead: Lead | null;
  loading: boolean;
  filters: { status: string; search: string };
  fetchLeads: () => Promise<void>;
  fetchLeadById: (id: string) => Promise<void>;
  updateStatus: (id: string, status: LeadStatus) => Promise<void>;
  assignLead: (id: string, assigneeId: string, assigneeName: string) => Promise<void>;
  setFilters: (filters: Partial<{ status: string; search: string }>) => void;
};

export const useLeadsStore = create<LeadsState>()((set) => ({
  leads: [],
  selectedLead: null,
  loading: false,
  filters: { status: "", search: "" },

  fetchLeads: async () => {
    set({ loading: true });
    const leads = await getLeads();
    set({ leads, loading: false });
  },

  fetchLeadById: async (id: string) => {
    set({ loading: true });
    const lead = await getLeadById(id);
    set({ selectedLead: lead ?? null, loading: false });
  },

  updateStatus: async (id: string, status: LeadStatus) => {
    const updated = await updateLeadStatus(id, status);
    if (updated) {
      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? { ...l, ...updated } : l)),
        selectedLead:
          state.selectedLead?.id === id
            ? { ...state.selectedLead, ...updated }
            : state.selectedLead,
      }));
    }
  },

  assignLead: async (id: string, assigneeId: string, assigneeName: string) => {
    const updated = await assignLead(id, assigneeId, assigneeName);
    if (updated) {
      set((state) => ({
        leads: state.leads.map((l) => (l.id === id ? { ...l, ...updated } : l)),
        selectedLead:
          state.selectedLead?.id === id
            ? { ...state.selectedLead, ...updated }
            : state.selectedLead,
      }));
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
