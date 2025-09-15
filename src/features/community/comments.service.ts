// src/features/community/comments.service.ts
import { supabase } from "@/services/supabase";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";
import type { CommentItem } from "./types";

const PAGE_SIZE = 20;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No auth user");
  return data.user.id;
}

export function useCommentsService() {
  const { open } = usePickHandleSheet();

  return {
    // create a new comment on a post
    create: async ({ postId, body }: { postId: string; body: string }) => {
      await ensureHandleOrPrompt(open);
      const user_id = await getUserId();
      const { error } = await supabase.from("comments").insert({
        post_id: postId,
        user_id,
        body,
      });
      if (error) throw error;
    },

    // paginated list of comments for a post (oldest → newest)
    listPageForPost: async (
      postId: string,
      page = 0
    ): Promise<{ items: CommentItem[]; hasMore: boolean }> => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("comments")
        .select(
          // use the FK-qualified embed to avoid ambiguity
          "id, post_id, user_id, body, created_at, author:profiles!comments_user_id_fkey(display_name, handle, avatar_url)",
          { count: "exact" }
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true })
        .range(from, to);

      if (error) throw error;

      const items: CommentItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        post_id: row.post_id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        author: row.author
          ? {
              display_name: row.author.display_name,
              handle: row.author.handle,
              avatar_url: row.author.avatar_url,
            }
          : null,
      }));

      const total = count ?? 0;
      const hasMore = to + 1 < total;
      return { items, hasMore };
    },

    // optional: allow author to delete their own comment
    removeMine: async (commentId: string) => {
      const uid = await getUserId();
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", uid);
      if (error) throw error;
    },
  };
}


// src/features/community/comments.service.ts
// add this helper export at the bottom (keep existing exports)
export async function getCommentCounts(postIds: string[]): Promise<Map<string, number>> {
    if (!postIds.length) return new Map();
    const { data, error } = await supabase
      .from("comments")
      .select("post_id, id", { count: "exact", head: false }) // grab rows, we’ll group client-side
      .in("post_id", postIds);
    if (error) throw error;
  
    const map = new Map<string, number>();
    for (const r of (data ?? []) as any[]) {
      map.set(r.post_id, (map.get(r.post_id) ?? 0) + 1);
    }
    return map;
  }
  