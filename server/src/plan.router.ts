// server/src/plan.router.ts
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import { fleurPlanSchema } from "./schema.plan";

const router = express.Router();

/** Bump this any time schema/prompt shape changes */
const SCHEMA_VERSION = "v2";

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
  const { persona, hairType, washFreq, goals, constraints } = req.body || {};
  if (!persona || !hairType || !washFreq || !Array.isArray(goals)) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // include schema version so old cached objects aren't reused
  const key = hash({ SCHEMA_VERSION, persona, hairType, washFreq, goals, constraints });
  if (cache.has(key)) {
    const cached = cache.get(key);
    res.set("x-plan-cache", "hit");
    res.set("x-plan-schema", SCHEMA_VERSION);
    return res.json(cached);
  }

  const system =
    "You are Fleur’s hair-care planner.\n" +
    "Write concise, brand-safe guidance for women’s hair. No medical claims. Use plain language.\n" +
    "Return JSON that EXACTLY matches the provided JSON schema (no extra fields).";

  const prompt = [
    `Persona: ${persona}`,
    `Hair type: ${hairType}`,
    `Wash frequency: ${washFreq}`,
    `Goals: ${goals.join(", ")}`,
    constraints ? `Constraints: ${constraints}` : null,
    "",
    "Fill these sections as if for a UI with 4 cards:",
    "",
    "1) summary.primary",
    "   - title: short diagnosis-style headline (e.g., 'Temporary postpartum shedding (3–6 months)')",
    "   - paragraph: 1–2 lines explaining what's going on and the plan (mention 6–8 week horizon when relevant)",
    "   - confidence: one of Low | Medium | High",
    "",
    "2) summary.drivers: up to 3 short chips, each with an icon from this whitelist only:",
    "   [heart, zap, droplet, activity, coffee, feather, thermometer, moon, shield, star]",
    "   Examples: {icon:'heart',label:'Post-partum window'}, {icon:'zap',label:'Frequent heat'}",
    "",
    "3) summary.quickWins: 3–5 actionable bullets for the next 2 weeks.",
    "   Examples: 'Scalp massage 3 min, 4×/wk (PM)', 'Heat protectant every style; medium heat only', 'Conditioner dwell 3–5 min; leave-in on mid-lengths/ends', 'Bond-building mask 1×/wk'",
    "",
    "4) summary.headsUp: one concise caution (e.g., color/chemical processing + dryness → prioritize bond care, lower heat).",
  ]
    .filter(Boolean)
    .join("\n");

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
        max_output_tokens: 700,
        // Structured outputs (strict) — name + schema at the top level
        text: {
          format: {
            type: "json_schema",
            name: "FleurPlan",
            schema: fleurPlanSchema,
            strict: true,
          },
          // optional, helps with debugging
          verbosity: "medium",
        },
      }),
    });

    if (!r.ok) {
      const err = await r.text();
      return res.status(502).json({ error: "LLM provider error", detail: err });
    }

    const data = (await r.json()) as ProviderResponse;
    const plan = extractPlanPayload(data);

    if (!plan) {
      return res.status(502).json({
        error: "LLM provider error",
        detail: "Could not extract plan JSON from response payload.",
      });
    }

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

function extractPlanPayload(d: ProviderResponse): unknown | null {
  // 1) Preferred: provider gives parsed JSON
  if (d.output_parsed) return d.output_parsed;

  // 2) Raw JSON string convenience field
  const p1 = tryParse(d.output_text);
  if (p1) return p1;

  // 3) Responses API nested text → parse it
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
