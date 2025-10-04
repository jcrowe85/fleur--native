// src/types/index.ts
export * from './plan';
export * from './profile';

// Article types for education module
export type EduCategory = 
  | "Peptides 101"
  | "Hair Science"
  | "Hair Wellness"
  | "Natural Care"
  | "scalp_health"
  | "hair_loss"
  | "styling"
  | "product_guide"
  | "routine_building"
  | "ingredients"
  | string;

export type Article = {
  id?: string; // Optional for seed data
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  category: EduCategory;
  icon?: string | null;
  read_minutes: number;
  audio_available: boolean;
  tags?: string[]; // Optional for seed data
  body_md?: string; // Optional for seed data
  body?: string; // Alternative field name used in some places
  hero?: string; // Hero image URL
  created_at?: string; // Optional for seed data
  updated_at?: string; // Optional for seed data
  published_at?: string; // Used in some sorting operations
};

