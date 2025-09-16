// src/features/community/comments.service.ts
import { supabase } from "@/services/supabase";
import type { CommentItem } from "./types";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";
import { ensureSession } from "@/features/community/ensureSession";


const COMMENTS_PAGE_SIZE = 20;

export function useCommentsService() {
  const { open } = usePickHandleSheet();

  async function create({ postId, body }: { postId: string; body: string }): Promise<CommentItem> {
    // Ensure we’re authenticated (RLS) and have a handle if your policy requires it
    const uid = await ensureSession();
    await ensureHandleOrPrompt(open);
    console.log("[comments.create] uid:", uid);

    const { data, error } = await supabase
      .from("comments")
      // If DB doesn't have: comments.user_id DEFAULT auth.uid(), then include { user_id: uid } here
      .insert({ post_id: postId, body })
      .select(
        "id, post_id, body, created_at, author:profiles!comments_user_id_fkey(display_name, handle, avatar_url)"
      )
      .single();

    if (error) {
      console.log("[comments.create] RLS/insert error:", error);
      throw error;
    }

    const row: any = data;
    return {
      id: row.id,
      user_id: row.user_id,
      post_id: row.post_id,
      body: row.body,
      created_at: row.created_at,
      author: row.author
        ? {
            display_name: row.author.display_name,
            handle: row.author.handle,
            avatar_url: row.author.avatar_url,
          }
        : null,
    };
  }

  async function listPageForPost(
    postId: string,
    page = 0
  ): Promise<{ items: CommentItem[]; hasMore: boolean; total: number }> {
    const from = page * COMMENTS_PAGE_SIZE;
    const to = from + COMMENTS_PAGE_SIZE - 1;

    const { data, error, count } = await supabase
      .from("comments")
      .select(
        "id, post_id, body, created_at, author:profiles!comments_user_id_fkey(display_name, handle, avatar_url)",
        { count: "exact" }
      )
      .eq("post_id", postId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const items: CommentItem[] = (data ?? []).map((row: any) => ({
      id: row.id,
      post_id: row.post_id,
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
    return { items, hasMore, total };
  }

  return { create, listPageForPost };
}
