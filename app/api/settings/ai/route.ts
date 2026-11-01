import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentKey = process.env.GEMINI_API_KEY || "";
  const currentModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const isDummy = !currentKey || currentKey.startsWith("dummy") || currentKey.includes("Sample");

  const maskedKey = isDummy
    ? "dummy_key_local (Simulation Mode Active)"
    : `${currentKey.slice(0, 6)}...${currentKey.slice(-4)}`;

  return NextResponse.json({
    model: currentModel,
    isDummy,
    status: isDummy ? "simulation" : "live",
    maskedKey,
  });
}

export async function POST(request: NextRequest) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { apiKey, model } = body;

    const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
    const trimmedModel = typeof model === "string" && model.trim() ? model.trim() : "gemini-1.5-flash";

    if (trimmedKey) {
      process.env.GEMINI_API_KEY = trimmedKey;
    }
    process.env.GEMINI_MODEL = trimmedModel;

    // Update .env.local file
    const envPath = path.join(process.cwd(), ".env.local");
    try {
      let content = "";
      try {
        content = await fs.readFile(envPath, "utf-8");
      } catch {
        content = "";
      }

      if (trimmedKey) {
        if (/GEMINI_API_KEY=.*/.test(content)) {
          content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY="${trimmedKey}"`);
        } else {
          content += `\nGEMINI_API_KEY="${trimmedKey}"`;
        }
      }

      if (/GEMINI_MODEL=.*/.test(content)) {
        content = content.replace(/GEMINI_MODEL=.*/, `GEMINI_MODEL="${trimmedModel}"`);
      } else {
        content += `\nGEMINI_MODEL="${trimmedModel}"`;
      }

      await fs.writeFile(envPath, content.trim() + "\n", "utf-8");
    } catch (fsErr) {
      console.warn("Could not write to .env.local:", fsErr);
    }

    const isDummy = !process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.startsWith("dummy");

    return NextResponse.json({
      success: true,
      status: isDummy ? "simulation" : "live",
      model: process.env.GEMINI_MODEL,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || "Failed to update AI settings" },
      { status: 500 }
    );
  }
}
