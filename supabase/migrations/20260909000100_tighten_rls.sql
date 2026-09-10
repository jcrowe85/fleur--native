-- Tighten row level security.
--
-- Several policies were written as blanket `USING (true)` / `WITH CHECK (true)`.
-- Postgres ORs policies together, so a single permissive policy defeats every
-- restrictive one alongside it. Because the app auto-creates a Supabase account
-- for every visitor, "any authenticated user" is effectively "anyone".

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
-- "System can manage profiles" was FOR ALL USING (true): any signed-in user
-- could read, update or delete ANY other user's profile row, which also made
-- the "Users can view/update own profile" policies beside it meaningless.
DROP POLICY IF EXISTS "System can manage profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can view own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can update own profile" ON "public"."profiles";
DROP POLICY IF EXISTS "Users can insert own profile" ON "public"."profiles";

-- The community feed embeds each post's author, so profile rows must stay
-- readable across users. Sensitive columns are withheld with column-level
-- grants below rather than by row, since RLS cannot filter columns.
CREATE POLICY "Profiles are readable by signed-in users"
    ON "public"."profiles" FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert own profile"
    ON "public"."profiles" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id AND auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON "public"."profiles" FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
    ON "public"."profiles" FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Withhold email from cross-user reads. Nothing in the app reads
-- profiles.email; the auth session already carries the current user's address.
REVOKE SELECT ON TABLE "public"."profiles" FROM "authenticated", "anon";
GRANT SELECT (
    id, user_id, first_name, last_name, display_name, handle, avatar_url,
    is_guest, first_login, has_performed_first_action, created_at, updated_at
) ON TABLE "public"."profiles" TO "authenticated";
GRANT INSERT, UPDATE, DELETE ON TABLE "public"."profiles" TO "authenticated";

-- ---------------------------------------------------------------------------
-- posts / comments / likes
-- ---------------------------------------------------------------------------
-- These only required `auth.uid() IS NOT NULL`, so a user could insert a row
-- with someone else's user_id and publish content under their name.
DROP POLICY IF EXISTS "Authenticated users can create posts" ON "public"."posts";
CREATE POLICY "Users can create own posts"
    ON "public"."posts" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create comments" ON "public"."comments";
CREATE POLICY "Users can create own comments"
    ON "public"."comments" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can create likes" ON "public"."likes";
CREATE POLICY "Users can create own likes"
    ON "public"."likes" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- support_messages
-- ---------------------------------------------------------------------------
-- "Webhook can insert support replies" allowed ANY caller to insert a row as
-- long as is_from_user = false, with no constraint on user_id — so one user
-- could plant fake "support" replies in another user's conversation. Replies
-- arrive via the service-role webhook, which bypasses RLS and needs no policy.
DROP POLICY IF EXISTS "Webhook can insert support replies" ON "public"."support_messages";

-- ---------------------------------------------------------------------------
-- sync_analytics / notification_promotions
-- ---------------------------------------------------------------------------
-- Both were WITH CHECK (true), letting anyone write rows attributed to any user.
DROP POLICY IF EXISTS "System can insert sync analytics" ON "public"."sync_analytics";
CREATE POLICY "Users can insert own sync analytics"
    ON "public"."sync_analytics" FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can manage notification promotions" ON "public"."notification_promotions";
-- Promotions are written by the service-role API server only; users read theirs
-- via the existing "Users can view own notification promotions" policy.

-- ---------------------------------------------------------------------------
-- storage: community bucket
-- ---------------------------------------------------------------------------
-- Uploads land at "<uid>/<file>". Pin the prefix so a user cannot write into
-- another user's folder, and allow them to remove their own uploads.
DROP POLICY IF EXISTS "Allow authenticated users to upload to community 1ajt695_0"
    ON "storage"."objects";

CREATE POLICY "Users can upload to their own community folder"
    ON "storage"."objects" FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'community'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their own community uploads"
    ON "storage"."objects" FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'community'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );
