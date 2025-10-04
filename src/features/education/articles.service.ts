import type { Article, EduCategory } from "./types";

/**
 * Local seed — loads instantly, no DB needed.
 * You can later replace listArticles() impl with Supabase and keep the same API.
 */
const SEED: Article[] = [
  // Peptides 101
  {
    slug: "peptides-basics",
    title: "Peptides 101: What They Do for Hair",
    category: "Peptides 101",
    excerpt: "A quick primer on peptide types and how they interact with the hair fiber.",
    body:
      "Peptides are short chains of amino acids. In hair care, they may aid feel, manageability, and breakage resistance by forming films and improving lubrication. While claims vary, look for products with clear peptide identity and concentration.",
    read_minutes: 4,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-01T00:00:00.000Z",
  },
  {
    slug: "how-to-use-peptides",
    title: "How to Use Peptides in Your Routine",
    category: "Peptides 101",
    excerpt: "Simple ways to slot peptides next to cleansers, masks, and leave-ins.",
    body:
      "Start with a peptide leave-in on damp hair 2–3x/week. Pair with a moisturizing mask on alternate wash days. Track your results for 4–6 weeks and adjust cadence.",
    read_minutes: 3,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-02T00:00:00.000Z",
  },

  // Hair Science
  {
    slug: "cuticle-structure",
    title: "The Hair Cuticle: Layers, Lipids, and Lift",
    category: "Hair Science",
    excerpt: "Why the outermost layers matter for shine and breakage.",
    body:
      "The cuticle consists of overlapping cells sealed by a lipid layer (18-MEA). Heat, UV, and chemical services erode this layer, increasing friction. Films, silicones, and conditioners can partially restore slip.",
    read_minutes: 5,
    audio_available: true,
    hero: undefined,
    published_at: "2025-09-03T00:00:00.000Z",
  },
  {
    slug: "protein-moisture-balance",
    title: "Protein vs. Moisture: Finding Balance",
    category: "Hair Science",
    excerpt: "When to reach for protein treatments vs. humectants and emollients.",
    body:
      "If hair feels overly soft, mushy, or limp, a protein treatment may help structure. If it feels straw-like or brittle, prioritize moisture and emollients. Alternate as needed.",
    read_minutes: 4,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-04T00:00:00.000Z",
  },

  // Hair Wellness
  {
    slug: "scalp-care-foundations",
    title: "Scalp Care Foundations",
    category: "Hair Wellness",
    excerpt: "Gentle cleansing, micro-inflammation basics, and when to see a pro.",
    body:
      "Keep the scalp clean and comfortable. If you notice persistent itching, scale, or shedding spikes, consult a dermatologist. Avoid harsh mechanical scrubbing.",
    read_minutes: 4,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-05T00:00:00.000Z",
  },
  {
    slug: "sleep-and-hair",
    title: "Sleep, Stress, and Hair",
    category: "Hair Wellness",
    excerpt: "How sleep debt and stress load may show up in your hair.",
    body:
      "Chronic stress influences hair cycle dynamics. Prioritize sleep hygiene and gentle handling during high-stress periods. Satin/silk pillowcases can reduce friction.",
    read_minutes: 3,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-06T00:00:00.000Z",
  },

  // Natural Care
  {
    slug: "gentle-detangling",
    title: "Gentle Detangling, Step by Step",
    category: "Natural Care",
    excerpt: "Reduce breakage with slip, sections, and the right tools.",
    body:
      "Saturate with conditioner, detangle in sections from ends upward, and use wide-tooth tools. Avoid yanking through knots; add more slip as needed.",
    read_minutes: 3,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-07T00:00:00.000Z",
  },
  {
    slug: "air-dry-playbook",
    title: "Air-Dry Playbook",
    category: "Natural Care",
    excerpt: "Cast-building gels vs. creams, and how to break the cast.",
    body:
      "Apply your styler on soaking-wet hair, encourage clumps, then hands-off while drying. Once fully dry, scrunch out the cast with a drop of lightweight oil.",
    read_minutes: 4,
    audio_available: false,
    hero: undefined,
    published_at: "2025-09-08T00:00:00.000Z",
  },
];

/** API kept tiny and stable for your screens */
export async function listArticles(): Promise<Article[]> {
  // If you later plug Supabase here, keep the same return shape.
  // Sort newest first to match typical feeds.
  return SEED.slice().sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
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
    const hay =
      `${a.title} ${a.excerpt ?? ""} ${a.body}`.toLowerCase();
    return catOk && hay.includes(q);
  });
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const found = SEED.find((a) => a.slug === slug);
  return found ?? null;
}

/* ----------------- OPTIONAL: Supabase hookup later -----------------

import { supabase } from "@/services/supabase";

export async function listArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,category,excerpt,body,read_minutes,audio_available,hero,published_at")
    .order("published_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as Article[];
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("slug,title,category,excerpt,body,read_minutes,audio_available,hero,published_at")
    .eq("slug", slug)
    .single();

  if (error) return null;
  return (data as Article) ?? null;
}

--------------------------------------------------------------------- */
