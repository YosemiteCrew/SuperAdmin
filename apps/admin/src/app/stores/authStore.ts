"use client";
import { create } from "zustand";
import type { AdminUser } from "@/app/types/auth";
import { ROLE_PERMISSIONS } from "@/app/lib/permissions";

type AuthStatus =
  | "idle"
  | "checking"
  | "authenticated"
  | "unauthenticated"
  | "mfa-required";

type AuthState = {
  user: AdminUser | null;
  status: AuthStatus;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  verifyMfa: (code: string) => Promise<void>;
  checkSession: () => void;
  signOut: () => void;
  updateUser: (updates: Partial<AdminUser>) => void;
};

const MOCK_ADMIN: AdminUser = {
  id: "admin-1",
  email: "admin@yosemitecrew.com",
  name: "Super Admin",
  role: "SUPER_ADMIN",
  permissions: ROLE_PERMISSIONS.SUPER_ADMIN,
  mfaEnabled: true,
  lastLoginAt: new Date().toISOString(),
  createdAt: "2024-01-15T00:00:00Z",
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "idle",
  loading: false,
  error: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 500));

    if (email === "admin@yosemitecrew.com" && password === "Admin@123") {
      set({ status: "mfa-required", loading: false });
    } else {
      set({ error: "Invalid email or password", loading: false });
    }
  },

  verifyMfa: async (code: string) => {
    set({ loading: true, error: null });
    await new Promise((r) => setTimeout(r, 500));

    if (code.length === 6) {
      sessionStorage.setItem("sa_access_token", "mock-token-xyz");
      sessionStorage.setItem("sa_authenticated", "true");
      set({ user: MOCK_ADMIN, status: "authenticated", loading: false });
    } else {
      set({ error: "Invalid verification code", loading: false });
    }
  },

  checkSession: () => {
    if (typeof window !== "undefined") {
      const isAuth = sessionStorage.getItem("sa_authenticated") === "true";
      if (isAuth) {
        set({ user: MOCK_ADMIN, status: "authenticated" });
      } else {
        set({ status: "unauthenticated" });
      }
    }
  },

  updateUser: (updates: Partial<AdminUser>) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null,
    }));
  },

  signOut: () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("sa_access_token");
      sessionStorage.removeItem("sa_authenticated");
    }
    set({
      user: null,
      status: "unauthenticated",
      loading: false,
      error: null,
    });
  },
}));
