// src/lib/icons.ts
export const FEATHER_ALLOWED = [
  "droplet","layers","shield","package","image","wind",
  "scissors","bookmark","list","info","moon","star",
  "activity","coffee","feather","thermometer","zap","heart",
] as const;

export type FeatherName = (typeof FEATHER_ALLOWED)[number];

export const ALLOWED_FEATHER = new Set<FeatherName>(FEATHER_ALLOWED);

export function sanitizeIcon(name: string, fallback: FeatherName = "list"): FeatherName {
  return ALLOWED_FEATHER.has(name as FeatherName) ? (name as FeatherName) : fallback;
}
