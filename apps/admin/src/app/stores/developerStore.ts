"use client";
import { create } from "zustand";
import type { Developer, DeveloperApp } from "@/app/types/developer";
import {
  getDevelopers,
  getDeveloperById,
  getDeveloperApps,
} from "@/app/services/mock";

type DeveloperState = {
  developers: Developer[];
  selectedDeveloper: Developer | null;
  apps: DeveloperApp[];
  loading: boolean;
  fetchDevelopers: () => Promise<void>;
  fetchDeveloperById: (id: string) => Promise<void>;
  fetchDeveloperApps: (developerId: string) => Promise<void>;
};

export const useDeveloperStore = create<DeveloperState>()((set) => ({
  developers: [],
  selectedDeveloper: null,
  apps: [],
  loading: false,

  fetchDevelopers: async () => {
    set({ loading: true });
    const developers = await getDevelopers();
    set({ developers, loading: false });
  },

  fetchDeveloperById: async (id: string) => {
    set({ loading: true });
    const developer = await getDeveloperById(id);
    set({ selectedDeveloper: developer ?? null, loading: false });
  },

  fetchDeveloperApps: async (developerId: string) => {
    const apps = await getDeveloperApps(developerId);
    set({ apps });
  },
}));
