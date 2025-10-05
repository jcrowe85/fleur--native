-- Create articles table for Fleur education content
CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" NOT NULL DEFAULT gen_random_uuid(),
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "subtitle" "text",
    "excerpt" "text",
    "category" "text" NOT NULL,
    "icon" "text",
    "read_minutes" integer DEFAULT 5,
    "audio_available" boolean DEFAULT false,
    "tags" "text"[] DEFAULT '{}',
    "body_md" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    "published_at" timestamp with time zone DEFAULT now()
);

-- Add primary key constraint
ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");

-- Add unique constraint on slug
ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "articles_category_idx" ON "public"."articles" USING btree ("category");
CREATE INDEX IF NOT EXISTS "articles_published_at_idx" ON "public"."articles" USING btree ("published_at" DESC);
CREATE INDEX IF NOT EXISTS "articles_created_at_idx" ON "public"."articles" USING btree ("created_at" DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for public read access
CREATE POLICY "Articles are publicly readable" ON "public"."articles"
    FOR SELECT USING (true);

-- Create RLS policies for authenticated users (admin access)
CREATE POLICY "Authenticated users can insert articles" ON "public"."articles"
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update articles" ON "public"."articles"
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete articles" ON "public"."articles"
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_articles_updated_at 
    BEFORE UPDATE ON "public"."articles" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON "public"."articles" TO "authenticated";
GRANT ALL ON "public"."articles" TO "service_role";
GRANT SELECT ON "public"."articles" TO "anon";
