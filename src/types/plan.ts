// src/types/plans.ts

/** Icons allowed by the schema for summary + routine */
export type SummaryIcon =
  | "heart" | "zap" | "droplet" | "activity" | "coffee"
  | "feather" | "thermometer" | "moon" | "shield" | "star";

export type RoutineIcon =
  | SummaryIcon
  | "list" | "bookmark" | "info";

/** Optional enrichment for the prompt only (not validated/returned by the server) */
export type HairThickness = "fine" | "medium" | "coarse";
export type HairTexture = "straight" | "wavy" | "curly" | "coily";
export type HairPorosity = "low" | "medium" | "high" | "unknown";

export type WashFrequencyCode =
  | "1x/week" | "2x/week" | "3x/week" | "4x/week" | "5x/week" | "6x/week" | "daily";

export type PlanInputDetail = {
  hairTypeDetail?: {
    thickness: HairThickness;
    texture: HairTexture;
    porosity: HairPorosity;
  };
  washFreqDetail?: {
    raw: string;             // e.g., "every other day"
    perWeek: number | null;  // e.g., 3.5 for QOD
  };
  goalsDetail?: Array<{
    raw: string;
    emphasis?: string;       // e.g., "short-term shedding", "bond/strength"
  }>;
  constraintsDetail?: Record<string, string | boolean>; // e.g., { colorTreated: true, heat: "3x/week", lifestyleSwim: true }
};

/** Input you POST to /api/plan/build (schema-friendly + optional __detail for prompt) */
export type PlanInput = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;     // e.g., "fine-straight"
  washFreq: WashFrequencyCode | string; // allow "2x/week" etc.
  goals: string[];      // e.g., ["reduce shedding"]
  constraints?: string; // e.g., "color-treated: regularly; heat: few times per week"
  __detail?: PlanInputDetail; // prompt-only enrichment (ignored by server schema)
};

/** Full plan object returned by the server */
export type FleurPlan = {
  summary: {
    primary: {
      title: string;
      paragraph: string;
      confidence: "Low" | "Medium" | "High";
    };
    drivers: Array<{ icon: SummaryIcon; label: string }>;
    quickWins: string[];  // 3–5 items
    headsUp: string;      // one concise paragraph
  };

  routine: {
    overview: {
      title: string;      // e.g., "Menopause: Thinning & Hair Loss"
      paragraph: string;  // 1–2 lines, mention 6–8wk horizon when relevant
    };
    weeklyPillars: Array<{ text: string; icon?: RoutineIcon }>; // 4–6
    why: string[];        // 3–5 bullets
    notes?: string[];     // optional
  };

  recommendations: Array<{
    title: string;
    why: string;
    howToUse: string;
    product: {
      sku: string;
      name: string;
      url: string;       // http/https
      price: string;     // keep as string for currency formatting
      imageUrl: string;  // http/https
    };
  }>;
};
