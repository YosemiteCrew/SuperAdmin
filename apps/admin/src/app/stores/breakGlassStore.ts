"use client";
import { create } from "zustand";
import type { BreakGlassGrant, GrantScope } from "@/app/types/break-glass";
import {
  getBreakGlassGrants,
  createBreakGlassGrant,
  revokeBreakGlassGrant,
} from "@/app/services/mock";

type BreakGlassState = {
  grants: BreakGlassGrant[];
  loading: boolean;
  fetchGrants: () => Promise<void>;
  createGrant: (params: {
    grantedTo: string;
    reason: string;
    ticketId: string;
    scope: GrantScope;
    expiresInHours: number;
  }) => Promise<void>;
  revokeGrant: (grantId: string) => Promise<void>;
};

export const useBreakGlassStore = create<BreakGlassState>()((set, get) => ({
  grants: [],
  loading: false,

  fetchGrants: async () => {
    set({ loading: true });
    const grants = await getBreakGlassGrants();
    set({ grants, loading: false });
  },

  createGrant: async (params) => {
    await createBreakGlassGrant({
      grantedTo: params.grantedTo,
      grantedToName: params.grantedTo,
      grantedBy: "admin-1",
      grantedByName: "Current Admin",
      reason: params.reason,
      ticketId: params.ticketId,
      scope: params.scope,
      durationHours: params.expiresInHours,
    });
    await get().fetchGrants();
  },

  revokeGrant: async (grantId: string) => {
    await revokeBreakGlassGrant(grantId, "admin-1");
    await get().fetchGrants();
  },
}));
