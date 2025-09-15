import { useCallback, useEffect, useState } from "react";
import { usePostsService } from "./posts.service";
import type { PostItem } from "./types";

export function useFeed() {
  const { listPage } = usePostsService();
  const [items, setItems] = useState<PostItem[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const p = reset ? 0 : page;
      const { items: newItems, hasMore } = await listPage(p);
      setItems((prev) => (reset ? newItems : [...prev, ...newItems]));
      setHasMore(hasMore);
      setPage(p + 1);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [listPage, page, loading]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => { load(true); }, []); // initial load

  return { items, hasMore, loadMore: () => !loading && hasMore && load(false), refresh, refreshing, loading, error };
}
