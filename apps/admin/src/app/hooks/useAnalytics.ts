"use client";
import { useEffect } from "react";
import { useAnalyticsStore } from "@/app/stores/analyticsStore";

export function useAnalytics() {
  const store = useAnalyticsStore();

  useEffect(() => {
    store.fetchAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
