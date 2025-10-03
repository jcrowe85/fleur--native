// server/src/plan.router.ts
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { fleurPlanSchema } from "./schema.plan";

const router = express.Router();

/** Bump this any time schema/prompt shape or post-processing changes */
const SCHEMA_VERSION = "v24";

const cache = new Map<string, unknown>();

/** Minimal shape of Responses API payload we care about */
interface ProviderResponse {
  output_parsed?: unknown;
  output_text?: string;
  output?: Array<{
    type: string; // usually "message"
    content: Array<
      | { type: "output_text"; text: string }
      | Record<string, unknown>
    >;
  }>;
}

router.post("/build", async (req, res) => {
  const { persona, hairType, washFreq, goals, constraints, __detail } = req.body || {};
  if (!persona || !hairType || !washFreq || !Array.isArray(goals)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // include schema version so old cached objects aren't reused
  const key = hash({ SCHEMA_VERSION, persona, hairType, washFreq, goals, constraints, __detail });
  if (cache.has(key)) {
    const cached = cache.get(key);
    res.set("x-plan-cache", "hit");
    res.set("x-plan-schema", SCHEMA_VERSION);
    return res.json(cached);
  }

  // Use hardcoded products with actual Shopify SKUs and handles
  const shopifyProducts = [
    { 
      handle: "bloom", 
      sku: "fleur-1",
      title: "Hair Growth Serum", 
      description: "Peptide-based serum for density and shedding",
      priceRange: { minVariantPrice: { amount: "85.00" } }
    },
    { 
      handle: "micro-roller", 
      sku: "Fleur-derma-stamp",
      title: "Derma Stamp", 
      description: "Micro-needling tool for scalp stimulation",
      priceRange: { minVariantPrice: { amount: "45.00" } }
    },
    { 
      handle: "shampoo", 
      sku: "fleur-shampoo",
      title: "Shampoo", 
      description: "Low-stripping cleanser",
      priceRange: { minVariantPrice: { amount: "25.00" } }
    },
    { 
      handle: "conditioner", 
      sku: "fleur-conditioner",
      title: "Conditioner", 
      description: "Detangling, mid-to-ends",
      priceRange: { minVariantPrice: { amount: "28.00" } }
    },
    { 
      handle: "hair-mask", 
      sku: "fleur-hair-mask",
      title: "Hair Mask", 
      description: "Weekly treatment for damage",
      priceRange: { minVariantPrice: { amount: "35.00" } }
    },
    { 
      handle: "heat-shield", 
      sku: "fleur-heat-shield",
      title: "Heat Shield", 
      description: "Heat protection",
      priceRange: { minVariantPrice: { amount: "22.00" } }
    },
    { 
      handle: "detangling-comb", 
      sku: "fleur-detangling-comb",
      title: "Detangling Comb", 
      description: "Gentle detangling",
      priceRange: { minVariantPrice: { amount: "15.00" } }
    },
    { 
      handle: "vegan-biotin", 
      sku: "fleur-biotin",
      title: "Vegan Biotin", 
      description: "Hair growth support",
      priceRange: { minVariantPrice: { amount: "30.00" } }
    },
    { 
      handle: "vitamin-d3", 
      sku: "fleur-vitamin-d3",
      title: "Vitamin D3", 
      description: "Hair health",
      priceRange: { minVariantPrice: { amount: "25.00" } }
    },
    { 
      handle: "iron", 
      sku: "fleur-iron",
      title: "Iron", 
      description: "Hair growth support",
      priceRange: { minVariantPrice: { amount: "20.00" } }
    },
    { 
      handle: "silk-pillow", 
      sku: "fleur-silk-pillow",
      title: "Silk Pillow", 
      description: "Friction reduction while sleeping",
      priceRange: { minVariantPrice: { amount: "55.00" } }
    },
  ];

  // derive helpful flags for more specific Summary/Quick Wins
  const flags = deriveFlags({ persona, hairType, washFreq, goals, constraints, detail: __detail });

  // Add check-in data context if available (for future enhancement)
  const checkInContext = __detail?.checkInData ? 
    `Recent Check-ins: ${__detail.checkInData.scalpCondition} scalp, ${__detail.checkInData.hairShedding} shedding, ${__detail.checkInData.overallFeeling} overall feeling` : 
    null;

  // Build enhanced product catalog with detailed targeting information
  const productCatalogText = shopifyProducts.length > 0 
    ? shopifyProducts.map((product: any) => {
        const price = product.priceRange?.minVariantPrice?.amount 
          ? `$${parseFloat(product.priceRange.minVariantPrice.amount).toFixed(2)}`
          : 'Price varies';
        const description = product.description 
          ? product.description.replace(/<[^>]*>/g, '').substring(0, 100) + '...'
          : 'Hair care product';
        
        // Add targeting information based on product type
        let targeting = '';
        if (product.handle === 'bloom') targeting = ' [Best for: shedding, thinning, menopause, postpartum]';
        else if (product.handle === 'micro-roller') targeting = ' [Best for: density, scalp stimulation, growth]';
        else if (product.handle === 'shampoo') targeting = ' [Best for: all hair types, gentle cleansing]';
        else if (product.handle === 'conditioner') targeting = ' [Best for: fine hair, detangling, moisture]';
        else if (product.handle === 'hair-mask') targeting = ' [Best for: damage repair, color-treated hair]';
        else if (product.handle === 'heat-shield') targeting = ' [Best for: heat styling, color protection]';
        else if (product.handle === 'detangling-comb') targeting = ' [Best for: breakage prevention, gentle styling]';
        else if (product.handle === 'vegan-biotin') targeting = ' [Best for: growth support, strength]';
        else if (product.handle === 'vitamin-d3') targeting = ' [Best for: hair health, deficiency support]';
        else if (product.handle === 'iron') targeting = ' [Best for: growth support, deficiency]';
        else if (product.handle === 'silk-pillow') targeting = ' [Best for: friction reduction, breakage prevention]';
        
        return `- ${product.title} (handle: ${product.handle}, price: ${price}) - ${description}${targeting}`;
      }).join('\n')
    : `- Hair Growth Serum (handle: bloom, price: $85.00) - Peptide-based serum for density and shedding [Best for: shedding, thinning, menopause, postpartum]
- Derma Stamp (handle: micro-roller, price: $45.00) - Micro-needling tool for scalp stimulation [Best for: density, scalp stimulation, growth]
- Shampoo (handle: shampoo, price: $25.00) - Low-stripping cleanser [Best for: all hair types, gentle cleansing]
- Conditioner (handle: conditioner, price: $28.00) - Detangling, mid-to-ends [Best for: fine hair, detangling, moisture]
- Hair Mask (handle: hair-mask, price: $35.00) - Weekly treatment for damage [Best for: damage repair, color-treated hair]
- Heat Shield (handle: heat-shield, price: $22.00) - Heat protection [Best for: heat styling, color protection]
- Detangling Comb (handle: detangling-comb, price: $15.00) - Gentle detangling [Best for: breakage prevention, gentle styling]
- Vegan Biotin (handle: vegan-biotin, price: $30.00) - Hair growth support [Best for: growth support, strength]
- Vitamin D3 (handle: vitamin-d3, price: $25.00) - Hair health [Best for: hair health, deficiency support]
- Iron (handle: iron, price: $20.00) - Hair growth support [Best for: growth support, deficiency]
- Silk Pillow (handle: silk-pillow, price: $55.00) - Friction reduction while sleeping [Best for: friction reduction, breakage prevention]`;

  // Product catalog ready for LLM


  const system =
    "You are Fleur's expert hair-care planner and trichology specialist. Create highly personalized, evidence-based hair care plans for women. Write concise, brand-safe guidance with no medical claims. Return JSON matching the schema exactly.\n\n" +
    "PRODUCT CATALOG:\n" +
    productCatalogText + "\n\n" +
    "EXPERTISE AREAS:\n" +
    "- Hair growth cycles and follicle health\n" +
    "- Scalp microbiome and barrier function\n" +
    "- Hormonal hair changes (menopause, postpartum)\n" +
    "- Hair porosity, texture, and density optimization\n" +
    "- Damage prevention and repair strategies\n" +
    "- Lifestyle factors affecting hair health\n\n" +
    "PERSONALIZATION PRINCIPLES:\n" +
    "- Tailor language and recommendations to user's specific hair type, concerns, and lifestyle\n" +
    "- Consider hormonal stage (menopause, postpartum) in all recommendations\n" +
    "- Factor in scalp type (oily, dry, sensitive, balanced) for product selection\n" +
    "- Account for hair porosity (low, medium, high) in routine timing\n" +
    "- Integrate lifestyle factors (heat usage, color treatment, exercise, water quality)\n" +
    "- Use specific, actionable language that reflects user's goals and constraints\n\n" +
    "RULES:\n" +
    "- Use product categories only (cleanse, condition, treat, protect, scalp, style, other). No oils.\n" +
    "- Include 'scalp massage' only for shedding/postpartum/scalp issues.\n" +
    "- Vary language and timing anchors based on user's specific needs.\n" +
    "- For thinning/density goals, prioritize 'peptide scalp serum' and 'derma stamp'.\n" +
    "- Match product recommendations to user's exact hair characteristics and lifestyle.\n";

  // Enhanced context block with rich questionnaire data
  const contextLines = [
    `User Profile: ${persona} with ${hairType} hair, washes ${washFreq}`,
    `Primary Goals: ${goals.join(", ")}`,
    constraints ? `Lifestyle & Constraints: ${constraints}` : null,
    
    // Hair characteristics
    __detail?.hairTypeDetail ? `Hair Details: ${__detail.hairTypeDetail.texture} texture, ${__detail.hairTypeDetail.thickness} thickness${__detail.hairTypeDetail.porosity ? `, ${__detail.hairTypeDetail.porosity} porosity` : ''}` : null,
    __detail?.scalpType ? `Scalp Type: ${__detail.scalpType.replace('opt_', '').replace('_', ' ')}` : null,
    
    // Hormonal context
    flags.personaMenopause ? `Menopause Stage: ${__detail?.menopauseStage?.replace('opt_meno_', '').replace('_', ' ') || 'perimenopause/menopause'}` : null,
    flags.personaPostpartum ? `Postpartum Timeline: ${__detail?.postpartumWindow?.replace('opt_pp_', '').replace('_', ' ') || 'recent'}` : null,
    
    // Hair treatments and styling
    __detail?.colorFrequency ? `Color Treatment: ${__detail.colorFrequency.replace('opt_color_', '').replace('_', ' ')}` : null,
    __detail?.heatUsage ? `Heat Styling: ${__detail.heatUsage.replace('opt_heat_', '').replace('_', ' ')}` : null,
    
    // Specific concerns from questionnaire
    __detail?.concerns ? `Specific Concerns: ${__detail.concerns.map((c: string) => c.replace('opt_', '').replace('_', ' ')).join(', ')}` : null,
    
    // Wash frequency details
    __detail?.washFreqDetail?.perWeek ? `Wash Frequency: ${__detail.washFreqDetail.perWeek} times per week` : null,
    
    // Additional lifestyle factors
    flags.colorTreated ? "Color-treated hair requires gentle, sulfate-free products" : null,
    flags.heatOften ? "Frequent heat styling requires heat protection and repair treatments" : null,
    flags.hardWater ? "Hard water area - recommend clarifying treatments" : null,
    flags.lifestyleSwim ? "Swimming/chlorine exposure - recommend protective treatments" : null,
    flags.lifestyleGym ? "Regular exercise - consider sweat-friendly products" : null,
    flags.dryScalp ? "Dry scalp condition - focus on gentle, hydrating products" : null,
    flags.oilyScalp ? "Oily scalp condition - recommend balancing, lightweight products" : null,
    
    // Check-in data context
    checkInContext,
  ].filter(Boolean).join("\n");

  const prompt = [
    contextLines,
    "",
    "Create a highly personalized hair care plan tailored to this user's specific needs:",
    "",
    "1) summary.primary:",
    "   - title: Compelling headline (≤6 words) that reflects their main concern/goal",
    "   - paragraph: 1-2 lines mentioning their specific hair type, wash frequency, primary goals, and realistic timeline (~6-8 weeks). Reference their hormonal stage if relevant.",
    "   - For menopause/postpartum users: mention supplements (biotin, iron, vitamin D3) as part of the comprehensive approach",
    "   - confidence: Low|Medium|High (based on how well their needs align with available solutions)",
    "",
    "2) summary.drivers: 2-3 key factors driving their hair concerns",
    "   Icons: heart, zap, droplet, activity, coffee, feather, thermometer, moon, shield, star",
    "   Focus on: hormonal changes, hair characteristics, lifestyle factors, or specific concerns",
    "",
    "3) summary.quickWins: 3-5 immediate lifestyle tips (≤60 chars each) that support hair health",
    "   Focus on: dietary, sleep, stress, or environmental factors - NOT routine steps",
    "   Use symbols: ×, wk, min, →, sec",
    "   Examples: 'Sleep on silk pillow', 'Stay hydrated 8× glasses', 'Reduce stress 10 min daily'",
    "",
    "4) summary.headsUp: One key caution specific to their hair type, lifestyle, or goals",
    "   Consider: their constraints, hormonal stage, or potential pitfalls",
    "",
    "5) routine.overview:",
    "   - title: Specific routine focus (e.g., 'Menopause: Thinning & Hair Loss' or 'Postpartum: Recovery & Regrowth')",
    "   - paragraph: 1-2 lines explaining the approach and 6-8 week timeline",
    "   - For menopause/postpartum users: mention supplements as part of the daily routine",
    "",
    "6) routine.weeklyPillars: 4-6 core practices tailored to their needs",
    "   Include: specific techniques, timing, and product categories",
    "   Icons: heart, zap, droplet, activity, coffee, feather, thermometer, moon, shield, star, none",
    "",
    "7) routine.why: 3 reasons this approach works for their specific situation",
    "   Reference: their hair type, concerns, lifestyle, or hormonal stage",
    "",
    "8) routine.notes: 1-4 additional tips specific to their constraints or goals",
    "",
    "9) recommendations: 3-5 products from catalog that directly address their needs",
    "   Include: handle, title, why (start with 'To address your [specific concern]'), howToUse (tailored to their routine)",
    "   Prioritize: products that match their hair type, scalp condition, and lifestyle",
    "   Consider: their wash frequency, heat usage, color treatment, and primary goals",
    "   Format why: 'To address your [specific concern] by [how it helps]'",
    "   For menopause/postpartum users: include relevant supplements in recommendations",
  ].join("\n");

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: prompt }] },
        ],
        temperature: 0.4,
        max_output_tokens: 1200,
        text: {
          format: {
            type: "json_schema",
            name: "FleurPlan",
            schema: fleurPlanSchema,
            strict: true,
          },
          verbosity: "medium",
        },
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      console.error("LLM API error:", r.status, err);
      return res.status(502).json({ error: "LLM provider error", detail: err });
    }

    const data = (await r.json()) as ProviderResponse;
    let plan = extractPlanPayload(data);


    if (!plan) {
      console.error("Failed to extract plan from LLM response:", JSON.stringify(data, null, 2));
      return res.status(502).json({
        error: "LLM provider error",
        detail: "Could not extract plan JSON from response payload.",
      });
    }

    // Post-processing
    plan = sanitizeRecommendations(plan as any);
    plan = diversifyQuickWins(plan as any, flags);
    plan = punchifyQuickWins(plan as any);
    plan = swapHeatProtectantIfNoHeat(plan as any, flags);
    plan = injectScalpToolsPillars(plan as any, flags);
    plan = ensurePriorityRecs(plan as any, flags);
    plan = sanitizeRoutinePillars(plan as any, flags);

    cache.set(key, plan);

    res.set("x-plan-cache", "miss");
    res.set("x-plan-schema", SCHEMA_VERSION);
    return res.json(plan);
  } catch (e: any) {
    return res
      .status(500)
      .json({ error: "Server error", detail: e?.message || String(e) });
  }
});

