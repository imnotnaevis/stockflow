import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import {
  db,
  assets,
  geminiRuns,
  assetStatusHistory,
  rejectionTaxonomies,
  assetRejections,
} from "@/lib/db";
import { eq } from "drizzle-orm";
import { runGeminiQualityCheck, QC_PROMPT_VERSION } from "@/lib/gemini";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  // 1. Authenticate
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = params;

  try {
    // 2. Query Asset
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let asset: any = null;
    try {
      const [found] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, assetId));
      asset = found;
    } catch {
      // DB connection offline
    }

    // In local dev without live database, support local preview ID
    if (!asset) {
      if (assetId.startsWith("local_preview_")) {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const uploads = await fs.readdir(uploadDir).catch(() => []);
        const latestFile = uploads[uploads.length - 1];
        asset = {
          id: assetId,
          filename: "local_asset",
          blobUrl: latestFile ? `/uploads/${latestFile}` : "/uploads/sample.jpg",
          width: 2400,
          height: 2400,
          phash: 0n,
          status: "qc_pending",
          seriesId: null,
          templateId: null,
          createdAt: new Date(),
        };
      } else {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
    }

    // 3. Enforce: Run ONLY if local checks passed
    const megapixels = (asset.width * asset.height) / 1_000_000;
    const isResolutionValid =
      asset.width >= CONFIG.IMAGE.MIN_WIDTH &&
      asset.height >= CONFIG.IMAGE.MIN_HEIGHT &&
      megapixels >= CONFIG.IMAGE.MIN_MEGAPIXELS;

    if (!isResolutionValid) {
      return NextResponse.json(
        {
          error: `Local technical check failed: Resolution ${asset.width}x${asset.height} (${megapixels.toFixed(1)} MP) is below Adobe Stock minimum ${CONFIG.IMAGE.MIN_MEGAPIXELS} MP. Gemini Vision QC cannot run on failing assets.`,
          localCheckPassed: false,
        },
        { status: 400 }
      );
    }

    // 4. Retrieve Image Buffer
    let imageBuffer: Buffer;
    if (asset.blobUrl.startsWith("/uploads/")) {
      const localPath = path.join(process.cwd(), "public", asset.blobUrl);
      imageBuffer = await fs.readFile(localPath);
    } else {
      const res = await fetch(asset.blobUrl);
      if (!res.ok) {
        throw new Error(`Failed to download image from blobUrl: ${res.statusText}`);
      }
      imageBuffer = Buffer.from(await res.arrayBuffer());
    }

    // 5. Run Gemini Vision Quality Gate
    const { result, tokens, costUsd, model, rawJson } =
      await runGeminiQualityCheck(imageBuffer);

    // 6. Evaluate Decision
    const targetStatus =
      result.overall_pass && result.ip_risk.level !== "high"
        ? "ready"
        : "qc_failed";

    const reason =
      targetStatus === "ready"
        ? `Passed Gemini Vision QC. Sharpness: ${result.sharpness}/100. ${result.short_reasons.join(" ")}`
        : `Failed Gemini Vision QC. ${result.short_reasons.join(" ")} (IP Risk: ${result.ip_risk.level})`;

    // 7. Store in DB in transaction
    let updatedAsset = { ...asset, status: targetStatus, phash: asset.phash?.toString() };

    try {
      await db.transaction(async (tx) => {
        // Record Gemini Run
        await tx.insert(geminiRuns).values({
          assetId: asset.id,
          model,
          promptVersion: QC_PROMPT_VERSION,
          raw: result,
          scores: {
            sharpness: result.sharpness,
            artifacts_count: result.artifacts.length,
            copy_space: result.copy_space,
            ip_risk: result.ip_risk,
          },
          tokens,
          costUsd: costUsd.toString(),
        });

        // Update Asset status
        const [u] = await tx
          .update(assets)
          .set({ status: targetStatus, updatedAt: new Date() })
          .where(eq(assets.id, asset.id))
          .returning();
        if (u) updatedAsset = { ...u, phash: u.phash.toString() };

        // Log status transition
        await tx.insert(assetStatusHistory).values({
          assetId: asset.id,
          fromStatus: asset.status,
          toStatus: targetStatus,
          reason,
        });

        // If QC failed, link to rejection taxonomy
        if (targetStatus === "qc_failed") {
          const taxonomyCode =
            result.ip_risk.level === "high"
              ? "INTELLECTUAL_PROPERTY"
              : "TECHNICAL_ISSUES";

          const [tax] = await tx
            .select()
            .from(rejectionTaxonomies)
            .where(eq(rejectionTaxonomies.code, taxonomyCode));

          if (tax) {
            await tx.insert(assetRejections).values({
              assetId: asset.id,
              taxonomyId: tax.id,
              notes: result.short_reasons.join("; "),
            });
          }
        }
      });
    } catch (dbErr) {
      console.warn("DB transaction warning (fallback to memory result):", dbErr);
    }

    return NextResponse.json({
      success: true,
      asset: updatedAsset,
      qcResult: result,
      run: {
        model,
        promptVersion: QC_PROMPT_VERSION,
        tokens,
        costUsd,
      },
    });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    console.error("Gemini QC execution error:", error);

    if (err.message?.includes("429") || err.status === 429) {
      return NextResponse.json(
        { error: "Gemini Vision rate limit exceeded (429). Please back off.", isRateLimit: true },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to execute Gemini Vision QC gate" },
      { status: 500 }
    );
  }
}
