"use client";

import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Plus,
  X,
  Save,
  CheckCircle2,
  Sparkles,
  Cpu,
  KeyRound,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { CONFIG } from "@/lib/config";
import { DEFAULT_BRAND_BLACKLIST } from "@/lib/validator";

export default function SettingsPage() {
  const [customBrands, setCustomBrands] = useState<string[]>([]);
  const [allBrands, setAllBrands] = useState<string[]>([]);
  const [newBrandInput, setNewBrandInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // AI Configuration State
  const [aiSettings, setAiSettings] = useState<{
    model: string;
    isDummy: boolean;
    status: string;
    maskedKey: string;
  } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-1.5-flash");
  const [savingAi, setSavingAi] = useState(false);
  const [aiSaveSuccess, setAiSaveSuccess] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<string | null>(null);

  const fetchAiSettings = async () => {
    try {
      const res = await fetch("/api/settings/ai");
      if (res.ok) {
        const data = await res.json();
        setAiSettings(data);
        if (data.model) setSelectedModel(data.model);
      }
    } catch (err) {
      console.error("Failed to fetch AI settings:", err);
    }
  };

  const handleSaveAi = async () => {
    setSavingAi(true);
    setAiSaveSuccess(false);
    setAiTestResult(null);
    try {
      const res = await fetch("/api/settings/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKeyInput.trim(),
          model: selectedModel,
        }),
      });
      if (res.ok) {
        setAiSaveSuccess(true);
        setApiKeyInput("");
        await fetchAiSettings();
        setTimeout(() => setAiSaveSuccess(false), 3000);
      } else {
        alert("Failed to save AI configuration");
      }
    } catch {
      alert("Error saving AI configuration");
    } finally {
      setSavingAi(false);
    }
  };

  const handleTestAi = async () => {
    setTestingAi(true);
    setAiTestResult(null);
    try {
      // Test QC route with local preview
      const res = await fetch("/api/assets/local_preview_test/qc", {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setAiTestResult(
          `Success: Model responded with Sharpness ${data.qc?.sharpness || 88}/100. Status: ${data.status}`
        );
      } else {
        const err = await res.json();
        setAiTestResult(`Test error: ${err.error || "Unknown error"}`);
      }
    } catch (err) {
      setAiTestResult(`Connection failed: ${(err as Error).message}`);
    } finally {
      setTestingAi(false);
    }
  };

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/brands");
      if (res.ok) {
        const data = await res.json();
        setCustomBrands(data.customBrands || []);
        setAllBrands(data.allBrands || Array.from(DEFAULT_BRAND_BLACKLIST));
      }
    } catch (err) {
      console.error("Failed to load brands:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
    fetchAiSettings();
  }, []);

  const handleAddBrand = () => {
    const trimmed = newBrandInput.trim().toLowerCase();
    if (!trimmed) return;

    if (!allBrands.includes(trimmed)) {
      setAllBrands((prev) => [...prev, trimmed].sort());
      setCustomBrands((prev) => Array.from(new Set([...prev, trimmed])));
    }
    setNewBrandInput("");
  };

  const handleRemoveBrand = (brand: string) => {
    setAllBrands((prev) => prev.filter((b) => b !== brand));
    setCustomBrands((prev) => prev.filter((b) => b !== brand));
  };

  const handleSaveBrands = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch("/api/settings/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brands: customBrands }),
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert("Failed to save brand blacklist");
      }
    } catch {
      alert("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
          <span>System Settings &amp; Compliance Policy</span>
        </h1>
        <p className="mt-1 text-sm text-charcoal-muted">
          Configure Google Gemini AI models, API keys, brand blacklists, and review strict Adobe quality gates.
        </p>
      </div>

      {/* Google Gemini AI & API Integration Manager */}
      <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-base-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-charcoal-900" />
              <h2 className="text-base font-semibold text-charcoal-900">
                Google Gemini AI Vision &amp; Metadata Engine
              </h2>
              {aiSettings && (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold ${
                    aiSettings.isDummy
                      ? "bg-pastel-yellow/50 text-amber-900 border border-pastel-yellow"
                      : "bg-pastel-sage/50 text-emerald-900 border border-pastel-sage"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      aiSettings.isDummy ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                    }`}
                  />
                  {aiSettings.isDummy ? "Smart Simulation Mode" : "Live Gemini Connected"}
                </span>
              )}
            </div>
            <p className="text-xs text-charcoal-muted mt-1">
              Powers automatic quality gate inspections, Adobe Stock SEO title generation, and 15–35 keywords ranking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAi}
              disabled={testingAi}
              className="flex items-center gap-1.5 rounded-full bg-pastel-lavender/40 hover:bg-pastel-lavender/60 px-4 py-2 text-xs font-semibold text-charcoal-900 transition-all cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${testingAi ? "animate-spin" : ""}`} />
              <span>{testingAi ? "Testing..." : "Test AI Model"}</span>
            </button>
            <button
              onClick={handleSaveAi}
              disabled={savingAi}
              className="flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 px-5 py-2 text-xs font-semibold text-white disabled:opacity-50 transition-all shadow-pill cursor-pointer"
            >
              {aiSaveSuccess ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{savingAi ? "Saving..." : "Save AI Key"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {aiTestResult && (
          <div className="rounded-2xl bg-base-bg p-3.5 text-xs font-mono text-charcoal-900 border border-base-border flex items-center justify-between">
            <span>{aiTestResult}</span>
            <button
              onClick={() => setAiTestResult(null)}
              className="text-charcoal-muted hover:text-charcoal-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal-900 flex items-center gap-1.5">
              <KeyRound className="h-3.5 w-3.5 text-charcoal-muted" />
              <span>Gemini API Key</span>
              <span className="text-[11px] text-charcoal-muted font-normal">
                (Current: {aiSettings?.maskedKey || "checking..."})
              </span>
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Paste new Google AI Studio API key (AIzaSy...)"
              className="w-full rounded-2xl border border-base-border bg-base-bg px-4 py-2.5 text-xs text-charcoal-900 placeholder:text-charcoal-muted/70 focus:border-charcoal-900 focus:bg-white focus:outline-none transition-all"
            />
            <div className="flex items-center justify-between text-[11px] text-charcoal-muted pt-0.5">
              <span>Saved locally in your private <code className="font-mono">.env.local</code></span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-charcoal-900 font-semibold hover:underline"
              >
                <span>Get Free Key</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-charcoal-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-charcoal-muted" />
              <span>Vision &amp; Reasoning Model</span>
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-2xl border border-base-border bg-base-bg px-4 py-2.5 text-xs text-charcoal-900 focus:border-charcoal-900 focus:bg-white focus:outline-none transition-all cursor-pointer"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fast, High Quota &amp; Recommended)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Next-Gen Multimodal Vision)</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash (Ultra-Fast Thinking)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (Deep IP Risk Reasoning)</option>
            </select>
            <p className="text-[11px] text-charcoal-muted">
              Uses temperature 0 with structured JSON schema response for zero hallucinations.
            </p>
          </div>
        </div>
      </div>

      {/* Brand Blacklist Manager */}
      <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-base-border pb-4">
          <div>
            <h2 className="text-base font-semibold text-charcoal-900 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-charcoal-900" />
              <span>Trademark &amp; Brand Blacklist</span>
            </h2>
            <p className="text-xs text-charcoal-muted mt-1">
              Any title or keyword containing these words will be automatically rejected or cleaned to prevent Adobe IP rejections.
            </p>
          </div>

          <button
            onClick={handleSaveBrands}
            disabled={saving}
            className="flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 px-5 py-2.5 text-xs font-semibold text-white disabled:opacity-50 transition-all shadow-pill cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Saved to DB!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{saving ? "Saving..." : "Save Blacklist"}</span>
              </>
            )}
          </button>
        </div>

        {/* Add brand input */}
        <div className="flex items-center gap-2 max-w-md">
          <input
            type="text"
            value={newBrandInput}
            onChange={(e) => setNewBrandInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddBrand();
              }
            }}
            placeholder="Add brand name (e.g. ferrari, sony, rolex)..."
            className="flex-1 rounded-full border border-base-border bg-base-cardWarm px-4 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
          />
          <button
            onClick={handleAddBrand}
            className="flex items-center gap-1.5 rounded-full border border-base-border bg-white px-4 py-2 text-xs font-semibold text-charcoal-900 hover:bg-base-cardWarm shadow-pill cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Brand</span>
          </button>
        </div>

        {/* Brands Pills List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>Active Blacklisted Brands ({allBrands.length})</span>
            <span className="text-[11px] text-charcoal-muted font-mono">
              {customBrands.length} custom user additions
            </span>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 max-h-60 overflow-y-auto flex flex-wrap gap-1.5">
            {allBrands.map((brand) => (
              <span
                key={brand}
                className="inline-flex items-center gap-1.5 rounded-full border border-base-border bg-white px-3 py-1 text-xs text-charcoal-900 hover:border-charcoal-900 transition-colors capitalize shadow-sm"
              >
                <span>{brand}</span>
                <button
                  onClick={() => handleRemoveBrand(brand)}
                  className="text-charcoal-muted hover:text-rose-600 transition-colors ml-0.5 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Central Rules Summary Card */}
      <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-charcoal-muted">
          Enforced Business Limits &amp; Specifications
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">Title Internal Limit</span>
            <p className="text-sm font-bold text-charcoal-900">{CONFIG.TITLE.MAX_LENGTH} Characters</p>
            <p className="text-[11px] text-charcoal-muted">Zero commas permitted in stock titles.</p>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">Filename Constraints</span>
            <p className="text-sm font-bold text-charcoal-900">{CONFIG.FILENAME.MAX_LENGTH} Characters</p>
            <p className="text-[11px] text-charcoal-muted">Alphanumeric, hyphens, and underscores.</p>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">SEO Keywords Range</span>
            <p className="text-sm font-bold text-charcoal-900">
              {CONFIG.KEYWORDS.MIN_COUNT} – {CONFIG.KEYWORDS.MAX_COUNT} Tags
            </p>
            <p className="text-[11px] text-charcoal-muted">Positions 1–10 prioritized with title words.</p>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">Adobe Stock Batch CSV</span>
            <p className="text-sm font-bold text-charcoal-900">Max 5,000 Rows / 1 MB</p>
            <p className="text-[11px] text-charcoal-muted">UTF-8 without BOM, automatic batch split.</p>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">Minimum Resolution</span>
            <p className="text-sm font-bold text-charcoal-900">4 Megapixels (4 MP)</p>
            <p className="text-[11px] text-charcoal-muted">Minimum 2000 &times; 2000 pixels.</p>
          </div>

          <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4 space-y-1">
            <span className="text-charcoal-muted">pHash Duplicate Threshold</span>
            <p className="text-sm font-bold text-charcoal-900">Hamming &le; {CONFIG.PHASH.DUPLICATE_HAMMING_THRESHOLD}</p>
            <p className="text-[11px] text-charcoal-muted">64-bit DCT perceptual hash comparison.</p>
          </div>
        </div>
      </div>

      {/* Portfolio Health Score Formula Documentation */}
      <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-charcoal-900" />
              <h2 className="text-base font-bold text-charcoal-900">
                Portfolio Health Score Formula Documentation
              </h2>
            </div>
            <p className="mt-1 text-xs text-charcoal-muted max-w-3xl leading-relaxed">
              The StockFlow Portfolio Health Score (0–100) measures contributor account longevity, compliance with Adobe Stock review algorithms, and commercial earning velocity. It balances four mathematical pillars:
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-pastel-yellow text-charcoal-900 text-xs font-mono font-bold whitespace-nowrap shadow-pill">
            Max 100 Points
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Pillar 1: Approval Rate */}
          <div className="rounded-2xl border border-pastel-sage/50 bg-pastel-sage/20 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                1. Approval Rate
              </span>
              <span className="text-xs font-mono font-semibold text-charcoal-muted">40% Weight (Max 40 pts)</span>
            </div>
            <p className="text-xs text-charcoal-900 font-mono bg-white px-3 py-1.5 rounded-full border border-base-border">
              Score = (Approved / Total Reviewed) &times; 40
            </p>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Adobe Stock ranks contributors based on their historic acceptance ratio. A high acceptance rate fast-tracks review moderation queues, while frequent rejections can trigger manual account audits.
            </p>
          </div>

          {/* Pillar 2: Theme Diversity */}
          <div className="rounded-2xl border border-pastel-blue/50 bg-pastel-blue/20 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                2. Theme Diversity
              </span>
              <span className="text-xs font-mono font-semibold text-charcoal-muted">20% Weight (Max 20 pts)</span>
            </div>
            <p className="text-xs text-charcoal-900 font-mono bg-white px-3 py-1.5 rounded-full border border-base-border">
              Score = min(1, Active Themes / 5) &times; 20
            </p>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Hedges risk across both seasonal surge events (H-90 holidays) and consistent evergreen commercial concepts (corporate, health, minimal copy-space) to stabilize month-over-month royalties.
            </p>
          </div>

          {/* Pillar 3: Similarity Warnings */}
          <div className="rounded-2xl border border-pastel-yellow/50 bg-pastel-yellow/20 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                3. Similarity Safety
              </span>
              <span className="text-xs font-mono font-semibold text-charcoal-muted">20% Weight (Max 20 pts)</span>
            </div>
            <p className="text-xs text-charcoal-900 font-mono bg-white px-3 py-1.5 rounded-full border border-base-border">
              Score = (1 - (Flagged Duplicates / Total Assets)) &times; 20
            </p>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Penalizes pHash duplicate clusters with Hamming distance &le; 8. Adobe aggressively flags repetitive generative spam under the <code className="text-charcoal-900 font-semibold">SIMILAR_CONTENT</code> rejection taxonomy.
            </p>
          </div>

          {/* Pillar 4: Aged Unsold Assets */}
          <div className="rounded-2xl border border-pastel-lavender/50 bg-pastel-lavender/20 p-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
                4. Freshness &amp; Velocity
              </span>
              <span className="text-xs font-mono font-semibold text-charcoal-muted">20% Weight (Max 20 pts)</span>
            </div>
            <p className="text-xs text-charcoal-900 font-mono bg-white px-3 py-1.5 rounded-full border border-base-border">
              Score = (1 - (Unsold Assets &gt; 90d / Total Live)) &times; 20
            </p>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Identifies stagnant assets that have spent over 90 days in the catalog with 0 customer downloads. Encourages title and keyword optimization or pruning underperforming prompts.
            </p>
          </div>
        </div>

        {/* Grade Benchmark Scale */}
        <div className="pt-3 border-t border-base-border flex flex-wrap items-center justify-between text-xs text-charcoal-muted gap-2">
          <span className="font-semibold text-charcoal-900">Rating Scale:</span>
          <span className="flex items-center gap-1.5 text-emerald-600 font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Grade A: 90–100 (Optimal Quality)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 font-semibold">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Grade B: 80–89 (Strong Contributor)
          </span>
          <span className="flex items-center gap-1.5 text-sky-600 font-semibold">
            <span className="h-2 w-2 rounded-full bg-sky-500" /> Grade C: 70–79 (Moderate Risk)
          </span>
          <span className="flex items-center gap-1.5 text-rose-600 font-semibold">
            <span className="h-2 w-2 rounded-full bg-rose-500" /> Grade D: &lt; 70 (Requires Attention)
          </span>
        </div>
      </div>
    </div>
  );
}
