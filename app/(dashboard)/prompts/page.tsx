"use client";

import { useEffect, useState } from "react";
import {
  Terminal,
  Plus,
  Copy,
  Check,
  Layers,
  Sparkles,
  GitBranch,
  Edit2,
  Trash2,
  AlertCircle,
  Search,
  X,
  Gauge,
  Bot,
  ShieldCheck,
  Tag,
  Wand2,
  Camera,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import type { PromptTemplateRecord, SeriesRecord, ThemeRecord } from "@/lib/store";

interface SeriesWithUsage extends SeriesRecord {
  usagePct: number;
  isWarning: boolean;
  isOverQuota: boolean;
}

interface GeminiAgentPrompt {
  id: string;
  name: string;
  role: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  model: string;
  temperature: string;
  purpose: string;
  systemInstruction: string;
  userPromptTemplate: string;
  outputFormat: string;
  exampleUse: string;
}

const GEMINI_AGENTS_LIBRARY: GeminiAgentPrompt[] = [
  {
    id: "agent-qc-inspector",
    name: "Gemini Vision Quality Inspector",
    role: "Adobe Stock QC & IP Moderation Gatekeeper",
    icon: ShieldCheck,
    accentColor: "border-pastel-lavenderDeep/40",
    badgeBg: "bg-pastel-lavender/60 border-pastel-lavender",
    badgeText: "text-pastel-lavenderDeep",
    model: "gemini-1.5-flash or gemini-2.0-flash",
    temperature: "0.0 (Strict / Deterministic)",
    purpose:
      "Performs automated optical inspection of generative images: scores sharpness (0-100), detects AI morphological distortions (extra fingers, asymmetrical eyes, melted textures), measures usable copy-space percentage, and flags intellectual property / brand trademark violations.",
    systemInstruction: `You are an elite Adobe Stock quality control inspection inspector.
Evaluate the stock photograph/illustration strictly against Adobe Stock technical and commercial review guidelines:
1. Sharpness: Evaluate focus, micro-contrast, edge sharpness (0 to 100). Stock requires sharp focus on the main subject.
2. Artifacts: Look for AI generation distortions (morphed fingers, asymmetric eyes, weird melted textures), sensor noise, color banding, edge halos, or over-sharpening halos.
3. Copy Space: Stock buyers need empty/uncluttered space to overlay typography or graphics.
4. IP Risk: Strict zero-tolerance for recognizable logos (Apple, Nike, BMW, etc.), trademarks, protected character designs, or non-incidental private property.
5. Overall Pass: Set to true ONLY if image has NO severe artifacts, NO medium/high IP risk, and adequate technical clarity for Adobe Stock buyers.`,
    userPromptTemplate: `Analyze the attached stock image against Adobe Stock commercial guidelines and output strict JSON:
{
  "sharpness": 88,
  "artifacts": [
    { "type": "slight compression", "location": "corners", "severity": "low" }
  ],
  "copy_space": {
    "usable": true,
    "percent": 35,
    "position": "upper right quadrant"
  },
  "ip_risk": {
    "level": "low",
    "reasons": []
  },
  "overall_pass": true,
  "short_reasons": [
    "Tack sharp focal plane on main subject.",
    "Zero commercial logos or recognizable trademarks.",
    "Clean copy space suitable for marketing typography."
  ]
}`,
    outputFormat: "Structured JSON conforming to Gemini Quality Schema",
    exampleUse: "Automatically triggered on image upload or via 'Run QC Inspection' button.",
  },
  {
    id: "agent-seo-metadata",
    name: "Adobe Stock SEO & Metadata Specialist",
    role: "Commercial Title & Keywords Ranking Architect",
    icon: Tag,
    accentColor: "border-pastel-blueDeep/40",
    badgeBg: "bg-pastel-blue/60 border-pastel-blue",
    badgeText: "text-pastel-blueDeep",
    model: "gemini-1.5-flash",
    temperature: "0.0 (Deterministic Ranking)",
    purpose:
      "Generates commercial titles (maximum 70 characters, no commas, zero AI buzzwords) and 15–35 buyer search keywords ranked by purchase intent. Enforces Adobe's critical rule: positions 1 to 10 must contain substantive title words.",
    systemInstruction: `You are a master Adobe Stock SEO metadata specialist.
Generate commercial stock metadata strictly adhering to Adobe guidelines:
1. Title: Descriptive, literal, commercial. MAXIMUM 70 CHARACTERS. DO NOT USE COMMAS IN THE TITLE.
2. Never mention "AI", "generative AI", model names, prompts, or software platforms.
3. Keywords: 20 to 30 highly relevant search tags ordered strictly by commercial buyer intent.
4. CRITICAL RULE: Positions 1 to 10 of the keywords MUST contain the substantive key words from your title.
5. Category: Choose the single best Adobe Stock category ID from 1 to 21.`,
    userPromptTemplate: `Analyze this image concept and generate compliant commercial stock metadata in JSON:
{
  "title": "Scenic Alpine Lake In Autumn Mountain Valley",
  "keywords": [
    "lake", "mountain", "alpine", "autumn", "valley",
    "scenic", "nature", "landscape", "outdoor", "reflection",
    "water", "sky", "wilderness", "forest", "peaceful",
    "serene", "tranquil", "morning", "sunlight", "view"
  ],
  "categoryId": 11
}`,
    outputFormat: "JSON containing title, keywords array, categoryId",
    exampleUse: "Triggered in Right Drawer via 'Generate with Gemini'.",
  },
  {
    id: "agent-prompt-advisor",
    name: "AI Prompt Advisor & Rejection Solver",
    role: "Moderation Diagnostics & Prompt Optimizer",
    icon: Wand2,
    accentColor: "border-pastel-yellowDeep/40",
    badgeBg: "bg-pastel-yellow/60 border-pastel-yellow",
    badgeText: "text-pastel-yellowDeep",
    model: "gemini-1.5-pro (Deep Reasoning)",
    temperature: "0.2 (Focused Creative Advice)",
    purpose:
      "Analyzes rejection logs (SIMILAR_CONTENT, TECHNICAL_ISSUES, INTELLECTUAL_PROPERTY), diagnoses the visual failure mode, and generates an optimized prompt version with fortified optical terms and negative prompt constraints.",
    systemInstruction: `You are a veteran Adobe Stock contributor and generative AI prompt engineer.
Your task is to analyze why an AI-generated stock image was rejected by Adobe Stock moderation, and rewrite the prompt to guarantee high commercial licensability.

When addressing:
- TECHNICAL_ISSUES: Add optical sharpness constraints ("tack sharp focal plane, clean 8k resolution, natural depth of field, 85mm f/2.8 lens, ISO 100") and fortify negative prompt against blur, noise, chromatic aberration, and melted textures.
- SIMILAR_CONTENT: Differentiate subject angles, unique environmental styling, distinct color palettes, and alternative composition to avoid repetitive generative series spam.
- INTELLECTUAL_PROPERTY: Remove all branded silhouettes, proprietary automotive grills, copyrighted logos, and trademarked architecture. Replace with generic, bespoke minimalist design.`,
    userPromptTemplate: `Base Prompt: "[INPUT_PROMPT]"
Rejection Code: [TAXONOMY_CODE e.g. SIMILAR_CONTENT or TECHNICAL_ISSUES]
Moderator Notes: [REJECTION_REASONS]

Output improved prompt, negative prompt, and rationale:
{
  "improvedPrompt": "...",
  "improvedNegativePrompt": "...",
  "rationale": "...",
  "versionNote": "..."
}`,
    outputFormat: "JSON with improvedPrompt, improvedNegativePrompt, and rationale",
    exampleUse: "Triggered on Rejections page or Prompts page via 'Prompt Advisor'.",
  },
  {
    id: "agent-commercial-concept",
    name: "Commercial Stock Photography Prompt Architect",
    role: "Midjourney, Flux & Imagen Visual Concept Director",
    icon: Camera,
    accentColor: "border-pastel-sageDeep/40",
    badgeBg: "bg-pastel-sage/60 border-pastel-sage",
    badgeText: "text-pastel-sageDeep",
    model: "gemini-1.5-pro or gemini-2.5-flash",
    temperature: "0.7 (Creative & Diverse)",
    purpose:
      "Generates hyper-realistic commercial stock photography prompts tailored for Midjourney v6.1, Flux.1, and Google Imagen 3. Formulates precise studio lighting, lens selection, candid human emotion, intentional negative copy space, and clean negative prompts.",
    systemInstruction: `You are a world-class Commercial Stock Photography Art Director specializing in creating high-earning prompts for Midjourney v6.1, Flux.1, and Google Imagen 3.

Guidelines for Maximum Adobe Stock Licensing:
1. Composition: Apply rule of thirds with intentional negative copy space (left or right third) for designers to place ad typography.
2. Lighting: Specify realistic commercial lighting setups (e.g. "diffuse Profoto softbox lighting, gentle Rembrandt rim light, golden hour natural backlight").
3. Camera & Optics: Specify professional medium format camera aesthetics (e.g. "shot on Hasselblad H6D-100c, 85mm prime lens, f/2.8, ISO 64, crisp micro-contrast, zero sensor noise").
4. Human Subjects: Direct authentic candid emotion, natural skin micro-texture with pores (no plastic/waxy AI skin), diverse representation, professional attire without brand logos.
5. Format: Output clean prompt text + negative prompt + recommended aspect ratio (--ar 16:9 or --ar 4:3).`,
    userPromptTemplate: `Generate 3 commercial stock photo concepts for [NICHE / THEME, e.g. "Sustainable Energy Engineering Team"]:

For each concept specify:
1. Concept Title & Commercial Buyer Use Case
2. Exact AI Prompt (Lighting, Camera, Subject, Setting, Copy-Space, Aspect Ratio)
3. Fortified Negative Prompt
4. Recommended Adobe Stock Category`,
    outputFormat: "Structured concept briefs with ready-to-paste generative AI prompts",
    exampleUse: "Use to feed Midjourney / Flux to generate clean, high-selling commercial assets.",
  },
  {
    id: "agent-seasonal-strategist",
    name: "Adobe Stock Seasonal Trend Strategist",
    role: "Quarterly H-90 Holiday Window Planner",
    icon: Calendar,
    accentColor: "border-pastel-peachDeep/40",
    badgeBg: "bg-pastel-peach/60 border-pastel-peach",
    badgeText: "text-pastel-peachDeep",
    model: "gemini-1.5-flash",
    temperature: "0.3 (Strategic Analysis)",
    purpose:
      "Analyzes calendar quarters and upcoming holidays to identify H-90 buyer surge windows. Recommends top-converting visual themes, prop checklists, and color palettes 30 to 90 days before holidays occur.",
    systemInstruction: `You are an Adobe Stock Contributor Campaign Strategist.
Given a target holiday or quarter (H-90 buying window):
1. Identify the top 5 high-demand commercial niches buyers are searching for 30-90 days before the event.
2. Outline specific props, color palettes, and models needed.
3. Formulate the exact visual concepts that avoid over-saturated stock clichés.
4. Provide negative copy-space placement recommendations for hero banner usage.`,
    userPromptTemplate: `Target Window: [QUARTER OR HOLIDAY, e.g. "Q4 Holiday & Black Friday Shopping Surge"]

Generate a strategic production blueprint:
1. Top 5 High-Demand Visual Sub-Niches
2. Prop & Color Palette Checklist
3. 3 Ready-to-Generate Commercial Prompts with Copy-Space
4. Submission Deadline Timeline (H-90 to H-30)`,
    outputFormat: "Strategic production blueprint and action timeline",
    exampleUse: "Use to plan weekly batch uploads aligned with Adobe Stock buyer cycles.",
  },
];

export default function PromptsAndSeriesPage() {
  const [activeTab, setActiveTab] = useState<"gemini_agents" | "prompts" | "series">("gemini_agents");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Prompts State
  const [prompts, setPrompts] = useState<PromptTemplateRecord[]>([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchPrompt, setSearchPrompt] = useState("");
  const [intentFilter, setIntentFilter] = useState("all");

  // Prompt Form State
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptTemplateRecord | null>(null);
  const [isNewVersionMode, setIsNewVersionMode] = useState(false);
  const [pName, setPName] = useState("");
  const [pPromptText, setPPromptText] = useState("");
  const [pNegativePrompt, setPNegativePrompt] = useState("");
  const [pCommercialIntent, setPCommercialIntent] = useState("");
  const [pNotes, setPNotes] = useState("");
  const [submittingPrompt, setSubmittingPrompt] = useState(false);
  const [promptError, setPromptError] = useState("");

  // Series State
  const [seriesList, setSeriesList] = useState<SeriesWithUsage[]>([]);
  const [themesList, setThemesList] = useState<ThemeRecord[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  // Series Form State
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState(false);
  const [editingSeries, setEditingSeries] = useState<SeriesWithUsage | null>(null);
  const [sTitle, setSTitle] = useState("");
  const [sThemeId, setSThemeId] = useState("");
  const [sMaxQuota, setSMaxQuota] = useState(50);
  const [sDescription, setSDescription] = useState("");
  const [submittingSeries, setSubmittingSeries] = useState(false);
  const [seriesError, setSeriesError] = useState("");

  const copyAgentText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadPrompts = async () => {
    try {
      setLoadingPrompts(true);
      const res = await fetch("/api/prompts");
      if (res.ok) {
        const data = await res.json();
        setPrompts(data.prompts || []);
      }
    } catch (err) {
      console.error("Failed to load prompts:", err);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const loadSeries = async () => {
    try {
      setLoadingSeries(true);
      const res = await fetch("/api/series");
      if (res.ok) {
        const data = await res.json();
        setSeriesList(data.series || []);
      }
      const tRes = await fetch("/api/themes");
      if (tRes.ok) {
        const tData = await tRes.json();
        setThemesList(tData.themes || []);
      }
    } catch (err) {
      console.error("Failed to load series:", err);
    } finally {
      setLoadingSeries(false);
    }
  };

  useEffect(() => {
    loadPrompts();
    loadSeries();
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreatePrompt = () => {
    setEditingPrompt(null);
    setIsNewVersionMode(false);
    setPName("");
    setPPromptText("");
    setPNegativePrompt(
      "deformed, blurry, watermark, text, signature, low quality, oversaturated, noisy, artifacts"
    );
    setPCommercialIntent("Hero Background / Ad Banner");
    setPNotes("");
    setPromptError("");
    setIsPromptModalOpen(true);
  };

  const openEditPrompt = (p: PromptTemplateRecord, newVersion = false) => {
    setEditingPrompt(p);
    setIsNewVersionMode(newVersion);
    setPName(p.name);
    setPPromptText(p.promptText);
    setPNegativePrompt(p.negativePrompt || "");
    setPCommercialIntent(p.commercialIntent || "Hero Background / Ad Banner");
    setPNotes(p.notes || "");
    setPromptError("");
    setIsPromptModalOpen(true);
  };

  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pPromptText.trim()) {
      setPromptError("Name and Prompt Text are required.");
      return;
    }

    try {
      setSubmittingPrompt(true);
      setPromptError("");

      const payload = {
        name: pName.trim(),
        promptText: pPromptText.trim(),
        negativePrompt: pNegativePrompt.trim(),
        commercialIntent: pCommercialIntent.trim(),
        notes: pNotes.trim(),
        createNewVersion: isNewVersionMode,
      };

      if (editingPrompt) {
        const res = await fetch(`/api/prompts/${editingPrompt.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update prompt");
      } else {
        const res = await fetch("/api/prompts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create prompt");
      }

      setIsPromptModalOpen(false);
      await loadPrompts();
    } catch (err) {
      setPromptError((err as Error).message);
    } finally {
      setSubmittingPrompt(false);
    }
  };

  const handleDeletePrompt = async (id: string, name: string) => {
    if (!confirm(`Delete prompt "${name}"?`)) return;
    try {
      const res = await fetch(`/api/prompts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPrompts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openCreateSeries = () => {
    setEditingSeries(null);
    setSTitle("");
    setSThemeId(themesList[0]?.id || "");
    setSMaxQuota(30);
    setSDescription("");
    setSeriesError("");
    setIsSeriesModalOpen(true);
  };

  const openEditSeries = (s: SeriesWithUsage) => {
    setEditingSeries(s);
    setSTitle(s.title);
    setSThemeId(s.themeId || "");
    setSMaxQuota(s.maxQuota);
    setSDescription(s.description || "");
    setSeriesError("");
    setIsSeriesModalOpen(true);
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sTitle.trim()) {
      setSeriesError("Series title is required.");
      return;
    }

    try {
      setSubmittingSeries(true);
      setSeriesError("");

      const payload = {
        title: sTitle.trim(),
        themeId: sThemeId || null,
        maxQuota: Number(sMaxQuota) || 50,
        description: sDescription.trim(),
      };

      if (editingSeries) {
        const res = await fetch(`/api/series/${editingSeries.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update series");
      } else {
        const res = await fetch("/api/series", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create series");
      }

      setIsSeriesModalOpen(false);
      await loadSeries();
    } catch (err) {
      setSeriesError((err as Error).message);
    } finally {
      setSubmittingSeries(false);
    }
  };

  const handleDeleteSeries = async (id: string, title: string) => {
    if (!confirm(`Delete series "${title}"?`)) return;
    try {
      const res = await fetch(`/api/series/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSeriesList((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPrompts = prompts.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchPrompt.toLowerCase()) ||
      p.promptText.toLowerCase().includes(searchPrompt.toLowerCase());
    const matchesIntent =
      intentFilter === "all" || p.commercialIntent === intentFilter;
    return matchesSearch && matchesIntent;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Prompts &amp; Series Engine</span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Versioned prompt templates with commercial intent tracking and series production quota meters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "prompts" ? (
            <button
              onClick={openCreatePrompt}
              className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold px-5 py-2.5 text-xs shadow-pill transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Prompt Template</span>
            </button>
          ) : (
            <button
              onClick={openCreateSeries}
              className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold px-5 py-2.5 text-xs shadow-pill transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Asset Series</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("gemini_agents")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "gemini_agents"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <Bot className="h-3.5 w-3.5 text-pastel-lavender" />
          <span>Gemini AI Agents Suite (5)</span>
        </button>

        <button
          onClick={() => setActiveTab("prompts")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "prompts"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5 text-pastel-yellowDeep" />
          <span>Prompt Templates ({prompts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("series")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "series"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <Gauge className="h-3.5 w-3.5 text-pastel-blueDeep" />
          <span>Series &amp; Quotas ({seriesList.length})</span>
        </button>
      </div>

      {/* ================= TAB 0: GEMINI AI AGENTS SUITE ================= */}
      {activeTab === "gemini_agents" && (
        <div className="space-y-6">
          {/* Banner */}
          <div className="rounded-3xl border border-base-border bg-gradient-to-r from-pastel-lavender/30 via-pastel-blue/20 to-pastel-yellow/20 p-6 shadow-soft">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-charcoal-900" />
                  <h2 className="text-base font-bold text-charcoal-900">
                    Google Gemini Commercial AI Agents Suite
                  </h2>
                </div>
                <p className="text-xs text-charcoal-muted max-w-2xl leading-relaxed">
                  Production-grade prompts engineered specifically to satisfy Adobe Stock&apos;s strict commercial moderation, metadata ranking algorithms, and buyer license demand. Copy any prompt directly to Google AI Studio or use them in your generation pipeline.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-3 py-1.5 rounded-full bg-white border border-base-border text-charcoal-900 font-semibold shadow-pill">
                  5 Specialized Agents
                </span>
              </div>
            </div>
          </div>

          {/* Agents List */}
          <div className="grid grid-cols-1 gap-6">
            {GEMINI_AGENTS_LIBRARY.map((agent) => {
              const Icon = agent.icon;
              const isSysCopied = copiedKey === `${agent.id}-sys`;
              const isUserCopied = copiedKey === `${agent.id}-usr`;

              return (
                <div
                  key={agent.id}
                  className="rounded-3xl border border-base-border bg-white p-6 shadow-soft hover:shadow-softHover transition-all space-y-5"
                >
                  {/* Top Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-base-border pb-4">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-base-bg border border-base-border flex items-center justify-center flex-shrink-0 shadow-sm text-charcoal-900">
                        <Icon className="w-5 h-5 text-charcoal-900" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-charcoal-900">
                            {agent.name}
                          </h3>
                          <span
                            className={`px-3 py-0.5 rounded-full text-[11px] font-bold border ${agent.badgeBg} ${agent.badgeText}`}
                          >
                            {agent.role}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-muted mt-1 leading-relaxed max-w-3xl">
                          {agent.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:items-end gap-1 flex-shrink-0 text-xs">
                      <span className="font-mono text-charcoal-900 font-semibold bg-base-bg px-2.5 py-1 rounded-full border border-base-border">
                        {agent.model}
                      </span>
                      <span className="text-[11px] text-charcoal-muted">
                        Temp: {agent.temperature}
                      </span>
                    </div>
                  </div>

                  {/* Prompts Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* System Instruction */}
                    <div className="space-y-2 flex flex-col justify-between rounded-2xl border border-base-border bg-base-bg/60 p-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
                            <Terminal className="h-3.5 w-3.5 text-charcoal-muted" />
                            <span>System Instruction (Agent Persona)</span>
                          </span>
                          <button
                            onClick={() => copyAgentText(`${agent.id}-sys`, agent.systemInstruction)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white border border-base-border hover:bg-base-cardWarm text-charcoal-900 transition-all cursor-pointer shadow-xs"
                          >
                            {isSysCopied ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy System Prompt</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-charcoal-700 bg-white p-3.5 rounded-xl border border-base-border whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
                          {agent.systemInstruction}
                        </pre>
                      </div>

                      <div className="pt-2 text-[11px] text-charcoal-muted flex items-center justify-between">
                        <span>Format: {agent.outputFormat}</span>
                      </div>
                    </div>

                    {/* User Prompt Template */}
                    <div className="space-y-2 flex flex-col justify-between rounded-2xl border border-base-border bg-base-bg/60 p-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-charcoal-muted" />
                            <span>User Prompt Template &amp; JSON Output</span>
                          </span>
                          <button
                            onClick={() => copyAgentText(`${agent.id}-usr`, agent.userPromptTemplate)}
                            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-white border border-base-border hover:bg-base-cardWarm text-charcoal-900 transition-all cursor-pointer shadow-xs"
                          >
                            {isUserCopied ? (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                <span className="text-emerald-700 font-bold">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                <span>Copy User Prompt</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="text-xs font-mono text-charcoal-700 bg-white p-3.5 rounded-xl border border-base-border whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
                          {agent.userPromptTemplate}
                        </pre>
                      </div>

                      <div className="pt-2 text-[11px] text-charcoal-muted flex items-center justify-between">
                        <span>Workflow: {agent.exampleUse}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= TAB 1: PROMPTS ================= */}
      {activeTab === "prompts" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-charcoal-muted" />
              <input
                type="text"
                placeholder="Search templates by title or prompt keywords..."
                value={searchPrompt}
                onChange={(e) => setSearchPrompt(e.target.value)}
                className="w-full rounded-full border border-base-border bg-white pl-9 pr-4 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted shadow-pill focus:outline-none"
              />
            </div>

            <select
              value={intentFilter}
              onChange={(e) => setIntentFilter(e.target.value)}
              className="rounded-full border border-base-border bg-white px-4 py-2 text-xs text-charcoal-900 shadow-pill focus:outline-none"
            >
              <option value="all">All Commercial Intents</option>
              <option value="Hero Background / Ad Banner">Hero Background / Ad Banner</option>
              <option value="Tech Website Hero">Tech Website Hero</option>
              <option value="Graphic Design Copy-Space">Graphic Design Copy-Space</option>
              <option value="Editorial Lifestyle">Editorial Lifestyle</option>
            </select>
          </div>

          {/* Prompts Grid */}
          {loadingPrompts ? (
            <div className="py-16 text-center text-charcoal-muted text-sm bg-white rounded-3xl border border-base-border shadow-soft">
              Loading prompts...
            </div>
          ) : filteredPrompts.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-base-border rounded-3xl p-8 bg-white shadow-soft">
              <Terminal className="h-8 w-8 text-charcoal-muted mx-auto mb-2" />
              <p className="text-charcoal-muted text-sm">No prompt templates found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredPrompts.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl border border-base-border bg-white p-6 shadow-soft hover:shadow-softHover transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-pastel-lavender/60 text-charcoal-900 font-semibold">
                          v{item.version}
                        </span>
                        {item.isLatest && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-readyBg text-status-readyText border border-status-readyBorder font-medium">
                            Latest
                          </span>
                        )}
                      </div>

                      <span className="text-xs px-3 py-1 rounded-full bg-base-cardWarm text-charcoal-muted border border-base-border">
                        {item.commercialIntent || "General Commercial"}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-charcoal-900">{item.name}</h3>

                    {/* Positive Prompt Text Box */}
                    <div className="relative rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                          Positive Prompt
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.promptText, item.id + "_pos")}
                          className="inline-flex items-center gap-1 text-[11px] text-charcoal-muted hover:text-charcoal-900 transition-colors cursor-pointer"
                        >
                          {copiedId === item.id + "_pos" ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-charcoal-900 font-mono leading-relaxed line-clamp-3">
                        {item.promptText}
                      </p>
                    </div>

                    {/* Negative Prompt Box */}
                    {item.negativePrompt && (
                      <div className="relative rounded-2xl border border-base-border bg-pastel-lavender/10 p-3.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-charcoal-muted">
                            Negative Prompt
                          </span>
                          <button
                            onClick={() => copyToClipboard(item.negativePrompt!, item.id + "_neg")}
                            className="inline-flex items-center gap-1 text-[11px] text-charcoal-muted hover:text-charcoal-900 transition-colors cursor-pointer"
                          >
                            {copiedId === item.id + "_neg" ? (
                              <>
                                <Check className="h-3 w-3 text-emerald-600" />
                                <span className="text-emerald-600 font-medium">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-charcoal-muted font-mono leading-relaxed line-clamp-2">
                          {item.negativePrompt}
                        </p>
                      </div>
                    )}

                    {item.notes && (
                      <p className="text-xs text-charcoal-muted italic">
                        💡 {item.notes}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-base-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditPrompt(item, true)}
                        className="inline-flex items-center gap-1 text-xs text-charcoal-900 hover:text-charcoal-700 font-semibold rounded-full bg-base-cardWarm px-3 py-1 border border-base-border"
                      >
                        <GitBranch className="h-3 w-3" />
                        <span>Branch (v{item.version + 1})</span>
                      </button>

                      <a
                        href="/rejections"
                        className="inline-flex items-center gap-1 text-xs text-charcoal-900 hover:text-charcoal-700 font-semibold rounded-full bg-pastel-lavender/40 px-3 py-1 border border-base-border"
                      >
                        <Sparkles className="h-3 w-3" />
                        <span>AI Advisor</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditPrompt(item, false)}
                        className="p-2 rounded-full text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
                        title="Edit in-place"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePrompt(item.id, item.name)}
                        className="p-2 rounded-full text-charcoal-muted hover:text-rose-600 hover:bg-base-cardWarm"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: SERIES MANAGEMENT & QUOTA METERS ================= */}
      {activeTab === "series" && (
        <div className="space-y-6">
          {/* Series Explainer Banner */}
          <div className="rounded-3xl border border-base-border bg-pastel-blue/20 p-6 shadow-soft">
            <div className="flex items-start gap-4">
              <div className="h-11 w-11 rounded-2xl bg-white border border-base-border text-charcoal-900 flex items-center justify-center flex-shrink-0 shadow-pill">
                <Gauge className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-charcoal-900">Adobe Stock Series Max Quotas</h3>
                <p className="text-xs text-charcoal-muted mt-1 max-w-2xl leading-relaxed">
                  Uploading too many similar assets to a single series risks triggering Adobe Stock&apos;s strict{" "}
                  <span className="font-semibold text-charcoal-900">SIMILAR_CONTENT</span> rejection taxonomy.
                  Enforce a strict max_quota (recommended 20-50 per series) to keep portfolios fresh and diverse.
                </p>
              </div>
            </div>
          </div>

          {/* Series Cards */}
          {loadingSeries ? (
            <div className="py-16 text-center text-charcoal-muted text-sm bg-white rounded-3xl border border-base-border shadow-soft">
              Loading series...
            </div>
          ) : seriesList.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-base-border rounded-3xl p-8 bg-white shadow-soft">
              <Layers className="h-8 w-8 text-charcoal-muted mx-auto mb-2" />
              <p className="text-charcoal-muted text-sm">No asset series created yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {seriesList.map((series) => {
                const isOver = series.isOverQuota;
                const isWarn = series.isWarning;

                return (
                  <div
                    key={series.id}
                    className="rounded-3xl border border-base-border bg-white p-6 shadow-soft hover:shadow-softHover transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-3 py-1 rounded-full bg-base-cardWarm border border-base-border text-charcoal-muted">
                          Theme: {series.themeName || "Uncategorized"}
                        </span>

                        <span
                          className={`text-xs px-3 py-1 rounded-full font-semibold border ${
                            isOver
                              ? "bg-status-rejectedBg text-status-rejectedText border-status-rejectedBorder"
                              : isWarn
                              ? "bg-status-pendingBg text-status-pendingText border-status-pendingBorder"
                              : "bg-status-readyBg text-status-readyText border-status-readyBorder"
                          }`}
                        >
                          {isOver ? "Over Quota!" : isWarn ? "Near Max Quota" : "Active Quota"}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-charcoal-900">{series.title}</h3>

                      {series.description && (
                        <p className="text-xs text-charcoal-muted line-clamp-2">{series.description}</p>
                      )}

                      {/* Usage Meter */}
                      <div className="space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-charcoal-muted font-medium">Production Usage</span>
                          <span className="font-mono text-charcoal-900">
                            <span className="font-bold">{series.currentCount}</span> / {series.maxQuota} assets ({series.usagePct}%)
                          </span>
                        </div>

                        <div className="h-2.5 w-full rounded-full bg-[#EBEBE8] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver
                                ? "bg-rose-500"
                                : isWarn
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, series.usagePct)}%` }}
                          />
                        </div>

                        {isWarn && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-600 pt-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Approaching quota ceiling. Wrap up variations to prevent duplicate flags.</span>
                          </div>
                        )}
                        {isOver && (
                          <div className="flex items-center gap-1.5 text-[11px] text-rose-600 pt-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Quota exceeded! New asset uploads will trigger duplicate warnings.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 pt-3 border-t border-base-border flex items-center justify-between">
                      <span className="text-[11px] text-charcoal-muted font-mono">
                        Max Quota: {series.maxQuota} items
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditSeries(series)}
                          className="p-2 rounded-full text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
                          title="Edit Quota"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSeries(series.id, series.title)}
                          className="p-2 rounded-full text-charcoal-muted hover:text-rose-600 hover:bg-base-cardWarm"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= PROMPT MODAL ================= */}
      {isPromptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-charcoal-900">
                {isNewVersionMode
                  ? `Branch New Version for "${editingPrompt?.name}" (v${(editingPrompt?.version || 1) + 1})`
                  : editingPrompt
                  ? "Edit Prompt Template"
                  : "Create Prompt Template"}
              </h2>
              <button
                onClick={() => setIsPromptModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {promptError && (
              <div className="rounded-2xl bg-status-rejectedBg border border-status-rejectedBorder p-3 text-xs text-status-rejectedText">
                {promptError}
              </div>
            )}

            <form onSubmit={handleSavePrompt} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g., Commercial Flatlay - Festive Warmth"
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Commercial Intent *
                </label>
                <select
                  value={pCommercialIntent}
                  onChange={(e) => setPCommercialIntent(e.target.value)}
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                >
                  <option value="Hero Background / Ad Banner">Hero Background / Ad Banner</option>
                  <option value="Tech Website Hero">Tech Website Hero</option>
                  <option value="Graphic Design Copy-Space">Graphic Design Copy-Space</option>
                  <option value="Editorial Lifestyle">Editorial Lifestyle</option>
                  <option value="Packaging & Product Background">Packaging & Product Background</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Positive Prompt *
                </label>
                <textarea
                  rows={4}
                  required
                  value={pPromptText}
                  onChange={(e) => setPPromptText(e.target.value)}
                  placeholder="Subject, lighting, composition, camera style, aesthetic parameters..."
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs font-mono text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Negative Prompt
                </label>
                <textarea
                  rows={2}
                  value={pNegativePrompt}
                  onChange={(e) => setPNegativePrompt(e.target.value)}
                  placeholder="deformed, blurry, watermark, low quality, artifacts..."
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs font-mono text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Commercial Strategy Notes
                </label>
                <input
                  type="text"
                  value={pNotes}
                  onChange={(e) => setPNotes(e.target.value)}
                  placeholder="e.g., Target Q4 holiday buyers searching for cozy winter vibes"
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPromptModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPrompt}
                  className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submittingPrompt
                    ? "Saving..."
                    : isNewVersionMode
                    ? "Publish Version"
                    : editingPrompt
                    ? "Update Template"
                    : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= SERIES MODAL ================= */}
      {isSeriesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-charcoal-900">
                {editingSeries ? "Edit Asset Series" : "Create Asset Series"}
              </h2>
              <button
                onClick={() => setIsSeriesModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {seriesError && (
              <div className="rounded-2xl bg-status-rejectedBg border border-status-rejectedBorder p-3 text-xs text-status-rejectedText">
                {seriesError}
              </div>
            )}

            <form onSubmit={handleSaveSeries} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Series Title *
                </label>
                <input
                  type="text"
                  required
                  value={sTitle}
                  onChange={(e) => setSTitle(e.target.value)}
                  placeholder="e.g., Festive Flatlays & Hot Cocoa"
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Parent Theme
                  </label>
                  <select
                    value={sThemeId}
                    onChange={(e) => setSThemeId(e.target.value)}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                  >
                    <option value="">Uncategorized</option>
                    {themesList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Max Production Quota
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={sMaxQuota}
                    onChange={(e) => setSMaxQuota(Number(e.target.value))}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Visual Cohesion Description
                </label>
                <textarea
                  rows={3}
                  value={sDescription}
                  onChange={(e) => setSDescription(e.target.value)}
                  placeholder="Describe lighting mood, perspective, props, and boundary restrictions..."
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSeriesModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSeries}
                  className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submittingSeries ? "Saving..." : editingSeries ? "Update Series" : "Create Series"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
