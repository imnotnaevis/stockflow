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
    const [templateRevenue, earnings] = await Promise.all([
      localStore.getTemplateRevenue(),
      localStore.getEarnings(),
    ]);

    const totalRevenue = templateRevenue.reduce((acc, t) => acc + t.totalRevenue, 0);
    const totalDownloads = templateRevenue.reduce((acc, t) => acc + t.totalDownloads, 0);

    return NextResponse.json({
      templateRevenue,
      earningsCount: earnings.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalDownloads,
    });
  } catch (err: unknown) {
    console.error("Earnings query error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

