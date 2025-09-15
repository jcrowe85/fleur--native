// src/state/profileStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

type ProfileState = {
  handle: string | null;
  avatarUrl: string | null;
  hasPickedHandle: boolean;
  setLocalProfile: (p: Partial<ProfileState>) => void;
  reset: () => void;
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      handle: null,
      avatarUrl: null,
      hasPickedHandle: false,
      setLocalProfile: (p) => set((s) => ({ ...s, ...p })),
      reset: () => set({ handle: null, avatarUrl: null, hasPickedHandle: false }),
    }),
    { name: "profile-store" }
  )
);
