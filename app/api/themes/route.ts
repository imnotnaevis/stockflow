import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const themes = await localStore.getThemes();
    const balance = await localStore.getCategoryQuotaBalance();

    return NextResponse.json({
      themes,
      balance,
    });
  } catch (err: unknown) {
    console.error("Themes fetch error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
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
    const { name, description, season, targetQuarter, targetEventDate, category } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Theme name is required" }, { status: 400 });
    }

    const created = await localStore.createTheme({
      name: name.trim(),
      description: description?.trim() || "",
      season: season || "All-Year",
      targetQuarter: targetQuarter || "Evergreen",
      targetEventDate: targetEventDate || null,
      category: category || "seasonal",
      isActive: true,
    });

    return NextResponse.json({ success: true, theme: created });
  } catch (err: unknown) {
    console.error("Theme creation error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

