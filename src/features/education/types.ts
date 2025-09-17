export type EduCategory = "Peptides 101" | "Hair Science" | "Hair Wellness" | "Natural Care";

export type Article = {
  id: string;             // uuid (or slug as id for local)
  slug: string;           // unique for routing
  title: string;
  subtitle?: string | null;
  excerpt: string;
  category: EduCategory;
  icon?: string | null;   // e.g. "feather:book" (not required)
  read_minutes?: number | null;
  audio_available?: boolean | null;
  tags?: string[] | null;
  body_md: string;        // markdown body
  created_at?: string | null;
  updated_at?: string | null;
};
