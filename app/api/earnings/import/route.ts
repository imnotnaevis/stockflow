import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { rows } = body;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array is required" }, { status: 400 });
    }

    const result = await localStore.importEarnings(rows);

    return NextResponse.json({
      success: true,
      importedCount: result.importedCount,
      matchedCount: result.matchedCount,
    });
  } catch (err: unknown) {
    console.error("Earnings import error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

