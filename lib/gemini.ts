import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import sharp from "sharp";
import {
  validateTitle,
  validateAndOrderKeywords,
} from "./validator";
import { CONFIG } from "./config";

/**
 * Zod schema for validating the Gemini Vision Quality Gate output.
 */
export const geminiQcResponseSchema = z.object({
  sharpness: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall perceptual sharpness score from 0 (blurry) to 100 (razor sharp)"),
  artifacts: z
    .array(
      z.object({
        type: z
          .string()
          .describe(
            "Type of artifact: e.g. chromatic aberration, ai weirdness/morphing, noise, banding, edge halos, compression"
          ),
        location: z
          .string()
          .describe("Where in the image this artifact is located"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe("Severity level"),
      })
    )
    .describe("List of visual or generative anomalies found"),
  copy_space: z.object({
    usable: z
      .boolean()
      .describe("Whether there is adequate empty / copy space for designers to place text or graphics"),
    percent: z
      .number()
      .min(0)
      .max(100)
      .describe("Approximate percentage of image canvas that qualifies as copy space"),
    position: z
      .string()
      .describe("Location of copy space, e.g. 'left third', 'top half', 'none'"),
  }),
  ip_risk: z.object({
    level: z
      .enum(["low", "medium", "high"])
      .describe("Risk level for intellectual property infringement"),
    reasons: z
      .array(z.string())
      .describe(
        "Specific identifiable logos, trademarked designs, recognizable buildings, or brand elements"
      ),
  }),
  overall_pass: z
    .boolean()
    .describe(
      "True if image meets commercial quality for Adobe Stock without severe defects or IP violations"
    ),
  short_reasons: z
    .array(z.string())
    .describe("Concise 1-sentence explanations for the pass/fail determination"),
});

export type GeminiQcResult = z.infer<typeof geminiQcResponseSchema>;

/**
 * JSON Schema for @google/genai QC responseSchema enforcement.
 */
export const geminiQcJsonSchema = {
  type: Type.OBJECT,
  properties: {
    sharpness: {
      type: Type.NUMBER,
      description: "Overall sharpness score from 0 (blurry) to 100 (crisp)",
    },
    artifacts: {
      type: Type.ARRAY,
      description: "Visual or generative anomalies",
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          location: { type: Type.STRING },
          severity: { type: Type.STRING, enum: ["low", "medium", "high"] },
        },
        required: ["type", "location", "severity"],
      },
    },
    copy_space: {
      type: Type.OBJECT,
      properties: {
        usable: { type: Type.BOOLEAN },
        percent: { type: Type.NUMBER },
        position: { type: Type.STRING },
      },
      required: ["usable", "percent", "position"],
    },
    ip_risk: {
      type: Type.OBJECT,
      properties: {
        level: { type: Type.STRING, enum: ["low", "medium", "high"] },
        reasons: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["level", "reasons"],
    },
    overall_pass: {
      type: Type.BOOLEAN,
      description: "True if ready for commercial Adobe Stock licensing",
    },
    short_reasons: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Bullet points explaining the decision",
    },
  },
  required: [
    "sharpness",
    "artifacts",
    "copy_space",
    "ip_risk",
    "overall_pass",
    "short_reasons",
  ],
};

export const QC_PROMPT_VERSION = "qc_v1.0";
export const METADATA_PROMPT_VERSION = "meta_v1.0";

export const QC_SYSTEM_INSTRUCTION = `You are an elite Adobe Stock quality control inspection inspector.
Evaluate the stock photograph/illustration strictly against Adobe Stock technical and commercial review guidelines:
1. Sharpness: Evaluate focus, micro-contrast, edge sharpness (0 to 100). Stock requires sharp focus on the main subject.
2. Artifacts: Look for AI generation distortions (morphed fingers, asymmetric eyes, weird melted textures), sensor noise, color banding, edge halos, or over-sharpening halos.
3. Copy Space: Stock buyers need empty/uncluttered space to overlay typography or graphics.
4. IP Risk: Strict zero-tolerance for recognizable logos (Apple, Nike, BMW, etc.), trademarks, protected character designs, or non-incidental private property.
5. Overall Pass: Set to true ONLY if image has NO severe artifacts, NO medium/high IP risk, and adequate technical clarity for Adobe Stock buyers.`;

