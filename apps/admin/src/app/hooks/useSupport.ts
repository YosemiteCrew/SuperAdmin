"use client";
import { useEffect, useMemo } from "react";
import { useSupportStore } from "@/app/stores/supportStore";

export function useSupport() {
  const store = useSupportStore();

  useEffect(() => {
    store.fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTickets = useMemo(() => {
    let result = store.tickets;

    if (store.filters.status) {
      result = result.filter((t) => t.status === store.filters.status);
    }

    if (store.filters.priority) {
      result = result.filter((t) => t.priority === store.filters.priority);
    }

    if (store.filters.search) {
      const query = store.filters.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.createdBy.toLowerCase().includes(query) ||
          t.createdByEmail.toLowerCase().includes(query)
      );
    }

    return result;
  }, [store.tickets, store.filters]);

  return { ...store, filteredTickets };
}
