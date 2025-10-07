


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Check if this is a guest user based on email pattern
  IF NEW.email LIKE '%@guest.local' THEN
    INSERT INTO public.profiles (id, user_id, email, is_guest)
    VALUES (NEW.id, NEW.id, NEW.email, true);
  ELSE
    INSERT INTO public.profiles (id, user_id, email, is_guest)
    VALUES (NEW.id, NEW.id, NEW.email, false);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_post_comments_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- When a comment is INSERTED
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  END IF;
  
  -- When a comment is DELETED
  IF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  
  -- When a comment is UPDATED (post_id changed)
  IF TG_OP = 'UPDATE' THEN
    -- Decrement count for old post
    UPDATE posts 
    SET comments_count = comments_count - 1
    WHERE id = OLD.post_id;
    
    -- Increment count for new post
    UPDATE posts 
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_post_comments_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "excerpt" "text",
    "category" "text" NOT NULL,
    "icon" "text",
    "read_minutes" integer DEFAULT 5,
    "audio_available" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "body_md" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "published_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid",
    "user_id" "uuid",
    "body" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "device_token" "text" NOT NULL,
    "platform" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notification_promotions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "promotion_type" "text" NOT NULL,
    "sent_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notification_promotions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "body" "text" NOT NULL,
    "category" "text" NOT NULL,
    "media_url" "text",
    "media_urls" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "comments_count" integer DEFAULT 0
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "display_name" "text",
    "handle" "text",
    "avatar_url" "text",
    "is_guest" boolean DEFAULT false,
    "first_login" boolean DEFAULT true,
    "has_performed_first_action" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "message_text" "text" NOT NULL,
    "is_from_user" boolean NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "slack_thread_ts" "text",
    "slack_message_ts" "text",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."support_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sync_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "sync_type" "text" NOT NULL,
    "success" boolean NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_sync_data" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "routine_data" "jsonb",
    "preferences" "jsonb",
    "last_synced" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "plan_data" "jsonb",
    "rewards_data" "jsonb",
    "cart_data" "jsonb",
    "purchase_data" "jsonb",
    "notification_preferences" "jsonb",
    "sync_frequency" "text" DEFAULT 'daily'::"text",
    "device_info" "jsonb"
);


ALTER TABLE "public"."user_sync_data" OWNER TO "postgres";


ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("post_id", "user_id");



ALTER TABLE ONLY "public"."notification_promotions"
    ADD CONSTRAINT "notification_promotions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_handle_key" UNIQUE ("handle");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_unique" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_analytics"
    ADD CONSTRAINT "sync_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sync_data"
    ADD CONSTRAINT "user_sync_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_sync_data"
    ADD CONSTRAINT "user_sync_data_user_id_unique" UNIQUE ("user_id");



CREATE INDEX "articles_category_idx" ON "public"."articles" USING "btree" ("category");



CREATE INDEX "articles_created_at_idx" ON "public"."articles" USING "btree" ("created_at" DESC);



CREATE INDEX "articles_published_at_idx" ON "public"."articles" USING "btree" ("published_at" DESC);



CREATE INDEX "idx_support_messages_created_at" ON "public"."support_messages" USING "btree" ("created_at");



CREATE INDEX "idx_support_messages_user_id" ON "public"."support_messages" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "update_articles_updated_at" BEFORE UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_comments_count_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_post_comments_count"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_promotions"
    ADD CONSTRAINT "notification_promotions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_messages"
    ADD CONSTRAINT "support_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_analytics"
    ADD CONSTRAINT "sync_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sync_data"
    ADD CONSTRAINT "user_sync_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view comments" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Anyone can view likes" ON "public"."likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view posts" ON "public"."posts" FOR SELECT USING (true);



CREATE POLICY "Articles are publicly readable" ON "public"."articles" FOR SELECT USING (true);



CREATE POLICY "Authenticated users can create comments" ON "public"."comments" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can create likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can create posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can delete articles" ON "public"."articles" FOR DELETE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert articles" ON "public"."articles" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update articles" ON "public"."articles" FOR UPDATE USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Service role can manage all support messages" ON "public"."support_messages" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can insert sync analytics" ON "public"."sync_analytics" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can manage notification promotions" ON "public"."notification_promotions" WITH CHECK (true);



CREATE POLICY "System can manage profiles" ON "public"."profiles" USING (true);



CREATE POLICY "Users can delete own comments" ON "public"."comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own posts" ON "public"."posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own support messages" ON "public"."support_messages" FOR INSERT WITH CHECK (((("auth"."uid"() = "user_id") AND ("auth"."uid"() IS NOT NULL)) OR ("auth"."role"() = 'service_role'::"text")));



CREATE POLICY "Users can manage own devices" ON "public"."devices" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own support messages" ON "public"."support_messages" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own sync data" ON "public"."user_sync_data" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own comments" ON "public"."comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own notification promotions" ON "public"."notification_promotions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own sync analytics" ON "public"."sync_analytics" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own support messages" ON "public"."support_messages" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Webhook can insert support replies" ON "public"."support_messages" FOR INSERT WITH CHECK (("is_from_user" = false));



ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_promotions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sync_data" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_post_comments_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."notification_promotions" TO "anon";
GRANT ALL ON TABLE "public"."notification_promotions" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_promotions" TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."support_messages" TO "anon";
GRANT ALL ON TABLE "public"."support_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."support_messages" TO "service_role";



GRANT ALL ON TABLE "public"."sync_analytics" TO "anon";
GRANT ALL ON TABLE "public"."sync_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."user_sync_data" TO "anon";
GRANT ALL ON TABLE "public"."user_sync_data" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sync_data" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