export const METADATA_SYSTEM_INSTRUCTION = `You are a master Adobe Stock SEO metadata specialist.
Generate commercial stock metadata strictly adhering to Adobe guidelines:
1. Title: Descriptive, literal, commercial. MAXIMUM 70 CHARACTERS. DO NOT USE COMMAS IN THE TITLE.
2. Never mention "AI", "generative AI", model names, prompts, or software platforms.
3. Keywords: 20 to 30 highly relevant search tags ordered strictly by commercial buyer intent.
4. CRITICAL RULE: Positions 1 to 10 of the keywords MUST contain the substantive key words from your title.
5. Category: Choose the single best Adobe Stock category ID from 1 to 21.`;

/**
 * Zod schema for Metadata Generation output
 */
export const geminiMetadataResponseSchema = z.object({
  title: z.string().min(5).max(70),
  keywords: z.array(z.string()).min(15).max(35),
  categoryId: z.number().int().min(1).max(21),
});

export type GeminiMetadataResult = z.infer<typeof geminiMetadataResponseSchema>;

export const geminiMetadataJsonSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Descriptive stock title without commas, maximum 70 characters",
    },
    keywords: {
      type: Type.ARRAY,
      description: "15 to 35 keywords ordered by search importance. Positions 1-10 must contain title substantive words",
      items: { type: Type.STRING },
    },
    categoryId: {
      type: Type.INTEGER,
      description: "Adobe Stock Category ID from 1 to 21",
    },
  },
  required: ["title", "keywords", "categoryId"],
};

/**
 * Downscales an image using Sharp so that its longest side is ~1536px,
 * optimized for Gemini Vision token efficiency and speed.
 */
export async function downscaleForGemini(imageBuffer: Buffer): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
}> {
  const image = sharp(imageBuffer);
  const meta = await image.metadata();
  const width = meta.width || 1536;
  const height = meta.height || 1536;
  const maxSide = Math.max(width, height);

  let resized = image;
  if (maxSide > 1536) {
    if (width >= height) {
      resized = image.resize({ width: 1536, withoutEnlargement: true });
    } else {
      resized = image.resize({ height: 1536, withoutEnlargement: true });
    }
  }

  const outputBuffer = await resized.jpeg({ quality: 85 }).toBuffer();
  const outputMeta = await sharp(outputBuffer).metadata();

  return {
    buffer: outputBuffer,
    width: outputMeta.width || 1536,
    height: outputMeta.height || 1536,
  };
}

/**
 * Executes the Gemini Vision Quality Gate.
 */
export async function runGeminiQualityCheck(
  imageBuffer: Buffer,
  retryCount = 0
): Promise<{
  result: GeminiQcResult;
  tokens: number;
  costUsd: number;
  model: string;
  rawJson: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const isDummyKey = !apiKey || apiKey.startsWith("dummy") || apiKey.includes("Sample");

  if (isDummyKey) {
    const simulatedResult: GeminiQcResult = {
      sharpness: 88,
      artifacts: [
        {
          type: "slight compression",
          location: "extreme corners",
          severity: "low",
        },
      ],
      copy_space: {
        usable: true,
        percent: 35,
        position: "upper right quadrant",
      },
      ip_risk: {
        level: "low",
        reasons: [],
      },
      overall_pass: true,
      short_reasons: [
        "Crisp focal plane on central subject with good depth of field.",
        "Zero identifiable commercial logos or copyrighted marks.",
        "Ample copy space in upper right quadrant suitable for typography overlays.",
      ],
    };

    return {
      result: simulatedResult,
      tokens: 380,
      costUsd: 0.00014,
      model: `${modelName}-simulated`,
      rawJson: JSON.stringify(simulatedResult),
    };
  }

  const { buffer: downscaledJpeg } = await downscaleForGemini(imageBuffer);
  const base64Data = downscaledJpeg.toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: `${QC_SYSTEM_INSTRUCTION}\n\nAnalyze this image now.` },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: geminiQcJsonSchema,
      },
    });

    const text = response.text || "";
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      if (retryCount === 0) {
        console.warn("Invalid JSON from Gemini, retrying once...");
        return await runGeminiQualityCheck(imageBuffer, 1);
      }
      throw new Error(`Failed to parse Gemini output as JSON: ${(parseErr as Error).message}`);
    }

    const validated = geminiQcResponseSchema.safeParse(parsed);
    if (!validated.success) {
      if (retryCount === 0) {
        console.warn("Zod schema validation failed on Gemini output, retrying once...");
        return await runGeminiQualityCheck(imageBuffer, 1);
      }
      throw new Error(`Zod validation error: ${validated.error.message}`);
    }

    const promptTokens = response.usageMetadata?.promptTokenCount || 300;
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || 150;
    const totalTokens = promptTokens + candidatesTokens;
    const costUsd = promptTokens * 0.000000075 + candidatesTokens * 0.0000003;

    return {
      result: validated.data,
      tokens: totalTokens,
      costUsd: Number(costUsd.toFixed(6)),
      model: modelName,
      rawJson: text,
    };
  } catch (err: unknown) {
    if (retryCount === 0) {
      console.warn("Gemini call failed, retrying once...", err);
      return await runGeminiQualityCheck(imageBuffer, 1);
    }
    throw err;
  }
}

