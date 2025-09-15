// src/types/profile.ts
export type Profile = {
    user_id: string;
    display_name: string | null;   // NEW
    handle: string | null;
    avatar_url: string | null;
    is_guest: boolean;
  };
  
  