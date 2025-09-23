// src/types/profile.ts
export type Profile = {
    user_id: string;
    display_name: string | null;   // NEW
    handle: string | null;
    avatar_url: string | null;
    is_guest: boolean;
    is_first_time?: boolean;
    has_received_signup_bonus?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  
  