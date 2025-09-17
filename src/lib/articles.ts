import { supabase } from "@/services/supabase";
import type { Article, EduCategory } from "@/types";

export async function listArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,subtitle,excerpt,category,icon,read_minutes,audio_available,tags,body_md,created_at,updated_at")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Article[];
}

export function filterArticles(
  all: Article[],
  opts: { q?: string; category?: EduCategory | "All" }
): Article[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const cat = opts.category ?? "All";
  return all.filter((a) => {
    const catOk = cat === "All" ? true : a.category === cat;
    if (!q) return catOk;
    const hay = `${a.title} ${a.subtitle ?? ""} ${a.excerpt ?? ""} ${a.body_md}`.toLowerCase();
    return catOk && hay.includes(q);
  });
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,title,subtitle,excerpt,category,icon,read_minutes,audio_available,tags,body_md,created_at,updated_at")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return (data as Article) ?? null;
}
