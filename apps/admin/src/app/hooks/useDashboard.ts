"use client";
import { useEffect } from "react";
import { useDashboardStore } from "@/app/stores/dashboardStore";

export function useDashboard() {
  const store = useDashboardStore();

  useEffect(() => {
    store.fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return store;
}
