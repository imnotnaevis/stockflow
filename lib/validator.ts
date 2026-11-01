import { CONFIG } from "./config";

// Default Brand Blacklist to prevent Intellectual Property rejections on Adobe Stock
export const DEFAULT_BRAND_BLACKLIST = [
  "apple",
  "iphone",
  "ipad",
  "macbook",
  "nike",
  "adidas",
  "puma",
  "gucci",
  "prada",
  "louis vuitton",
  "rolex",
  "bmw",
  "mercedes",
  "audi",
  "porsche",
  "ferrari",
  "lamborghini",
  "tesla",
  "toyota",
  "honda",
  "disney",
  "marvel",
  "pixar",
  "star wars",
  "lego",
  "coca-cola",
  "pepsi",
  "mcdonalds",
  "starbucks",
  "playstation",
  "xbox",
  "nintendo",
  "instagram",
  "facebook",
  "tiktok",
  "twitter",
  "youtube",
  "google",
  "microsoft",
  "amazon",
] as const;

// Common English stop words to filter out when extracting substantive title words
const STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "if",
  "then",
  "else",
  "when",
  "at",
  "from",
  "by",
  "on",
  "off",
  "for",
  "in",
  "out",
  "over",
  "to",
  "into",
  "with",
  "of",
  "about",
  "against",
  "between",
  "through",
  "during",
  "before",
  "after",
  "above",
  "below",
  "up",
  "down",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "having",
  "do",
  "does",
  "did",
  "doing",
  "as",
  "this",
  "that",
  "these",
  "those",
  "it",
  "its",
  "no",
  "not",
  "only",
  "own",
  "same",
  "so",
  "than",
  "too",
  "very",
  "can",
  "will",
  "just",
  "should",
  "now",
]);

/**
 * Strips generative AI prompt syntax, weights, LoRA tags, and flags:
 * - Generic flags: `--ar 16:9`, `--v 6.0`, `--style raw`, `--no text`, `--chaos 20`
 * - Midjourney weights: `::2`, `::`
 * - SD / A1111 weights: `(word:1.2)`, `[word:0.8]`, `(word)`
 * - LoRA / Embedding tags: `<lora:name:0.8>`, `<hypernet:name:0.8>`
 */
export function stripPromptParameters(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove <lora:...>, <hypernet:...>, <lyco:...>
  cleaned = cleaned.replace(/<(?:lora|hypernet|lyco|embedding):[^>]+>/gi, " ");

  // 2. Remove generic double-dash flags with optional arguments: e.g. --ar 16:9, --v 6, --no water mark
  // Matches '--' followed by a flag name and optional value up to next flag or boundary
  cleaned = cleaned.replace(/--[a-z0-9_-]+(?:\s+[^-\s,;]+)?/gi, " ");

  // 3. Remove prompt weights: e.g. ::1.5 or ::
  cleaned = cleaned.replace(/::(?:\d+(?:\.\d+)?)?/g, " ");

  // 4. Remove weighted parentheses/brackets: (term:1.2) -> term, [term:0.8] -> term
  cleaned = cleaned.replace(/[\(\[](.*?):(?:\d+(?:\.\d+)?)?[\)\]]/g, "$1");

  // 5. Clean standalone wrapping parentheses or brackets
  cleaned = cleaned.replace(/[\(\)\[\]{}]/g, " ");

  // Normalize multiple spaces into single space
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Identifies and removes forbidden AI terms and blacklisted brand names using word boundaries.
 */
export function removeForbiddenAITerms(
  text: string,
  customBlacklist: string[] = []
): { cleaned: string; detected: string[] } {
  if (!text) return { cleaned: "", detected: [] };

  const allTerms = [
    ...CONFIG.FORBIDDEN_TERMS,
    ...DEFAULT_BRAND_BLACKLIST,
    ...customBlacklist,
  ];

  let cleaned = text;
  const detected: string[] = [];
  const seenDetected = new Set<string>();

  for (const term of allTerms) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "gi");

    if (regex.test(cleaned)) {
      if (!seenDetected.has(term.toLowerCase())) {
        seenDetected.add(term.toLowerCase());
        detected.push(term);
      }
      cleaned = cleaned.replace(regex, " ");
    }
  }

  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return { cleaned, detected };
}

/**
 * Extracts substantive, searchable keywords from a title (ignoring stop words and punctuation).
 */
export function extractSubstantiveTitleWords(title: string): string[] {
  if (!title) return [];

  // Remove punctuation
  const clean = title.toLowerCase().replace(/[^a-z0-9\s-]/g, " ");
  const tokens = clean.split(/\s+/);
  const substantive: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    const trimmed = token.trim();
    if (
      trimmed.length >= 3 &&
      !STOP_WORDS.has(trimmed) &&
      !seen.has(trimmed) &&
      !/^\d+$/.test(trimmed)
    ) {
      seen.add(trimmed);
      substantive.push(trimmed);
    }
  }

  return substantive;
}

/**
 * Validates and sanitizes an Adobe Stock asset title.
 * Enforces:
 * - 5 to 70 characters
 * - NO COMMAS (strictly prohibited in stock titles)
 * - Zero forbidden AI or brand terms
 */
