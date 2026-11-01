import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetSeries, productionThemes } from "@/lib/db";
import { eq, and, like, desc } from "drizzle-orm";
import { toHexHash } from "@/lib/phash";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const seriesId = searchParams.get("seriesId");
  const themeId = searchParams.get("themeId");
  const search = searchParams.get("search");

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
      })
      .from(assets)
      .leftJoin(assetSeries, eq(assets.seriesId, assetSeries.id))
      .leftJoin(productionThemes, eq(assetSeries.themeId, productionThemes.id))
      .where(whereClause)
      .orderBy(desc(assets.createdAt))
      .limit(200);

    // Format BigInt phash for JSON response
    const formatted = list.map((item) => ({
      ...item,
      phashHex: toHexHash(item.phash),
      phashBigInt: item.phash.toString(),
    }));

    return NextResponse.json({ assets: formatted });
  } catch (err: unknown) {
    console.warn("Could not query assets table (db may not be live):", err);
    // Return empty list safely
    return NextResponse.json({ assets: [] });
  }
}

