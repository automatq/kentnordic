export const LEAD_FORM_TYPES = [
  "inquiry",
  "rate-sheet",
  "fare-list-updates",
] as const;

export type LeadFormType = (typeof LEAD_FORM_TYPES)[number];

/**
 * Footer captures are intentionally differentiated for sales follow-up while
 * continuing to use the same inquiry endpoint and lead schema.
 */
export function formTypeFromSourcePage(sourcePage: string): LeadFormType {
  if (sourcePage.endsWith("#rate-sheet")) return "rate-sheet";
  if (sourcePage.endsWith("#fare-list-updates")) return "fare-list-updates";
  return "inquiry";
}
