import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, geminiRuns, assetStatusHistory, assetRejections, rejectionTaxonomies } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { toHexHash } from "@/lib/phash";
import { memoryAssets } from "@/lib/memory-store";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: assetId } = params;

  try {
    const [asset] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));

    if (asset) {
      // Fetch latest gemini runs
      const runs = await db
        .select()
        .from(geminiRuns)
        .where(eq(geminiRuns.assetId, assetId))
        .orderBy(desc(geminiRuns.createdAt))
        .limit(5);

      // Fetch status history
      const history = await db
        .select()
        .from(assetStatusHistory)
        .where(eq(assetStatusHistory.assetId, assetId))
        .orderBy(desc(assetStatusHistory.changedAt))
        .limit(20);

      return NextResponse.json({
        asset: {
          ...asset,
          phashHex: toHexHash(asset.phash),
          phashBigInt: asset.phash.toString(),
        },
        latestQc: runs.length > 0 ? runs[0] : null,
        runs,
        history,
      });
    }
  } catch (err: unknown) {
    // Database offline
  }

  // Memory fallback
  const mem = memoryAssets.find((a) => a.id === assetId);
  if (mem) {
    return NextResponse.json({
      asset: mem,
      latestQc: null,
      runs: [],
      history: [],
    });
  }

  return NextResponse.json({ error: "Asset not found" }, { status: 404 });
}

