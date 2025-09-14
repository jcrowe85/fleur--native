// server/src/plan.router.ts
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { fleurPlanSchema } from "./schema.plan";

const router = express.Router();

/** Bump this any time schema/prompt shape or post-processing changes */
const SCHEMA_VERSION = "v11";

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

  // derive helpful flags for more specific Summary/Quick Wins
  const flags = deriveFlags({ persona, hairType, washFreq, goals, constraints, detail: __detail });

  const system =
    "You are Fleur’s hair-care planner.\n" +
    "Write concise, brand-safe guidance for women’s hair. No medical claims. Use plain language.\n" +
    "Return JSON that EXACTLY matches the provided JSON schema (no extra fields).\n" +
    "\n" +
    "VARIETY & DEDUPING:\n" +
    "- Avoid repeating the same canonical tips across users.\n" +
    "- Only include 'scalp massage' if shedding/postpartum/scalp flags are present; otherwise do not use it.\n" +
    "- Vary verbs and anchors (e.g., 'set a 3-min timer', 'make Wed the mask day').\n" +
    "\n" +
    "PRODUCT HINTS POLICY (Summary/Routine only):\n" +
    "- Hint at product *categories* (NOT brands/SKUs/links/prices).\n" +
    "- Allowed: cleanse, condition, treat, protect, scalp, style, other. (Do not use 'oil' category.)\n" +
    "- Keep hints brief; place inside quickWins, headsUp, overview, whyThisWorks, or weekly step notes.\n" +
    "- Reserve full product details ('Kit') for the Recommendations page (not returned here).\n" +
    "\n" +
    "DEDUPING AGAINST CORE CATALOG:\n" +
    "- Do NOT recommend any hair oil products or use the 'oil' category.\n" +
    "\n" +
    // Allow generic category mentions in Summary/Routine
    "When thinning/density is a driver (menopause, postpartum, or thickness/shedding goals), it is OK to *mention* generic 'peptide scalp serum' and 'derma stamp' as categories (no brands/SKUs/links/prices).\n";

  // add a readable context block so the model can anchor specifics
  const contextLines = [
    "Context:",
    `- persona: ${persona}`,
    `- hair: ${hairType}`,
    flags.porosity ? `- porosity: ${flags.porosity}` : null,
    `- wash: ${washFreq}${flags.washPerWeek ? ` (~${flags.washPerWeek}×/wk)` : ""}`,
    `- normalized goals: ${goals.join(", ")}`,
    constraints ? `- constraints: ${constraints}` : null,
    __detail?.concerns?.length ? `- concerns(ids): ${__detail.concerns.join(", ")}` : null,
    __detail?.goalsRaw?.length ? `- goals(ids): ${__detail.goalsRaw.join(", ")}` : null,
    __detail?.scalpType ? `- scalpType: ${__detail.scalpType}` : null,
    __detail?.colorFrequency ? `- colorFrequency: ${__detail.colorFrequency}` : null,
    __detail?.heatUsage ? `- heatUsage: ${__detail.heatUsage}` : null,
    __detail?.menopauseStage ? `- menopauseStage: ${__detail.menopauseStage}` : null,
    __detail?.postpartumWindow ? `- postpartumWindow: ${__detail.postpartumWindow}` : null,
    __detail?.washFreqDetail?.perWeek ? `- washPerWeek: ${__detail.washFreqDetail.perWeek}` : null,
    `- flags: menopause=${flags.personaMenopause}, postpartum=${flags.personaPostpartum}, fine=${flags.fine}, curlyOrCoily=${flags.curlyOrCoily}, colorTreated=${flags.colorTreated}, heatOften=${flags.heatOften}, swims=${flags.lifestyleSwim}, gym=${flags.lifestyleGym}, hardWater=${flags.hardWater}, dryScalp=${flags.dryScalp}, oilyScalp=${flags.oilyScalp}, noHeat=${flags.noHeat}`,
  ].filter(Boolean).join("\n");

  const prompt = [
    contextLines,
    "",
    "Fill these sections for a UI with 4 cards. Keep outputs concise and specific to this user.",
    "",
    // — Summary
 "1) summary.primary",
"   - title: diagnosis-style headline (≤ 36 chars or ≤ 6 words).",
    "   - paragraph: 1–2 human lines that MUST mention:",
    "     • the user’s hair type in natural words (e.g., 'fine straight', 'wavy medium')",
    "     • wash cadence OR styling cadence (e.g., '2×/wk' or 'daily heat')",
    "     • at least ONE selected goal verbatim (e.g., 'reduce shedding', 'strengthen strands')",
    "     • at least ONE relevant constraint (e.g., 'color-treated', 'hard water', 'daily heat') when present",
    "     • a realistic horizon (e.g., 'first changes ~6–8 weeks')",
    "   - If persona is postpartum and a postpartumWindow is provided, reference it plainly (e.g., '3–6 months postpartum').",
    "   - If scalp type is provided (dry/oily/sensitive), include one clause that adapts care to that scalp type.",
    "   - confidence: one of Low | Medium | High",
    "",
    // — Drivers
    "2) summary.drivers: up to 3 chips tied to persona/constraints/goals. Prefer including one environmental chip when relevant (e.g., 'Hard water', 'Frequent heat').",
    "   Allowed icons: [heart, zap, droplet, activity, coffee, feather, thermometer, moon, shield, star].",
    "   Use user-specific anchors (e.g., 'Frequent heat', 'High porosity care', 'Hard water').",
    "",
    // — Quick Wins
    "3) summary.quickWins: 3–5 bullets for the next 2 weeks.",
    "   FORM: ≤ 60 chars, one clause, minimal punctuation; prefer symbols (×, wk, min, →, sec).",
    "   RECIPE (mix without duplicates):",
    "   - Technique (rinse/detangle/app method; include 'scalp massage' ONLY if shedding/postpartum/scalp flags).",
    "   - Product category hint (cleanse/condition/treat/protect/scalp/style/other) — no brands/SKUs/links/prices.",
    "   - Habit/Measurement (frequency, dwell time, timer, day-of-week anchor).",
    "   - Avoid/Limit (reduce or swap behavior).",
    "   RULES:",
    "   - Include ≥1 goal-specific win (e.g., shedding → scalp; damage → bond mask; curls → leave-in + plop).",
    "   - Include ≥1 constraint-specific win (e.g., color → bond/treat + lower heat; heat → protect each style; hard water → clarify monthly).",
    "   - If fine hair → lightweight conditioner; avoid heavy roots.",
    "   - If curly/coily → hydration + leave-in/gel techniques; avoid over-cleansing.",
    "   - Use the user's washPerWeek to set realistic cadence.",
    "   Examples:",
    "   - Heat protectant every style; keep temps medium.",
    "   - Balancing sham. on wash days; avoid double-wash.",
    "   - Bond mask 1×/wk, 7–10 min, mid→ends.",
    "   - Cool rinse 10–15 sec; detangle ends upward.",
    "",
    // — Heads up
    "4) summary.headsUp: one concise caution tailored to flags (e.g., color/chemical + dryness → prioritize bond care, lower heat).",
    "",
    // — Subtle category hints
    "5) Hints (no new fields): Weave subtle product CATEGORY hints across Summary and Routine.",
    "   - Allowed: cleanse, condition, treat, protect, scalp, style, other. Do NOT use 'oil'.",
    "   - Where: quickWins, headsUp, routine.overview/why, weekly notes.",
    "   - Keep hints compact: 1–4 total across Summary + Routine.",
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
        temperature: 0.6,
        max_output_tokens: 800,
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
      return res.status(502).json({ error: "LLM provider error", detail: err });
    }

    const data = (await r.json()) as ProviderResponse;
    let plan = extractPlanPayload(data);

    if (!plan) {
      return res.status(502).json({
        error: "LLM provider error",
        detail: "Could not extract plan JSON from response payload.",
      });
    }

    // ---------- Post-processing pipeline ----------
    plan = sanitizeRecommendations(plan as any);
    plan = diversifyQuickWins(plan as any, flags);
    plan = punchifyQuickWins(plan as any);
    plan = swapHeatProtectantIfNoHeat(plan as any, flags);
    plan = injectScalpToolsPillars(plan as any, flags);
    plan = ensurePriorityRecs(plan as any, flags);

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

