export type EduCategory =
  | "Peptides 101"
  | "Hair Science"
  | "Hair Wellness"
  | "Natural Care"
  | string;

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;     // ✅ corrected spelling
  category: EduCategory;
  icon?: string | null;
  read_minutes: number;
  audio_available: boolean;
  tags: string[];
  body_md: string;
  created_at: string;          // ISO
  updated_at: string;          // ISO
}