/** Dev helper: flush cache so you don't keep old shapes */
router.post("/cache/flush", (req, res) => {
  cache.clear();
  res.json({ ok: true, cleared: true, schema: SCHEMA_VERSION });
});

export default router;

/* ---------------- helpers ---------------- */

function deriveFlags(input: {
  persona: string;
  hairType: string;
  washFreq: string;
  goals: string[];
  constraints?: string;
  detail?: any;
}) {
  const { persona, hairType, washFreq, goals, constraints = "", detail } = input;

  const personaMenopause = /meno/i.test(persona);
  const personaPostpartum = /post.?partum|pp/i.test(persona);
  const fine = /fine/i.test(hairType);
  const curlyOrCoily = /(curly|coily|kinky|wavy)/i.test(hairType);
  const colorTreated = /color|bleach|highlight|toner|root/.test(constraints);
  const heatOften = /(\b3x|\b4x|\b5x|\b6x|daily|every\s*day|few times per week)/i.test(constraints);
  const lifestyleSwim = /swim|pool|chlorine/i.test(constraints);
  const lifestyleGym = /gym|sweat|workout/i.test(constraints);
  const hardWater = /hard\s*water/i.test(constraints);

  // Optional scalp-type flags
  const dryScalp = !!detail?.constraintsDetail?.dryScalp || /dry\s*scalp/i.test(constraints);
  const oilyScalp = !!detail?.constraintsDetail?.oilyScalp || /oily\s*scalp/i.test(constraints);

  const goalsReduceShedding = goals.some((g) => /shed|fall|loss/i.test(g));
  const goalsThicker = goals.some((g) => /thick|density|full/i.test(g));
  const goalsRepairDamage = goals.some((g) => /damage|break|split|bond/i.test(g));
  const goalsDefineCurls = goals.some((g) => /curl|define/i.test(g));

  const porosity = detail?.hairTypeDetail?.porosity ?? "unknown";
  const washPerWeek = detail?.washFreqDetail?.perWeek ?? undefined;

  const noHeat =
    /heat:\s*never/i.test(constraints) ||
    detail?.heatUsage === "opt_heat_never" ||
    false;

  const heatUsage = detail?.heatUsage;

  return {
    personaMenopause,
    personaPostpartum,
    fine,
    curlyOrCoily,
    colorTreated,
    heatOften,
    lifestyleSwim,
    lifestyleGym,
    hardWater,
    dryScalp,
    oilyScalp,
    goalsReduceShedding,
    goalsThicker,
    goalsRepairDamage,
    goalsDefineCurls,
    porosity,
    washPerWeek,
    noHeat,
    heatUsage,
  };
}

