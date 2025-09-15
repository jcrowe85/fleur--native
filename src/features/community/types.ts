// src/features/community/types.ts
export type PostItem = {
    id: string;
    user_id: string;
    body: string;
    media_url: string | null;
    created_at: string;
    author: { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
    liked_by_me?: boolean;
    comments_count?: number; // 👈 NEW
  };
  
  export type CommentItem = {
    id: string;
    post_id: string;
    user_id: string;
    body: string;
    created_at: string;
    author: { display_name: string | null; handle: string | null; avatar_url: string | null } | null;
  };
  