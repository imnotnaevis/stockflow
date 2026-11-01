import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetMetadata, assetKeywords, assetStatusHistory } from "@/lib/db";
import { eq, inArray, asc } from "drizzle-orm";
import { generateAdobeStockCsvBatches, type CsvAssetRow } from "@/lib/csv";
import { validateTitle, validateAndOrderKeywords } from "@/lib/validator";

// Pre-flight check and CSV export endpoint
export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch all assets that are in "ready" status
    const readyAssets = await db
      .select({
        id: assets.id,
        filename: assets.filename,
        blobUrl: assets.blobUrl,
        width: assets.width,
        height: assets.height,
        status: assets.status,
      })
      .from(assets)
      .where(eq(assets.status, "ready"));

    // 2. Fetch metadata & keywords for these assets
    const enrichedAssets = [];

    for (const a of readyAssets) {
      const [meta] = await db
        .select()
        .from(assetMetadata)
        .where(eq(assetMetadata.assetId, a.id));

      const kws = await db
        .select()
        .from(assetKeywords)
        .where(eq(assetKeywords.assetId, a.id))
        .orderBy(asc(assetKeywords.position));

      const megapixels = (a.width * a.height) / 1_000_000;
      const isResolutionValid =
        a.width >= CONFIG.IMAGE.MIN_WIDTH &&
        a.height >= CONFIG.IMAGE.MIN_HEIGHT &&
        megapixels >= CONFIG.IMAGE.MIN_MEGAPIXELS;

      const titleValid = meta ? validateTitle(meta.title).isValid : false;
      const keywordsValid = meta
        ? validateAndOrderKeywords(kws.map((k) => k.keyword), meta.title).isValid
        : false;

      enrichedAssets.push({
        ...a,
        megapixels: Number(megapixels.toFixed(1)),
        title: meta?.title || "",
        categoryId: meta?.categoryId || null,
        keywords: kws.map((k) => k.keyword),
        checklist: {
          qcPassed: a.status === "ready",
          resolutionPassed: isResolutionValid,
          titleValid,
          keywordsValid,
          categoryAssigned: Boolean(meta?.categoryId),
          isExportReady:
            isResolutionValid && titleValid && keywordsValid && Boolean(meta?.categoryId),
        },
      });
    }

    const exportableCount = enrichedAssets.filter((a) => a.checklist.isExportReady).length;

    return NextResponse.json({
      totalReady: readyAssets.length,
      exportableCount,
      assets: enrichedAssets,
    });
  } catch (err: unknown) {
    return NextResponse.json({ totalReady: 0, exportableCount: 0, assets: [] });
  }
}

// Generate CSV Batches
export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetIds } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { error: "assetIds array is required" },
        { status: 400 }
      );
    }

    // Fetch assets, metadata, keywords
    const selectedAssets = await db
      .select({
        id: assets.id,
        filename: assets.filename,
      })
      .from(assets)
      .where(inArray(assets.id, assetIds));

    const csvRows: CsvAssetRow[] = [];

    for (const a of selectedAssets) {
      const [meta] = await db
        .select()
        .from(assetMetadata)
        .where(eq(assetMetadata.assetId, a.id));

      const kws = await db
        .select()
        .from(assetKeywords)
        .where(eq(assetKeywords.assetId, a.id))
        .orderBy(asc(assetKeywords.position));

      if (meta && kws.length >= CONFIG.KEYWORDS.MIN_COUNT) {
        csvRows.push({
          filename: a.filename,
          title: meta.title,
          keywords: kws.map((k) => k.keyword),
          categoryId: meta.categoryId,
        });
      }
    }

    if (csvRows.length === 0) {
      return NextResponse.json(
        { error: "None of the selected assets have complete, valid metadata for export." },
        { status: 400 }
      );
    }

    // Generate batches adhering to max 5000 rows / 1 MB / UTF-8 no BOM
    const batches = generateAdobeStockCsvBatches(csvRows);

    return NextResponse.json({
      success: true,
      totalRows: csvRows.length,
      batchCount: batches.length,
      batches,
    });
  } catch (err: unknown) {
    console.error("CSV generation error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "CSV generation failed" },
      { status: 500 }
    );
  }
}

