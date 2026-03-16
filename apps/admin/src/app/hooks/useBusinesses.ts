"use client";
import { useEffect, useMemo } from "react";
import { useBusinessStore } from "@/app/stores/businessStore";

export function useBusinesses() {
  const store = useBusinessStore();

  useEffect(() => {
    store.fetchBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredBusinesses = useMemo(() => {
    let result = store.businesses;

    if (store.filters.status) {
      result = result.filter((b) => b.status === store.filters.status);
    }

    if (store.filters.type) {
      result = result.filter((b) => b.type === store.filters.type);
    }

    if (store.filters.invitedOnly) {
      result = result.filter((b) => b.status === "invited");
    }

    if (store.filters.search) {
      const query = store.filters.search.toLowerCase();
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(query) ||
          b.ownerName.toLowerCase().includes(query) ||
          b.ownerEmail.toLowerCase().includes(query)
      );
    }

    return result;
  }, [store.businesses, store.filters]);

  return { ...store, filteredBusinesses };
}
