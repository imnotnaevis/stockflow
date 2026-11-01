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
} from "lucide-react";
import type { PromptTemplateRecord, SeriesRecord, ThemeRecord } from "@/lib/store";

interface SeriesWithUsage extends SeriesRecord {
  usagePct: number;
  isWarning: boolean;
  isOverQuota: boolean;
}

export default function PromptsAndSeriesPage() {
  const [activeTab, setActiveTab] = useState<"prompts" | "series">("prompts");

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
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab("prompts")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "prompts"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
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
          <Gauge className="h-3.5 w-3.5" />
          <span>Series &amp; Quota Meters ({seriesList.length})</span>
        </button>
      </div>

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
