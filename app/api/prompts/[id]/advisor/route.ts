import { NextRequest, NextResponse } from "next/server";
import { CONFIG } from "@/lib/config";
import { verifySessionToken } from "@/lib/auth";
import { localStore } from "@/lib/store";
import { suggestPromptImprovements } from "@/lib/gemini";

export async function POST(
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
    const body = await request.json().catch(() => ({}));
    const applyAsNewVersion = Boolean(body?.applyAsNewVersion);

    // 1. Fetch template
    const prompts = await localStore.getPrompts();
    const template = prompts.find((p) => p.id === id);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // 2. Fetch rejections for this template
    const rejections = await localStore.getRejections();
    const templateRejections = rejections.filter((r) => r.templateId === id);

    // Count taxonomies
    const taxonomyCounts = new Map<string, { label: string; count: number; notes: string[] }>();
    for (const r of templateRejections) {
      const existing = taxonomyCounts.get(r.taxonomyCode) || {
        label: r.taxonomyLabel,
        count: 0,
        notes: [],
      };
      existing.count += 1;
      if (r.notes) existing.notes.push(r.notes);
      taxonomyCounts.set(r.taxonomyCode, existing);
    }

    const rejectionHistory = Array.from(taxonomyCounts.entries()).map(([code, item]) => ({
      code,
      label: item.label,
      count: item.count,
      notes: item.notes.slice(0, 3).join("; "),
    }));

    // 3. Ask Gemini Prompt Advisor
    const suggestion = await suggestPromptImprovements({
      templateName: template.name,
      promptText: template.promptText,
      negativePrompt: template.negativePrompt,
      commercialIntent: template.commercialIntent,
      rejectionHistory,
    });

    let newVersionTemplate = null;

    // 4. If requested, save as new template version (NEVER overwrite original)
    if (applyAsNewVersion) {
      newVersionTemplate = await localStore.updatePrompt(
        template.id,
        {
          promptText: suggestion.improvedPrompt,
          negativePrompt: suggestion.improvedNegativePrompt,
          notes: `${suggestion.versionNote} | Rationale: ${suggestion.rationale}`,
        },
        true // createNewVersion = true
      );
    }

    return NextResponse.json({
      success: true,
      originalTemplate: template,
      rejectionCount: templateRejections.length,
      suggestion,
      newVersionCreated: Boolean(newVersionTemplate),
      newVersionTemplate,
    });
  } catch (err: unknown) {
    console.error("Prompt Advisor error:", err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

