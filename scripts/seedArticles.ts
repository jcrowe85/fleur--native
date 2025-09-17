// scripts/seedArticles.ts
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// 1) Load .env explicitly
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "..", ".env"),
];
const envPath = candidates.find((p) => fs.existsSync(p));
if (!envPath) {
  console.error("❌ Could not find a .env at:", candidates.join(" OR "));
  process.exit(1);
}
dotenv.config({ path: envPath });
console.log("✅ Loaded env from:", envPath);

// 2) Resolve envs (EXPO_ or NEXT_)
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("🔎 Using project URL:", url);
if (!url || !serviceKey) {
  const missing = [
    !url && "EXPO_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL",
    !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
  ]
    .filter(Boolean)
    .join(", ");
  throw new Error(`Missing required env var(s): ${missing}`);
}

import { createClient } from "@supabase/supabase-js";
const supabase = createClient(url, serviceKey);

// 3) Verify table exists before inserting
async function assertTable() {
  const { error } = await supabase.from("articles").select("id").limit(1);
  if (error) {
    console.error("❌ Table check failed:", error);
    throw error;
  }
  console.log("✅ Table 'articles' is reachable.");
}

// 4) Use genuine upsert (onConflict: 'slug') + detailed logging
type SeedItem = {
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  category: string;
  icon?: string | null;
  read_minutes?: number;
  audio_available?: boolean;
  tags?: string[];
  body_md: string;
};

export async function upsertArticles(items: SeedItem[]) {
  await assertTable();

  console.log(`📦 Upserting ${items.length} article(s) ...`);
  const { data, error } = await supabase
    .from("articles")
    .upsert(items, { onConflict: "slug" })
    .select("id, slug, title");

  if (error) {
    console.error("❌ Upsert error:", error);
    throw error;
  }
  console.log("✅ Upserted rows:", data);
  return true;
}

