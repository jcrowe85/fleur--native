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

// ---- Seed items below ----
const SEED_ITEMS: SeedItem[] = [
    {
      slug: "minoxidil-mechanisms-vasodilation-growth-factors",
      title: "Minoxidil Mechanisms: Vasodilation and Growth Factors",
      subtitle:
        "How minoxidil boosts blood flow, extends anagen, and upregulates VEGF",
      excerpt:
        "Learn how minoxidil increases blood flow, extends the anagen phase, and upregulates VEGF expression for enhanced follicle health.",
      category: "Hair Science",
      icon: "activity",
      read_minutes: 7,
      audio_available: true,
      tags: [
        "minoxidil",
        "VEGF",
        "vasodilation",
        "anagen phase",
        "potassium channels",
        "dermal papilla",
        "PGD2",
        "PGE2"
      ],
      body_md: `# Minoxidil Mechanisms: Vasodilation and Growth Factors
  
  > Educational guide. For diagnosis or treatment decisions, consult a licensed clinician.
  
  ## The Discovery of Minoxidil
  
  Originally developed as an **oral antihypertensive**, minoxidil’s hair growth effects were found when patients reported unexpected regrowth. This led to **topical minoxidil**, now among the most widely used over-the-counter options for pattern hair loss.
  
  ---
  
  ## Primary Mechanisms of Action
  
  ### 1) Vasodilation and Improved Blood Flow
  
  **Potassium Channel Opening**  
  Minoxidil opens **ATP-sensitive potassium channels** in vascular smooth muscle, which:
  - Relaxes vessel walls  
  - Increases vessel diameter  
  - Enhances blood flow to follicles  
  - Improves nutrient and oxygen delivery
  
  **Microcirculation Enhancement**  
  Benefits are concentrated around the **dermal papilla**, the growth “command center” of the follicle, supporting:
  - More efficient delivery of growth factors  
  - Better waste removal  
  - Improved cellular respiration  
  - Healthier local pH balance
  
  ### 2) Growth Factor Upregulation
  
  **VEGF (Vascular Endothelial Growth Factor)**  
  Minoxidil upregulates **VEGF**, helping to:
  - Promote **angiogenesis** (new capillary growth)  
  - Support endothelial cell survival  
  - Increase vascular permeability for nutrient exchange  
  - Enhance follicle vascularization
  
  **PDGF (Platelet-Derived Growth Factor)**  
  Elevated **PDGF** is associated with:
  - Dermal papilla cell proliferation  
  - Stronger follicular architecture  
  - Improved hair shaft formation and anchoring
  
  ### 3) Hair Cycle Manipulation
  
  **Anagen Extension**  
  Minoxidil helps **prolong the growth phase** by:
  - Stimulating dermal papilla activity  
  - Elevating metabolic processes  
  - Delaying catagen (regression) entry  
  - Maintaining follicle size and activity
  
  **Telogen Shortening**  
  It also **shortens the resting phase**, which can:
  - Accelerate re-entry into anagen  
  - Increase total cycles per year  
  - Maximize visible growth potential
  
  ---
  
  ## Secondary Mechanisms
  
  ### Anti-Inflammatory Effects
  Minoxidil shows mild anti-inflammatory activity:
  - May reduce **PGD2** signaling  
  - Lowers inflammatory cytokines  
  - Helps protect follicles from immune stress  
  - Supports a healthier scalp environment
  
  ### Prostaglandin Pathway Modulation
  Evidence suggests minoxidil may **boost PGE2** and **reduce PGD2**, helping to:
  - Balance inflammatory cascades  
  - Support follicle survival and function
  
  ---
  
  ## Concentration and Efficacy
  
  **Standard Concentrations**  
  - **2%**: FDA-approved for women  
  - **5%**: FDA-approved for men  
  - **10–15%**: Compounded (off-label)
  
  **Dose–Response Considerations**  
  Higher strengths may yield:
  - Faster visible changes  
  - Greater density gains  
  - Better outcomes for some non-responders  
  - **But** a higher likelihood of irritation or side effects
  
  ---
  
  ## Response Variability
  
  **Genetic and Enzymatic Factors**  
  Outcomes vary with:
  - **Sulfotransferase** enzyme activity  
  - Genetic polymorphisms affecting drug metabolism  
  - Individual vascular responsiveness  
  - Baseline follicle sensitivity
  
  **Responder Categories**  
  - **Good responders (~40%)**: Noticeable regrowth  
  - **Moderate responders (~40%)**: Stabilization + modest gains  
  - **Poor responders (~20%)**: Minimal response
  
  ---
  
  ## Optimization Strategies
  
  ### Application Techniques
  
  **Proper Application**
  1. Apply to **clean, dry scalp**  
  2. Use **1 mL twice daily** (or **2 mL once daily**)  
  3. **Massage** lightly for even spread  
  4. Allow **4+ hours** before washing  
  5. Keep timing **consistent**
  
  **Enhanced Penetration**
  - **Dermarolling** pre-application (0.5–1.5 mm; professional guidance recommended)  
  - **Tretinoin** co-application to aid absorption  
  - Vehicle tweaks (e.g., **propylene glycol-free** options for sensitivity)
  
  ### Combination Therapies
  
  Minoxidil plays well with:
  - **Finasteride/Dutasteride**: Addresses DHT pathway  
  - **Ketoconazole**: Anti-inflammatory + potential DHT modulation  
  - **Adenosine**: Additional growth factor signaling  
  - **Copper peptides**: Regeneration and scalp environment support
  
  ---
  
  ## Timeline and Expectations
  
  **Phase 1 (Weeks 1–4):** Initial **shedding** may increase as weak hairs transition  
  **Phase 2 (Months 2–4):** Stabilization; new vellus hairs appear  
  **Phase 3 (Months 4–12):** Density and caliber improve; **~12 months** for peak effects
  
  ---
  
  ## Side Effects and Management
  
  **Common**
  - Scalp irritation or itch  
  - Unwanted facial hair  
  - Initial shedding  
  - Dryness or flaking
  
  **Rare**
  - Contact dermatitis  
  - Cardiovascular effects with improper use  
  - Edema or dizziness
  
  **Management**
  - Start with **lower strength** if sensitive  
  - Consider **alcohol-free** or **foam** formulas  
  - Moisturize after drying  
  - Adjust frequency as tolerated
  
  ---
  
  ## Advanced Formulations
  
  **Liposomal Minoxidil**
  - Improved penetration and stability  
  - Potentially lower systemic exposure  
  - May reduce irritation
  
  **Topical Minoxidil + Finasteride**
  - Dual-pathway targeting  
  - Lower systemic finasteride levels vs. oral  
  - Convenient single-application protocols
  
  ---
  
  ## Conclusion
  
  Minoxidil’s multifaceted actions—**vasodilation**, **growth-factor upregulation** (VEGF/PDGF), and **hair-cycle modulation**—make it a cornerstone therapy. Success hinges on **consistency**, **patience**, and often **combination strategies**. Early intervention and structured monitoring during the first year set realistic expectations and optimize outcomes.`
    }
  ];
  
  

if (require.main === module) {
  (async () => {
    await upsertArticles(SEED_ITEMS);
    // Read back a proof
    const { data, error } = await supabase
      .from("articles")
      .select("slug, title, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;
    console.log("🔁 Latest rows:", data);
    console.log("✅ Done.");
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