export function validateTitle(
  rawTitle: string,
  customBlacklist: string[] = []
): { isValid: boolean; errors: string[]; cleaned: string } {
  const errors: string[] = [];

  // 1. Strip prompt parameters first
  const noParams = stripPromptParameters(rawTitle);

  // 2. Check for commas
  if (noParams.includes(",")) {
    errors.push("Title must not contain commas (use descriptive spacing instead)");
  }

  // 3. Remove commas for cleaned output
  const commaFree = noParams.replace(/,/g, " ").replace(/\s+/g, " ").trim();

  // 4. Check forbidden terms & brands
  const { cleaned, detected } = removeForbiddenAITerms(commaFree, customBlacklist);
  if (detected.length > 0) {
    errors.push(`Title contains forbidden term(s): ${detected.join(", ")}`);
  }

  // 5. Length constraints
  if (cleaned.length < CONFIG.TITLE.MIN_LENGTH) {
    errors.push(
      `Title must be at least ${CONFIG.TITLE.MIN_LENGTH} characters (currently ${cleaned.length})`
    );
  }
  if (cleaned.length > CONFIG.TITLE.MAX_LENGTH) {
    errors.push(
      `Title cannot exceed ${CONFIG.TITLE.MAX_LENGTH} characters (currently ${cleaned.length})`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleaned,
  };
}

/**
 * Validates an asset filename (excluding file extension).
 * Enforces:
 * - 3 to 30 characters
 * - Alphanumeric, hyphen, and underscore only
 */
export function validateFilename(rawFilename: string): {
  isValid: boolean;
  errors: string[];
  cleaned: string;
} {
  const errors: string[] = [];
  const cleaned = rawFilename
    .replace(/\.[^/.]+$/, "") // strip extension
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, CONFIG.FILENAME.MAX_LENGTH);

  if (cleaned.length < CONFIG.FILENAME.MIN_LENGTH) {
    errors.push(
      `Filename must be at least ${CONFIG.FILENAME.MIN_LENGTH} characters`
    );
  }
  if (!CONFIG.FILENAME.ALLOWED_PATTERN.test(cleaned)) {
    errors.push(
      "Filename may only contain alphanumeric characters, hyphens, and underscores"
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleaned,
  };
}

/**
 * Validates, deduplicates, and orders keywords according to Adobe Stock commercial SEO guidelines.
 * Rule:
 * - 15 to 35 keywords
 * - No duplicate tags
 * - No commas inside tags
 * - Positions 1 to 10 MUST contain the substantive words from the title!
 */
export function validateAndOrderKeywords(
  rawKeywords: string[] | string,
  title: string,
  customBlacklist: string[] = []
): {
  isValid: boolean;
  errors: string[];
  keywords: string[];
  substantiveTitleWordsInTop10: boolean;
} {
  const errors: string[] = [];

  // Parse into array
  const rawList = Array.isArray(rawKeywords)
    ? rawKeywords
    : rawKeywords.split(",");

  const cleanedList: string[] = [];
  const seen = new Set<string>();
  const detectedForbidden = new Set<string>();

  for (const item of rawList) {
    const stripped = stripPromptParameters(item);
    const { cleaned, detected } = removeForbiddenAITerms(stripped, customBlacklist);

    detected.forEach((d) => detectedForbidden.add(d));

    const normalized = cleaned.toLowerCase().trim();
    if (normalized.length > 0 && !seen.has(normalized)) {
      if (normalized.includes(",")) {
        errors.push(`Keyword tag contains invalid comma: "${normalized}"`);
      }
      seen.add(normalized);
      cleanedList.push(normalized);
    }
  }

  if (detectedForbidden.size > 0) {
    errors.push(
      `Keywords contain forbidden term(s): ${Array.from(detectedForbidden).join(", ")}`
    );
  }

  // Extract substantive words from title
  const substantiveWords = extractSubstantiveTitleWords(title);

  // Reorder keywords so substantive title words appear in positions 1 to 10
  const titleWordsSet = new Set(substantiveWords);
  const prioritizedKeywords: string[] = [];
  const remainingKeywords: string[] = [];

  // 1. Collect title substantive words first
  for (const kw of cleanedList) {
    if (titleWordsSet.has(kw)) {
      prioritizedKeywords.push(kw);
      titleWordsSet.delete(kw);
    } else {
      remainingKeywords.push(kw);
    }
  }

  // If some substantive title words were missing from keywords, inject them into top positions
  for (const missingWord of titleWordsSet) {
    prioritizedKeywords.push(missingWord);
  }

  // Combine: prioritized words in top positions, followed by remaining keywords
  const finalOrderedKeywords = [...prioritizedKeywords, ...remainingKeywords];

  // Check count bounds (15 - 35)
  if (finalOrderedKeywords.length < CONFIG.KEYWORDS.MIN_COUNT) {
    errors.push(
      `Keywords count (${finalOrderedKeywords.length}) is below minimum of ${CONFIG.KEYWORDS.MIN_COUNT}`
    );
  }
  if (finalOrderedKeywords.length > CONFIG.KEYWORDS.MAX_COUNT) {
    errors.push(
      `Keywords count (${finalOrderedKeywords.length}) exceeds maximum of ${CONFIG.KEYWORDS.MAX_COUNT}`
    );
  }

  // Check that positions 1-10 cover the substantive title words
  const top10 = new Set(finalOrderedKeywords.slice(0, 10));
  const substantiveInTop10 = substantiveWords.every((w) => top10.has(w));

  return {
    isValid: errors.length === 0,
    errors,
    keywords: finalOrderedKeywords.slice(0, CONFIG.KEYWORDS.MAX_COUNT),
    substantiveTitleWordsInTop10: substantiveInTop10,
  };
}

