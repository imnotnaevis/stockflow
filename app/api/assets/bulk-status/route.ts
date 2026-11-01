import { NextRequest, NextResponse } from "next/server";
import { CONFIG, ASSET_STATUSES, type AssetStatus } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetStatusHistory } from "@/lib/db";
import { inArray, eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetIds, toStatus, reason } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ error: "assetIds array is required" }, { status: 400 });
    }

    if (!ASSET_STATUSES.includes(toStatus as AssetStatus)) {
      return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // Fetch current statuses
      const existing = await tx
        .select({ id: assets.id, status: assets.status })
        .from(assets)
        .where(inArray(assets.id, assetIds));

      // Update assets
      await tx
        .update(assets)
        .set({ status: toStatus, updatedAt: new Date() })
        .where(inArray(assets.id, assetIds));

      // Insert status history records
      for (const item of existing) {
        await tx.insert(assetStatusHistory).values({
          assetId: item.id,
          fromStatus: item.status,
          toStatus,
          reason: reason || "Bulk status transition",
        });
      }
    });

    return NextResponse.json({ success: true, updatedCount: assetIds.length });
  } catch (err: unknown) {
    console.error("Bulk status update error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Bulk update failed" },
      { status: 500 }
    );
  }
}