/**
 * Generates smart, high-converting Adobe Stock SEO metadata (Title, Category, Keywords)
 * tailored to the visual context, filename, and themes.
 */
export function generateSmartSeoFromContext(context?: {
  filename?: string;
  templatePrompt?: string;
  categoryId?: number;
}): {
  title: string;
  keywords: string[];
  categoryId: number;
} {
  const rawText = [context?.filename || "", context?.templatePrompt || ""].join(" ").toLowerCase();

  const words = rawText
    .replace(/\b(17\d{10,}|asset_\w+|test_\w+)\b/g, "")
    .replace(/\.(jpg|jpeg|png|webp|avif)\b/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const textLower = words.join(" ");

  // 1. Food & Beverage
  if (
    /coffee|tea|latte|matcha|burger|pizza|salad|food|drink|fruit|cake|dessert|bakery|baking|breakfast|culinary|chef|meal|snack|chocolate|cocoa|cookie/.test(
      textLower
    )
  ) {
    const isCoffee = /coffee|latte|matcha|tea|cocoa|mug|cup/.test(textLower);
    const title = isCoffee
      ? "Aromatic Fresh Coffee Cup In Cozy Morning Cafe"
      : "Delicious Fresh Gourmet Food Meal On Rustic Table";

    const baseKeywords = [
      isCoffee ? "coffee" : "food",
      isCoffee ? "cup" : "meal",
      isCoffee ? "cafe" : "gourmet",
      isCoffee ? "morning" : "fresh",
      isCoffee ? "aromatic" : "table",
      isCoffee ? "cozy" : "delicious",
      "beverage",
      "culinary",
      "organic",
      "healthy",
      "ingredient",
      "nutrition",
      "tasty",
      "kitchen",
      "breakfast",
      "lunch",
      "dinner",
      "artisan",
      "still life",
      "appetizing",
      "snack",
      "restaurant",
      "rustic",
      "warm",
      "homemade",
      "wood",
      "ceramic",
      "closeup",
      "overhead",
      "wooden table",
      "refreshment",
      "dining",
      "eating",
      "flavor",
      "commercial",
      "copy space",
      "background",
    ];

    const ordered = validateAndOrderKeywords(baseKeywords, title);
    return {
      title,
      keywords: ordered.keywords,
      categoryId: context?.categoryId || 8, // Food & Drink
    };
  }

  // 2. Business & Technology
  if (
    /business|office|work|corporate|team|meeting|executive|laptop|fintech|finance|strategy|tech|digital|cyber|network|computer/.test(
      textLower
    )
  ) {
    const title = "Modern Corporate Business Team Collaborating In Bright Office";
    const baseKeywords = [
      "business",
      "corporate",
      "team",
      "office",
      "collaborating",
      "modern",
      "bright",
      "meeting",
      "teamwork",
      "technology",
      "executive",
      "professional",
      "workplace",
      "communication",
      "laptop",
      "strategy",
      "startup",
      "diverse",
      "finance",
      "success",
      "fintech",
      "entrepreneur",
      "consulting",
      "career",
      "partnership",
      "presentation",
      "commercial",
      "leadership",
      "discussion",
      "coworking",
      "glass board",
      "management",
      "planning",
      "digital",
      "copy space",
      "background",
    ];

    const ordered = validateAndOrderKeywords(baseKeywords, title);
    return {
      title,
      keywords: ordered.keywords,
      categoryId: context?.categoryId || 3, // Business
    };
  }

  // 3. Architecture & Interior
  if (
    /interior|architecture|room|living|house|home|apartment|decor|furniture|minimalist|luxury|bedroom|kitchen|building/.test(
      textLower
    )
  ) {
    const title = "Modern Minimalist Living Room Interior In Warm Sunlight";
    const baseKeywords = [
      "interior",
      "modern",
      "minimalist",
      "living room",
      "architecture",
      "sunlight",
      "warm",
      "home",
      "design",
      "furniture",
      "decor",
      "apartment",
      "contemporary",
      "luxury",
      "house",
      "room",
      "sofa",
      "indoor",
      "aesthetic",
      "clean",
      "spacious",
      "wooden",
      "residential",
      "real estate",
      "window",
      "daylight",
      "lifestyle",
      "elegance",
      "architectural",
      "nordic",
      "scandinavian",
      "staging",
      "commercial",
      "copy space",
      "background",
    ];

    const ordered = validateAndOrderKeywords(baseKeywords, title);
    return {
      title,
      keywords: ordered.keywords,
      categoryId: context?.categoryId || 2, // Architecture
    };
  }

  // 4. People & Lifestyle
  if (
    /woman|man|people|person|family|portrait|lifestyle|smile|smiling|happy|fitness|yoga|running|wellness/.test(
      textLower
    )
  ) {
    const title = "Happy Young Woman Enjoying Morning Sunshine Outdoors";
    const baseKeywords = [
      "lifestyle",
      "woman",
      "happy",
      "morning",
      "sunshine",
      "outdoors",
      "young adult",
      "smile",
      "portrait",
      "vitality",
      "wellness",
      "joy",
      "freedom",
      "leisure",
      "positive",
      "relaxation",
      "summer",
      "cheerful",
      "health",
      "beauty",
      "natural",
      "caucasian",
      "attractive",
      "energy",
      "peaceful",
      "travel",
      "serenity",
      "park",
      "daylight",
      "commercial",
      "authenticity",
      "copy space",
      "background",
    ];

    const ordered = validateAndOrderKeywords(baseKeywords, title);
    return {
      title,
      keywords: ordered.keywords,
      categoryId: context?.categoryId || 14, // People
    };
  }

  // 5. Holidays & Seasonal
  if (
    /christmas|xmas|holiday|halloween|valentine|easter|gift|festive|celebration|winter|snow|cozy/.test(
      textLower
    )
  ) {
    const isXmas = /christmas|xmas|winter|snow|gift|festive/.test(textLower);
    const title = isXmas
      ? "Cozy Winter Christmas Holiday Gift Boxes On Wooden Table"
      : "Festive Holiday Celebration With Elegant Gift Decorations";

    const baseKeywords = [
      isXmas ? "christmas" : "holiday",
      isXmas ? "winter" : "festive",
      isXmas ? "holiday" : "celebration",
      isXmas ? "gift" : "decoration",
      isXmas ? "cozy" : "gift",
      isXmas ? "boxes" : "elegant",
      "celebration",
      "tradition",
      "festive",
      "decor",
      "present",
      "seasonal",
      "greeting",
      "joy",
      "xmas",
      "new year",
      "wooden",
      "table",
      "ribbon",
      "wrapped",
      "warm",
      "pine",
      "ornament",
      "december",
      "family",
      "gathering",
      "surprise",
      "holiday season",
      "cheer",
      "craft",
      "sparkle",
      "still life",
      "commercial",
      "copy space",
      "background",
    ];

    const ordered = validateAndOrderKeywords(baseKeywords, title);
    return {
      title,
      keywords: ordered.keywords,
      categoryId: context?.categoryId || 10, // Holidays
    };
  }

  // 6. Default: Nature & Landscapes
  const title = "Scenic Alpine Mountain Lake In Autumn Sunshine";
  const baseKeywords = [
    "lake",
    "mountain",
    "alpine",
    "autumn",
    "scenic",
    "sunshine",
    "nature",
    "landscape",
    "outdoor",
    "valley",
    "reflection",
    "water",
    "sky",
    "wilderness",
    "forest",
    "peaceful",
    "serene",
    "tranquil",
    "morning",
    "travel",
    "destination",
    "tourism",
    "hiking",
    "view",
    "beauty in nature",
    "calm",
    "national park",
    "panorama",
    "environment",
    "fresh air",
    "geology",
    "adventure",
    "clouds",
    "commercial",
    "copy space",
    "background",
  ];

  const ordered = validateAndOrderKeywords(baseKeywords, title);
  return {
    title,
    keywords: ordered.keywords,
    categoryId: context?.categoryId || 11, // Landscapes
  };
}

/**
 * Generates Adobe Stock compliant Title and Keywords using Gemini Vision.
 * Keywords are prioritized by commercial value, and positions 1-10 are guaranteed
 * to include the substantive words from the generated title.
 */
export async function generateAssetMetadata(
  imageBuffer: Buffer,
  context?: { templatePrompt?: string; categoryId?: number; filename?: string },
  retryCount = 0
): Promise<{
  title: string;
  keywords: string[];
  categoryId: number;
  tokens: number;
  costUsd: number;
  model: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const isDummyKey = !apiKey || apiKey.startsWith("dummy") || apiKey.includes("Sample");

  if (isDummyKey) {
    const fallback = generateSmartSeoFromContext(context);
    return {
      title: fallback.title,
      keywords: fallback.keywords,
      categoryId: fallback.categoryId,
      tokens: 320,
      costUsd: 0.00012,
      model: `${modelName}-simulated`,
    };
  }

  const { buffer: downscaledJpeg } = await downscaleForGemini(imageBuffer);
  const base64Data = downscaledJpeg.toString("base64");

  const ai = new GoogleGenAI({ apiKey });

  const contextPrompt = context?.templatePrompt
    ? `\n\nImage generation concept context: "${context.templatePrompt}". Do not copy flags or syntax.`
    : "";

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${METADATA_SYSTEM_INSTRUCTION}${contextPrompt}\n\nGenerate compliant title and keywords for this image now.`,
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: geminiMetadataJsonSchema,
      },
    });

    const text = response.text || "";
    let parsed: unknown;

    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      if (retryCount === 0) {
        return await generateAssetMetadata(imageBuffer, context, 1);
      }
      throw new Error(`Failed to parse Gemini metadata response: ${(parseErr as Error).message}`);
    }

    const validated = geminiMetadataResponseSchema.safeParse(parsed);
    if (!validated.success) {
      if (retryCount === 0) {
        return await generateAssetMetadata(imageBuffer, context, 1);
      }
      throw new Error(`Invalid metadata structure: ${validated.error.message}`);
    }

    // Sanitize title through validator pure functions
    const titleResult = validateTitle(validated.data.title);
    const finalTitle = titleResult.cleaned;

    // Sanitize and reorder keywords through validator pure functions
    const keywordsResult = validateAndOrderKeywords(validated.data.keywords, finalTitle);

    const promptTokens = response.usageMetadata?.promptTokenCount || 280;
    const candidatesTokens = response.usageMetadata?.candidatesTokenCount || 120;
    const totalTokens = promptTokens + candidatesTokens;
    const costUsd = promptTokens * 0.000000075 + candidatesTokens * 0.0000003;

    return {
      title: finalTitle,
      keywords: keywordsResult.keywords,
      categoryId: validated.data.categoryId || context?.categoryId || 11,
      tokens: totalTokens,
      costUsd: Number(costUsd.toFixed(6)),
      model: modelName,
    };
  } catch (err: unknown) {
    if (retryCount === 0) {
      return await generateAssetMetadata(imageBuffer, context, 1);
    }
    console.warn("Gemini metadata generation failed, falling back to smart contextual SEO:", err);
    const fallback = generateSmartSeoFromContext(context);
    return {
      title: fallback.title,
      keywords: fallback.keywords,
      categoryId: fallback.categoryId,
      tokens: 300,
      costUsd: 0.0001,
      model: `${modelName}-fallback`,
    };
  }
}

/**
 * -------------------------------------------------------------------
 * Gemini Prompt Advisor Engine (Phase 6)
 * -------------------------------------------------------------------
 * Analyzes a prompt template's Adobe Stock rejection history and suggests
 * targeted improvements to overcome technical, commercial, or similarity flags.
 */

export interface PromptAdvisorInput {
  templateName: string;
  promptText: string;
  negativePrompt?: string | null;
  commercialIntent?: string | null;
  rejectionHistory: Array<{
    code: string;
    label?: string;
    notes?: string | null;
    count: number;
  }>;
}

export interface PromptAdvisorResult {
  improvedPrompt: string;
  improvedNegativePrompt: string;
  rationale: string;
  versionNote: string;
}

export const promptAdvisorJsonSchema = {
  type: Type.OBJECT,
  properties: {
    improvedPrompt: {
      type: Type.STRING,
      description: "Refined prompt text resolving the rejection causes while preserving core aesthetic.",
    },
    improvedNegativePrompt: {
      type: Type.STRING,
      description: "Targeted negative prompt blocking specific artifacts or defect patterns.",
    },
    rationale: {
      type: Type.STRING,
      description: "Concise commercial and technical rationale explaining how this resolves reviewer flags.",
    },
    versionNote: {
      type: Type.STRING,
      description: "Short changelog entry for this new template version (e.g., 'Optimized depth of field and eliminated chromatic fringing').",
    },
  },
  required: ["improvedPrompt", "improvedNegativePrompt", "rationale", "versionNote"],
};

export async function suggestPromptImprovements(
  input: PromptAdvisorInput
): Promise<PromptAdvisorResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const rejectionsSummary =
    input.rejectionHistory.length > 0
      ? input.rejectionHistory
          .map((r) => `- [${r.code}] ${r.label || r.code} (${r.count}x): ${r.notes || "Standard rejection"}`)
          .join("\n")
      : "No formal rejections yet. Optimize for commercial buyer utility and razor sharpness.";

  // Offline / Mock / Fallback generator if API key is dummy
  if (!apiKey || apiKey.includes("dummy") || apiKey.includes("placeholder")) {
    const hasTechnical = input.rejectionHistory.some((r) => r.code === "TECHNICAL_ISSUES");
    const hasSimilar = input.rejectionHistory.some((r) => r.code === "SIMILAR_CONTENT");
    const hasIp = input.rejectionHistory.some((r) => r.code === "INTELLECTUAL_PROPERTY");

    let promptAddition = "commercial studio lighting, balanced rule-of-thirds composition, crisp 8k optical clarity";
    let negAddition = "chromatic aberration, lens glare, digital noise, edge fringing, compression artifacts";

    if (hasTechnical) {
      promptAddition += ", tack sharp focus, clean ISO 100, master professional color grading";
      negAddition += ", motion blur, pixelation, blown-out highlights, muddy shadows";
    }
    if (hasSimilar) {
      promptAddition += ", distinct dynamic angle, unique textural elements, differentiated props";
    }
    if (hasIp) {
      promptAddition += ", completely generic unbranded environment, bespoke architectural geometry";
      negAddition += ", recognizable trademarks, logos, brand emblems, proprietary silhouettes";
    }

    return {
      improvedPrompt: `${input.promptText}, ${promptAddition}`,
      improvedNegativePrompt: input.negativePrompt
        ? `${input.negativePrompt}, ${negAddition}`
        : negAddition,
      rationale: `Addressed ${input.rejectionHistory.map((r) => r.code).join(", ") || "quality guidelines"} by augmenting optical precision terms and fortifying negative defect constraints.`,
      versionNote: `AI Advisor Optimization: mitigated ${input.rejectionHistory.map((r) => r.code).join(", ") || "rejection patterns"}.`,
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `You are a world-class Adobe Stock AI Contributor Advisor and prompt engineer.
A template has experienced rejections from Adobe Stock moderation. Your task is to upgrade the prompt text and negative prompt so future assets pass inspection with high commercial velocity.

REJECTION HISTORY:
${rejectionsSummary}

STRICT ADOBE STOCK RULES:
1. NEVER include forbidden terms: "generative ai", "ai", "midjourney", "dall-e", "stable diffusion", "flux", "photorealistic", "hyperrealistic", "unreal engine", or platform names.
2. Maintain the core concept: "${input.templateName}" (Commercial Intent: ${input.commercialIntent || "Commercial Stock"}).
3. Ensure crisp subject isolation, natural lighting, and negative copy space where appropriate.
4. Output JSON matching the exact schema.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Original Prompt:\n${input.promptText}\n\nOriginal Negative Prompt:\n${input.negativePrompt || "(None)"}\n\nSuggest upgraded prompt and negative prompt now.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: promptAdvisorJsonSchema,
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text) as PromptAdvisorResult;
    return parsed;
  } catch (err: unknown) {
    console.warn("Gemini prompt advisor API call failed, using heuristic advisor:", err);
    return {
      improvedPrompt: `${input.promptText}, professional commercial lighting, sharp optical depth of field, high dynamic range clarity`,
      improvedNegativePrompt: `${input.negativePrompt || "low quality, deformed, blurry"}, chromatic aberration, edge halos, visual artifacts, noise`,
      rationale: "Enhanced studio lighting parameters and optical sharpness vocabulary to counteract moderation rejection points.",
      versionNote: "Heuristic AI Advisor: Enhanced contrast, clarity, and defect blocker tags.",
    };
  }
}
