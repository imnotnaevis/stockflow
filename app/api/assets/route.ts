import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetStatusHistory, assetSeries, productionThemes, assetMetadata, assetKeywords } from "@/lib/db";
import { eq, and, like, desc } from "drizzle-orm";
import { computeImagePHash, computeHammingDistance, toHexHash } from "@/lib/phash";
import { generateAssetMetadata, generateSmartSeoFromContext } from "@/lib/gemini";
import { memoryAssets, type MemoryAsset } from "@/lib/memory-store";
import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const seriesId = searchParams.get("seriesId");
  const search = searchParams.get("search") || searchParams.get("query");

  try {
    const conditions = [];

    if (status && status !== "all") {
      conditions.push(eq(assets.status, status));
    }
    if (seriesId && seriesId !== "all") {
      conditions.push(eq(assets.seriesId, seriesId));
    }
    if (search) {
      conditions.push(like(assets.filename, `%${search.toLowerCase()}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const list = await db
      .select({
        id: assets.id,
        filename: assets.filename,
        blobUrl: assets.blobUrl,
        thumbnailUrl: assets.thumbnailUrl,
        width: assets.width,
        height: assets.height,
        phash: assets.phash,
        status: assets.status,
        adobeContentId: assets.adobeContentId,
        seriesId: assets.seriesId,
        templateId: assets.templateId,
        createdAt: assets.createdAt,
        seriesTitle: assetSeries.title,
        seriesQuota: assetSeries.maxQuota,
        seriesCount: assetSeries.currentCount,
        themeName: productionThemes.name,
        metadataTitle: assetMetadata.title,
        metadataCategoryId: assetMetadata.categoryId,
      })
      .from(assets)
      .leftJoin(assetSeries, eq(assets.seriesId, assetSeries.id))
      .leftJoin(productionThemes, eq(assetSeries.themeId, productionThemes.id))
      .leftJoin(assetMetadata, eq(assets.id, assetMetadata.assetId))
      .where(whereClause)
      .orderBy(desc(assets.createdAt))
      .limit(200);

    const formatted = list.map((item) => ({
      ...item,
      phashHex: toHexHash(item.phash),
      phashBigInt: item.phash.toString(),
      metadata: item.metadataTitle
        ? {
            title: item.metadataTitle,
            categoryId: item.metadataCategoryId || 11,
            keywords: [],
          }
        : null,
    }));

    if (formatted.length > 0) {
      return NextResponse.json({ assets: formatted });
    }
  } catch (err: unknown) {
    console.warn("Database assets query failed, falling back to local memory store:", err);
  }

  // Filter local memory store fallback
  let fallbackList = [...memoryAssets];
  if (status && status !== "all") {
    fallbackList = fallbackList.filter((a) => a.status === status);
  }
  if (seriesId && seriesId !== "all") {
    fallbackList = fallbackList.filter((a) => a.seriesId === seriesId);
  }
  if (search) {
    fallbackList = fallbackList.filter((a) =>
      a.filename.toLowerCase().includes(search.toLowerCase())
    );
  }

  return NextResponse.json({ assets: fallbackList });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    let imageBuffer: Buffer;
    let originalFilename = "uploaded_asset";
    let seriesId: string | null = null;
    let templateId: string | null = null;
    let clientMime = "image/jpeg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided in form" }, { status: 400 });
      }

      originalFilename = file.name;
      clientMime = file.type || "image/jpeg";
      seriesId = (formData.get("seriesId") as string) || null;
      templateId = (formData.get("templateId") as string) || null;

      const bytes = await file.arrayBuffer();
      imageBuffer = Buffer.from(bytes);
    } else {
      const body = await request.json();
      const { blobUrl, filename, seriesId: sId, templateId: tId } = body;
      if (!blobUrl) {
        return NextResponse.json({ error: "No file or blobUrl provided" }, { status: 400 });
      }

      originalFilename = filename || "asset";
      seriesId = sId || null;
      templateId = tId || null;

      if (blobUrl.startsWith("data:")) {
        const base64Part = blobUrl.split(",")[1];
        imageBuffer = Buffer.from(base64Part, "base64");
      } else if (blobUrl.startsWith("/uploads/")) {
        const localPath = path.join(process.cwd(), "public", blobUrl);
        imageBuffer = await fs.readFile(localPath);
      } else {
        const res = await fetch(blobUrl);
        if (!res.ok) throw new Error("Could not fetch remote blobUrl");
        imageBuffer = Buffer.from(await res.arrayBuffer());
      }
    }

    // Clean filename
    const cleanFilename = originalFilename
      .replace(/\.[^/.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .slice(0, CONFIG.FILENAME.MAX_LENGTH);

    // 1. Sharp metadata & dimensions
    const image = sharp(imageBuffer);
    const meta = await image.metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    const megapixels = (width * height) / 1_000_000;

    // Technical compliance info (non-blocking for user workflow)
    const isResolutionCompliant = megapixels >= 4 || width >= 2000 || height >= 2000;
    const initialStatus = "ready";
    const statusReason = "Asset uploaded and AI SEO metadata generated. Ready for Adobe Stock.";

    // 2. Compute 64-bit DCT pHash
    const phash = await computeImagePHash(imageBuffer);
    const hexPhash = toHexHash(phash);

    // 3. Duplicate check against existing assets
    let duplicateMatch: {
      matchedAssetId: string;
      matchedFilename: string;
      hammingDistance: number;
    } | null = null;

    let minDistance = 64;

    // Check memory assets
    for (const existing of memoryAssets) {
      try {
        const existingBigInt = BigInt(existing.phashBigInt || existing.phash || "0");
        const dist = computeHammingDistance(phash, existingBigInt);
        if (dist < minDistance) minDistance = dist;
        if (dist <= CONFIG.PHASH.DUPLICATE_HAMMING_THRESHOLD) {
          if (!duplicateMatch || dist < duplicateMatch.hammingDistance) {
            duplicateMatch = {
              matchedAssetId: existing.id,
              matchedFilename: existing.filename,
              hammingDistance: dist,
            };
          }
        }
      } catch {
        // ignore conversion error
      }
    }

    // 4. Save image URL
    let finalUrl = "";
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    const hasLiveBlob = blobToken && !blobToken.startsWith("dummy") && !blobToken.includes("sample");

    if (hasLiveBlob) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`assets/${Date.now()}_${cleanFilename}.jpg`, imageBuffer, {
          access: "public",
          contentType: clientMime,
        });
        finalUrl = blob.url;
      } catch (blobErr) {
        console.warn("Vercel blob put failed:", blobErr);
      }
    }

    // If no live blob or blob failed, save to public/uploads or generate data URL
    if (!finalUrl) {
      try {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadDir, { recursive: true });
        const safeName = `${Date.now()}_${cleanFilename}.jpg`;
        const filePath = path.join(uploadDir, safeName);
        await fs.writeFile(filePath, imageBuffer);
        finalUrl = `/uploads/${safeName}`;
      } catch {
        // Vercel serverless read-only filesystem fallback: data URL
        const previewBuffer = await sharp(imageBuffer)
          .resize({ width: 800, withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toBuffer();
        finalUrl = `data:image/jpeg;base64,${previewBuffer.toString("base64")}`;
      }
    }

    // 5. Automatic AI Analysis & SEO Generation (Title, Category, Keywords)
    let generatedMeta: { title: string; categoryId: number; keywords: string[] } | null = null;
    try {
      const metaResult = await generateAssetMetadata(imageBuffer, {
        filename: originalFilename,
      });
      generatedMeta = {
        title: metaResult.title,
        categoryId: metaResult.categoryId,
        keywords: metaResult.keywords,
      };
    } catch (metaErr) {
      console.warn("Auto SEO generation fallback:", metaErr);
      generatedMeta = generateSmartSeoFromContext({ filename: originalFilename });
    }

    // 6. Save to database or memory
    const assetId = "asset_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7);
    let savedAsset: MemoryAsset = {
      id: assetId,
      filename: cleanFilename,
      blobUrl: finalUrl,
      thumbnailUrl: finalUrl,
      width,
      height,
      phash: hexPhash,
      phashHex: hexPhash,
      phashBigInt: phash.toString(),
      status: initialStatus,
      adobeContentId: null,
      seriesId,
      templateId,
      createdAt: new Date().toISOString(),
      metadata: generatedMeta,
    };

    try {
      const [inserted] = await db
        .insert(assets)
        .values({
          filename: cleanFilename,
          blobUrl: finalUrl,
          thumbnailUrl: finalUrl,
          width,
          height,
          phash,
          status: initialStatus,
          seriesId: seriesId || null,
          templateId: templateId || null,
        })
        .returning();

      if (inserted) {
        savedAsset = {
          id: inserted.id,
          filename: inserted.filename,
          blobUrl: inserted.blobUrl,
          thumbnailUrl: inserted.thumbnailUrl,
          width: inserted.width,
          height: inserted.height,
          phash: hexPhash,
          phashHex: toHexHash(inserted.phash),
          phashBigInt: inserted.phash.toString(),
          status: inserted.status,
          adobeContentId: inserted.adobeContentId,
          seriesId: inserted.seriesId,
          templateId: inserted.templateId,
          createdAt: inserted.createdAt instanceof Date ? inserted.createdAt.toISOString() : String(inserted.createdAt),
          metadata: generatedMeta,
        };

        if (generatedMeta) {
          try {
            await db
              .insert(assetMetadata)
              .values({
                assetId: inserted.id,
                title: generatedMeta.title,
                categoryId: generatedMeta.categoryId,
                releaseStatus: "none_required",
              })
              .onConflictDoUpdate({
                target: assetMetadata.assetId,
                set: {
                  title: generatedMeta.title,
                  categoryId: generatedMeta.categoryId,
                },
              });

            for (let i = 0; i < generatedMeta.keywords.length; i++) {
              await db
                .insert(assetKeywords)
                .values({
                  assetId: inserted.id,
                  keyword: generatedMeta.keywords[i],
                  position: i + 1,
                })
                .onConflictDoNothing();
            }
          } catch (mErr) {
            console.warn("DB metadata insertion warning:", mErr);
          }
        }

        await db.insert(assetStatusHistory).values({
          assetId: inserted.id,
          fromStatus: null,
          toStatus: initialStatus,
          reason: statusReason,
        });
      }
    } catch (dbErr) {
      console.warn("DB insert failed, saved to local memory list:", dbErr);
    }

    // Save to memory cache as well
    memoryAssets.unshift(savedAsset);

    return NextResponse.json({
      success: true,
      asset: savedAsset,
      metadata: generatedMeta,
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
    });
  } catch (err: unknown) {
    console.error("Upload & asset processing error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Upload failed" },
      { status: 500 }
    );
  }
}