/** Remove oils from recommendations */
function sanitizeRecommendations(plan: any) {
  if (!plan) return plan;
  if (!Array.isArray(plan.recommendations)) return plan;

  const filtered = (plan.recommendations as any[]).filter((rec) => {
    const text =
      [
        rec?.slot,
        rec?.category,
        rec?.title,
        rec?.name,
        rec?.product?.name,
        rec?.product?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toString()
        .toLowerCase() || "";

    const isOil =
      /(^|[^a-z])oil(s)?([^a-z]|$)/i.test(text) ||
      rec?.slot === "oil" ||
      rec?.category === "oil";

    return !isOil;
  });

  plan.recommendations = filtered;
  return plan;
}

function diversifyQuickWins(plan: any, flags: ReturnType<typeof deriveFlags>) {
  if (!plan?.summary?.quickWins || !Array.isArray(plan.summary.quickWins)) return plan;

  const wins = [...plan.summary.quickWins];
  const scalpIdx = wins.findIndex((w: string) => /scalp\s+massage/i.test(w));

  const hasSheddingContext = flags.goalsReduceShedding || flags.personaPostpartum || flags.dryScalp;
  if (scalpIdx !== -1 && !hasSheddingContext) {
    wins[scalpIdx] = buildAlternateWin(flags);
  }

  plan.summary.quickWins = dedupeWins(wins);
  return plan;
}

function buildAlternateWin(flags: ReturnType<typeof deriveFlags>): string {
  if (flags.heatOften) {
    return "Heat protectant every style; keep temps medium.";
  }
  if (flags.colorTreated) {
    return "Bond mask 1×/wk, 7–10 min, mid→ends.";
  }
  if (flags.curlyOrCoily) {
    return "Leave-in on soaking-wet hair; scrunch then plop.";
  }
  if (flags.hardWater) {
    return "Chelate/clarify 1×/mo; follow with rich conditioner.";
  }
  return "Cool rinse 10–15 sec; detangle ends upward.";
}

function punchifyQuickWins(plan: any) {
  if (!plan?.summary?.quickWins || !Array.isArray(plan.summary.quickWins)) return plan;

  const mapAbbrev = (s: string) => {
    let out = s;
    out = out.replace(/\bminutes?\b/gi, "min");
    out = out.replace(/\bseconds?\b/gi, "sec");
    out = out.replace(/\bper week\b/gi, "/wk");
    out = out.replace(/\btimes?\s+per\s+week\b/gi, "×/wk");
    out = out.replace(/\b1x\/? ?per ?week\b/gi, "1×/wk");
    out = out.replace(/\b2x\/? ?per ?week\b/gi, "2×/wk");
    out = out.replace(/\b3x\/? ?per ?week\b/gi, "3×/wk");
    out = out.replace(/\b4x\/? ?per ?week\b/gi, "4×/wk");
    out = out.replace(/\b5x\/? ?per ?week\b/gi, "5×/wk");
    out = out.replace(/\b6x\/? ?per ?week\b/gi, "6×/wk");
    out = out.replace(/\b([Mm]id[- ]lengths?)\s*(to|→)\s*ends\b/g, "mid→ends");
    out = out.replace(/\bdouble[- ]wash(ing)?\b/gi, "double-wash");
    out = out.replace(/\bconditioner\b/gi, "cond.");
    out = out.replace(/\bshampoo\b/gi, "sham.");
    out = out.replace(/;?\s*\(.*?\)\s*$/g, "");
    out = out.replace(/\s{2,}/g, " ").trim();
    out = out.replace(/;\s*/g, "; ");

    const MAX = 60;
    if (out.length > MAX) {
      out = out.slice(0, MAX - 1).trim();
      if (!/[.!?]$/.test(out)) out = out.replace(/[;,]?\s*$/, "") + "…";
    }
    return out;
  };

  const wins = (plan.summary.quickWins as string[]).map(mapAbbrev);
  plan.summary.quickWins = dedupeWins(wins);
  return plan;
}

function dedupeWins(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}

/** If user *never* uses heat, swap 'heat protectant' cues for UV/friction cues */
function swapHeatProtectantIfNoHeat(plan: any, flags: ReturnType<typeof deriveFlags>) {
  const noHeat = flags?.noHeat === true;

  if (!noHeat) return plan;

  const swap = (line: string) =>
    line
      .replace(/heat\s*protectant[^;,.]*/gi, "UV shield on sunny days")
      .replace(/before\s*heat[^;,.]*/gi, "reduce friction")
      .replace(/\s{2,}/g, " ")
      .trim();

  if (Array.isArray(plan?.summary?.quickWins)) {
    plan.summary.quickWins = (plan.summary.quickWins as string[]).map(swap);
  }
  if (Array.isArray(plan?.routine?.weeklyPillars)) {
    plan.routine.weeklyPillars = plan.routine.weeklyPillars.map((p: any) => ({ ...p, text: swap(p.text) }));
  }
  if (typeof plan?.summary?.headsUp === "string") {
    plan.summary.headsUp = swap(plan.summary.headsUp);
  }
  return plan;
}

/** Density focus = true → inject serum/stamp pillars if missing */
function injectScalpToolsPillars(plan: any, flags: ReturnType<typeof deriveFlags>) {
  if (!Array.isArray(plan?.routine?.weeklyPillars)) return plan;

  const densityFocus =
    flags?.goalsThicker ||
    flags?.goalsReduceShedding ||
    flags?.personaMenopause ||
    flags?.personaPostpartum;

  if (!densityFocus) return plan;

  const pillars = [...plan.routine.weeklyPillars] as Array<{ text: string; icon: string }>;

  const hasSerum = pillars.some((p) => /serum/i.test(p.text));
  const hasStamp = pillars.some((p) => /(derma\s*stamp|micro-?needle|microneedl)/i.test(p.text));

  const needed: Array<{ text: string; icon: string }> = [];
  if (!hasSerum) needed.push({ text: "Peptide scalp serum — nightly (scalp)", icon: "droplet" });
  if (!hasStamp) needed.push({ text: "Derma stamp 2–3×/wk before serum", icon: "activity" });

  if (needed.length) {
    const insertAt = Math.min(1, pillars.length);
    pillars.splice(insertAt, 0, ...needed);
    plan.routine.weeklyPillars = pillars.slice(0, 6);
  }

  return plan;
}

/** Deterministically ensure we get the right products based on user needs */
function ensurePriorityRecs(plan: any, flags: ReturnType<typeof deriveFlags>) {
  if (!Array.isArray(plan?.recommendations)) return plan;

  // Start with LLM recommendations
  const recs = [...plan.recommendations];
  const usedHandles = new Set(recs.map(r => r?.handle).filter(Boolean));
  
  // Analyze routine to see what products the LLM actually recommended
  const routineText = plan.routine?.weeklyPillars?.map((p: any) => p.text).join(' ').toLowerCase() || '';
  const routineMentionsHeatShield = /heat.*shield|shield.*heat|heat.*protect|protect.*heat|heat.*protection|protection.*heat/.test(routineText);
  const routineMentionsSerum = /serum|peptide/.test(routineText);
  const routineMentionsDermaStamp = /derma.*stamp|stamp|microneedl|roller/.test(routineText);
  const routineMentionsMask = /mask|deep.*condition/.test(routineText);
  
  // Only add products that are mentioned in routine but missing from recommendations
  if (routineMentionsSerum && !usedHandles.has("bloom")) {
    recs.push(makeSerumRec());
  }
  
  if (routineMentionsDermaStamp && !usedHandles.has("micro-roller")) {
    recs.push(makeStampRec());
  }
  
  // CRITICAL FIX: Only add heat shield if mentioned in routine AND user actually uses heat
  const userUsesHeat = flags.heatOften || 
                      (plan.input?.constraints && /heat.*few|heat.*daily|heat.*regular/.test(plan.input.constraints.toLowerCase()));
  
  if (routineMentionsHeatShield && userUsesHeat && !usedHandles.has("heat-shield")) {
    recs.push(makeHeatShieldRec());
  }
  
  if (routineMentionsMask && !usedHandles.has("hair-mask")) {
    recs.push(makeHairMaskRec());
  }
  
  // Always ensure basic shampoo/conditioner if not present
  if (!usedHandles.has("shampoo")) {
    recs.push(makeShampooRec());
  }
  if (!usedHandles.has("conditioner")) {
    recs.push(makeConditionerRec());
  }
  
  // Add supplements for hormonal users - ensure all 3 are included
  if (flags.personaMenopause || flags.personaPostpartum) {
    // Add missing supplements for hormonal users (don't limit by 8 here)
    if (!usedHandles.has("vegan-biotin")) {
      recs.push(makeBiotinRec());
    }
    if (!usedHandles.has("iron")) {
      recs.push(makeIronRec());
    }
    if (!usedHandles.has("vitamin-d3")) {
      recs.push(makeVitaminD3Rec());
    }
  }

  // Remove inappropriate products based on user context
  const filteredRecs = recs.filter(rec => {
    const handle = rec?.handle;
    const title = rec?.title?.toLowerCase() || '';
    
    // Remove heat shield if user doesn't use heat
    if (handle === 'heat-shield' && !userUsesHeat) {
      return false;
    }
    
    // Remove supplements if user is not hormonal (menopause/postpartum)
    const isSupplement = ['vegan-biotin', 'iron', 'vitamin-d3'].includes(handle);
    if (isSupplement && !flags.personaMenopause && !flags.personaPostpartum) {
      return false;
    }
    
    return true;
  });

  // Remove duplicates and limit to 8
  const trimmed = prioritizeAndTrim(filteredRecs, 8);
  plan.recommendations = trimmed.map(normalizeRecTitles);
  
  // Ensure summary paragraph mentions menopause when relevant
  if (flags.personaMenopause && plan.summary?.primary?.paragraph) {
    const paragraph = plan.summary.primary.paragraph;
    if (!paragraph.toLowerCase().includes('menopause') && !paragraph.toLowerCase().includes('hormonal')) {
      plan.summary.primary.paragraph = paragraph.replace(
        /(expect first changes in ~6–8 weeks)/i,
        'expect first changes in ~6–8 weeks. Menopause-related hormonal changes can affect hair density, so consistent care is key'
      );
    }
  }
  
  return plan;
}

function makeSerumRec() {
  return {
    handle: "bloom",
    sku: "fleur-1",
    title: "Hair Growth Serum",
    why: "To address your shedding concern by delivering peptide-rich nutrients directly to hair follicles, promoting stronger roots and denser growth where you need it most.",
    howToUse: "Apply nightly to scalp; part hair, 2–3 drops per section; do not rinse.",
  };
}

function makeStampRec() {
  return {
    handle: "micro-roller",
    sku: "Fleur-derma-stamp",
    title: "Derma Stamp",
    why: "To address your thinning concern by stimulating blood circulation and collagen production in your scalp, creating the optimal environment for thicker, stronger hair growth.",
    howToUse: "Use 1–2×/wk on clean scalp; light, even presses at crown/temples; avoid irritated skin.",
  };
}

function makeShampooRec() {
  return {
    handle: "shampoo",
    sku: "fleur-shampoo",
    title: "Shampoo",
    why: "To address your scalp concerns while preserving your hair's natural moisture barrier, preventing the dryness and damage that leads to breakage and dullness.",
    howToUse: "Use 2×/wk, lather gently and rinse thoroughly.",
  };
}

function makeConditionerRec() {
  return {
    handle: "conditioner",
    sku: "fleur-conditioner",
    title: "Conditioner",
    why: "To address your dryness and tangling concerns by delivering deep hydration exactly where you need it, without the heaviness that flattens fine hair.",
    howToUse: "Apply to mid-lengths and ends after shampooing, then rinse.",
  };
}

function makeHeatShieldRec() {
  return {
    handle: "heat-shield",
    sku: "fleur-heat-shield",
    title: "Heat Shield",
    why: "To address your heat damage concerns by creating an invisible barrier that shields your hair from styling tools, keeping your color vibrant and your strands strong.",
    howToUse: "Apply before heat styling to protect color and prevent damage.",
  };
}

function makeHairMaskRec() {
  return {
    handle: "hair-mask",
    sku: "fleur-hair-mask",
    title: "Hair Mask",
    why: "To address your damage concerns by penetrating deep into hair fibers to rebuild broken bonds, transforming brittle, damaged hair into resilient, healthy strands.",
    howToUse: "Use 1×/wk for 7–10 min on damp hair, focusing on mid-lengths and ends.",
  };
}

function makeBiotinRec() {
  return {
    handle: "vegan-biotin",
    sku: "fleur-biotin",
    title: "Vegan Biotin",
    why: "To address your hormonal hair loss by providing essential B-vitamins that strengthen hair from the inside out, promoting thicker, more resilient growth during life changes.",
    howToUse: "Take daily as directed to support hair health from within.",
  };
}

function makeIronRec() {
  return {
    handle: "iron",
    sku: "fleur-iron",
    title: "Iron",
    why: "To address your iron-deficiency hair loss by replenishing essential nutrients that fuel hair growth, ensuring your follicles have the energy they need to produce strong, healthy strands.",
    howToUse: "Take daily as directed to support hair health from within.",
  };
}

function makeVitaminD3Rec() {
  return {
    handle: "vitamin-d3",
    sku: "fleur-vitamin-d3",
    title: "Vitamin D3",
    why: "To address your vitamin D deficiency hair loss by activating hair follicles and creating the optimal environment for healthy, strong hair production.",
    howToUse: "Take daily as directed to support hair health from within.",
  };
}

function prioritizeAndTrim(list: any[], max: number) {
  const score = (r: any) => {
    const text = [r?.title, r?.product?.name].filter(Boolean).join(" ").toLowerCase();
    // More balanced scoring - don't heavily favor any specific products
    if (/serum|peptide/.test(text)) return 80;
    if (/cleanse|sham/.test(text)) return 75;
    if (/condition/.test(text)) return 70;
    if (/biotin|vitamin|iron/.test(text)) return 65; // After core products but still high priority
    if (/derma\s*stamp|microneedl/.test(text)) return 60;
    if (/protect|heat/.test(text)) return 55;
    if (/mask|bond|repair/.test(text)) return 55;
    if (/comb|detangle/.test(text)) return 55;
    if (/pillow|silk/.test(text)) return 50;
    return 40; // Base score for any other products
  };

  const deduped = dedupeByKey(list, (r) => (r?.title || "").toLowerCase());
  return deduped.sort((a, b) => score(b) - score(a)).slice(0, max);
}

function normalizeRecTitles(r: any) {
  const text = [r?.title].filter(Boolean).join(" ").toLowerCase();
  const out = { ...r };

  if (/serum|peptide/.test(text)) {
    out.title = "Hair Growth Serum";
    out.handle = "bloom";
    out.sku = "fleur-1";
  } else if (/stamp|microneedl/.test(text)) {
    out.title = "Derma Stamp";
    out.handle = "micro-roller";
    out.sku = "Fleur-derma-stamp";
  } else if (/mask|bond|repair/.test(text)) {
    out.title = "Hair Mask";
    out.handle = "hair-mask";
    out.sku = "fleur-hair-mask";
  } else if (/cleanse|sham/.test(text)) {
    out.title = "Shampoo";
    out.handle = "shampoo";
    out.sku = "fleur-shampoo";
  } else if (/condition|leave/.test(text)) {
    out.title = "Conditioner";
    out.handle = "conditioner";
    out.sku = "fleur-conditioner";
  } else if (/protect|heat/.test(text)) {
    out.title = "Heat Shield";
    out.handle = "heat-shield";
    out.sku = "fleur-heat-shield";
  } else if (/comb|detangle/.test(text)) {
    out.title = "Detangling Comb";
    out.handle = "detangling-comb";
    out.sku = "fleur-detangling-comb";
  } else if (/biotin/.test(text)) {
    out.title = "Vegan Biotin";
    out.handle = "vegan-biotin";
    out.sku = "fleur-biotin";
  } else if (/vitamin|d3/.test(text)) {
    out.title = "Vitamin D3";
    out.handle = "vitamin-d3";
    out.sku = "fleur-vitamin-d3";
  } else if (/iron/.test(text)) {
    out.title = "Iron";
    out.handle = "iron";
    out.sku = "fleur-iron";
  } else if (/pillowcase|silk/.test(text)) {
    out.title = "Silk Pillow";
    out.handle = "silk-pillow";
    out.sku = "fleur-silk-pillow";
  }
  return out;
}

function includesAny(fields: any[], re: RegExp) {
  return fields.some((f) => (typeof f === "string" ? re.test(f) : false));
}

function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) { out.push(item); continue; }
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

