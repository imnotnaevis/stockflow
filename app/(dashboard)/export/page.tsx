"use client";

import { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  CheckCircle2,
  Download,
  ShieldCheck,
  Send,
  Sparkles,
  Info,
  CheckSquare,
  Square,
  RefreshCw,
  AlertCircle,
  FileCheck,
  X,
} from "lucide-react";
import { CONFIG } from "@/lib/config";
import type { CsvBatchFile } from "@/lib/csv";

interface ExportAssetItem {
  id: string;
  filename: string;
  blobUrl: string;
  width: number;
  height: number;
  megapixels: number;
  status: string;
  title: string;
  categoryId: number | null;
  keywords: string[];
  checklist: {
    qcPassed: boolean;
    resolutionPassed: boolean;
    titleValid: boolean;
    keywordsValid: boolean;
    categoryAssigned: boolean;
    isExportReady: boolean;
  };
}

export default function ExportPage() {
  const [assets, setAssets] = useState<ExportAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Export & Batches
  const [generatedBatches, setGeneratedBatches] = useState<CsvBatchFile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPreflight = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/export");
      if (res.ok) {
        const data = await res.json();
        const list: ExportAssetItem[] = data.assets || [];
        setAssets(list);
        const readyIds = list.filter((a) => a.checklist.isExportReady).map((a) => a.id);
        setSelectedIds(new Set(readyIds));
      }
    } catch (err) {
      console.error("Preflight fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreflight();
  }, []);

  const handleToggleSelectAll = () => {
    const ready = assets.filter((a) => a.checklist.isExportReady);
    if (selectedIds.size === ready.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ready.map((a) => a.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerateCsv = async () => {
    if (selectedIds.size === 0) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "CSV generation failed");

      setGeneratedBatches(data.batches || []);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadBatch = (batch: CsvBatchFile) => {
    const blob = new Blob([batch.csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", batch.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleConfirmSubmission = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/export/confirm-submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission transition failed");

      setConfirmModalOpen(false);
      setGeneratedBatches([]);
      setSelectedIds(new Set());
      fetchPreflight();
      alert(`Success! ${data.submittedCount} assets moved to 'submitted' status.`);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const readyAssets = assets.filter((a) => a.checklist.isExportReady);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Adobe Stock CSV Export</span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Pre-flight checklist, compliance verification, and UTF-8 batch CSV export.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchPreflight}
            className="flex items-center gap-2 rounded-full border border-base-border bg-white px-4 py-2 text-xs font-medium text-charcoal-900 hover:bg-base-cardWarm shadow-pill transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh Checklist</span>
          </button>
        </div>
      </div>

      {/* Critical AI Submission Reminder Banner */}
      <div className="rounded-3xl border border-base-border bg-pastel-yellow/30 p-6 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white border border-base-border p-2.5 text-charcoal-900 flex-shrink-0 shadow-pill">
            <Info className="h-5 w-5 text-amber-600" />
          </div>
          <div className="space-y-1 text-xs text-charcoal-900">
            <h3 className="font-semibold text-sm">
              Crucial Adobe Stock Generative AI Submission Policy
            </h3>
            <p className="text-charcoal-muted leading-relaxed">
              When uploading these files to the Adobe Contributor Portal, you must check the box:{" "}
              <strong className="underline text-charcoal-900">&ldquo;Created using generative AI tools&rdquo;</strong>.
              Never add &ldquo;generative AI&rdquo; or AI platform names to the CSV titles or keywords—StockFlow AI has stripped all of them to prevent policy rejections.
            </p>
          </div>
        </div>
      </div>

      {/* Pre-Flight Checklist KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>QC Gate Passed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-charcoal-900">{assets.length}</span>
            <span className="text-xs text-charcoal-muted">ready assets</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>Resolution &ge; 4 MP</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-charcoal-900">
              {assets.filter((a) => a.checklist.resolutionPassed).length}
            </span>
            <span className="text-xs text-charcoal-muted">/ {assets.length}</span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>Valid Metadata</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-charcoal-900">
              {assets.filter((a) => a.checklist.titleValid && a.checklist.keywordsValid).length}
            </span>
            <span className="text-xs text-charcoal-muted">/ {assets.length}</span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="rounded-3xl border border-base-border bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between text-xs text-charcoal-muted">
            <span>Export Ready</span>
            <FileCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{readyAssets.length}</span>
            <span className="text-xs text-charcoal-muted">ready for CSV</span>
          </div>
        </div>
      </div>

      {/* Generated Batches Download Banner (if generated) */}
      {generatedBatches.length > 0 && (
        <div className="rounded-3xl border border-base-border bg-pastel-lavender/30 p-6 space-y-4 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-base-border pb-4">
            <div>
              <h3 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-emerald-600" />
                <span>CSV Batches Generated Successfully</span>
              </h3>
              <p className="text-xs text-charcoal-muted mt-1">
                UTF-8 format without BOM, adhering to Adobe limits (max 5,000 rows / 1 MB).
              </p>
            </div>

            <button
              onClick={() => setConfirmModalOpen(true)}
              className="flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white px-5 py-2.5 text-xs font-semibold shadow-pill transition-all cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span>Confirm &amp; Mark as Submitted</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {generatedBatches.map((b) => (
              <div
                key={b.batchIndex}
                className="flex items-center justify-between rounded-2xl border border-base-border bg-white p-4 text-xs shadow-soft"
              >
                <div>
                  <p className="font-mono font-semibold text-charcoal-900">{b.filename}</p>
                  <p className="text-[11px] text-charcoal-muted">
                    {b.rowCount} rows &bull; {(b.byteSize / 1024).toFixed(1)} KB
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadBatch(b)}
                  className="flex items-center gap-1.5 rounded-full bg-base-cardWarm hover:bg-pastel-lavender/40 border border-base-border text-charcoal-900 px-3.5 py-1.5 text-xs font-semibold shadow-pill transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assets Pre-Flight Checklist Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-charcoal-900 flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-charcoal-900" />
              <span>Pre-Flight Checklist Assets</span>
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Only assets with valid resolution, title (&le; 70 chars, no commas), and 15–35 keywords can be exported.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateCsv}
              disabled={isGenerating || selectedIds.size === 0}
              className="flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white px-5 py-2.5 text-xs font-semibold shadow-pill disabled:opacity-50 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>Generate CSV ({selectedIds.size})</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
                <th scope="col" className="w-10 px-4 py-2">
                  <button onClick={handleToggleSelectAll} className="text-charcoal-muted hover:text-charcoal-900">
                    {readyAssets.length > 0 && selectedIds.size === readyAssets.length ? (
                      <CheckSquare className="h-4 w-4 text-charcoal-900" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                </th>
                <th scope="col" className="px-4 py-2">Preview</th>
                <th scope="col" className="px-4 py-2">Filename</th>
                <th scope="col" className="px-4 py-2">Title (max 70, no commas)</th>
                <th scope="col" className="px-4 py-2">Keywords (15-35)</th>
                <th scope="col" className="px-4 py-2">Category</th>
                <th scope="col" className="px-4 py-2 text-right">Export Ready</th>
              </tr>
            </thead>
            <tbody>
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center bg-white rounded-3xl border border-base-border shadow-soft">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="rounded-full bg-pastel-lavender/60 p-4 text-charcoal-900 mb-3 shadow-pill">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-charcoal-900">
                        No Ready Assets for Export
                      </h3>
                      <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">
                        Assets must have status &lsquo;ready&rsquo; (via Gemini QC or manual override) to appear in the pre-flight export checklist.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map((asset) => {
                  const isSelected = selectedIds.has(asset.id);
                  const isReady = asset.checklist.isExportReady;

                  return (
                    <tr
                      key={asset.id}
                      className={`bg-white rounded-2xl border border-base-border shadow-soft hover:shadow-softHover transition-all ${
                        !isReady ? "opacity-60" : isSelected ? "ring-2 ring-charcoal-900/10" : ""
                      }`}
                    >
                      <td className="px-4 py-3 first:rounded-l-2xl">
                        <button
                          disabled={!isReady}
                          onClick={() => handleToggleSelect(asset.id)}
                          className="text-charcoal-muted hover:text-charcoal-900 disabled:opacity-30"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-charcoal-900" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded-xl border border-base-border bg-base-cardWarm overflow-hidden">
                          <img
                            src={asset.blobUrl}
                            alt={asset.filename}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-charcoal-900 font-medium">
                        {asset.filename}
                      </td>

                      <td className="px-4 py-3 max-w-xs truncate">
                        {asset.title ? (
                          <div>
                            <span className="text-charcoal-900 font-medium">{asset.title}</span>
                            <div className="text-[10px] text-charcoal-muted">
                              {asset.title.length}/70 chars {asset.title.includes(",") && "• ⚠ Has comma"}
                            </div>
                          </div>
                        ) : (
                          <span className="text-rose-600 text-xs italic">Missing title</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`font-semibold ${
                            asset.checklist.keywordsValid ? "text-emerald-600" : "text-amber-600"
                          }`}
                        >
                          {asset.keywords.length} tags
                        </span>
                        <span className="text-[10px] text-charcoal-muted ml-1">
                          {asset.keywords.length < 15 ? "(<15)" : asset.keywords.length > 35 ? "(>35)" : "(✓)"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {asset.categoryId ? (
                          <span className="rounded-full bg-base-cardWarm border border-base-border px-3 py-0.5 text-charcoal-700 text-[11px]">
                            {CONFIG.CATEGORIES.find((c) => c.id === asset.categoryId)?.name || `Cat #${asset.categoryId}`}
                          </span>
                        ) : (
                          <span className="text-rose-600 italic">None</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right last:rounded-r-2xl">
                        {isReady ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-[11px]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Passed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-medium text-[11px]">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>Incomplete</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-base-border bg-white p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-base-border pb-3">
              <h3 className="text-base font-bold text-charcoal-900 flex items-center gap-2">
                <Send className="h-4 w-4 text-charcoal-900" />
                <span>Confirm Adobe Stock Submission</span>
              </h3>
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-charcoal-muted leading-relaxed">
              Have you successfully uploaded the images and CSV batch to the Adobe Stock Contributor Portal?
            </p>

            <div className="rounded-2xl border border-base-border bg-pastel-lavender/30 p-4 text-xs text-charcoal-900 space-y-1">
              <strong className="block font-semibold">Action Summary:</strong>
              <p>
                Marking <strong>{selectedIds.size} assets</strong> as &lsquo;submitted&rsquo; will record an audit entry in the status history and move them to the submitted pipeline.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
              >
                Cancel
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmSubmission}
                className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? "Updating..." : "Yes, Mark as Submitted"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
