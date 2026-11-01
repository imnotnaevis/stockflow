import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { db, productionThemes, assetSeries } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const themes = await db.select().from(productionThemes);
    const series = await db.select().from(assetSeries);

    return NextResponse.json({ themes, series });
  } catch (err: unknown) {
    console.warn("Could not fetch themes/series:", err);
    return NextResponse.json({ themes: [], series: [] });
  }
}

