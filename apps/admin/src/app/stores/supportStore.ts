"use client";
import { create } from "zustand";
import type { SupportTicket, TicketStatus, TicketPriority } from "@/app/types/ticket";
import {
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket,
} from "@/app/services/mock";

type SupportFilters = {
  status: string;
  priority: string;
  search: string;
};

type SupportState = {
  tickets: SupportTicket[];
  selectedTicket: SupportTicket | null;
  loading: boolean;
  filters: SupportFilters;
  fetchTickets: () => Promise<void>;
  fetchTicketById: (id: string) => Promise<void>;
  updateStatus: (id: string, status: TicketStatus) => Promise<void>;
  updatePriority: (id: string, priority: TicketPriority) => Promise<void>;
  assignTicket: (id: string, assigneeId: string, assigneeName: string) => Promise<void>;
  setFilters: (filters: Partial<SupportFilters>) => void;
};

export const useSupportStore = create<SupportState>()((set) => ({
  tickets: [],
  selectedTicket: null,
  loading: false,
  filters: { status: "", priority: "", search: "" },

  fetchTickets: async () => {
    set({ loading: true });
    const tickets = await getTickets();
    set({ tickets, loading: false });
  },

  fetchTicketById: async (id: string) => {
    set({ loading: true });
    const ticket = await getTicketById(id);
    set({ selectedTicket: ticket ?? null, loading: false });
  },

  updateStatus: async (id: string, status: TicketStatus) => {
    const updated = await updateTicketStatus(id, status);
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...updated } : t)),
        selectedTicket:
          state.selectedTicket?.id === id
            ? { ...state.selectedTicket, ...updated }
            : state.selectedTicket,
      }));
    }
  },

  updatePriority: async (id: string, priority: TicketPriority) => {
    const updated = await updateTicketPriority(id, priority);
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...updated } : t)),
        selectedTicket:
          state.selectedTicket?.id === id
            ? { ...state.selectedTicket, ...updated }
            : state.selectedTicket,
      }));
    }
  },

  assignTicket: async (id: string, assigneeId: string, assigneeName: string) => {
    const updated = await assignTicket(id, assigneeId, assigneeName);
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...updated } : t)),
        selectedTicket:
          state.selectedTicket?.id === id
            ? { ...state.selectedTicket, ...updated }
            : state.selectedTicket,
      }));
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
