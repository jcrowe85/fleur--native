// src/features/community/likes.service.ts
import { supabase } from "@/services/supabase";
import { usePickHandleSheet } from "./pickHandleSheet";
import { ensureHandleOrPrompt } from "./ensureHandle";
import { ensureSession } from "@/features/community/ensureSession";
import { onFirstLike } from "@/services/rewards";

/** Like/unlike a post with RLS-safe preconditions and robust toggle. */
export function useLikesService() {
  const { open } = usePickHandleSheet();

  return {
    toggle: async (postId: string): Promise<boolean> => {
      const uid = await ensureSession();           // ensure authenticated
      await ensureHandleOrPrompt(open);            // ensure handle if your policy requires it
      console.log("[likes.toggle] uid:", uid, "post:", postId);

      // 1) Try to LIKE by inserting. If a row exists (unique constraint), we UNLIKE instead.
      const { error: insErr } = await supabase.from("likes").insert({ post_id: postId });
      if (!insErr) {
        // insert succeeded → now liked
        // Award points for first like (one-time only, not reversible)
        onFirstLike({ postId });
        return true;
      }

      // 2) If insert failed because it already exists, UNLIKE (delete my row)
      const msg = String((insErr as any)?.message ?? "");
      const code = (insErr as any)?.code;
      const isUniqueViolation = code === "23505" || /duplicate key|unique/i.test(msg);

      if (isUniqueViolation) {
        const { error: delErr } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", uid);
        if (delErr) {
          console.log("[likes.toggle] delete error:", delErr);
          throw delErr;
        }
        return false; // now unliked
      }

      // 3) Some other error (likely RLS or auth) → surface it so UI can revert
      console.log("[likes.toggle] insert error:", insErr);
      throw insErr;
    },
  };
}
