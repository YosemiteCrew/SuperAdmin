"use client";
import { create } from "zustand";
import type { Business } from "@/app/types/business";
import {
  getBusinesses,
  getBusinessById,
  updateBusinessStatus,
} from "@/app/services/mock";

type BusinessFilters = {
  status: string;
  type: string;
  search: string;
  invitedOnly: boolean;
};

type BusinessState = {
  businesses: Business[];
  selectedBusiness: Business | null;
  loading: boolean;
  filters: BusinessFilters;
  fetchBusinesses: () => Promise<void>;
  fetchBusinessById: (id: string) => Promise<void>;
  approveBusiness: (id: string) => Promise<void>;
  suspendBusiness: (id: string) => Promise<void>;
  deactivateBusiness: (id: string) => Promise<void>;
  setFilters: (filters: Partial<BusinessFilters>) => void;
};

export const useBusinessStore = create<BusinessState>()((set) => ({
  businesses: [],
  selectedBusiness: null,
  loading: false,
  filters: { status: "", type: "", search: "", invitedOnly: false },

  fetchBusinesses: async () => {
    set({ loading: true });
    const businesses = await getBusinesses();
    set({ businesses, loading: false });
  },

  fetchBusinessById: async (id: string) => {
    set({ loading: true });
    const business = await getBusinessById(id);
    set({ selectedBusiness: business ?? null, loading: false });
  },

  approveBusiness: async (id: string) => {
    const updated = await updateBusinessStatus(id, "active");
    if (updated) {
      set((state) => ({
        businesses: state.businesses.map((b) =>
          b.id === id ? { ...b, ...updated } : b
        ),
        selectedBusiness:
          state.selectedBusiness?.id === id
            ? { ...state.selectedBusiness, ...updated }
            : state.selectedBusiness,
      }));
    }
  },

  suspendBusiness: async (id: string) => {
    const updated = await updateBusinessStatus(id, "suspended");
    if (updated) {
      set((state) => ({
        businesses: state.businesses.map((b) =>
          b.id === id ? { ...b, ...updated } : b
        ),
        selectedBusiness:
          state.selectedBusiness?.id === id
            ? { ...state.selectedBusiness, ...updated }
            : state.selectedBusiness,
      }));
    }
  },

  deactivateBusiness: async (id: string) => {
    const updated = await updateBusinessStatus(id, "deactivated");
    if (updated) {
      set((state) => ({
        businesses: state.businesses.map((b) =>
          b.id === id ? { ...b, ...updated } : b
        ),
        selectedBusiness:
          state.selectedBusiness?.id === id
            ? { ...state.selectedBusiness, ...updated }
            : state.selectedBusiness,
      }));
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
