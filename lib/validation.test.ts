import { describe, it, expect } from "vitest";
import {
  findForbiddenTerms,
  normalizeKeywords,
  assetMetadataSchema,
} from "./validation";

describe("Metadata Validation & Business Rules", () => {
  it("detects forbidden AI and model terms", () => {
    expect(findForbiddenTerms("A cat made with Midjourney")).toContain("midjourney");
    expect(findForbiddenTerms("Photo of generative AI city")).toContain("generative ai");
    expect(findForbiddenTerms("DALL-E 3 artwork")).toContain("dall-e");
    expect(findForbiddenTerms("Clean scenic mountain view at sunset")).toEqual([]);
  });

  it("normalizes and deduplicates keywords correctly", () => {
    const raw = ["Sunset", "sunset", "  Mountain ", "sky", "", "  "];
    const normalized = normalizeKeywords(raw);
    expect(normalized).toEqual(["sunset", "mountain", "sky"]);
  });

  it("validates compliant asset metadata successfully", () => {
    const validData = {
      filename: "golden_hour_sunset_01",
      title: "Golden Hour Mountain Valley Sunset Overlooking Serene Lake",
      keywords: [
        "sunset", "mountain", "lake", "golden hour", "nature",
        "landscape", "evening", "water", "sky", "scenic",
        "outdoor", "reflection", "peaceful", "tranquil", "sunlight",
        "wilderness", "view", "calm"
      ],
      categoryId: 11, // Landscapes
      status: "ready" as const,
    };

    const result = assetMetadataSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects title exceeding 70 characters", () => {
    const longTitle = "This title is intentionally written to be much longer than seventy characters in order to verify the internal limit";
    const data = {
      filename: "sunset_01",
      title: longTitle,
      keywords: Array.from({ length: 16 }, (_, i) => `keyword${i}`),
      categoryId: 11,
    };

    const result = assetMetadataSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("70 characters");
    }
  });

  it("rejects forbidden AI terms in title and keywords", () => {
    const data = {
      filename: "ai_art_piece",
      title: "Generative AI painting of futuristic cityscape",
      keywords: Array.from({ length: 16 }, (_, i) => i === 0 ? "midjourney" : `keyword${i}`),
      categoryId: 8,
    };

    const result = assetMetadataSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it("rejects keywords count outside 15-35 range", () => {
    const tooFew = {
      filename: "sunset_01",
      title: "Golden Hour Mountain Valley Sunset",
      keywords: ["sunset", "mountain", "lake"], // only 3
      categoryId: 11,
    };

    const result = assetMetadataSchema.safeParse(tooFew);
    expect(result.success).toBe(false);
  });
});

