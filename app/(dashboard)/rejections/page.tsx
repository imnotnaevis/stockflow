"use client";

import { useEffect, useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Sparkles,
  Check,
  TrendingDown,
  DollarSign,
  UploadCloud,
  FileSpreadsheet,
  Gauge,
  GitBranch,
  Copy,
  X,
  Target,
} from "lucide-react";
import type {
  TemplateRejectionAnalysis,
  CalibrationMetrics,
  TemplateRevenueSummary,
} from "@/lib/revenue";
import type { RejectionRecord } from "@/lib/store";

interface RejectionsData {
  taxonomies: Array<{
    code: string;
    label: string;
    description: string;
    count: number;
  }>;
  rejections: RejectionRecord[];
  templateAnalysis: TemplateRejectionAnalysis[];
  calibration: CalibrationMetrics;
  threshold: number;
}

export default function RejectionsPage() {
  const [data, setData] = useState<RejectionsData | null>(null);
  const [revenueData, setRevenueData] = useState<TemplateRevenueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"patterns" | "calibration" | "earnings" | "logs">("patterns");

  // Configurable threshold (default 70%)
  const [threshold, setThreshold] = useState<number>(0.7);

  // Gemini Prompt Advisor Modal
  const [advisorModalOpen, setAdvisorModalOpen] = useState(false);
  const [advisingTemplate, setAdvisingTemplate] = useState<TemplateRejectionAnalysis | null>(null);
  const [advisorLoading, setAdvisorLoading] = useState(false);
  const [advisorResult, setAdvisorResult] = useState<{
    improvedPrompt: string;
    improvedNegativePrompt: string;
    rationale: string;
    versionNote: string;
  } | null>(null);
  const [advisorSuccessMsg, setAdvisorSuccessMsg] = useState("");
  const [applyingVersion, setApplyingVersion] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Earnings CSV Import Modal
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importStep, setImportStep] = useState<"paste" | "preview">("paste");
  const [previewRows, setPreviewRows] = useState<
    Array<{
      adobeContentId?: string;
      filename?: string;
      downloads: number;
      amountUsd: number;
      licenseType: string;
      periodDate: string;
    }>
  >([]);
  const [importing, setImporting] = useState(false);
  const [importSuccessMsg, setImportSuccessMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [rejRes, earnRes] = await Promise.all([
        fetch(`/api/rejections?threshold=${threshold}`),
        fetch("/api/earnings"),
      ]);

      if (rejRes.ok) {
        const rejJson = await rejRes.json();
        setData(rejJson);
      }
      if (earnRes.ok) {
        const earnJson = await earnRes.json();
        setRevenueData(earnJson.templateRevenue || []);
      }
    } catch (err) {
      console.error("Failed to load feedback loop data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [threshold]);

  const handleOpenAdvisor = async (tmpl: TemplateRejectionAnalysis) => {
    setAdvisingTemplate(tmpl);
    setAdvisorModalOpen(true);
    setAdvisorLoading(true);
    setAdvisorResult(null);
    setAdvisorSuccessMsg("");

    try {
      const res = await fetch(`/api/prompts/${tmpl.templateId}/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAsNewVersion: false }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Advisor failed");
      setAdvisorResult(json.suggestion);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setAdvisorLoading(false);
    }
  };

  const handleApplyNewVersion = async () => {
    if (!advisingTemplate || !advisorResult) return;
    try {
      setApplyingVersion(true);
      const res = await fetch(`/api/prompts/${advisingTemplate.templateId}/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyAsNewVersion: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create new version");
      setAdvisorSuccessMsg(
        `Success! Created version v${(advisingTemplate.version || 1) + 1} without overwriting v${advisingTemplate.version}.`
      );
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setApplyingVersion(false);
    }
  };

  const handleParseCsv = () => {
    if (!csvText.trim()) return;

    const lines = csvText.trim().split("\n");
    if (lines.length < 2) {
      alert("CSV must include a header and at least one data row.");
      return;
    }

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));
    const idIdx = header.findIndex((h) => h.includes("content") || h.includes("asset id") || h.includes("id"));
    const fileIdx = header.findIndex((h) => h.includes("file") || h.includes("name"));
    const dlIdx = header.findIndex((h) => h.includes("download") || h.includes("qty") || h.includes("sales"));
    const earnIdx = header.findIndex((h) => h.includes("earn") || h.includes("royalt") || h.includes("amount") || h.includes("usd"));
    const licenseIdx = header.findIndex((h) => h.includes("license") || h.includes("plan"));

    const rows: typeof previewRows = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));

      const adobeContentId = idIdx !== -1 ? cols[idIdx] : undefined;
      const filename = fileIdx !== -1 ? cols[fileIdx] : undefined;
      const downloads = dlIdx !== -1 ? parseInt(cols[dlIdx], 10) || 1 : 1;
      const amountUsd = earnIdx !== -1 ? parseFloat(cols[earnIdx].replace(/[^0-9.]/g, "")) || 0.99 : 0.99;
      const licenseType = licenseIdx !== -1 && cols[licenseIdx] ? cols[licenseIdx] : "Standard";

      rows.push({
        adobeContentId,
        filename,
        downloads,
        amountUsd: Number(amountUsd.toFixed(2)),
        licenseType,
        periodDate: new Date().toISOString().slice(0, 7),
      });
    }

    setPreviewRows(rows);
    setImportStep("preview");
  };

  const handleConfirmImport = async () => {
    if (previewRows.length === 0) return;
    try {
      setImporting(true);
      const res = await fetch("/api/earnings/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: previewRows }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Import failed");

      setImportSuccessMsg(`Imported ${json.importedCount} sales records (${json.matchedCount} matched to existing portfolio assets).`);
      setCsvText("");
      setPreviewRows([]);
      setImportStep("paste");
      await loadData();
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const lowRateTemplatesCount =
    data?.templateAnalysis.filter((t) => t.isBelowThreshold).length || 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Feedback Loop &amp; Moderation Calibration</span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Rejection patterns by template, Gemini Prompt Advisor, earnings CSV import, and QC outcome calibration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setImportModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold px-5 py-2.5 text-xs shadow-pill transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Import Adobe Sales CSV</span>
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <span className="text-xs text-charcoal-muted font-medium">Total Moderation Rejections</span>
          <p className="text-2xl font-bold text-charcoal-900 mt-1">
            {data?.rejections.length || 0}
          </p>
          <span className="text-[11px] text-charcoal-muted">Across all catalog batches</span>
        </div>

        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <span className="text-xs text-charcoal-muted font-medium">Low Acceptance Templates</span>
            {lowRateTemplatesCount > 0 && (
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            )}
          </div>
          <p className="text-2xl font-bold text-rose-600 mt-1">
            {lowRateTemplatesCount}
          </p>
          <span className="text-[11px] text-charcoal-muted">Below {Math.round(threshold * 100)}% threshold</span>
        </div>

        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <span className="text-xs text-charcoal-muted font-medium">QC Calibration Accuracy</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {data?.calibration.accuracyPct ?? 88}%
          </p>
          <span className="text-[11px] text-charcoal-muted">
            {data?.calibration.truePositives || 0} True Positives / {data?.calibration.totalEvaluated || 0} Reviewed
          </span>
        </div>

        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <span className="text-xs text-charcoal-muted font-medium">Total Portfolio Royalties</span>
          <p className="text-2xl font-bold text-charcoal-900 mt-1">
            ${revenueData.reduce((acc, r) => acc + r.totalRevenue, 0).toFixed(2)}
          </p>
          <span className="text-[11px] text-charcoal-muted">
            {revenueData.reduce((acc, r) => acc + r.totalDownloads, 0)} total downloads
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveTab("patterns")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "patterns"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <TrendingDown className="h-3.5 w-3.5" />
          <span>Rejection Patterns &amp; Prompt Advisor</span>
        </button>

        <button
          onClick={() => setActiveTab("calibration")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "calibration"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <Gauge className="h-3.5 w-3.5" />
          <span>QC Outcome Calibration</span>
        </button>

        <button
          onClick={() => setActiveTab("earnings")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "earnings"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <DollarSign className="h-3.5 w-3.5" />
          <span>Revenue per Template</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
            activeTab === "logs"
              ? "bg-charcoal-900 text-white"
              : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>Rejection Logs ({data?.rejections.length || 0})</span>
        </button>
      </div>

      {/* ================= TAB 1: PATTERNS & PROMPT ADVISOR ================= */}
      {activeTab === "patterns" && (
        <div className="space-y-6">
          {/* Threshold Configurator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-3xl border border-base-border bg-pastel-lavender/30 p-5 shadow-soft">
            <div>
              <span className="text-xs font-bold text-charcoal-900">
                Acceptance Rate Warning Threshold
              </span>
              <p className="text-[11px] text-charcoal-muted">
                Templates below this threshold will be highlighted for Gemini AI Prompt Advisor optimization.
              </p>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-charcoal-900 font-bold bg-white px-3 py-1 rounded-full border border-base-border shadow-pill">
                {Math.round(threshold * 100)}%
              </span>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={Math.round(threshold * 100)}
                onChange={(e) => setThreshold(Number(e.target.value) / 100)}
                className="accent-charcoal-900 w-32 cursor-pointer"
              />
            </div>
          </div>

          {/* Taxonomies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {data?.taxonomies.map((tax) => (
              <div
                key={tax.code}
                className="rounded-2xl border border-base-border bg-white p-4 shadow-soft flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-rose-600 uppercase">
                    {tax.code}
                  </span>
                  <h4 className="text-xs font-semibold text-charcoal-900 mt-1">{tax.label}</h4>
                  <p className="text-[11px] text-charcoal-muted line-clamp-2 mt-1">{tax.description}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-base-border flex items-center justify-between">
                  <span className="text-xs text-charcoal-muted">Total Flags</span>
                  <span className="text-sm font-bold text-charcoal-900 font-mono">{tax.count}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Templates Performance & Rejection Patterns Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-charcoal-900 flex items-center gap-2">
                  <Target className="h-4 w-4 text-charcoal-900" />
                  <span>Template Acceptance Rates &amp; AI Prompt Advisor</span>
                </h3>
                <p className="text-xs text-charcoal-muted mt-0.5">
                  Templates below {Math.round(threshold * 100)}% acceptance trigger automated advisor guidance to branch new versions.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left text-xs border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                    <th className="px-5 py-2">Template</th>
                    <th className="px-5 py-2">Version</th>
                    <th className="px-5 py-2">Approved / Total</th>
                    <th className="px-5 py-2">Acceptance Rate</th>
                    <th className="px-5 py-2">Primary Rejection Cause</th>
                    <th className="px-5 py-2 text-right">Advisor Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.templateAnalysis.map((tmpl) => (
                    <tr
                      key={tmpl.templateId}
                      className={`bg-white rounded-2xl border border-base-border shadow-soft hover:shadow-softHover transition-all ${
                        tmpl.isBelowThreshold ? "ring-2 ring-rose-500/10" : ""
                      }`}
                    >
                      <td className="px-5 py-4 font-semibold text-charcoal-900 flex items-center gap-2 first:rounded-l-2xl">
                        {tmpl.isBelowThreshold && (
                          <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                        )}
                        <span>{tmpl.templateName}</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-charcoal-700 font-semibold">
                        v{tmpl.version}
                      </td>
                      <td className="px-5 py-4 font-mono text-charcoal-700">
                        {tmpl.approvedCount} / {tmpl.totalReviewed}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              tmpl.isBelowThreshold
                                ? "text-rose-600"
                                : tmpl.acceptanceRatePct >= 90
                                ? "text-emerald-600"
                                : "text-amber-600"
                            }`}
                          >
                            {tmpl.acceptanceRatePct}%
                          </span>
                          {tmpl.isBelowThreshold && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-status-rejectedBg text-status-rejectedText border border-status-rejectedBorder font-semibold">
                              Below Threshold
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {tmpl.topRejectionTaxonomies[0] ? (
                          <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-base-cardWarm text-charcoal-700 border border-base-border">
                            {tmpl.topRejectionTaxonomies[0].code} ({tmpl.topRejectionTaxonomies[0].count}x)
                          </span>
                        ) : (
                          <span className="text-charcoal-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right last:rounded-r-2xl">
                        <button
                          onClick={() => handleOpenAdvisor(tmpl)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-charcoal-900 text-white hover:bg-charcoal-800 text-xs font-semibold shadow-pill transition-all cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>AI Advisor</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: QC OUTCOME CALIBRATION ================= */}
      {activeTab === "calibration" && data && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-6">
            <div>
              <h3 className="text-sm font-bold text-charcoal-900 flex items-center gap-2">
                <Gauge className="h-4 w-4 text-charcoal-900" />
                <span>Confusion Matrix: Gemini QC Gate vs Adobe Moderation Outcomes</span>
              </h3>
              <p className="text-xs text-charcoal-muted mt-1">
                Evaluates algorithmic precision by comparing Gemini Vision automated pass/fail flags against actual Adobe Stock moderator verdicts.
              </p>
            </div>

            {/* Confusion Matrix 2x2 Grid with Pastel Tints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* True Positives */}
              <div className="rounded-2xl border border-pastel-sage/50 bg-pastel-sage/30 p-5 space-y-1 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal-900 uppercase">
                    True Positives (QC Passed &amp; Adobe Approved)
                  </span>
                  <span className="text-2xl font-bold text-charcoal-900 font-mono">
                    {data.calibration.truePositives}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted">
                  Ideal state: High sharpness and compliance predicted correctly.
                </p>
              </div>

              {/* False Positives */}
              <div className="rounded-2xl border border-status-rejectedBorder bg-status-rejectedBg p-5 space-y-1 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-700 uppercase">
                    False Positives (QC Passed but Adobe Rejected)
                  </span>
                  <span className="text-2xl font-bold text-rose-700 font-mono">
                    {data.calibration.falsePositives}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted">
                  Defect escaped quality gate. Signals need to tighten sharpness or artifact checks.
                </p>
              </div>

              {/* False Negatives */}
              <div className="rounded-2xl border border-status-pendingBorder bg-status-pendingBg p-5 space-y-1 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-700 uppercase">
                    False Negatives (QC Failed but Approved)
                  </span>
                  <span className="text-2xl font-bold text-amber-700 font-mono">
                    {data.calibration.falseNegatives}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted">
                  False alarm overridden manually that Adobe reviewers accepted.
                </p>
              </div>

              {/* True Negatives */}
              <div className="rounded-2xl border border-pastel-blue/50 bg-pastel-blue/30 p-5 space-y-1 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-charcoal-900 uppercase">
                    True Negatives (QC Failed &amp; Adobe Rejected)
                  </span>
                  <span className="text-2xl font-bold text-charcoal-900 font-mono">
                    {data.calibration.trueNegatives}
                  </span>
                </div>
                <p className="text-xs text-charcoal-muted">
                  Accurately prevented flawed submissions. Saved contributor acceptance ratio.
                </p>
              </div>
            </div>

            {/* Sharpness Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-base-border">
              <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4">
                <span className="text-xs text-charcoal-muted">Average Sharpness of Approved Assets</span>
                <p className="text-2xl font-bold text-emerald-600 font-mono mt-1">
                  {data.calibration.avgSharpnessApproved} / 100
                </p>
              </div>

              <div className="rounded-2xl border border-base-border bg-base-cardWarm p-4">
                <span className="text-xs text-charcoal-muted">Average Sharpness of Rejected Assets</span>
                <p className="text-2xl font-bold text-rose-600 font-mono mt-1">
                  {data.calibration.avgSharpnessRejected} / 100
                </p>
              </div>

              <div className="rounded-2xl border border-base-border bg-pastel-yellow/30 p-4">
                <span className="text-xs text-charcoal-900 font-semibold">Recommended Sharpness Gate</span>
                <p className="text-2xl font-bold text-charcoal-900 font-mono mt-1">
                  &ge; {data.calibration.recommendedSharpnessThreshold}
                </p>
                <span className="text-[10px] text-charcoal-muted">Threshold maximizes acceptance velocity</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: REVENUE PER TEMPLATE ================= */}
      {activeTab === "earnings" && (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-xs border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-5 py-2">Template</th>
                  <th className="px-5 py-2">Version</th>
                  <th className="px-5 py-2">Catalog Assets</th>
                  <th className="px-5 py-2">Downloads</th>
                  <th className="px-5 py-2">Total Revenue (USD)</th>
                  <th className="px-5 py-2 text-right">Avg Revenue / Asset</th>
                </tr>
              </thead>
              <tbody>
                {revenueData.map((row) => (
                  <tr
                    key={row.templateId}
                    className="bg-white rounded-2xl border border-base-border shadow-soft hover:shadow-softHover transition-all"
                  >
                    <td className="px-5 py-4 font-semibold text-charcoal-900 first:rounded-l-2xl">
                      {row.templateName}
                    </td>
                    <td className="px-5 py-4 font-mono text-charcoal-700 font-semibold">
                      v{row.version}
                    </td>
                    <td className="px-5 py-4 font-mono text-charcoal-700">
                      {row.assetCount}
                    </td>
                    <td className="px-5 py-4 font-mono text-charcoal-700">
                      {row.totalDownloads}
                    </td>
                    <td className="px-5 py-4 font-mono font-bold text-emerald-600 text-sm">
                      ${row.totalRevenue.toFixed(2)}
                    </td>
                    <td className="px-5 py-4 font-mono text-charcoal-700 text-right last:rounded-r-2xl">
                      ${row.averageRevenuePerAsset.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= TAB 4: REJECTION LOGS ================= */}
      {activeTab === "logs" && data && (
        <div className="space-y-4">
          <div className="overflow-x-auto pb-4">
            <table className="w-full text-left text-xs border-separate border-spacing-y-2">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                  <th className="px-5 py-2">Filename</th>
                  <th className="px-5 py-2">Taxonomy Code</th>
                  <th className="px-5 py-2">Reviewer Notes</th>
                  <th className="px-5 py-2 text-right">Rejected At</th>
                </tr>
              </thead>
              <tbody>
                {data.rejections.map((rej) => (
                  <tr
                    key={rej.id}
                    className="bg-white rounded-2xl border border-base-border shadow-soft hover:shadow-softHover transition-all"
                  >
                    <td className="px-5 py-4 font-mono text-charcoal-900 first:rounded-l-2xl">
                      {rej.filename}
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-mono text-[11px] px-2.5 py-0.5 rounded-full bg-status-rejectedBg border border-status-rejectedBorder text-status-rejectedText font-semibold">
                        {rej.taxonomyCode}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-charcoal-muted max-w-md">
                      {rej.notes || "Standard rejection without moderator comment."}
                    </td>
                    <td className="px-5 py-4 text-charcoal-muted text-right font-mono text-[11px] last:rounded-r-2xl">
                      {new Date(rej.rejectedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= PROMPT ADVISOR MODAL ================= */}
      {advisorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-charcoal-900" />
                <h2 className="text-base font-bold text-charcoal-900">
                  Gemini Prompt Advisor: {advisingTemplate?.templateName} (v{advisingTemplate?.version})
                </h2>
              </div>
              <button
                onClick={() => setAdvisorModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {advisorSuccessMsg && (
              <div className="rounded-2xl border border-status-readyBorder bg-status-readyBg p-4 text-xs text-status-readyText flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{advisorSuccessMsg}</span>
              </div>
            )}

            {advisorLoading ? (
              <div className="py-12 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-charcoal-900 animate-spin mx-auto" />
                <p className="text-xs text-charcoal-muted">
                  Analyzing rejection root causes and engineering compliant prompt upgrades...
                </p>
              </div>
            ) : advisorResult ? (
              <div className="space-y-4">
                {/* Rationale Banner */}
                <div className="rounded-2xl border border-base-border bg-pastel-lavender/30 p-4 space-y-1 text-xs">
                  <span className="font-bold text-charcoal-900">Advisor Optimization Rationale:</span>
                  <p className="text-charcoal-muted leading-relaxed">{advisorResult.rationale}</p>
                </div>

                {/* Upgraded Positive Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase text-charcoal-900 text-[11px]">
                      Recommended Positive Prompt (Preserving Aesthetic)
                    </span>
                    <button
                      onClick={() => copyText(advisorResult.improvedPrompt, "pos")}
                      className="text-charcoal-muted hover:text-charcoal-900 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "pos" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === "pos" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="rounded-2xl border border-base-border bg-base-cardWarm p-3.5 text-xs font-mono text-charcoal-900 leading-relaxed">
                    {advisorResult.improvedPrompt}
                  </div>
                </div>

                {/* Upgraded Negative Prompt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase text-charcoal-900 text-[11px]">
                      Expanded Negative Prompt (Targeting Rejection Defects)
                    </span>
                    <button
                      onClick={() => copyText(advisorResult.improvedNegativePrompt, "neg")}
                      className="text-charcoal-muted hover:text-charcoal-900 flex items-center gap-1 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "neg" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === "neg" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                  <div className="rounded-2xl border border-base-border bg-base-cardWarm p-3.5 text-xs font-mono text-charcoal-900 leading-relaxed">
                    {advisorResult.improvedNegativePrompt}
                  </div>
                </div>

                {/* Changelog Note */}
                <div className="text-xs text-charcoal-muted">
                  <span className="font-mono">Version Changelog Note: </span>
                  <span>{advisorResult.versionNote}</span>
                </div>

                {/* Apply Button */}
                <div className="pt-4 border-t border-base-border flex items-center justify-between">
                  <span className="text-xs text-charcoal-muted">
                    Stores as new template version <span className="font-mono font-bold text-charcoal-900">v{(advisingTemplate?.version || 1) + 1}</span> (never overwrites original).
                  </span>
                  <button
                    disabled={applyingVersion || Boolean(advisorSuccessMsg)}
                    onClick={handleApplyNewVersion}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <GitBranch className="h-4 w-4" />
                    <span>{applyingVersion ? "Publishing..." : `Apply as Version v${(advisingTemplate?.version || 1) + 1}`}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= EARNINGS CSV IMPORT MODAL ================= */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-charcoal-900" />
                <h2 className="text-base font-bold text-charcoal-900">
                  Import Adobe Stock Sales / Earnings CSV
                </h2>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {importSuccessMsg && (
              <div className="rounded-2xl border border-status-readyBorder bg-status-readyBg p-4 text-xs text-status-readyText flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{importSuccessMsg}</span>
              </div>
            )}

            {importStep === "paste" ? (
              <div className="space-y-4">
                <p className="text-xs text-charcoal-muted leading-relaxed">
                  Export your royalty sales report from the Adobe Stock Contributor Portal and paste the CSV content below. We will match records by <code className="text-charcoal-900 font-semibold">adobe_content_id</code> or <code className="text-charcoal-900 font-semibold">filename</code>.
                </p>

                <div>
                  <textarea
                    rows={8}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder={`Content ID,File Name,License,Sales Count,Royalties\n591029101,cozy_hot_cocoa_01.jpg,Standard,12,14.80\n591029301,fintech_hologram_dash_01.jpg,Subscription,22,28.50`}
                    className="w-full rounded-2xl border border-base-border bg-base-cardWarm p-4 text-xs font-mono text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setImportModalOpen(false)}
                    className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleParseCsv}
                    className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill cursor-pointer"
                  >
                    Preview Mapped Columns &rarr;
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-charcoal-900">
                    Preview: {previewRows.length} Sales Rows Detected
                  </span>
                  <button
                    onClick={() => setImportStep("paste")}
                    className="text-xs text-charcoal-900 font-medium underline cursor-pointer"
                  >
                    &larr; Re-edit CSV
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto rounded-2xl border border-base-border bg-base-cardWarm">
                  <table className="w-full text-left text-xs text-charcoal-900">
                    <thead className="border-b border-base-border bg-white uppercase text-[10px] font-semibold text-charcoal-muted">
                      <tr>
                        <th className="px-4 py-2">Adobe Content ID</th>
                        <th className="px-4 py-2">Filename</th>
                        <th className="px-4 py-2">Downloads</th>
                        <th className="px-4 py-2">Royalties</th>
                        <th className="px-4 py-2">License</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-border font-mono text-[11px]">
                      {previewRows.slice(0, 10).map((r, i) => (
                        <tr key={i} className="hover:bg-white">
                          <td className="px-4 py-2">{r.adobeContentId || "-"}</td>
                          <td className="px-4 py-2">{r.filename || "-"}</td>
                          <td className="px-4 py-2">{r.downloads}</td>
                          <td className="px-4 py-2 text-emerald-600 font-bold">${r.amountUsd.toFixed(2)}</td>
                          <td className="px-4 py-2 text-charcoal-muted">{r.licenseType}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setImportStep("paste")}
                    className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={importing}
                    onClick={handleConfirmImport}
                    className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 cursor-pointer"
                  >
                    {importing ? "Importing..." : `Confirm & Save ${previewRows.length} Rows`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
