import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, appSettings } from "@/lib/db";
import { eq } from "drizzle-orm";
import { DEFAULT_BRAND_BLACKLIST } from "@/lib/validator";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let customBrands: string[] = [];
    try {
      const [setting] = await db
        .select()
        .from(appSettings)
        .where(eq(appSettings.key, "brand_blacklist"));

      if (setting && Array.isArray(setting.value)) {
        customBrands = setting.value as string[];
      }
    } catch {
      // Local dev DB offline
    }

    const allBrands = Array.from(
      new Set([...DEFAULT_BRAND_BLACKLIST, ...customBrands])
    ).sort();

    return NextResponse.json({
      defaultBrands: Array.from(DEFAULT_BRAND_BLACKLIST),
      customBrands,
      allBrands,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to fetch brand blacklist" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { brands } = body;

    if (!Array.isArray(brands)) {
      return NextResponse.json(
        { error: "brands must be an array of strings" },
        { status: 400 }
      );
    }

    const cleaned = Array.from(
      new Set(brands.map((b: string) => b.trim().toLowerCase()).filter(Boolean))
    );

    try {
      await db
        .insert(appSettings)
        .values({
          key: "brand_blacklist",
          value: cleaned,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: cleaned,
            updatedAt: new Date(),
          },
        });
    } catch (dbErr) {
      console.warn("Could not save settings to DB:", dbErr);
    }

    return NextResponse.json({ success: true, customBrands: cleaned });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update brand blacklist" },
      { status: 500 }
    );
  }
}

