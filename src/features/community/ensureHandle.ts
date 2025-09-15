// src/features/community/ensureHandle.ts
import { getMyProfile, upsertMyProfile, validateDisplayName } from "@/services/profile";
import { useProfileStore } from "@/state/profileStore";

function isPlaceholder(h?: string | null) {
  return !h || /^anonymous-/i.test(h);
}

export async function ensureHandleOrPrompt(
  showSheet?: () => Promise<{ handle?: string; avatarUrl?: string | null; display_name: string }>
): Promise<string> {
  const server = await getMyProfile();
  if (server?.display_name && !isPlaceholder(server.handle)) return server.handle!;

  const local = useProfileStore.getState();
  if (local.hasPickedHandle && local.handle && local.avatarUrl != null) {
    // if you already stored a local pick previously, trust it as display name
    const nameErr = validateDisplayName(local.handle); // treat stored "handle" as name from old flow
    if (!nameErr) {
      const { handle } = await upsertMyProfile({ display_name: local.handle, avatar_url: local.avatarUrl });
      return handle;
    } else {
      useProfileStore.getState().reset();
    }
  }

  if (!showSheet) throw new Error("Name required"); // in practice we pass the sheet

  const picked = await showSheet(); // now returns display_name
  const nameErr = validateDisplayName(picked.display_name);
  if (nameErr) throw new Error(nameErr);

  const { handle } = await upsertMyProfile({ display_name: picked.display_name, avatar_url: picked.avatarUrl ?? null });

  useProfileStore.getState().setLocalProfile({
    handle: picked.display_name,             // store the friendly name locally
    avatarUrl: picked.avatarUrl ?? null,
    hasPickedHandle: true,
  });

  return handle;
}
