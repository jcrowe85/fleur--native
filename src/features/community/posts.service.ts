// src/features/community/posts.service.ts
import { supabase } from "@/services/supabase";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";
import type { PostItem } from "./types";
import { getCommentCounts } from "./comments.service";

const PAGE_SIZE = 10;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No auth user");
  return data.user.id;
}

export function usePostsService() {
  const { open } = usePickHandleSheet();

  const create = async (input: {
    body: string;
    mediaUrl?: string | null;
    category?: "hair_journeys" | "tips_tricks" | "before_after";
  }) => {
    await ensureHandleOrPrompt(open);
    const user_id = await getUserId();
    const { error } = await supabase.from("posts").insert({
      user_id,
      body: input.body,
      media_url: input.mediaUrl ?? null,
      category: input.category ?? "tips_tricks",
    });
    if (error) throw error;
  };

  const listPage = async (page = 0): Promise<{ items: PostItem[]; hasMore: boolean }> => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    // Embed author via the FK name to avoid ambiguity
    const { data, error, count } = await supabase
      .from("posts")
      .select(
        "id, user_id, body, media_url, created_at, author:profiles!posts_user_id_fkey(display_name, handle, avatar_url)",
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    const items: PostItem[] = (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      body: row.body,
      media_url: row.media_url,
      created_at: row.created_at,
      author: row.author
        ? {
            display_name: row.author.display_name,
            handle: row.author.handle,
            avatar_url: row.author.avatar_url,
          }
        : null,
      liked_by_me: false,   // filled below
      comments_count: 0,    // filled below
    }));

    const ids = items.map((p) => p.id);

    // Mark which of these posts I liked
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    if (uid && ids.length) {
      const { data: mine, error: likeErr } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", uid)
        .in("post_id", ids);
      if (likeErr) throw likeErr;
      const likedSet = new Set((mine ?? []).map((r: any) => r.post_id as string));
      for (const p of items) if (likedSet.has(p.id)) p.liked_by_me = true;
    }

    // Attach comment counts
    try {
      if (ids.length) {
        const counts = await getCommentCounts(ids);
        for (const p of items) p.comments_count = counts.get(p.id) ?? 0;
      }
    } catch {
      // ignore count errors; leave defaults
    }

    const total = count ?? 0;
    const hasMore = to + 1 < total;
    return { items, hasMore };
  };

  return { create, listPage };
}
