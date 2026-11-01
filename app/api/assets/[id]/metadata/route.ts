import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetMetadata, assetKeywords } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { validateTitle, validateAndOrderKeywords } from "@/lib/validator";
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
    const [meta] = await db
      .select()
      .from(assetMetadata)
      .where(eq(assetMetadata.assetId, assetId));

    const keywords = await db
      .select()
      .from(assetKeywords)
      .where(eq(assetKeywords.assetId, assetId))
      .orderBy(asc(assetKeywords.position));

    if (meta) {
      return NextResponse.json({
        metadata: meta,
        keywords: keywords.map((k) => k.keyword),
      });
    }
  } catch (err: unknown) {
    // Database offline
  }

  // Memory fallback
  const mem = memoryAssets.find((a) => a.id === assetId);
  if (mem?.metadata) {
    return NextResponse.json({
      metadata: {
        assetId: mem.id,
        title: mem.metadata.title,
        categoryId: mem.metadata.categoryId,
      },
      keywords: mem.metadata.keywords,
    });
  }

  return NextResponse.json({ metadata: null, keywords: [] });
}

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
    const { title, keywords, categoryId } = body;

    // Validate Title
    const titleVal = validateTitle(title || "");
    if (!titleVal.isValid) {
      return NextResponse.json(
        { error: titleVal.errors.join("; "), details: titleVal.errors },
        { status: 400 }
      );
    }

    // Validate Keywords and order
    const kwVal = validateAndOrderKeywords(keywords || [], titleVal.cleaned);
    if (!kwVal.isValid) {
      return NextResponse.json(
        { error: kwVal.errors.join("; "), details: kwVal.errors },
        { status: 400 }
      );
    }

    const catId = Number(categoryId) || 11;

    try {
      await db.transaction(async (tx) => {
        // Upsert metadata
        await tx
          .insert(assetMetadata)
          .values({
            assetId,
            title: titleVal.cleaned,
            categoryId: catId,
            releaseStatus: "none_required",
          })
          .onConflictDoUpdate({
            target: assetMetadata.assetId,
            set: {
              title: titleVal.cleaned,
              categoryId: catId,
              updatedAt: new Date(),
            },
          });

        // Replace keywords
        await tx.delete(assetKeywords).where(eq(assetKeywords.assetId, assetId));

        for (let i = 0; i < kwVal.keywords.length; i++) {
          await tx.insert(assetKeywords).values({
            assetId,
            keyword: kwVal.keywords[i],
            position: i + 1,
          });
        }
      });
    } catch (dbErr) {
      console.warn("Could not save to DB:", dbErr);
    }

    // Update memory asset
    const mem = memoryAssets.find((a) => a.id === assetId);
    if (mem) {
      mem.metadata = {
        title: titleVal.cleaned,
        categoryId: catId,
        keywords: kwVal.keywords,
      };
    }

    return NextResponse.json({
      success: true,
      metadata: {
        title: titleVal.cleaned,
        keywords: kwVal.keywords,
        categoryId: catId,
      },
      substantiveTitleWordsInTop10: kwVal.substantiveTitleWordsInTop10,
    });
  } catch (err: unknown) {
    console.error("Save metadata error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save metadata" },
      { status: 500 }
    );
  }
}

