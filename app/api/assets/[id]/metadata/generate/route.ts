import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, assets, assetMetadata, assetKeywords, promptTemplates } from "@/lib/db";
import { eq } from "drizzle-orm";
import { generateAssetMetadata, generateSmartSeoFromContext } from "@/lib/gemini";
import { memoryAssets } from "@/lib/memory-store";
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
  const body = await request.json().catch(() => ({}));

  try {
    // 1. Fetch Asset from DB or Memory Store
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
      const mem = memoryAssets.find((a) => a.id === assetId);
      if (mem) {
        asset = mem;
      }
    }

    if (!asset) {
      if (body?.filename || body?.blobUrl) {
        asset = {
          id: assetId,
          filename: body.filename || "asset",
          blobUrl: body.blobUrl || "",
          templateId: null,
        };
      } else {
        const uploadDir = path.join(process.cwd(), "public", "uploads");
        const uploads = await fs.readdir(uploadDir).catch(() => []);
        const latestFile = uploads[uploads.length - 1];
        asset = {
          id: assetId,
          filename: "stock_asset",
          blobUrl: latestFile ? `/uploads/${latestFile}` : "",
          templateId: null,
        };
      }
    }

    // 2. Read Image Buffer or generate from context
    let imageBuffer: Buffer | null = null;
    if (asset.blobUrl) {
      try {
        if (asset.blobUrl.startsWith("data:")) {
          const base64Part = asset.blobUrl.split(",")[1];
          imageBuffer = Buffer.from(base64Part, "base64");
        } else if (asset.blobUrl.startsWith("/uploads/")) {
          const localPath = path.join(process.cwd(), "public", asset.blobUrl);
          imageBuffer = await fs.readFile(localPath);
        } else if (asset.blobUrl.startsWith("http")) {
          const res = await fetch(asset.blobUrl);
          if (res.ok) {
            imageBuffer = Buffer.from(await res.arrayBuffer());
          }
        }
      } catch (bufErr) {
        console.warn("Could not read image buffer for asset:", bufErr);
      }
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

    // 4. Generate Metadata with Gemini or Smart Context Analyzer
    let title: string;
    let keywords: string[];
    let categoryId: number;
    let tokens = 320;
    let costUsd = 0.00012;

    if (imageBuffer) {
      const generated = await generateAssetMetadata(imageBuffer, {
        templatePrompt,
        filename: asset.filename,
      });
      title = generated.title;
      keywords = generated.keywords;
      categoryId = generated.categoryId;
      tokens = generated.tokens;
      costUsd = generated.costUsd;
    } else {
      const fallback = generateSmartSeoFromContext({
        filename: asset.filename,
        templatePrompt,
      });
      title = fallback.title;
      keywords = fallback.keywords;
      categoryId = fallback.categoryId;
    }

    // 5. Update Memory Store
    const memMatch = memoryAssets.find((a) => a.id === assetId);
    if (memMatch) {
      memMatch.metadata = { title, categoryId, keywords };
    }

    // 6. Save in database if available
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
            position: i + 1,
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

