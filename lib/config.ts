/**
 * StockFlow AI - Central Business Rules Configuration
 * All business limits, Adobe Stock specifications, and lifecycle constraints reside here.
 */

export const ASSET_STATUSES = [
  "idea",
  "qc_pending",
  "qc_failed",
  "ready",
  "submitted",
  "approved",
  "rejected",
] as const;

export type AssetStatus = (typeof ASSET_STATUSES)[number];

export const REJECTION_TAXONOMY_SEEDS = [
  {
    code: "TECHNICAL_ISSUES",
    label: "Technical Issues",
    description: "Quality defects such as artifacting, chromatic aberration, blurring, or incorrect exposure.",
  },
  {
    code: "SIMILAR_CONTENT",
    label: "Similar Content",
    description: "Too similar to already accepted or existing files in your portfolio.",
  },
  {
    code: "INTELLECTUAL_PROPERTY",
    label: "Intellectual Property",
    description: "Contains copyrighted logos, identifiable trademarks, protected architecture, or proprietary designs.",
  },
  {
    code: "METADATA_NON_COMPLIANT",
    label: "Metadata Non-Compliant",
    description: "Title or keywords contain forbidden words, spam, repetitive terms, or fail Adobe metadata guidelines.",
  },
  {
    code: "LOW_COMMERCIAL_VALUE",
    label: "Low Commercial Value",
    description: "Lacks sufficient buyer appeal or commercial utility for stock stock buyers.",
  },
] as const;

export type RejectionTaxonomyCode = (typeof REJECTION_TAXONOMY_SEEDS)[number]["code"];

export const CONFIG = {
  // Image specifications for Adobe Stock submissions
  IMAGE: {
    MIN_WIDTH: 2000,
    MIN_HEIGHT: 2000,
    MIN_MEGAPIXELS: 4, // Adobe Stock requires at least 4 MP (e.g., 2000x2000 = 4,000,000 pixels)
    ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png"] as const,
    ALLOWED_MIME_TYPES: ["image/jpeg", "image/png"] as const,
    MAX_FILE_SIZE_BYTES: 50 * 1024 * 1024, // 50 MB
  },

  // Title constraints (Adobe allows up to 200 chars, but StockFlow sets max 70 for optimal SEO and internal clarity)
  TITLE: {
    MIN_LENGTH: 5,
    MAX_LENGTH: 70,
  },

  // Filename constraints (excluding extension)
  FILENAME: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 30,
    ALLOWED_PATTERN: /^[a-z0-9_-]+$/i,
  },

  // Keywords constraints (Adobe allows 5-49; StockFlow enforces tight quality of 15-35)
  KEYWORDS: {
    MIN_COUNT: 15,
    MAX_COUNT: 35,
    MAX_KEYWORD_LENGTH: 50,
  },

  // CSV Export constraints for Adobe Stock batch uploads
  CSV: {
    MAX_ROWS: 5000,
    MAX_SIZE_BYTES: 1024 * 1024, // 1 MB
    ENCODING: "utf-8",
    NO_BOM: true,
    COLUMNS: ["Filename", "Title", "Keywords", "Category"] as const,
  },

  // Perceptual Hash (pHash) similarity configuration
  PHASH: {
    BITS: 64,
    // Hamming distance <= 8 indicates duplicate / near-duplicate image
    DUPLICATE_HAMMING_THRESHOLD: 8,
    SIMILAR_HAMMING_THRESHOLD: 12,
  },

  // Forbidden keywords & phrases:
  // Adobe Stock policy forbids mentioning generative AI, model names, or creator platforms
  // in title or keywords (AI origin is designated solely via the Adobe portal submission checkbox).
  FORBIDDEN_TERMS: [
    "generative ai",
    "generative-ai",
    "genai",
    "gen ai",
    "artificial intelligence",
    "midjourney",
    "dall-e",
    "dalle",
    "dall-e 3",
    "stable diffusion",
    "stablediffusion",
    "sdxl",
    "flux.1",
    "flux",
    "firefly",
    "adobe firefly",
    "chatgpt",
    "chat gpt",
    "openai",
    "runway",
    "leonardo ai",
    "leonardo.ai",
    "ai generated",
    "ai-generated",
    "prompt",
  ] as const,

  // Adobe Stock Categories
  CATEGORIES: [
    { id: 1, name: "Animals" },
    { id: 2, name: "Buildings and Architecture" },
    { id: 3, name: "Business" },
    { id: 4, name: "Drinks" },
    { id: 5, name: "The Environment" },
    { id: 6, name: "States of Mind" },
    { id: 7, name: "Food" },
    { id: 8, name: "Graphic Resources" },
    { id: 9, name: "Hobbies and Leisure" },
    { id: 10, name: "Industry" },
    { id: 11, name: "Landscapes" },
    { id: 12, name: "Lifestyle" },
    { id: 13, name: "People" },
    { id: 14, name: "Plants and Flowers" },
    { id: 15, name: "Culture and Religion" },
    { id: 16, name: "Science" },
    { id: 17, name: "Social Issues" },
    { id: 18, name: "Sports" },
    { id: 19, name: "Technology" },
    { id: 20, name: "Transport" },
    { id: 21, name: "Travel" },
  ] as const,

  // Auth & Session
  AUTH: {
    COOKIE_NAME: "sf_session",
    MAX_AGE_SECONDS: 60 * 60 * 24 * 7, // 7 days
  },

  // Portfolio Planning & KPIs
  PORTFOLIO: {
    WEEKLY_UPLOAD_TARGET: 50,
    MIN_ACCEPTANCE_RATE_THRESHOLD: 0.70, // 70% template acceptance rate threshold
    CATEGORY_QUOTA_TARGETS: {
      seasonal: 40, // 40% Seasonal holiday content
      evergreen: 40, // 40% Evergreen commercial concepts
      copy_space: 20, // 20% Minimalist copy-space layouts
    },
  },

  // Seasonal Holiday & Event Windows (H-90 to H-30)
  // Adobe Stock buyers start purchasing seasonal assets 30 to 90 days before the event
  SEASONAL: {
    WINDOW_EARLY_DAYS: 90, // H-90: optimal start of production
    WINDOW_LATE_DAYS: 30, // H-30: optimal end of production before submission review lag
  },

  // Portfolio Health Score Weights (Total = 100%)
  // 1. Approval Rate (40%): Ratio of accepted assets to total reviewed
  // 2. Theme Diversity (20%): Broad coverage across seasonal & evergreen niches
  // 3. Duplicate/Similarity Penalties (20%): Avoiding spam and near-duplicate rejection flags
  // 4. Aged Unsold Assets (20%): Identifying stale inventory >90 days old with 0 sales
  HEALTH_SCORE_WEIGHTS: {
    APPROVAL_RATE: 0.40,
    THEME_DIVERSITY: 0.20,
    SIMILARITY_SAFETY: 0.20,
    FRESHNESS: 0.20,
  },
} as const;

export type AdobeCategory = (typeof CONFIG.CATEGORIES)[number];
