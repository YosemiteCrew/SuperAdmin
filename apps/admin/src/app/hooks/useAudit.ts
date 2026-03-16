"use client";
import { useEffect, useMemo } from "react";
import { useAuditStore } from "@/app/stores/auditStore";

export function useAudit() {
  const store = useAuditStore();

  useEffect(() => {
    store.fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEntries = useMemo(() => {
    let result = store.entries;

    if (store.filters.action) {
      result = result.filter((e) => e.action === store.filters.action);
    }

    if (store.filters.search) {
      const query = store.filters.search.toLowerCase();
      result = result.filter(
        (e) =>
          e.actorName.toLowerCase().includes(query) ||
          e.resource.toLowerCase().includes(query) ||
          e.resourceId.toLowerCase().includes(query) ||
          e.details.toLowerCase().includes(query)
      );
    }

    return result;
  }, [store.entries, store.filters]);

  return { ...store, filteredEntries };
}
