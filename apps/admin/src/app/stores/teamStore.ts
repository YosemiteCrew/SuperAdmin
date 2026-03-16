"use client";
import { create } from "zustand";
import type { TeamMember, TeamRole } from "@/app/types/team";
import {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
} from "@/app/services/mock";

type TeamState = {
  members: TeamMember[];
  loading: boolean;
  fetchMembers: () => Promise<void>;
  addMember: (name: string, email: string, role: TeamRole) => Promise<void>;
  removeMember: (id: string) => Promise<void>;
};

export const useTeamStore = create<TeamState>()((set) => ({
  members: [],
  loading: false,

  fetchMembers: async () => {
    set({ loading: true });
    const members = await getTeamMembers();
    set({ members, loading: false });
  },

  addMember: async (name: string, email: string, role: TeamRole) => {
    const member = await addTeamMember(name, email, role);
    set((state) => ({
      members: [...state.members, member],
    }));
  },

  removeMember: async (id: string) => {
    const success = await removeTeamMember(id);
    if (success) {
      set((state) => ({
        members: state.members.filter((m) => m.id !== id),
      }));
    }
  },
}));
