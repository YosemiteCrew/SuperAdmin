"use client";
import { create } from "zustand";
import type { Business, VerificationRequest } from "@/app/types/business";
import {
  getBusinesses,
  getBusinessById,
  updateBusinessStatus,
  getVerifications,
  getVerificationById,
  updateVerificationStatus,
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
  verifications: VerificationRequest[];
  selectedVerification: VerificationRequest | null;
  verificationsLoading: boolean;
  fetchBusinesses: () => Promise<void>;
  fetchBusinessById: (id: string) => Promise<void>;
  approveBusiness: (id: string) => Promise<void>;
  suspendBusiness: (id: string) => Promise<void>;
  deactivateBusiness: (id: string) => Promise<void>;
  setFilters: (filters: Partial<BusinessFilters>) => void;
  fetchVerifications: () => Promise<void>;
  fetchVerificationById: (id: string) => Promise<void>;
  approveVerification: (id: string) => Promise<void>;
  rejectVerification: (id: string, reason: string) => Promise<void>;
};

export const useBusinessStore = create<BusinessState>()((set) => ({
  businesses: [],
  selectedBusiness: null,
  loading: false,
  filters: { status: "", type: "", search: "", invitedOnly: false },
  verifications: [],
  selectedVerification: null,
  verificationsLoading: false,

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

  fetchVerifications: async () => {
    set({ verificationsLoading: true });
    const verifications = await getVerifications();
    set({ verifications, verificationsLoading: false });
  },

  fetchVerificationById: async (id: string) => {
    set({ verificationsLoading: true });
    const verification = await getVerificationById(id);
    set({
      selectedVerification: verification ?? null,
      verificationsLoading: false,
    });
  },

  approveVerification: async (id: string) => {
    const updated = await updateVerificationStatus(id, "approved");
    if (updated) {
      set((state) => ({
        verifications: state.verifications.map((v) =>
          v.id === id ? { ...v, ...updated } : v
        ),
        selectedVerification:
          state.selectedVerification?.id === id
            ? { ...state.selectedVerification, ...updated }
            : state.selectedVerification,
      }));
    }
  },

  rejectVerification: async (id: string, reason: string) => {
    const updated = await updateVerificationStatus(id, "rejected", reason);
    if (updated) {
      set((state) => ({
        verifications: state.verifications.map((v) =>
          v.id === id ? { ...v, ...updated } : v
        ),
        selectedVerification:
          state.selectedVerification?.id === id
            ? { ...state.selectedVerification, ...updated }
            : state.selectedVerification,
      }));
    }
  },
}));
