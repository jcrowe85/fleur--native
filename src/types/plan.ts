// src/types/plan.ts

/** Icons allowed by the schema for summary + routine */
export type SummaryIcon =
  | "heart" | "zap" | "droplet" | "activity" | "coffee"
  | "feather" | "thermometer" | "moon" | "shield" | "star";

export type RoutineIcon =
  | SummaryIcon
  | "list" | "bookmark" | "info";

/** Optional: input you POST to /api/plan/build */
export type PlanInput = {
  persona: "menopause" | "postpartum" | "general";
  hairType: string;     // e.g., "fine-straight"
  washFreq: string;     // e.g., "2x/week"
  goals: string[];      // e.g., ["reduce shedding"]
  constraints?: string; // e.g., "color-treated: regularly; heat: few times per week"
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