/** Ensure serum + derma stamp appear in recs for density/shedding personas/goals */
function ensurePriorityRecs(plan: any, flags: ReturnType<typeof deriveFlags>) {
  if (!Array.isArray(plan?.recommendations)) return plan;

  const recs = [...plan.recommendations];

  const hasSerum = recs.some(r =>
    includesAny([r?.title, r?.product?.name], /serum|peptide/i)
  );

  const hasStamp = recs.some(r =>
    includesAny([r?.title, r?.product?.name], /derma\s*stamp|microneedl/i)
  );

  const serumIndicated =
    flags.goalsReduceShedding || flags.goalsThicker || flags.personaPostpartum || flags.colorTreated || flags.oilyScalp;

  const stampIndicated =
    (flags.goalsThicker || flags.goalsReduceShedding || flags.personaMenopause || flags.personaPostpartum) &&
    !flags.dryScalp; // avoid if irritated

  if (serumIndicated && !hasSerum) {
    recs.unshift(makeSerumRec());
  }

  if (stampIndicated && !hasStamp) {
    recs.splice(1, 0, makeStampRec()); // after serum if both added
  }

  const trimmed = prioritizeAndTrim(recs, 6);
  plan.recommendations = trimmed.map(normalizeRecTitles);
  return plan;
}

