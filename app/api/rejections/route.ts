import { NextRequest, NextResponse } from "next/server";
import { CONFIG, REJECTION_TAXONOMY_SEEDS } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const threshold = Number(searchParams.get("threshold")) || CONFIG.PORTFOLIO.MIN_ACCEPTANCE_RATE_THRESHOLD;

    const [rejections, templateAnalysis, calibration] = await Promise.all([
      localStore.getRejections(),
      localStore.getRejectionAnalysis(threshold),
      localStore.getCalibrationMetrics(),
    ]);

    // Aggregate rejections by taxonomy
    const taxonomyCounts = new Map<string, number>();
    for (const r of rejections) {
      taxonomyCounts.set(r.taxonomyCode, (taxonomyCounts.get(r.taxonomyCode) || 0) + 1);
    }

    const taxonomyBreakdown = REJECTION_TAXONOMY_SEEDS.map((seed) => ({
      code: seed.code,
      label: seed.label,
      description: seed.description,
      count: taxonomyCounts.get(seed.code) || 0,
    }));

    return NextResponse.json({
      taxonomies: taxonomyBreakdown,
      rejections,
      templateAnalysis,
      calibration,
      threshold,
    });
  } catch (err: unknown) {
    console.error("Rejections query error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
