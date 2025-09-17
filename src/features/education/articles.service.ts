import { supabase } from "@/services/supabase";
import type { Article, EduCategory } from "./types";

// ------- Local fallback (8 starter articles) -------
const LOCAL: Article[] = [
  {
    id: "local-peptides-quick-start",
    slug: "peptides-quick-start",
    category: "Peptides 101",
    title: "Peptides for Hair: A Quick Start",
    subtitle: "What they are, how they work, and why dosage matters",
    excerpt:
      "Peptides are short chains of amino acids that signal your follicles to behave like younger, healthier follicles. Here’s the science, simplified.",
    read_minutes: 10,
    audio_available: false,
    icon: "peptides",
    tags: ["peptides", "beginner"],
    body_md: `## What are hair peptides?

Peptides are short sequences of amino acids that act as *signals*. In hair care, certain peptides (like **GHK-Cu**, **AHK-Cu**, **Pal-AHK**, **PTD-DBM**, and thymus peptides) nudge follicle stem cells, dermal papilla cells, and microvasculature to behave more *youthfully*.

### Key benefits
- Support anagen (growth) phase signaling  
- Improve microcirculation and nutrient delivery  
- Reduce inflammatory markers that impair follicles  
- Synergize with gentle exfoliation and microneedling

### Application tips
- Apply to a clean scalp, once or twice daily  
- Consistency beats intensity — think **8–12 weeks** minimum  
- Combine with scalp hygiene, sleep, and protein-sufficient nutrition

---

## What to pair peptides with
- **Niacinamide (2–5%)** for barrier and sebum balance  
- **Caffeine (~0.2–1%)** for microcirculation  
- **Low-trauma microneedling (0.25–0.5 mm weekly)** to enhance penetration

> TL;DR: Peptides are signals. Give them time + consistency and they reinforce the systems your hair already uses to grow.`,
  },
  {
    id: "local-copper-peptides",
    slug: "copper-peptides-follicle-health",
    category: "Peptides 101",
    title: "Copper Peptides & Follicle Health",
    subtitle: "GHK-Cu isn’t just ‘blue’—it’s bioactive",
    excerpt:
      "Copper peptides can modulate inflammation, support angiogenesis, and improve extracellular matrix health—three pillars of robust follicles.",
    read_minutes: 12,
    audio_available: false,
    icon: "peptides",
    tags: ["copper", "ghk-cu"],
    body_md: `## Why copper matters

Copper (as **GHK-Cu**) participates in wound healing, collagen remodeling, and angiogenesis. In scalp care, that maps to **reduced micro-inflammation** and **better ECM quality** around follicles.

### Practical guidance
- Use leave-on formulas; rinse-offs don’t give sufficient contact time  
- Avoid mixing immediately with strong acids; keep routines separated by time  
- Expect **gradual** cosmetic improvements over **8–16 weeks**`,
  },
  {
    id: "local-hair-cycle",
    slug: "the-real-hair-cycle",
    category: "Hair Science",
    title: "Anagen, Catagen, Telogen: The Real Hair Cycle",
    subtitle: "Growth and rest phases explained without the jargon",
    excerpt:
      "Your hair isn’t static. It cycles through growth (anagen), transition (catagen), and rest (telogen). Understanding this helps expectations.",
    read_minutes: 9,
    audio_available: true,
    icon: "science",
    tags: ["cycle", "biology"],
    body_md: `## The phases
- **Anagen** (2–6+ years): growth  
- **Catagen** (2–3 weeks): controlled regression  
- **Telogen** (3–4 months): rest → shed → restart

### Why shedding can be normal
Up to **50–100 hairs/day** is typical. Synchronization events (stress, illness, postpartum) can push more follicles into telogen—called **TE**—and it’s reversible.

### What helps
- Reduce triggers (stress, iron deficiency)  
- Gentle, peptide-rich topicals + time  
- Protein-adequate diet`,
  },
  {
    id: "local-dht-inflammation",
    slug: "dht-inflammation-scalp-biology",
    category: "Hair Science",
    title: "DHT, Inflammation & Scalp Biology",
    subtitle: "The two-front war against miniaturization",
    excerpt:
      "Miniaturization often involves androgen signaling **and** chronic micro-inflammation. Address both for the best cosmetic outcomes.",
    read_minutes: 11,
    audio_available: false,
    icon: "science",
    tags: ["dht", "inflammation"],
    body_md: `## It’s not only hormones
Androgens like **DHT** alter follicle cycling. But **micro-inflammation** and **fibrosis** around follicles are key co-factors.

### Tactics
- Gentle anti-inflammatory actives (peptides, niacinamide)  
- Avoid harsh detergents; respect scalp barrier  
- Consider physician-guided therapies if needed`,
  },
  {
    id: "local-stress-sleep-shedding",
    slug: "stress-sleep-and-shedding",
    category: "Hair Wellness",
    title: "Stress, Sleep & Shedding: Practical Fixes",
    subtitle: "Lower your allostatic load and your scalp will thank you",
    excerpt:
      "Chronic stress and short sleep push follicles into rest. Small, daily wins — light, movement, and bedtime hygiene — help reverse the trend.",
    read_minutes: 8,
    audio_available: false,
    icon: "wellness",
    tags: ["sleep", "stress"],
    body_md: `## The low-friction plan
- **Morning light** within 60 minutes of waking  
- **15–20 min** brisk movement daily  
- Caffeine cutoff **8+ hours** before bed  
- Wind-down: warm shower, dim lights, phone away

### Pair with scalp routines
- Evening leave-on peptides  
- Weekly low-depth microneedling`,
  },
  {
    id: "local-nutrition-hair",
    slug: "nutrition-for-hair",
    category: "Hair Wellness",
    title: "Nutrition for Hair: Protein, Iron, Zinc",
    subtitle: "Simple checks before you overhaul your diet",
    excerpt:
      "Hair is protein. Under-eating protein or running low on iron, zinc, or B-complex shows up as excessive shedding and weak growth.",
    read_minutes: 7,
    audio_available: false,
    icon: "wellness",
    tags: ["nutrition", "protein"],
    body_md: `## Quick checkpoints
- **Protein**: ~1.6–2.2 g/kg/day for active adults  
- **Iron**: get labs if you suspect deficiency (especially ferritin)  
- **Zinc & B-vitamins**: often missed in restrictive diets

> Work with a clinician for labs and personalized advice.`,
  },
  {
    id: "local-labels-ph",
    slug: "labels-sulfates-silicones-ph",
    category: "Natural Care",
    title: "Sulfates, Silicones & pH: Make Sense of Labels",
    subtitle: "Not all surfactants are harsh and not all silicones are bad",
    excerpt:
      "Formulation nuance matters. Look at the whole system—surfactant blend, pH, and leave-on vs rinse-off—before judging a product.",
    read_minutes: 9,
    audio_available: false,
    icon: "natural",
    tags: ["labels", "ph"],
    body_md: `## The big three
- **Surfactants**: blends can be mild even with a sulfate present  
- **Silicones**: useful for frizz and breakage in rinse-offs  
- **pH**: ~4.5–5.5 helps cuticle lay flat

Rule of thumb: pleasant *and* gentle beats “harsh but squeaky clean.”`,
  },
  {
    id: "local-massage-microneedling",
    slug: "scalp-massage-and-microneedling",
    category: "Natural Care",
    title: "Scalp Massage & Microneedling 101",
    subtitle: "Low-trauma methods to support circulation and signaling",
    excerpt:
      "Hands and tools can help—if you respect biology. Keep pressure light, frequency consistent, and pair with leave-on actives.",
    read_minutes: 8,
    audio_available: false,
    icon: "natural",
    tags: ["massage", "microneedling"],
    body_md: `## Gentle is the goal
- Massage: 5–10 minutes/day, light to moderate pressure  
- Microneedling: **0.25–0.5 mm** weekly for topicals; sanitize tools  
- Always on a clean scalp; avoid when irritated`,
  },
];

