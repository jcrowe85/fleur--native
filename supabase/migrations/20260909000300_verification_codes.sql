-- Server-side email verification codes.
--
-- Codes were previously generated in the app, held in an in-memory Map, and
-- passed to the `send-verification-code` Edge Function as a request parameter.
-- Two problems:
--
--  1. The function accepted any {email, code} from any caller with no auth, so
--     it was an open relay: anyone could make Fleur email arbitrary content to
--     arbitrary addresses from your verified sending domain, which is a fast
--     route to that domain being blocklisted.
--  2. The Map is process memory, so a backgrounded app on Android lost the code
--     and the user could never complete verification.

CREATE TABLE IF NOT EXISTS "public"."email_verification_codes" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "email" text NOT NULL,
    -- SHA-256 of the code, never the code itself: a leaked DB read should not
    -- hand out working verification codes.
    "code_hash" text NOT NULL,
    "attempts" integer NOT NULL DEFAULT 0,
    "consumed_at" timestamp with time zone,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "email_verification_codes_lookup_idx"
    ON "public"."email_verification_codes" ("user_id", "email", "created_at" DESC);

ALTER TABLE "public"."email_verification_codes" ENABLE ROW LEVEL SECURITY;

-- No user-facing policy: the table is only ever touched by the service-role
-- Edge Function, which bypasses RLS. Clients must go through the function.
GRANT ALL ON TABLE "public"."email_verification_codes" TO "service_role";

-- Housekeeping: drop codes that are long past use.
CREATE OR REPLACE FUNCTION "public"."purge_expired_verification_codes"()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.email_verification_codes
    WHERE expires_at < now() - interval '1 day';
$$;
