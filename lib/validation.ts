import { z } from "zod";
import { CONFIG, ASSET_STATUSES, type AssetStatus } from "./config";

/**
 * Checks if a given text contains any forbidden Adobe Stock generative AI or model terms.
 */
export function findForbiddenTerms(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];

  for (const term of CONFIG.FORBIDDEN_TERMS) {
    // Regex matching whole words or exact phrase boundaries
    const regex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(lower)) {
      matched.push(term);
    }
  }

  return matched;
}

/**
 * Normalizes an array or comma-separated string of keywords into a clean, deduplicated string array.
 */
export function normalizeKeywords(input: string | string[]): string[] {
  const rawList = Array.isArray(input) ? input : input.split(",");
  const cleaned: string[] = [];
  const seen = new Set<string>();

  for (const item of rawList) {
    const trimmed = item.trim().toLowerCase();
    if (trimmed.length > 0 && !seen.has(trimmed)) {
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
  }

  return cleaned;
}

/**
 * Zod schema for Adobe Stock Asset Metadata
 */
export const assetMetadataSchema = z.object({
  filename: z
    .string()
    .trim()
    .min(CONFIG.FILENAME.MIN_LENGTH, `Filename must be at least ${CONFIG.FILENAME.MIN_LENGTH} characters`)
    .max(CONFIG.FILENAME.MAX_LENGTH, `Filename cannot exceed ${CONFIG.FILENAME.MAX_LENGTH} characters`)
    .regex(CONFIG.FILENAME.ALLOWED_PATTERN, "Filename can only contain letters, numbers, hyphens, and underscores"),
  
  title: z
    .string()
    .trim()
    .min(CONFIG.TITLE.MIN_LENGTH, `Title must be at least ${CONFIG.TITLE.MIN_LENGTH} characters`)
    .max(CONFIG.TITLE.MAX_LENGTH, `Title cannot exceed ${CONFIG.TITLE.MAX_LENGTH} characters (internal limit)`)
    .refine((val) => findForbiddenTerms(val).length === 0, (val) => ({
      message: `Title contains forbidden AI/platform term(s): ${findForbiddenTerms(val).join(", ")}`,
    })),

  keywords: z
    .array(z.string().trim())
    .transform((list) => normalizeKeywords(list))
    .refine(
      (list) => list.length >= CONFIG.KEYWORDS.MIN_COUNT && list.length <= CONFIG.KEYWORDS.MAX_COUNT,
      `Keywords count must be between ${CONFIG.KEYWORDS.MIN_COUNT} and ${CONFIG.KEYWORDS.MAX_COUNT}`
    )
    .refine(
      (list) => {
        const forbidden = list.flatMap((kw) => findForbiddenTerms(kw));
        return forbidden.length === 0;
      },
      (list) => {
        const forbidden = list.flatMap((kw) => findForbiddenTerms(kw));
        return {
          message: `Keywords contain forbidden AI/platform term(s): ${Array.from(new Set(forbidden)).join(", ")}`,
        };
      }
    ),

  categoryId: z
    .number()
    .int()
    .min(1)
    .max(21)
    .refine(
      (id) => CONFIG.CATEGORIES.some((c) => c.id === id),
      "Invalid Adobe Stock category ID"
    ),

  status: z.enum(ASSET_STATUSES).default("idea"),
});

export type AssetMetadataInput = z.infer<typeof assetMetadataSchema>;

