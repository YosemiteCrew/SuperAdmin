"use client";
import { create } from "zustand";
import type { AuditEntry } from "@/app/types/audit";
import { getAuditEntries } from "@/app/services/mock";

type AuditState = {
  entries: AuditEntry[];
  loading: boolean;
  filters: { action: string; search: string };
  fetchEntries: () => Promise<void>;
  setFilters: (filters: Partial<{ action: string; search: string }>) => void;
};

export const useAuditStore = create<AuditState>()((set) => ({
  entries: [],
  loading: false,
  filters: { action: "", search: "" },

  fetchEntries: async () => {
    set({ loading: true });
    const entries = await getAuditEntries();
    set({ entries, loading: false });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
