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
    const series = await localStore.getSeries();
    return NextResponse.json({ series });
  } catch (err: unknown) {
    console.error("Series fetch error:", err);
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
    const { themeId, title, maxQuota, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Series title is required" }, { status: 400 });
    }

    const quota = Number(maxQuota) || 50;
    const created = await localStore.createSeries({
      themeId: themeId || null,
      title: title.trim(),
      maxQuota: quota,
      currentCount: 0,
      status: "active",
      description: description?.trim() || "",
    });

    return NextResponse.json({ success: true, series: created });
  } catch (err: unknown) {
    console.error("Series creation error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