// ---- Your seed items below ----
const SEED_ITEMS: SeedItem[] = [
  {
    slug: "peptides-101-what-they-do-for-hair",
    title: "Peptides 101: What They Do for Hair",
    subtitle: "A founder-friendly guide to surface science and routine wins",
    excerpt:
      "Peptides are short amino-acid chains that improve slip, reduce friction, and help minimize breakage from everyday handling—here’s how to use them well.",
    category: "Peptides 101",
    icon: "beaker",
    audio_available: false,
    tags: ["peptides", "film-formers", "breakage", "routine", "ingredients"],
    body_md: `# Peptides 101: What They Do for Hair

Peptides have been gaining attention in the world of skincare and haircare alike. But what exactly are they, why do they matter for your hair, and how can you use them effectively? This guide is designed to give you a clear, science-backed understanding of peptides in haircare. By the end, you’ll know what peptides can (and can’t) do for your hair, how they compare to other well-known ingredients, and how to integrate them into a routine that helps keep your strands healthier over the long run.

---

## What Are Peptides?

Peptides are short chains of amino acids, the building blocks of proteins. Hair itself is primarily made of keratin, which is a long, complex protein. Peptides are much smaller—think of them as fragments of proteins—that can interact with the surface of your hair and, in some cases, influence the environment of your scalp.

### The Difference Between Peptides and Proteins
- **Proteins (like keratin or collagen):** Large molecules that usually cannot penetrate the hair shaft. They may coat the surface but don’t typically absorb deeply.  
- **Peptides:** Smaller chains (2–50 amino acids) that can form films on the hair or sometimes reach into the outer cuticle layers.  

The small size of peptides makes them versatile. In skincare, certain peptides act as “signals” that tell cells to produce more collagen. In haircare, their main value is **film-forming, lubrication, and protective effects**.

---

## Why Peptides Matter for Hair

Your hair faces daily stress: brushing, heat styling, sun exposure, coloring, and even friction from your pillowcase. All of these chip away at the hair cuticle—the protective outer shell made of overlapping scales. When the cuticle is damaged, hair becomes rough, tangly, and prone to breakage.

Peptides can help by:
1. **Forming flexible films** that coat and smooth the hair shaft.  
2. **Reducing friction** between hair fibers, so fewer strands break during brushing or detangling.  
3. **Improving manageability and shine** by making the cuticle surface more uniform.  
4. **Enhancing routine products** like conditioners, masks, or serums by working alongside humectants and oils.

---

## Types of Peptides Used in Haircare

Not all peptides are the same. Here are the major categories you’ll find in products:

### Hydrolyzed Protein-Derived Peptides
These come from breaking down large proteins into smaller fragments. Examples include hydrolyzed keratin, wheat, rice, or silk proteins. They help reinforce the surface and improve combing.

### Copper Peptides (e.g., GHK-Cu)
These have gained popularity for scalp applications. In skin research, copper peptides support wound healing and collagen production. In hair serums, they’re often included for their **scalp conditioning benefits** and potential to encourage a healthier follicle environment.

### Signal Peptides
Common in advanced skincare, these are small peptides designed to influence signaling pathways. In hair, some formulas use them in scalp serums, often paired with massage, to improve scalp condition.

### Synthetic Peptide Blends
Some cosmetic labs create custom peptides or combinations to target specific needs like anti-frizz, heat protection, or film-building.

---

## What Peptides Can Realistically Do for Your Hair

It’s important to keep expectations realistic. Here’s what peptides *do well*:

- **Smoothing and Detangling:** Less snagging during brushing means less breakage.  
- **Shine and Feel:** Healthier-looking hair that reflects light better.  
- **Improved Styling Results:** Curls, braids, or blowouts can last longer because peptides help create a more even hair surface.  
- **Complementing Moisture and Protein:** Peptides don’t replace conditioners or oils, but they strengthen your overall routine.  

---

## What Peptides Cannot Do

There are limits, and it’s good to be clear:

- **No true “repair” of split ends:** Only a haircut removes split ends. Peptides may smooth them temporarily but won’t fuse them back together.  
- **No regrowth of hair shafts:** Hair is dead tissue once it leaves the scalp. Peptides won’t “grow” new strands.  
- **Not a miracle cure:** Peptides are best thought of as supportive allies in a balanced routine.  

---

## Peptides vs. Other Common Hair Ingredients

Peptides are often compared to other ingredient families. Here’s how they stack up:

### Peptides vs. Oils
- **Oils:** Excellent for sealing moisture and adding shine.  
- **Peptides:** Better for lubrication, slip, and film formation.  
- **Best practice:** Use both. Oils seal, peptides smooth.

### Peptides vs. Humectants
- **Humectants (like glycerin):** Attract water into the hair.  
- **Peptides:** Do not pull in moisture but help manage it by smoothing the surface.  
- **Best practice:** Use humectants for hydration, peptides for manageability.

### Peptides vs. Silicones
- **Silicones:** Strong film-formers, highly smoothing, but can build up.  
- **Peptides:** Lightweight films, less risk of buildup.  
- **Best practice:** Alternate or combine depending on hair type.

---

## How to Use Peptides in Your Hair Routine

### Step 1: Wash Day
1. Start with a gentle shampoo.  
2. Follow with a conditioner that includes hydrolyzed protein or peptides.  

### Step 2: Weekly Treatments
- Rotate in a peptide-rich mask if your hair feels limp or mushy.  
- Alternate with a moisture-focused mask if hair feels brittle.

### Step 3: Leave-In Serums
- Apply a peptide serum on damp hair, focusing on mid-lengths to ends.  
- Layer a styling cream or gel on top if you need hold.

### Step 4: Scalp Care
- Massage in a copper peptide serum 2–3x per week.  
- Combine with good scalp hygiene: avoid harsh scrubbing, keep buildup under control.

---

## Who Benefits Most from Peptides?

- **Color-Treated Hair:** Because color opens and stresses the cuticle.  
- **Curly and Coily Hair:** Naturally more fragile due to bends and twists.  
- **Long Hair:** The older the strand, the more cumulative damage.  
- **Heat-Styled Hair:** Repeated blow-drying or flat ironing erodes protective layers.  

---

## Practical Tips for Success

1. **Consistency Over Hype:** Results appear over weeks of use, not overnight.  
2. **Layer Smartly:** Combine peptides with humectants, emollients, and oils.  
3. **Don’t Overdo It:** Too much protein/peptide care can make hair stiff. Alternate with moisture.  
4. **Track Your Results:** Notice if tangling reduces, shine increases, or breakage lessens.  

---

## The Science Behind Peptides

For the science-curious:

- The outer hair layer, the **cuticle**, is sealed by a lipid called 18-MEA. Damage strips this lipid away.  
- Peptides, especially cationic (positively charged) ones, adhere to the negatively charged hair surface.  
- This attraction helps peptides “stick” where damage is most present.  
- Flexible films from peptides reduce friction between fibers. Less friction = less breakage.  

---

## Myths and Misconceptions

- **“Peptides rebuild hair completely.”** False. They improve surface feel, not rebuild keratin.  
- **“Peptides regrow hair.”** Misleading. Any regrowth claim relates to scalp health, not the hair shaft.  
- **“More peptides = better.”** Not always. Balance is key; too much protein-like care can backfire.  

---

## Building a Peptide-Friendly Routine

Here’s an example weekly cadence:

- **Monday:** Wash + conditioner with peptides.  
- **Wednesday:** Leave-in peptide serum after shower.  
- **Friday:** Mask treatment (rotate protein/moisture).  
- **Sunday:** Scalp massage with copper peptide serum.  

This gives balanced support without overwhelming your hair.

---

## Frequently Asked Questions

**Q: Can peptides cause buildup?**  
A: Generally less than silicones, but overuse of protein-rich masks can make hair feel stiff. Alternate with moisture.

**Q: Are peptides safe for sensitive scalps?**  
A: Usually yes, but always patch test. Some formulas pair peptides with preservatives or carriers that can irritate.

**Q: Do peptides work on all hair types?**  
A: Yes, though benefits are most noticeable on damaged, color-treated, or curly hair.

---

## Final Thoughts

Peptides aren’t miracle workers, but they are reliable allies for healthier-looking, easier-to-manage hair. Think of them as one layer of defense in your overall haircare routine. By reducing friction, smoothing the cuticle, and complementing other ingredients, they help you retain length, reduce breakage, and enjoy a softer, shinier mane.

In short: **Peptides protect what you already have.** With consistent use, they can help your strands look and feel their best over time.
`,
  },
];

if (require.main === module) {
  (async () => {
    await upsertArticles(SEED_ITEMS);
    // Read back a proof
    const { data, error } = await supabase
      .from("articles")
      .select("slug, title, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw error;
    console.log("🔁 Latest rows:", data);
    console.log("✅ Done.");
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