// ------- Service API -------
export async function listArticles(): Promise<Article[]> {
  // Try Supabase first
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, subtitle, excerpt, category, icon, read_minutes, audio_available, tags, body_md, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.log("[education] using LOCAL articles fallback", error?.message);
    return LOCAL;
  }
  // Ensure tags is array if returned as null
  return (data as Article[]).map((a) => ({ ...a, tags: (a as any).tags ?? null }));
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const { data, error } = await supabase
    .from("articles")
    .select("id, slug, title, subtitle, excerpt, category, icon, read_minutes, audio_available, tags, body_md, created_at, updated_at")
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    // fallback to local
    const found = LOCAL.find((a) => a.slug === slug) ?? null;
    return found ?? null;
  }
  return data as Article;
}

export function filterArticles(
  items: Article[],
  opts: { q?: string; category?: EduCategory | "All" }
): Article[] {
  const q = (opts.q ?? "").trim().toLowerCase();
  const cat = opts.category ?? "All";
  return items.filter((a) => {
    const inCat = cat === "All" ? true : a.category === cat;
    if (!q) return inCat;
    const hay = [a.title, a.subtitle ?? "", a.excerpt, a.category, ...(a.tags ?? [])]
      .join(" ")
      .toLowerCase();
    return inCat && hay.includes(q);
  });
}