function makeSerumRec() {
  return {
    title: "Peptide Scalp Serum",
    why: "Targets shedding and density at the root with consistent use.",
    howToUse: "Apply nightly to scalp; part hair, 2–3 drops per section; do not rinse.",
    product: {
      sku: "SERUM-001",
      name: "Peptide Scalp Serum",
      url: "https://example.com/serum",
      price: "$48",
      imageUrl: "https://example.com/serum.jpg"
    }
  };
}

function makeStampRec() {
  return {
    title: "Derma Stamp Tool",
    why: "Micro-stimulation supports thicker-looking growth signals over time.",
    howToUse: "Use 1–2×/wk on clean scalp; light, even presses at crown/temples; avoid irritated skin.",
    product: {
      sku: "STAMP-001",
      name: "Derma Stamp Tool",
      url: "https://example.com/stamp",
      price: "$32",
      imageUrl: "https://example.com/stamp.jpg"
    }
  };
}

function prioritizeAndTrim(list: any[], max: number) {
  const score = (r: any) => {
    const text = [r?.title, r?.product?.name].filter(Boolean).join(" ").toLowerCase();
    if (/serum/.test(text)) return 100;
    if (/derma\s*stamp|microneedl/.test(text)) return 95;
    if (/protect|heat/.test(text)) return 80;
    if (/mask|bond|treat/.test(text)) return 70;
    if (/cleanse|sham/.test(text)) return 60;
    if (/condition/.test(text)) return 55;
    return 10;
  };

  const deduped = dedupeByKey(list, (r) => (r?.product?.sku || r?.product?.name || r?.title || "").toLowerCase());
  return deduped.sort((a, b) => score(b) - score(a)).slice(0, max);
}

function normalizeRecTitles(r: any) {
  const text = [r?.title, r?.product?.name].filter(Boolean).join(" ").toLowerCase();
  const out = { ...r };

  if (/serum|peptide/.test(text)) {
    out.title = "Peptide Scalp Serum";
    out.product = out.product || {};
    out.product.name = out.product.name || "Peptide Scalp Serum";
  } else if (/stamp|microneedl/.test(text)) {
    out.title = "Derma Stamp Tool";
    out.product = out.product || {};
    out.product.name = out.product.name || "Derma Stamp Tool";
  } else if (/mask|bond|repair/.test(text)) {
    out.title = "Bond Repair Mask";
  } else if (/cleanse|sham/.test(text)) {
    out.title = "Gentle Cleanser";
  } else if (/condition|leave/.test(text)) {
    out.title = "Lightweight Conditioner";
  } else if (/protect|heat/.test(text)) {
    out.title = "Heat Protectant Spray";
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
