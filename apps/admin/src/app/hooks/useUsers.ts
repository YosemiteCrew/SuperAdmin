"use client";
import { useEffect, useMemo } from "react";
import { useUsersStore } from "@/app/stores/usersStore";

export function useUsers() {
  const store = useUsersStore();

  useEffect(() => {
    store.fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    let result = store.users;

    if (store.filters.type) {
      result = result.filter((u) => u.type === store.filters.type);
    }

    if (store.filters.status) {
      result = result.filter((u) => u.status === store.filters.status);
    }

    if (store.filters.search) {
      const query = store.filters.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [store.users, store.filters]);

  return { ...store, filteredUsers };
}
