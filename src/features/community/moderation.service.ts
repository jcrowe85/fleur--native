// src/features/community/moderation.service.ts
import { supabase } from "@/services/supabase";

/**
 * Content reporting and user blocking.
 *
 * Both stores require these for any app with a public feed: App Store Review
 * Guideline 1.2 (objectionable UGC) and Google Play's User Generated Content
 * policy. Shipping a community tab without them is a near-certain rejection.
 */

export const REPORT_REASONS = [
  { code: "spam", label: "Spam or misleading" },
  { code: "harassment", label: "Harassment or bullying" },
  { code: "hate_speech", label: "Hate speech" },
  { code: "nudity", label: "Nudity or sexual content" },
  { code: "misinformation", label: "False health claims" },
  { code: "self_harm", label: "Self-harm or dangerous advice" },
  { code: "other", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["code"];

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("You need to be signed in to do that.");
  return data.user.id;
}

export async function reportPost(
  postId: string,
  reason: ReportReason,
  details?: string
): Promise<void> {
  const reporterId = await requireUserId();

  const { error } = await supabase.from("content_reports").insert({
    reporter_id: reporterId,
    post_id: postId,
    reason,
    details: details?.trim() || null,
  });

  // A repeat report is a no-op, not an error the user needs to see.
  if (error && error.code !== "23505") throw error;
}

export async function reportComment(
  commentId: string,
  reason: ReportReason,
  details?: string
): Promise<void> {
  const reporterId = await requireUserId();

  const { error } = await supabase.from("content_reports").insert({
    reporter_id: reporterId,
    comment_id: commentId,
    reason,
    details: details?.trim() || null,
  });

  if (error && error.code !== "23505") throw error;
}

export async function blockUser(blockedId: string): Promise<void> {
  const blockerId = await requireUserId();
  if (blockerId === blockedId) throw new Error("You cannot block yourself.");

  const { error } = await supabase
    .from("blocked_users")
    .insert({ blocker_id: blockerId, blocked_id: blockedId });

  if (error && error.code !== "23505") throw error;
}

export async function unblockUser(blockedId: string): Promise<void> {
  const blockerId = await requireUserId();

  const { error } = await supabase
    .from("blocked_users")
    .delete()
    .eq("blocker_id", blockerId)
    .eq("blocked_id", blockedId);

  if (error) throw error;
}

/** Ids the current user has blocked, for client-side feed filtering. */
export async function fetchBlockedUserIds(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("blocked_users")
    .select("blocked_id")
    .eq("blocker_id", auth.user.id);

  if (error) {
    console.warn("[moderation] could not load block list:", error.message);
    return [];
  }

  return (data ?? []).map((row) => row.blocked_id as string);
}
