-- User-generated content moderation + account deletion support.
--
-- App Store Review Guideline 1.2 and Google Play's UGC policy both require an
-- app with a public feed to offer a way to report objectionable content and to
-- block abusive users, with reports acted on within 24 hours. Neither existed.
-- Guideline 5.1.1(v) additionally requires in-app account deletion for any app
-- that supports account creation.

-- ---------------------------------------------------------------------------
-- Columns the soft-delete Edge Function expects but that were never created
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."profiles"
    ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "public"."user_deletions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT now() NOT NULL,
    "deletion_type" text NOT NULL DEFAULT 'soft_delete',
    "reason" text
);

ALTER TABLE "public"."user_deletions" ENABLE ROW LEVEL SECURITY;
-- Written only by the service-role Edge Function; no user-facing policy.
GRANT ALL ON TABLE "public"."user_deletions" TO "service_role";

-- ---------------------------------------------------------------------------
-- Content reports
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."content_reports" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "reporter_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "post_id" uuid REFERENCES public.posts(id) ON DELETE CASCADE,
    "comment_id" uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    "reason" text NOT NULL CHECK (reason IN (
        'spam', 'harassment', 'hate_speech', 'nudity',
        'misinformation', 'self_harm', 'other'
    )),
    "details" text,
    "status" text NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "reviewed_at" timestamp with time zone,
    -- Exactly one target.
    CONSTRAINT "content_reports_one_target" CHECK (
        (post_id IS NOT NULL AND comment_id IS NULL) OR
        (post_id IS NULL AND comment_id IS NOT NULL)
    ),
    -- One report per user per item.
    CONSTRAINT "content_reports_unique_post" UNIQUE (reporter_id, post_id),
    CONSTRAINT "content_reports_unique_comment" UNIQUE (reporter_id, comment_id)
);

CREATE INDEX IF NOT EXISTS "content_reports_pending_idx"
    ON "public"."content_reports" ("created_at" DESC) WHERE status = 'pending';

ALTER TABLE "public"."content_reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can file reports"
    ON "public"."content_reports" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
    ON "public"."content_reports" FOR SELECT
    TO authenticated
    USING (auth.uid() = reporter_id);

GRANT SELECT, INSERT ON TABLE "public"."content_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."content_reports" TO "service_role";

-- ---------------------------------------------------------------------------
-- Blocked users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "blocker_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "blocked_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT "blocked_users_not_self" CHECK (blocker_id <> blocked_id)
);

ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own block list"
    ON "public"."blocked_users" FOR ALL
    TO authenticated
    USING (auth.uid() = blocker_id)
    WITH CHECK (auth.uid() = blocker_id);

GRANT SELECT, INSERT, DELETE ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";

-- ---------------------------------------------------------------------------
-- Feed view that hides blocked authors and moderated content
-- ---------------------------------------------------------------------------
ALTER TABLE "public"."posts"
    ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone;

CREATE OR REPLACE VIEW "public"."visible_posts"
WITH (security_invoker = true) AS
SELECT p.*
FROM public.posts p
WHERE p.hidden_at IS NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.blocked_users b
      WHERE b.blocker_id = auth.uid() AND b.blocked_id = p.user_id
  );

GRANT SELECT ON "public"."visible_posts" TO "authenticated";
