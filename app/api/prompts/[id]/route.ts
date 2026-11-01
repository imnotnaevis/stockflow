import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const body = await request.json();
    const { createNewVersion, ...updates } = body;

    const updated = await localStore.updatePrompt(id, updates, Boolean(createNewVersion));
    if (!updated) {
      return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, prompt: updated });
  } catch (err: unknown) {
    console.error("Prompt update error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sessionCookie = request.cookies.get(CONFIG.AUTH.COOKIE_NAME)?.value;
  const session = await verifySessionToken(sessionCookie);
  if (!session?.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;
    const deleted = await localStore.deletePrompt(id);
    if (!deleted) {
      return NextResponse.json({ error: "Prompt template not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Prompt delete error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

