import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetMetadata, assetKeywords, promptTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateAssetMetadata } from "@/lib/gemini";
import fs from "fs/promises";
import path from "path";

export const maxDuration = 60;

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
    // 1. Fetch Asset
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let asset: any = null;
    try {
      const [found] = await db
        .select()
        .from(assets)
        .where(eq(assets.id, assetId));
      asset = found;
    } catch {
      // Local dev DB offline
    }

    if (!asset) {
      if (assetId.startsWith("local_preview_")) {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const uploads = await fs.readdir(uploadDir).catch(() => []);
        const latestFile = uploads[uploads.length - 1];
        asset = {
          id: assetId,
          filename: "local_asset",
          blobUrl: latestFile ? `/uploads/${latestFile}` : "/uploads/sample.jpg",
          templateId: null,
        };
      } else {
        return NextResponse.json({ error: "Asset not found" }, { status: 404 });
      }
    }

    // 2. Read Image Buffer
    let imageBuffer: Buffer;
    if (asset.blobUrl.startsWith("/uploads/")) {
      const localPath = path.join(process.cwd(), "public", asset.blobUrl);
      imageBuffer = await fs.readFile(localPath);
    } else {
      const res = await fetch(asset.blobUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch image from blobUrl: ${res.statusText}`);
      }
      imageBuffer = Buffer.from(await res.arrayBuffer());
    }

    // 3. Check for prompt template context if templateId exists
    let templatePrompt: string | undefined;
    if (asset.templateId) {
      try {
        const [tpl] = await db
          .select()
          .from(promptTemplates)
          .where(eq(promptTemplates.id, asset.templateId));
        if (tpl) templatePrompt = tpl.promptText;
      } catch {
        // Ignore
      }
    }

    // 4. Generate Metadata with Gemini
    const { title, keywords, categoryId, tokens, costUsd } =
      await generateAssetMetadata(imageBuffer, { templatePrompt });

    // 5. Save in database in transaction
    try {
      await db.transaction(async (tx) => {
        // Upsert asset_metadata
        await tx
          .insert(assetMetadata)
          .values({
            assetId: asset.id,
            title,
            categoryId,
            releaseStatus: "none_required",
          })
          .onConflictDoUpdate({
            target: assetMetadata.assetId,
            set: {
              title,
              categoryId,
              updatedAt: new Date(),
            },
          });

        // Delete existing keywords and insert new ordered keywords
        await tx.delete(assetKeywords).where(eq(assetKeywords.assetId, asset.id));

        for (let i = 0; i < keywords.length; i++) {
          await tx.insert(assetKeywords).values({
            assetId: asset.id,
            keyword: keywords[i],
            position: i + 1, // 1-based indexing for Adobe Stock importance
          });
        }
      });
    } catch (dbErr) {
      console.warn("Could not save to DB (fallback memory return):", dbErr);
    }

    return NextResponse.json({
      success: true,
      assetId: asset.id,
      metadata: {
        title,
        keywords,
        categoryId,
      },
      stats: {
        tokens,
        costUsd,
      },
    });
  } catch (err: unknown) {
    console.error("Metadata generation error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to generate metadata" },
      { status: 500 }
    );
  }
}

