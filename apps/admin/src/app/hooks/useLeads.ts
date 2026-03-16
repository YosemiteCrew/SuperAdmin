"use client";
import { useEffect, useMemo } from "react";
import { useLeadsStore } from "@/app/stores/leadsStore";

export function useLeads() {
  const store = useLeadsStore();

  useEffect(() => {
    store.fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLeads = useMemo(() => {
    let result = store.leads;

    if (store.filters.status) {
      result = result.filter((l) => l.status === store.filters.status);
    }

    if (store.filters.search) {
      const query = store.filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(query) ||
          l.email.toLowerCase().includes(query) ||
          l.company.toLowerCase().includes(query)
      );
    }

    return result;
  }, [store.leads, store.filters]);

  return { ...store, filteredLeads };
}
