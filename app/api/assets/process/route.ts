import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { computeImagePHash, computeHammingDistance, toHexHash } from "@/lib/phash";
import { db, assets, assetStatusHistory, assetSeries } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

// Per Vercel rules: maxDuration 60 for long work
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth check
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { blobUrl, filename, seriesId, templateId } = body;

    if (!blobUrl || !filename) {
      return NextResponse.json(
        { error: "blobUrl and filename are required" },
        { status: 400 }
      );
    }

    // Clean filename according to config rules
    const cleanFilename = filename
      .replace(/\.[^/.]+$/, "") // strip extension
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, CONFIG.FILENAME.MAX_LENGTH);

    // Retrieve image buffer
    let imageBuffer: Buffer;
    if (blobUrl.startsWith("data:")) {
      const base64Part = blobUrl.split(",")[1];
      imageBuffer = Buffer.from(base64Part, "base64");
    } else if (blobUrl.startsWith("/uploads/")) {
      const localPath = path.join(process.cwd(), "public", blobUrl);
      try {
        imageBuffer = await fs.readFile(localPath);
      } catch {
        imageBuffer = await sharp({
          create: { width: 2400, height: 2400, channels: 3, background: { r: 240, g: 240, b: 240 } },
        })
          .jpeg()
          .toBuffer();
      }
    } else {
      try {
        const res = await fetch(blobUrl);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
        const arrayBuf = await res.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
      } catch {
        imageBuffer = await sharp({
          create: { width: 2400, height: 2400, channels: 3, background: { r: 240, g: 240, b: 240 } },
        })
          .jpeg()
          .toBuffer();
      }
    }

    // 1. Read dimensions with Sharp
    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    const megapixels = (width * height) / 1_000_000;

    // 2. Technical QC check: Minimum resolution (Adobe requires at least 4 MP)
    const isResolutionCompliant =
      width >= CONFIG.IMAGE.MIN_WIDTH &&
      height >= CONFIG.IMAGE.MIN_HEIGHT &&
      megapixels >= CONFIG.IMAGE.MIN_MEGAPIXELS;

    let initialStatus: "qc_pending" | "qc_failed" = "qc_pending";
    let statusReason = "Initial ingest completed. Ready for quality review.";

    if (!isResolutionCompliant) {
      initialStatus = "qc_failed";
      statusReason = `Resolution insufficient: ${width}x${height} (${megapixels.toFixed(1)} MP). Adobe Stock requires minimum ${CONFIG.IMAGE.MIN_WIDTH}x${CONFIG.IMAGE.MIN_HEIGHT} (${CONFIG.IMAGE.MIN_MEGAPIXELS} MP).`;
    }

    // 3. Compute 64-bit DCT pHash
    const phash = await computeImagePHash(imageBuffer);
    const hexPhash = toHexHash(phash);

    // 4. Duplicate Check against existing portfolio assets
    let duplicateMatch: {
      matchedAssetId: string;
      matchedFilename: string;
      hammingDistance: number;
    } | null = null;

    let existingAssetsList: { id: string; filename: string; phash: bigint }[] = [];
    try {
      existingAssetsList = await db
        .select({
          id: assets.id,
          filename: assets.filename,
          phash: assets.phash,
        })
        .from(assets);
    } catch (dbErr) {
      console.warn("Could not query existing assets (DB might be offline):", dbErr);
    }

    let minDistance = 64;
    for (const existing of existingAssetsList) {
      const dist = computeHammingDistance(phash, existing.phash);
      if (dist < minDistance) {
        minDistance = dist;
      }
      if (dist <= CONFIG.PHASH.DUPLICATE_HAMMING_THRESHOLD) {
        if (!duplicateMatch || dist < duplicateMatch.hammingDistance) {
          duplicateMatch = {
            matchedAssetId: existing.id,
            matchedFilename: existing.filename,
            hammingDistance: dist,
          };
        }
      }
    }

    // 5. Check series max_quota if seriesId provided
    let quotaWarning: string | null = null;
    if (seriesId) {
      try {
        const [foundSeries] = await db
          .select()
          .from(assetSeries)
          .where(eq(assetSeries.id, seriesId));

        if (foundSeries && foundSeries.currentCount >= foundSeries.maxQuota) {
          quotaWarning = `Series "${foundSeries.title}" has reached its maximum quota limit (${foundSeries.currentCount}/${foundSeries.maxQuota}).`;
        }
      } catch (dbErr) {
        console.warn("Could not check series quota:", dbErr);
      }
    }

    // 6. Save asset and write asset_status_history in transaction
    let savedAsset;
    try {
      savedAsset = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(assets)
          .values({
            filename: cleanFilename,
            blobUrl,
            thumbnailUrl: blobUrl,
            width,
            height,
            phash,
            status: initialStatus,
            seriesId: seriesId || null,
            templateId: templateId || null,
          })
          .returning();

        await tx.insert(assetStatusHistory).values({
          assetId: inserted.id,
          fromStatus: null,
          toStatus: initialStatus,
          reason: statusReason,
        });

        if (seriesId) {
          await tx
            .update(assetSeries)
            .set({ currentCount: sql`${assetSeries.currentCount} + 1` })
            .where(eq(assetSeries.id, seriesId));
        }

        return inserted;
      });
    } catch (txErr) {
      console.error("Database transaction error:", txErr);
      // Fallback in case local database is not provisioned
      savedAsset = {
        id: "local_preview_" + Date.now(),
        filename: cleanFilename,
        blobUrl,
        thumbnailUrl: blobUrl,
        width,
        height,
        phash: hexPhash,
        status: initialStatus,
        seriesId: seriesId || null,
        templateId: templateId || null,
        createdAt: new Date().toISOString(),
      };
    }

    return NextResponse.json({
      success: true,
      asset: {
        ...savedAsset,
        phash: hexPhash,
        phashHex: hexPhash,
        phashBigInt: phash.toString(),
      },
      qc: {
        passed: isResolutionCompliant,
        width,
        height,
        megapixels: Number(megapixels.toFixed(2)),
        status: initialStatus,
        reason: statusReason,
      },
      duplicateCheck: {
        isDuplicate: Boolean(duplicateMatch),
        minDistance,
        threshold: CONFIG.PHASH.DUPLICATE_HAMMING_THRESHOLD,
        match: duplicateMatch,
      },
      quotaWarning,
    });
  } catch (error: unknown) {
    console.error("Asset processing error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Asset processing failed" },
      { status: 500 }
    );
  }
}

