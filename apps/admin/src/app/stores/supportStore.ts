"use client";
import { create } from "zustand";
import type {
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from "@/app/types/ticket";
import * as api from "@/app/services/api/support";
import {
  getTickets,
  getTicketById,
  updateTicketStatus,
  updateTicketPriority,
  assignTicket as mockAssignTicket,
} from "@/app/services/mock";

// ── Mapping helpers ────────────────────────────────────

function mapTypeToCategory(type: string): TicketCategory {
  const map: Record<string, TicketCategory> = {
    GENERAL_ENQUIRY: "general",
    FEATURE_REQUEST: "feature_request",
    DSAR: "general",
    COMPLAINT: "complaint",
  };
  return map[type] || "general";
}

function mapContactRequestToTicket(req: api.ContactRequest): SupportTicket {
  return {
    id: req._id,
    subject: req.subject,
    description: req.message,
    status: req.status.toLowerCase().replace("_", "_") as TicketStatus,
    priority: req.priority.toLowerCase() as TicketPriority,
    category: mapTypeToCategory(req.type),
    assigneeId: req.assigneeId,
    assigneeName: req.assigneeName,
    createdBy: req.fullName || "Unknown",
    createdByEmail: req.email || "",
    createdAt: req.createdAt,
    updatedAt: req.updatedAt,
  };
}

function mapStatusToApi(status: string): string {
  return status.toUpperCase();
}

function mapPriorityToApi(priority: string): string {
  return priority.toUpperCase();
}

// ── Try API first, fallback to mock ────────────────────

async function tryApiOrMock<T>(
  apiFn: () => Promise<T>,
  mockFn: () => Promise<T>
): Promise<T> {
  try {
    return await apiFn();
  } catch {
    console.warn("API call failed, falling back to mock data");
    return await mockFn();
  }
}

// ── Store ──────────────────────────────────────────────

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
  assignTicket: (
    id: string,
    assigneeId: string,
    assigneeName: string
  ) => Promise<void>;
  setFilters: (filters: Partial<SupportFilters>) => void;
};

export const useSupportStore = create<SupportState>()((set) => ({
  tickets: [],
  selectedTicket: null,
  loading: false,
  filters: { status: "", priority: "", search: "" },

  fetchTickets: async () => {
    set({ loading: true });
    const tickets = await tryApiOrMock(
      async () => {
        const reqs = await api.listRequests();
        return reqs.map(mapContactRequestToTicket);
      },
      async () => getTickets()
    );
    set({ tickets, loading: false });
  },

  fetchTicketById: async (id: string) => {
    set({ loading: true });
    const ticket = await tryApiOrMock(
      async () => {
        const req = await api.getRequest(id);
        return mapContactRequestToTicket(req);
      },
      async () => {
        const t = await getTicketById(id);
        return t ?? null;
      }
    );
    set({ selectedTicket: ticket ?? null, loading: false });
  },

  updateStatus: async (id: string, status: TicketStatus) => {
    const updated = await tryApiOrMock(
      async () => {
        const req = await api.updateStatus(id, mapStatusToApi(status));
        return mapContactRequestToTicket(req);
      },
      async () => {
        const t = await updateTicketStatus(id, status);
        return t ?? null;
      }
    );
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updated } : t
        ),
        selectedTicket:
          state.selectedTicket?.id === id
            ? { ...state.selectedTicket, ...updated }
            : state.selectedTicket,
      }));
    }
  },

  updatePriority: async (id: string, priority: TicketPriority) => {
    const updated = await tryApiOrMock(
      async () => {
        const req = await api.updatePriority(id, mapPriorityToApi(priority));
        return mapContactRequestToTicket(req);
      },
      async () => {
        const t = await updateTicketPriority(id, priority);
        return t ?? null;
      }
    );
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updated } : t
        ),
        selectedTicket:
          state.selectedTicket?.id === id
            ? { ...state.selectedTicket, ...updated }
            : state.selectedTicket,
      }));
    }
  },

  assignTicket: async (
    id: string,
    assigneeId: string,
    assigneeName: string
  ) => {
    const updated = await tryApiOrMock(
      async () => {
        const req = await api.assignRequest(id, assigneeId, assigneeName);
        return mapContactRequestToTicket(req);
      },
      async () => {
        const t = await mockAssignTicket(id, assigneeId, assigneeName);
        return t ?? null;
      }
    );
    if (updated) {
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updated } : t
        ),
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
