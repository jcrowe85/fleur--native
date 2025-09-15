// src/features/community/likes.service.ts
import { supabase } from "@/services/supabase";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";

async function getUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("No auth user");
  return data.user.id;
}

export function useLikesService() {
  const { open } = usePickHandleSheet();

  return {
    toggle: async (postId: string) => {
      await ensureHandleOrPrompt(open);
      const user_id = await getUserId();

      // check existing
      const { data: existing, error: selErr } = await supabase
        .from("likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", user_id)
        .maybeSingle();
      if (selErr && selErr.code !== "PGRST116") throw selErr;

      if (existing) {
        const { error } = await supabase.from("likes").delete().eq("post_id", postId).eq("user_id", user_id);
        if (error) throw error;
        return false; // now unliked
      } else {
        const { error } = await supabase.from("likes").insert({ post_id: postId, user_id });
        if (error) throw error;
        return true; // now liked
      }
    },
  };
}
