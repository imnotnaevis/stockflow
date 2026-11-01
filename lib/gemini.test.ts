import { describe, it, expect } from "vitest";
import { geminiQcResponseSchema, downscaleForGemini } from "./gemini";
import sharp from "sharp";

describe("Gemini Vision QC Schema & Image Downscaling", () => {
  it("validates compliant QC result from Gemini Vision", () => {
    const validData = {
      sharpness: 92,
      artifacts: [
        {
          type: "noise",
          location: "dark shadows in lower background",
          severity: "low" as const,
        },
      ],
      copy_space: {
        usable: true,
        percent: 40,
        position: "left half",
      },
      ip_risk: {
        level: "low" as const,
        reasons: [],
      },
      overall_pass: true,
      short_reasons: [
        "Focal plane is sharply focused on subject.",
        "Zero identifiable commercial trademarks.",
      ],
    };

    const parseResult = geminiQcResponseSchema.safeParse(validData);
    expect(parseResult.success).toBe(true);
  });

  it("rejects invalid sharpness score out of bounds", () => {
    const invalidData = {
      sharpness: 105, // > 100
      artifacts: [],
      copy_space: { usable: true, percent: 10, position: "top" },
      ip_risk: { level: "low" as const, reasons: [] },
      overall_pass: true,
      short_reasons: ["Test"],
    };

    const parseResult = geminiQcResponseSchema.safeParse(invalidData);
    expect(parseResult.success).toBe(false);
  });

  it("downscales high-resolution image to long side ~1536px", async () => {
    // Generate a 3000x2000 test image in memory
    const buffer = await sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 3,
        background: { r: 100, g: 150, b: 200 },
      },
    })
      .jpeg()
      .toBuffer();

    const { buffer: downscaled, width, height } = await downscaleForGemini(buffer);
    expect(Math.max(width, height)).toBe(1536);
    expect(downscaled.length).toBeLessThan(buffer.length);
  });

  it("generates targeted prompt improvements addressing rejection history", async () => {
    const { suggestPromptImprovements } = await import("./gemini");
    const result = await suggestPromptImprovements({
      templateName: "Cozy Winter Mug",
      promptText: "Overhead mug of hot chocolate on wooden table",
      negativePrompt: "low quality",
      commercialIntent: "Hero Background / Ad Banner",
      rejectionHistory: [
        { code: "TECHNICAL_ISSUES", count: 3, notes: "Blurry edges and noise in shadows" },
      ],
    });

    expect(result.improvedPrompt).toContain("Overhead mug of hot chocolate");
    expect(result.improvedPrompt.length).toBeGreaterThan("Overhead mug of hot chocolate on wooden table".length);
    expect(result.improvedNegativePrompt).toBeDefined();
    expect(result.rationale).toBeDefined();
    expect(result.versionNote).toContain("AI Advisor");
  });
});