function extractPlanPayload(d: ProviderResponse): unknown | null {
  if (d.output_parsed) return d.output_parsed;
  const p1 = tryParse(d.output_text);
  if (p1) return p1;
  const textNode = d.output
    ?.flatMap((msg) => msg.content)
    .find((c: any) => c?.type === "output_text") as
    | { type: "output_text"; text: string }
    | undefined;
  if (textNode?.text) {
    const p2 = tryParse(textNode.text);
    if (p2) return p2;
  }
  return null;
}

function hash(obj: unknown): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(obj))
    .digest("hex")
    .slice(0, 16);
}

function tryParse<T = unknown>(s?: string): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

/** Add supplement instructions to routine pillars for hormonal users, remove for non-hormonal users */
function sanitizeRoutinePillars(plan: any, flags: ReturnType<typeof deriveFlags>) {
  if (!Array.isArray(plan?.routine?.weeklyPillars)) return plan;
  
  // For hormonal users, ensure supplements are mentioned in weekly pillars
  if (flags.personaMenopause || flags.personaPostpartum) {
    const pillars = [...plan.routine.weeklyPillars];
    
    // Check if supplements are already mentioned in pillars
    const hasSupplementMention = pillars.some((p: any) => 
      /biotin|iron|vitamin.*d3|supplement/i.test(p.text || '')
    );
    
    // If no supplement mention, add it
    if (!hasSupplementMention) {
      const supplementText = flags.personaPostpartum 
        ? "Take daily supplements: biotin, iron, and vitamin D3 for postpartum recovery"
        : "Take daily supplements: biotin, iron, and vitamin D3 for hormonal balance";
      
      // If we're at the limit (6 pillars), replace the last one with supplements
      if (pillars.length >= 6) {
        pillars[pillars.length - 1] = {
          text: supplementText,
          icon: "heart"
        };
      } else {
        pillars.push({
          text: supplementText,
          icon: "heart"
        });
      }
      
      plan.routine.weeklyPillars = pillars;
    }
    
    return plan;
  }
  
  // For non-hormonal users, remove supplement mentions
  const pillars = plan.routine.weeklyPillars.map((pillar: any) => {
    const text = pillar.text || '';
    
    // Remove supplement mentions for non-hormonal users
    const hasSupplementMention = /biotin|iron|vitamin.*d3|supplement/i.test(text);
    
    if (hasSupplementMention) {
      // Replace with a more appropriate pillar
      if (/daily.*biotin.*iron/i.test(text)) {
        return { ...pillar, text: "Gentle scalp massage for circulation" };
      } else if (/supplement/i.test(text)) {
        return { ...pillar, text: "Stay hydrated and eat protein-rich foods" };
      }
    }
    
    return pillar;
  });
  
  plan.routine.weeklyPillars = pillars;
  return plan;
}
