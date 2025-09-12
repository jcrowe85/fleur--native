// server/src/plan.router.ts
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { fleurPlanSchema } from "./schema.plan";

const router = express.Router();

/** Bump this any time schema/prompt shape or post-processing changes */
const SCHEMA_VERSION = "v7";

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
    "- Do NOT recommend or mention peptide hair serum or derma stamp in recommendations.\n" +
    "- Do NOT recommend any hair oil products or use the 'oil' category.";

  // add a readable context block so the model can anchor specifics
  const contextLines = [
    "Context:",
    `- persona: ${persona}`,
    `- hair: ${hairType} | porosity: ${flags.porosity}`,
    `- wash: ${washFreq}${flags.washPerWeek ? ` (~${flags.washPerWeek}x/week)` : ""}`,
    `- goals: ${goals.join(", ")}`,
    constraints ? `- constraints: ${constraints}` : null,
    `- flags: menopause=${flags.personaMenopause}, postpartum=${flags.personaPostpartum}, fine=${flags.fine}, curlyOrCoily=${flags.curlyOrCoily}, colorTreated=${flags.colorTreated}, heatOften=${flags.heatOften}, swims=${flags.lifestyleSwim}, gym=${flags.lifestyleGym}, hardWater=${flags.hardWater}, dryScalp=${flags.dryScalp}, oilyScalp=${flags.oilyScalp}`,
  ].filter(Boolean).join("\n");

  const prompt = [
    contextLines,
    "",
    "Fill these sections as if for a UI with 4 cards:",
    "",
    // —— Summary: make it specific, expectation-setting, and human
    "1) summary.primary",
    "   - title: diagnosis-style headline (≤ 75 chars).",
    "   - paragraph: 1–2 friendly, human-sounding lines that include specifics:",
    "     • hair type/porosity (e.g., fine + medium porosity)",
    "     • wash cadence (e.g., ~3–4×/week) if known",
    "     • constraints that shape care (e.g., color-treated, frequent heat, chlorine)",
    "     • a realistic horizon (e.g., first changes ~6–8 weeks)",
    "     • what to expect (e.g., fewer strands in brush, baby hairs along part)",
    "   - Use plain, natural phrasing instead of clinical tone (e.g., 'We’ll help your strands feel softer and stronger over the next 6–8 weeks').",
    "   - confidence: one of Low | Medium | High",
    "",
    "2) summary.drivers: up to 3 short chips (icon+label) tied to persona/constraints/goals.",
    "   Allowed icons: [heart, zap, droplet, activity, coffee, feather, thermometer, moon, shield, star].",
    "   Examples: {icon:'heart',label:'Post-partum window'}, {icon:'zap',label:'Frequent heat'}, {icon:'droplet',label:'High porosity care'}",
    "",
    // —— Quick Wins: slot recipe + rules to diversify and keep single-line
    "3) summary.quickWins: 3–5 bullets for the next 2 weeks.",
    "   FORM: each bullet ≤ 60 chars, one clause, minimal punctuation; prefer symbols (×, wk, min, →, sec); no parentheses unless essential.",
    "   SLOT recipe (pick 3–5 total, no duplicates):",
    "   - Technique (rinse/detangle/application method; avoid 'scalp massage' unless shedding/postpartum/scalp flags).",
    "   - Product category hint (cleanse/condition/treat/protect/scalp/style/other) — subtle, no brands/SKUs/links/prices; do not use 'oil'.",
    "   - Habit/Measurement (frequency, dwell time, timer, day-of-week anchor)",
    "   - Avoid/Limit (what to reduce or swap)",
    "",
    "   RULES (tie to flags & goals):",
    "   - Include at least 1 goal-specific win (e.g., shedding → scalp focus; damage → bond care; curls → leave-in + plop).",
    "   - Include at least 1 constraint-specific win (e.g., colorTreated → bond/treat + lower heat; heatOften → protect every style; hardWater → clarify monthly).",
    "   - If fine hair → lightweight conditioner; avoid heavy oils at roots.",
    "   - If curlyOrCoily → emphasize hydration, leave-in, gel/curl cream techniques; avoid over-cleansing.",
    "   - If porosity=low → lighter layers, longer rinse; if high → richer conditioner and seal mid→ends.",
    "   - If washPerWeek ≤ 2 → weekly/twice-weekly anchors; if ≥ 4 → keep steps lighter per wash.",
    "   - Make each bullet measurable/time-bound (e.g., '3 min, 4×/wk', '1×/wk', '10–15 sec cool rinse').",
    "   - At least one win must NOT involve the scalp.",
    "",
    "   Examples (illustrative, single-line):",
    "   - Heat protectant every style; keep temps medium.",
    "   - Balancing shampoo on wash days; no double-wash.",
    "   - Bond mask 1×/wk, 7–10 min, mid→ends.",
    "   - Cool rinse 10–15 sec; detangle ends upward.",
    "",
    "4) summary.headsUp: one concise caution tailored to flags (e.g., color/chemical processing + dryness → prioritize bond care, lower heat).",
    "",
    // —— Keep subtle category hints throughout (no new keys)
    "5) Hints (no new fields): Weave subtle product *category* hints into existing text of Summary and Routine.",
    "   - Allowed categories: cleanse, condition, treat, protect, scalp, style, other. (Do not use 'oil'.)",
    "   - Where to hint:",
    "     • summary.quickWins",
    "     • summary.headsUp",
    "     • routine.overview / whyThisWorks",
    "     • routine weekly step notes",
    "   - Keep hints compact: 1–4 total across Summary + Routine. Avoid over-selling.",
  ].filter(Boolean).join("\n");

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
        temperature: 0.5,
        max_output_tokens: 800, // allow richer Summary/Routine
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

    // 0) Sanitize recommendation set against core/banned categories
    plan = sanitizeRecommendations(plan as any);

    // 1) Keep scalp massage only when context supports it
    plan = diversifyQuickWins(plan as any, flags);

    // 2) Make bullets punchy, single-line, phone-friendly
    plan = punchifyQuickWins(plan as any);

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

  // Optional scalp-type flags if you decide to send them in __detail later
  const dryScalp = !!detail?.constraintsDetail?.dryScalp || /dry\s*scalp/i.test(constraints);
  const oilyScalp = !!detail?.constraintsDetail?.oilyScalp || /oily\s*scalp/i.test(constraints);

  const goalsReduceShedding = goals.some((g) => /shed|fall|loss/i.test(g));
  const goalsThicker = goals.some((g) => /thick|density|full/i.test(g));
  const goalsRepairDamage = goals.some((g) => /damage|break|split|bond/i.test(g));
  const goalsDefineCurls = goals.some((g) => /curl|define/i.test(g));

  const porosity = detail?.hairTypeDetail?.porosity ?? "unknown";
  const washPerWeek = detail?.washFreqDetail?.perWeek ?? undefined;

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
  };
}

/** Remove oils and core-duplicate items from recommendations */
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

    const isSerumOrStamp = /(serum|derma\s*stamp|microneedl)/i.test(text);

    return !isOil && !isSerumOrStamp;
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

    // Common expansions → abbreviations
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
    out = out.replace(/\bprotectant\b/gi, "protectant"); // keep as-is
    out = out.replace(/;?\s*\(.*?\)\s*$/g, ""); // drop trailing parentheses
    out = out.replace(/\s{2,}/g, " ").trim();

    // Keep one clause; replace semicolons with short breaks
    out = out.replace(/;\s*/g, "; ");

    // Hard cap 60 chars; keep it readable
    const MAX = 60;
    if (out.length > MAX) {
      out = out.slice(0, MAX - 1).trim();
      if (!/[.!?]$/.test(out)) out = out.replace(/[;,]?\s*$/,"") + "…";
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
