"use client";
import { create } from "zustand";
import type { AppUser } from "@/app/types/user";
import { getUsers } from "@/app/services/mock";

type UsersState = {
  users: AppUser[];
  loading: boolean;
  filters: { type: string; status: string; search: string };
  fetchUsers: () => Promise<void>;
  setFilters: (filters: Partial<{ type: string; status: string; search: string }>) => void;
};

export const useUsersStore = create<UsersState>()((set) => ({
  users: [],
  loading: false,
  filters: { type: "", status: "", search: "" },

  fetchUsers: async () => {
    set({ loading: true });
    const users = await getUsers();
    set({ users, loading: false });
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },
}));
