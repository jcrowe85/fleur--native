// src/features/community/posts.service.ts
import { useCallback, useMemo } from "react";
import { supabase } from "@/services/supabase";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";
import { ensureSession } from "./ensureSession";
import type { PostItem } from "./types";

const PAGE_SIZE = 10;

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No auth user");
  return data.user.id;
}

export function usePostsService() {
  const { open } = usePickHandleSheet();

  const create = useCallback(
    async (input: {
      body: string;
      category: "hair_journeys" | "tips_tricks" | "before_after" | "questions";
      mediaUrl?: string | null;       // legacy, optional
      mediaUrls?: string[] | null;    // NEW: multiple
    }) => {
      await ensureSession();
      await ensureHandleOrPrompt(open);

      const user_id = await getUserId();
      const media_urls = (input.mediaUrls ?? undefined) as unknown as string[] | undefined;

      const { error } = await supabase.from("posts").insert({
        user_id,
        body: input.body,
        category: input.category,
        media_url: input.mediaUrl ?? media_urls?.[0] ?? null,
        media_urls: media_urls ?? null,
      });

      if (error) throw error;
    },
    [open]
  );

  const listPage = useCallback(
    async (page = 0): Promise<{ items: PostItem[]; hasMore: boolean }> => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("posts")
        .select(
          [
            "id",
            "user_id",
            "body",
            "media_url",
            "media_urls",
            "category",
            "created_at",
            "comments_count",
            "author:profiles!posts_user_id_fkey(display_name, handle, avatar_url)",
          ].join(", "),
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const items: PostItem[] = (data ?? []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        body: row.body,
        media_url: row.media_url ?? null,
        media_urls: Array.isArray(row.media_urls)
          ? row.media_urls
          : row.media_url
          ? [row.media_url]
          : [],
        category: row.category,
        created_at: row.created_at,
        comments_count: typeof row.comments_count === "number" ? row.comments_count : 0,
        author: row.author
          ? {
              display_name: row.author.display_name,
              handle: row.author.handle,
              avatar_url: row.author.avatar_url,
            }
          : null,
        liked_by_me: false,
      }));

      // Mark which posts I liked (no likes_count column assumed)
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id;
      if (uid && items.length) {
        const ids = items.map((p) => p.id);
        const { data: mine, error: likeErr } = await supabase
          .from("likes")
          .select("post_id")
          .eq("user_id", uid)
          .in("post_id", ids);
        if (likeErr) throw likeErr;

        const likedSet = new Set((mine ?? []).map((r: any) => r.post_id as string));
        for (const p of items) if (likedSet.has(p.id)) p.liked_by_me = true;
      }

      const total = count ?? 0;
      const hasMore = to + 1 < total;
      return { items, hasMore };
    },
    []
  );

  return useMemo(() => ({ create, listPage }), [create, listPage]);
}
