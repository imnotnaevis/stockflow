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
    const prompts = await localStore.getPrompts();
    return NextResponse.json({ prompts });
  } catch (err: unknown) {
    console.error("Prompts fetch error:", err);
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
    const { name, promptText, negativePrompt, commercialIntent, notes, parameters } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Prompt name is required" }, { status: 400 });
    }
    if (!promptText || !promptText.trim()) {
      return NextResponse.json({ error: "Prompt text is required" }, { status: 400 });
    }

    const created = await localStore.createPrompt({
      name: name.trim(),
      promptText: promptText.trim(),
      negativePrompt: negativePrompt?.trim() || null,
      commercialIntent: commercialIntent?.trim() || null,
      notes: notes?.trim() || null,
      version: 1,
      parentId: null,
      isLatest: true,
      parameters: parameters || {},
    });

    return NextResponse.json({ success: true, prompt: created });
  } catch (err: unknown) {
    console.error("Prompt creation error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

