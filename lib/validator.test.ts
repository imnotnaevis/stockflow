import { describe, it, expect } from "vitest";
import {
  stripPromptParameters,
  removeForbiddenAITerms,
  extractSubstantiveTitleWords,
  validateTitle,
  validateFilename,
  validateAndOrderKeywords,
} from "./validator";

describe("Validator & Prompt Stripper Pure Functions", () => {
  it("strips generic double-dash flags and parameters", () => {
    const raw = "Scenic mountain valley at sunset --ar 16:9 --v 6.0 --style raw --chaos 20";
    const cleaned = stripPromptParameters(raw);
    expect(cleaned).toBe("Scenic mountain valley at sunset");
  });

  it("strips Midjourney and Stable Diffusion prompt weights", () => {
    const raw = "golden hour sunlight::1.5 and misty forest::2 with (dramatic lighting:1.2)";
    const cleaned = stripPromptParameters(raw);
    expect(cleaned).toContain("golden hour sunlight and misty forest with dramatic lighting");
    expect(cleaned).not.toContain("::");
    expect(cleaned).not.toContain(":1.2");
  });

  it("strips LoRA and embedding tags", () => {
    const raw = "Cyberpunk neon street <lora:neon_glow_v2:0.8> in rainy night <hypernet:details:0.5>";
    const cleaned = stripPromptParameters(raw);
    expect(cleaned).toBe("Cyberpunk neon street in rainy night");
  });

  it("removes forbidden AI terms and blacklisted brands with word boundaries", () => {
    // "rain" or "training" should NOT match "ai"
    const text = "A girl in rainy weather wearing Nike sneakers made with Midjourney and generative AI";
    const { cleaned, detected } = removeForbiddenAITerms(text);

    expect(detected).toContain("nike");
    expect(detected).toContain("midjourney");
    expect(detected).toContain("generative ai");
    expect(cleaned).toContain("rainy weather");
    expect(cleaned).not.toContain("Midjourney");
    expect(cleaned).not.toContain("Nike");
  });

  it("extracts substantive title words correctly", () => {
    const title = "Cozy Wooden Cabin in the Snowy Mountain Pines";
    const substantive = extractSubstantiveTitleWords(title);
    expect(substantive).toContain("cozy");
    expect(substantive).toContain("wooden");
    expect(substantive).toContain("cabin");
    expect(substantive).toContain("snowy");
    expect(substantive).toContain("mountain");
    expect(substantive).toContain("pines");
    expect(substantive).not.toContain("in");
    expect(substantive).not.toContain("the");
  });

  it("validates and rejects title containing commas", () => {
    const titleWithCommas = "Cozy Cabin, Winter Forest, Snow Pines";
    const result = validateTitle(titleWithCommas);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("commas"))).toBe(true);
    expect(result.cleaned).toBe("Cozy Cabin Winter Forest Snow Pines");
  });

  it("enforces title maximum 70 characters internal limit", () => {
    const longTitle = "This is an extremely long title that describes a beautiful landscape scene and exceeds the maximum seventy characters internal limit";
    const result = validateTitle(longTitle);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("70 characters"))).toBe(true);
  });

  it("validates and cleans filenames", () => {
    const invalid = "My Photo (Version 1).JPEG";
    const result = validateFilename(invalid);
    expect(result.cleaned).toBe("my_photo__version_1_");
    expect(result.isValid).toBe(true);
  });

  it("orders keywords so substantive title words appear in positions 1 to 10", () => {
    const title = "Majestic Eagle Flying Over Autumn River Canyon";
    const rawKeywords = [
      "landscape",
      "nature",
      "outdoor",
      "wilderness",
      "scenic",
      "water",
      "canyon", // title word
      "eagle", // title word
      "flying", // title word
      "river", // title word
      "autumn", // title word
      "majestic", // title word
      "wildlife",
      "predator",
      "sky",
      "calm",
    ];

    const result = validateAndOrderKeywords(rawKeywords, title);
    expect(result.isValid).toBe(true);
    expect(result.keywords.length).toBeGreaterThanOrEqual(15);
    expect(result.keywords.length).toBeLessThanOrEqual(35);

    // Positions 1-10 must include title substantive words
    const top10 = result.keywords.slice(0, 10);
    expect(top10).toContain("canyon");
    expect(top10).toContain("eagle");
    expect(top10).toContain("flying");
    expect(top10).toContain("river");
    expect(top10).toContain("autumn");
    expect(top10).toContain("majestic");
    expect(result.substantiveTitleWordsInTop10).toBe(true);
  });

  it("rejects keywords outside 15-35 range", () => {
    const tooFew = ["eagle", "flying", "river"];
    const result = validateAndOrderKeywords(tooFew, "Eagle Flying River");
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes("below minimum"))).toBe(true);
  });
});

