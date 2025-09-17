export type Author = {
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
};

export type PostItem = {
  id: string;
  user_id: string;
  body: string;
  category?: "hair_journeys" | "tips_tricks" | "before_after" | "questions";
  media_url?: string | null;   // legacy single
  media_urls?: string[];       // NEW multiple
  created_at: string;
  comments_count: number;
  author: Author | null;
  liked_by_me: boolean;
};

export type CommentAuthor = {
  display_name?: string | null;
  handle?: string | null;
  avatar_url?: string | null;
} | null;

export type CommentItem = {
  id: string;
  user_id: string;          // ⬅️ add this
  post_id: string;
  body: string;
  created_at: string;
  author: CommentAuthor;
};