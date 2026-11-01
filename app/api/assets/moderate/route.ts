import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";
import { db, assets, assetStatusHistory, assetRejections, rejectionTaxonomies } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { assetIds, status, taxonomyCode, moderatorFeedback } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json({ error: "assetIds array is required" }, { status: 400 });
    }

    if (status !== "approved" && status !== "rejected") {
      return NextResponse.json(
        { error: "status must be 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    if (status === "rejected" && !taxonomyCode) {
      return NextResponse.json(
        { error: "Rejection taxonomy code is required when rejecting assets" },
        { status: 400 }
      );
    }

    // 1. Update in localStore
    const storeResult = await localStore.moderateAssets(
      assetIds,
      status,
      taxonomyCode,
      moderatorFeedback
    );

    // 2. Update in Postgres DB if connected
    try {
      await db.transaction(async (tx) => {
        // Update status on assets
        await tx
          .update(assets)
          .set({ status })
          .where(inArray(assets.id, assetIds));

        // Write status history
        for (const id of assetIds) {
          await tx.insert(assetStatusHistory).values({
            assetId: id,
            toStatus: status,
            reason: moderatorFeedback || `Moderator marked as ${status}`,
          });

          // Write rejection if rejected
          if (status === "rejected" && taxonomyCode) {
            const tax = await tx
              .select()
              .from(rejectionTaxonomies)
              .where(eq(rejectionTaxonomies.code, taxonomyCode))
              .limit(1);

            if (tax && tax[0]) {
              await tx.insert(assetRejections).values({
                assetId: id,
                taxonomyId: tax[0].id,
                notes: moderatorFeedback || null,
              });
            }
          }
        }
      });
    } catch (dbErr) {
      console.warn("DB update skipped or offline; local store updated:", dbErr);
    }

    return NextResponse.json({
      success: true,
      modifiedCount: storeResult.modifiedCount || assetIds.length,
      status,
      taxonomyCode: taxonomyCode || null,
    });
  } catch (err: unknown) {
    console.error("Asset moderation error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

