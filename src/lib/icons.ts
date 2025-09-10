export const ALLOWED_FEATHER = new Set(["droplet","moon","wind","scissors","bookmark","list","info"]);
export function sanitizeIcon(name: string, fallback = "list") {
  return ALLOWED_FEATHER.has(name) ? (name as any) : (fallback as any);
}
