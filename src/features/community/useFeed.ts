import { useEffect, useRef, useState, useCallback } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import type { PostItem } from "./types";
import { usePostsService } from "./posts.service";
import { fetchBlockedUserIds } from "./moderation.service";

export function useFeed() {
  const { listPage } = usePostsService();
  const [items, setItems] = useState<PostItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  /**
   * Authors this user has blocked.
   *
   * Filtering client-side keeps pagination simple and takes effect immediately
   * when someone blocks from the post menu, without waiting for a refetch.
   */
  const blockedRef = useRef<Set<string>>(new Set());

  const dropBlocked = useCallback(
    (list: PostItem[]) => list.filter((p) => !blockedRef.current.has(p.user_id)),
    []
  );

  /** Hide an author's posts right away and remember the block. */
  const hideAuthor = useCallback((userId: string) => {
    blockedRef.current.add(userId);
    setItems((prev) => prev.filter((p) => p.user_id !== userId));
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [blocked, { items: first, hasMore }] = await Promise.all([
        fetchBlockedUserIds(),
        listPage(0),
      ]);
      blockedRef.current = new Set(blocked);
      setItems(dropBlocked(first));
      setPage(1);
      setHasMore(hasMore);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feed");
    } finally {
      setRefreshing(false);
    }
  }, [listPage, dropBlocked]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { items: more, hasMore: moreLeft } = await listPage(page);
      setItems((prev) => [...prev, ...dropBlocked(more)]);
      setPage((p) => p + 1);
      setHasMore(moreLeft);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load more");
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, page, listPage, dropBlocked]);

  useEffect(() => {
    // run once on mount
    refresh();

    // one realtime subscription
    const ch = supabase
      .channel("community-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, (payload) => {
        const postId = (payload.new as any)?.post_id as string | undefined;
        if (!postId) return;
        setItems((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: (p.comments_count ?? 0) + 1 } : p))
        );
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, (payload) => {
        const postId = (payload.old as any)?.post_id as string | undefined;
        if (!postId) return;
        setItems((prev) =>
          prev.map((p) =>
            p.id === postId ? { ...p, comments_count: Math.max((p.comments_count ?? 0) - 1, 0) } : p
          )
        );
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "likes" }, async (payload) => {
        const { data } = await supabase.auth.getUser();
        const me = data.user?.id;
        if (!me) return;

        if (payload.eventType === "INSERT") {
          const row = payload.new as any;
          if (row.user_id === me) {
            setItems((prev) => prev.map((p) => (p.id === row.post_id ? { ...p, liked_by_me: true } : p)));
          }
        } else if (payload.eventType === "DELETE") {
          const row = payload.old as any;
          if (row.user_id === me) {
            setItems((prev) => prev.map((p) => (p.id === row.post_id ? { ...p, liked_by_me: false } : p)));
          }
        }
      })
      .subscribe();

    channelRef.current = ch;
    return () => {
      channelRef.current?.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 👈 run once

  return { items, hasMore, loadMore, refresh, refreshing, loading, error, setItems, hideAuthor };
}
