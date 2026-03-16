"use client";
import { create } from "zustand";
import type { AnalyticsSummary } from "@/app/types/analytics";
import { getAnalytics } from "@/app/services/mock";

type AnalyticsState = {
  summary: AnalyticsSummary | null;
  loading: boolean;
  fetchAnalytics: () => Promise<void>;
};

export const useAnalyticsStore = create<AnalyticsState>()((set) => ({
  summary: null,
  loading: false,

  fetchAnalytics: async () => {
    set({ loading: true });
    const summary = await getAnalytics();
    set({ summary, loading: false });
  },
}));
