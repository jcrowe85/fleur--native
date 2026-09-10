-- Server-side audit + throttle for point redemptions.
--
-- Point balances currently live in the client (AsyncStorage), so the server
-- cannot yet *authoritatively* verify a balance. This table gives us the two
-- things we can enforce today: an immutable record of every code the server
-- minted, and a throttle so a tampered client cannot mint codes in a loop.
--
-- Follow-up (tracked separately): move earn/spend into a server-owned ledger
-- and make `points_spent` here debit that ledger inside a transaction.

CREATE TABLE IF NOT EXISTS "public"."point_redemptions" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "product_sku" text NOT NULL,
    "points_spent" integer NOT NULL CHECK (points_spent > 0),
    "discount_code" text NOT NULL,
    "discount_node_id" text,
    "status" text NOT NULL DEFAULT 'issued'
        CHECK (status IN ('issued', 'redeemed', 'expired', 'revoked')),
    "checkout_url" text,
    "expires_at" timestamp with time zone NOT NULL,
    "redeemed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "point_redemptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "point_redemptions_discount_code_key" UNIQUE ("discount_code")
);

CREATE INDEX IF NOT EXISTS "point_redemptions_user_created_idx"
    ON "public"."point_redemptions" ("user_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "point_redemptions_active_idx"
    ON "public"."point_redemptions" ("user_id", "status")
    WHERE status = 'issued';

ALTER TABLE "public"."point_redemptions" ENABLE ROW LEVEL SECURITY;

-- Users may read their own redemption history and nothing else.
-- Writes go exclusively through the service-role API server, which bypasses RLS.
CREATE POLICY "Users can view own redemptions"
    ON "public"."point_redemptions"
    FOR SELECT
    USING (auth.uid() = user_id);

GRANT SELECT ON TABLE "public"."point_redemptions" TO "authenticated";
GRANT ALL ON TABLE "public"."point_redemptions" TO "service_role";
