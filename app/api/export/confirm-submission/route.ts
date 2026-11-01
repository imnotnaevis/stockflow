import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetStatusHistory } from "@/lib/db";
import { inArray } from "drizzle-orm";

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
      return NextResponse.json({ error: "assetIds array is required" }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({ id: assets.id, status: assets.status })
        .from(assets)
        .where(inArray(assets.id, assetIds));

      await tx
        .update(assets)
        .set({ status: "submitted", updatedAt: new Date() })
        .where(inArray(assets.id, assetIds));

      for (const item of existing) {
        await tx.insert(assetStatusHistory).values({
          assetId: item.id,
          fromStatus: item.status,
          toStatus: "submitted",
          reason: "User confirmed export to Adobe Stock batch CSV. Asset marked as submitted.",
        });
      }
    });

    return NextResponse.json({ success: true, submittedCount: assetIds.length });
  } catch (err: unknown) {
    console.error("Confirm submission error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to confirm submission" },
      { status: 500 }
    );
  }
}

