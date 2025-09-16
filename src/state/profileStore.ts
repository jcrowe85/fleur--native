// src/state/profileStore.ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Profile = { user_id: string; handle?: string; display_name?: string; avatar_url?: string | null };

type State = {
  profile: Profile | null;
  // actions optional; not required by the guard
  setProfile?: (p: Partial<Profile>) => void;
  clear?: () => void;
};

export const useProfileStore = create<State>()(
  persist(
    (set, get) => ({
      profile: null,
      // actions optional
      setProfile: (p) => set({ profile: { ...(get().profile ?? {} as any), ...p } }),
      clear: () => set({ profile: null }),
    }),
    { name: "profile", storage: createJSONStorage(() => AsyncStorage) }
  )
);
