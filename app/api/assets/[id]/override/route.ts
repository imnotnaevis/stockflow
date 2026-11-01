import { NextRequest, NextResponse } from "next/server";
import { CONFIG, ASSET_STATUSES, type AssetStatus } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetStatusHistory } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(
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
    const body = await request.json();
    const { status: targetStatus, note } = body;

    if (!targetStatus || !ASSET_STATUSES.includes(targetStatus as AssetStatus)) {
      return NextResponse.json({ error: "Invalid target status" }, { status: 400 });
    }

    const [current] = await db
      .select()
      .from(assets)
      .where(eq(assets.id, assetId));

    if (!current) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const overrideReason = `Manual Override by user: ${note || "No custom note provided"}`;

    await db.transaction(async (tx) => {
      await tx
        .update(assets)
        .set({ status: targetStatus, updatedAt: new Date() })
        .where(eq(assets.id, assetId));

      await tx.insert(assetStatusHistory).values({
        assetId: current.id,
        fromStatus: current.status,
        toStatus: targetStatus,
        reason: overrideReason,
      });
    });

    return NextResponse.json({
      success: true,
      assetId,
      newStatus: targetStatus,
      reason: overrideReason,
    });
  } catch (err: unknown) {
    console.error("Manual override error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Manual override failed" },
      { status: 500 }
    );
  }
}

