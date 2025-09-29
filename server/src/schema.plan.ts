// server/src/schema.plan.ts

/** Icons allowed in chips */
export const FLEUR_ICON_ENUM_CHIPS = [
  "heart",
  "zap",
  "droplet",
  "activity",
  "coffee",
  "feather",
  "thermometer",
  "moon",
  "shield",
  "star",
] as const;

/** Icons allowed in weekly pillars (chips + 'none' sentinel) */
export const FLEUR_ICON_ENUM_PILLARS = [
  ...FLEUR_ICON_ENUM_CHIPS,
  "none", // sentinel to indicate “no icon”
] as const;

export const fleurPlanSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "object",
      additionalProperties: false,
      properties: {
        primary: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            paragraph: { type: "string" },
            confidence: { type: "string", enum: ["Low", "Medium", "High"] },
          },
          required: ["title", "paragraph", "confidence"],
        },
        drivers: {
          type: "array",
          minItems: 0,
          maxItems: 3,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              icon: { type: "string", enum: [...FLEUR_ICON_ENUM_CHIPS] },
              label: { type: "string" },
            },
            required: ["icon", "label"],
          },
        },
        quickWins: {
          type: "array",
          minItems: 3,
          maxItems: 5,
          items: { type: "string" },
        },
        headsUp: { type: "string" },
      },
      required: ["primary", "drivers", "quickWins", "headsUp"],
    },

    routine: {
      type: "object",
      additionalProperties: false,
      properties: {
        overview: {
          type: "object",
          additionalProperties: false,
          properties: {
            title: { type: "string" },
            paragraph: { type: "string" },
          },
          required: ["title", "paragraph"],
        },
        weeklyPillars: {
          type: "array",
          minItems: 4,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              text: { type: "string" },
              icon: { type: "string", enum: [...FLEUR_ICON_ENUM_PILLARS] }, // REQUIRED, allow 'none'
            },
            required: ["text", "icon"], // <- make icon required to satisfy provider
          },
        },
        why: {
          type: "array",
          minItems: 3,
          maxItems: 3,
          items: { type: "string" },
        },
        notes: {
          type: "array",
          minItems: 1,
          maxItems: 4,
          items: { type: "string" },
        },
      },
      required: ["overview", "weeklyPillars", "why", "notes"],
    },

    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 8, // Updated to 8 to include supplements for hormonal users
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          handle: { type: "string" },
          title: { type: "string" },
          why: { type: "string" },
          howToUse: { type: "string" },
        },
        required: ["handle", "title", "why", "howToUse"],
      },
    },
  },
  required: ["summary", "routine", "recommendations"],
} as const;

export type FleurPlanJsonSchema = typeof fleurPlanSchema;
