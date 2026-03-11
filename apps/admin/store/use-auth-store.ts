import { create } from "zustand";

type AuthStore = {
  verificationCode: string[];
  setVerificationCode: (code: string[]) => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  verificationCode: [],
  setVerificationCode: (verificationCode) => set({ verificationCode }),
}));
