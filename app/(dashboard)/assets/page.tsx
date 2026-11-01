"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  UploadCloud,
  FileImage,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  FileCheck,
  Sparkles,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  ChevronRight,
  Play,
  Pause,
  Sliders,
  X,
  Plus,
  Tag,
  History,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import { RightDrawer } from "@/components/drawer";
import { CONFIG, ASSET_STATUSES, type AssetStatus } from "@/lib/config";
import type { GeminiQcResult } from "@/lib/gemini";
import { validateTitle, validateAndOrderKeywords, extractSubstantiveTitleWords } from "@/lib/validator";

interface AssetRow {
  id: string;
  filename: string;
  blobUrl: string;
  thumbnailUrl?: string | null;
  width: number;
  height: number;
  phashHex: string;
  phashBigInt: string;
  status: AssetStatus;
  adobeContentId?: string | null;
  seriesId?: string | null;
  templateId?: string | null;
  createdAt: string;
  seriesTitle?: string | null;
  seriesQuota?: number | null;
  seriesCount?: number | null;
  themeName?: string | null;
}

interface UploadQueueItem {
  id: string;
  file: File;
  status: "waiting" | "uploading" | "processing" | "success" | "error";
  progress: number;
  blobUrl?: string;
  qcResult?: {
    passed: boolean;
    width: number;
    height: number;
    megapixels: number;
    reason: string;
  };
  duplicateCheck?: {
    isDuplicate: boolean;
    minDistance: number;
    match?: {
      matchedAssetId: string;
      matchedFilename: string;
      hammingDistance: number;
    } | null;
  };
  error?: string;
}

interface QcQueueItem {
  assetId: string;
  filename: string;
  status: "waiting" | "running" | "passed" | "failed" | "rate_limited";
  qcResult?: GeminiQcResult;
  error?: string;
}

const STATUS_BADGES: Record<
  AssetStatus,
  { label: string; bg: string; text: string; dot: string; icon: React.ComponentType<{ className?: string }> }
> = {
  idea: { label: "Idea", bg: "bg-status-ideaBg border-status-ideaBorder", text: "text-status-ideaText", dot: "bg-charcoal-muted", icon: Sparkles },
  qc_pending: { label: "QC Pending", bg: "bg-status-pendingBg border-status-pendingBorder", text: "text-status-pendingText", dot: "bg-amber-500", icon: Clock },
  qc_failed: { label: "QC Failed", bg: "bg-status-rejectedBg border-status-rejectedBorder", text: "text-status-rejectedText", dot: "bg-rose-500", icon: AlertTriangle },
  ready: { label: "Ready", bg: "bg-status-readyBg border-status-readyBorder", text: "text-status-readyText", dot: "bg-emerald-500", icon: CheckCircle2 },
  submitted: { label: "Submitted", bg: "bg-status-submittedBg border-status-submittedBorder", text: "text-status-submittedText", dot: "bg-sky-500", icon: Send },
  approved: { label: "Approved", bg: "bg-status-readyBg border-status-readyBorder", text: "text-status-readyText", dot: "bg-emerald-600", icon: FileCheck },
  rejected: { label: "Rejected", bg: "bg-status-rejectedBg border-status-rejectedBorder", text: "text-status-rejectedText", dot: "bg-rose-600", icon: XCircle },
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [seriesFilter, setSeriesFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [availableSeries, setAvailableSeries] = useState<Array<{ id: string; title: string; currentCount: number; maxQuota: number }>>([]);

  // Upload Queue State
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Gemini Vision QC Queue State
  const [qcQueue, setQcQueue] = useState<QcQueueItem[]>([]);
  const [isQcRunning, setIsQcRunning] = useState(false);
  const [isQcPaused, setIsQcPaused] = useState(false);
  const [backoffCountdown, setBackoffCountdown] = useState<number | null>(null);

  // Drawer & Inspector State
  const [inspectingAsset, setInspectingAsset] = useState<AssetRow | null>(null);
  const [inspectDrawerOpen, setInspectDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"qc" | "metadata" | "history">("qc");
  const [inspectingQcData, setInspectingQcData] = useState<GeminiQcResult | null>(null);
  const [inspectingHistory, setInspectingHistory] = useState<Array<{ id: string; fromStatus: string | null; toStatus: string; reason: string | null; changedAt: string }>>([]);
  const [isRunningSingleQc, setIsRunningSingleQc] = useState(false);

  // Manual Override State
  const [manualOverrideStatus, setManualOverrideStatus] = useState<AssetStatus>("ready");
  const [manualOverrideNote, setManualOverrideNote] = useState("");
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Metadata Editor State
  const [metaTitle, setMetaTitle] = useState("");
  const [metaCategoryId, setMetaCategoryId] = useState<number>(11);
  const [metaKeywords, setMetaKeywords] = useState<string[]>([]);
  const [newKeywordInput, setNewKeywordInput] = useState("");
  const [isGeneratingMeta, setIsGeneratingMeta] = useState(false);
  const [isSavingMeta, setIsSavingMeta] = useState(false);

  // Bulk Rejection Modal State
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectTaxonomyCode, setRejectTaxonomyCode] = useState<string>("TECHNICAL_ISSUES");
  const [moderatorFeedbackNotes, setModeratorFeedbackNotes] = useState("");
  const [submittingModeration, setSubmittingModeration] = useState(false);

  // Fetch Assets
  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeStatusFilter !== "all") params.set("status", activeStatusFilter);
      if (seriesFilter !== "all") params.set("seriesId", seriesFilter);
      if (searchQuery.trim()) params.set("query", searchQuery.trim());

      const res = await fetch(`/api/assets?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAssets(data.assets || []);
        if (data.series) {
          setAvailableSeries(data.series);
        }
      }
    } catch (err) {
      console.error("Failed to load assets:", err);
    } finally {
      setLoading(false);
    }
  }, [activeStatusFilter, seriesFilter, searchQuery]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  // Bulk Select
  const handleToggleSelectAll = () => {
    if (selectedAssetIds.size === assets.length) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(assets.map((a) => a.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    const next = new Set(selectedAssetIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedAssetIds(next);
  };

  // Drag & Drop Handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === "image/png" || file.type === "image/jpeg") {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      alert("Only PNG and JPG files are supported.");
      return;
    }

    const newItems: UploadQueueItem[] = validFiles.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      status: "waiting",
      progress: 0,
    }));

    setUploadQueue((prev) => [...prev, ...newItems]);
    processUploadQueue(newItems);
  };

  // Upload to Vercel Blob and process server-side
  const processUploadQueue = async (items: UploadQueueItem[]) => {
    for (const item of items) {
      setUploadQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 10 } : q))
      );

      try {
        let blobUrl = "";
        try {
          const newBlob = await upload(item.file.name, item.file, {
            access: "public",
            handleUploadUrl: "/api/upload",
          });
          blobUrl = newBlob.url;
        } catch {
          blobUrl = URL.createObjectURL(item.file);
        }

        setUploadQueue((prev) =>
          prev.map((q) => (q.id === item.id ? { ...q, status: "processing", progress: 60, blobUrl } : q))
        );

        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("blobUrl", blobUrl);
        formData.append("filename", item.file.name);

        const res = await fetch("/api/assets", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to process asset on server");
        }

        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: "success",
                  progress: 100,
                  qcResult: data.qcResult,
                  duplicateCheck: data.duplicateCheck,
                }
              : q
          )
        );

        fetchAssets();
      } catch (err: unknown) {
        setUploadQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: "error", progress: 100, error: (err as Error).message }
              : q
          )
        );
      }
    }
  };

  // QC Queue runner
  const handleStartQcQueue = () => {
    const selectedAssets = assets.filter((a) => selectedAssetIds.has(a.id));
    if (selectedAssets.length === 0) return;

    const newQueue: QcQueueItem[] = selectedAssets.map((a) => ({
      assetId: a.id,
      filename: a.filename,
      status: "waiting",
    }));

    setQcQueue(newQueue);
    setIsQcRunning(true);
    setIsQcPaused(false);
  };

  const processQcQueue = useCallback(async () => {
    if (!isQcRunning || isQcPaused) return;

    const nextIndex = qcQueue.findIndex((item) => item.status === "waiting");
    if (nextIndex === -1) {
      setIsQcRunning(false);
      fetchAssets();
      return;
    }

    const currentItem = qcQueue[nextIndex];
    setQcQueue((prev) =>
      prev.map((item, idx) => (idx === nextIndex ? { ...item, status: "running" } : item))
    );

    try {
      const res = await fetch(`/api/assets/${currentItem.assetId}/qc`, {
        method: "POST",
      });

      if (res.status === 429) {
        const backoffSeconds = 5;
        setQcQueue((prev) =>
          prev.map((item, idx) => (idx === nextIndex ? { ...item, status: "rate_limited" } : item))
        );
        for (let s = backoffSeconds; s > 0; s--) {
          setBackoffCountdown(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setBackoffCountdown(null);
        setQcQueue((prev) =>
          prev.map((item, idx) => (idx === nextIndex ? { ...item, status: "waiting" } : item))
        );
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "QC run failed");
      }

      setQcQueue((prev) =>
        prev.map((item, idx) =>
          idx === nextIndex
            ? {
                ...item,
                status: data.qcResult?.overall_pass ? "passed" : "failed",
                qcResult: data.qcResult,
              }
            : item
        )
      );
    } catch (err: unknown) {
      setQcQueue((prev) =>
        prev.map((item, idx) =>
          idx === nextIndex ? { ...item, status: "failed", error: (err as Error).message } : item
        )
      );
    }
  }, [isQcRunning, isQcPaused, qcQueue, fetchAssets]);

  useEffect(() => {
    if (isQcRunning && !isQcPaused) {
      processQcQueue();
    }
  }, [isQcRunning, isQcPaused, qcQueue, processQcQueue]);

  // Bulk Actions
  const handleBulkApprove = async () => {
    if (selectedAssetIds.size === 0) return;
    setSubmittingModeration(true);
    try {
      const res = await fetch("/api/assets/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: Array.from(selectedAssetIds),
          action: "approve",
        }),
      });
      if (res.ok) {
        setSelectedAssetIds(new Set());
        fetchAssets();
      }
    } catch (err) {
      console.error("Bulk approve failed:", err);
    } finally {
      setSubmittingModeration(false);
    }
  };

  const handleBulkRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssetIds.size === 0) return;
    setSubmittingModeration(true);
    try {
      const res = await fetch("/api/assets/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetIds: Array.from(selectedAssetIds),
          action: "reject",
          taxonomyCode: rejectTaxonomyCode,
          feedbackNotes: moderatorFeedbackNotes,
        }),
      });
      if (res.ok) {
        setIsRejectModalOpen(false);
        setModeratorFeedbackNotes("");
        setSelectedAssetIds(new Set());
        fetchAssets();
      }
    } catch (err) {
      console.error("Bulk reject failed:", err);
    } finally {
      setSubmittingModeration(false);
    }
  };

  // Inspect Asset in Drawer
  const handleInspectAsset = async (asset: AssetRow, tab: "qc" | "metadata" | "history" = "qc") => {
    setInspectingAsset(asset);
    setDrawerTab(tab);
    setInspectDrawerOpen(true);
    setInspectingQcData(null);
    setInspectingHistory([]);
    setMetaTitle("");
    setMetaKeywords([]);

    try {
      const res = await fetch(`/api/assets/${asset.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.latestQc?.raw) setInspectingQcData(data.latestQc.raw as GeminiQcResult);
        if (data.history) setInspectingHistory(data.history);
      }

      const metaRes = await fetch(`/api/assets/${asset.id}/metadata`);
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        if (metaData.metadata) {
          setMetaTitle(metaData.metadata.title || "");
          setMetaCategoryId(metaData.metadata.categoryId || 11);
        }
        if (metaData.keywords) {
          setMetaKeywords(metaData.keywords || []);
        }
      }
    } catch (err) {
      console.warn("Could not load asset inspection details:", err);
    }
  };

  const handleRunSingleQc = async () => {
    if (!inspectingAsset) return;
    setIsRunningSingleQc(true);
    try {
      const res = await fetch(`/api/assets/${inspectingAsset.id}/qc`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "QC check failed");

      setInspectingQcData(data.qcResult);
      if (data.asset) {
        setInspectingAsset((prev) => (prev ? { ...prev, status: data.asset.status } : null));
      }
      fetchAssets();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsRunningSingleQc(false);
    }
  };

  const handleApplyOverride = async () => {
    if (!inspectingAsset) return;
    setIsSubmittingOverride(true);
    try {
      const res = await fetch(`/api/assets/${inspectingAsset.id}/override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: manualOverrideStatus,
          note: manualOverrideNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Override failed");

      setInspectingAsset((prev) => (prev ? { ...prev, status: manualOverrideStatus } : null));
      fetchAssets();
      alert(`Status updated to ${manualOverrideStatus}`);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSubmittingOverride(false);
    }
  };

  const handleGenerateMetadata = async () => {
    if (!inspectingAsset) return;
    setIsGeneratingMeta(true);
    try {
      const res = await fetch(`/api/assets/${inspectingAsset.id}/metadata/generate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Metadata generation failed");

      setMetaTitle(data.metadata.title);
      setMetaKeywords(data.metadata.keywords);
      setMetaCategoryId(data.metadata.categoryId);
      fetchAssets();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsGeneratingMeta(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!inspectingAsset) return;
    setIsSavingMeta(true);
    try {
      const res = await fetch(`/api/assets/${inspectingAsset.id}/metadata`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: metaTitle,
          categoryId: metaCategoryId,
          keywords: metaKeywords,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save metadata failed");
      alert("Metadata saved successfully!");
      fetchAssets();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsSavingMeta(false);
    }
  };

  const handleAddKeyword = () => {
    const trimmed = newKeywordInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!metaKeywords.includes(trimmed)) {
      setMetaKeywords((prev) => [...prev, trimmed]);
    }
    setNewKeywordInput("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    setMetaKeywords((prev) => prev.filter((k) => k !== keyword));
  };

  const titleValidation = validateTitle(metaTitle);
  const keywordsValidation = validateAndOrderKeywords(metaKeywords, metaTitle);
  const substantiveTitleWords = extractSubstantiveTitleWords(metaTitle);

  const qcCompletedCount = qcQueue.filter((q) => q.status === "passed" || q.status === "failed").length;
  const qcProgressPercent = qcQueue.length > 0 ? Math.round((qcCompletedCount / qcQueue.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Assets Management</span>
            <span className="rounded-full bg-pastel-lavender/60 text-charcoal-900 px-3 py-0.5 text-xs font-semibold">
              {assets.length} items
            </span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Multi-file ingest, 64-bit DCT pHash duplicate gate, and Gemini Vision automated quality control.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedAssetIds.size > 0 && (
            <>
              <button
                onClick={handleStartQcQueue}
                className="flex items-center gap-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Run QC ({selectedAssetIds.size})</span>
              </button>

              <button
                disabled={submittingModeration}
                onClick={handleBulkApprove}
                className="flex items-center gap-1.5 rounded-full bg-status-readyBg border border-status-readyBorder text-status-readyText hover:brightness-95 px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve ({selectedAssetIds.size})</span>
              </button>

              <button
                disabled={submittingModeration}
                onClick={() => setIsRejectModalOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-status-rejectedBg border border-status-rejectedBorder text-status-rejectedText hover:brightness-95 px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject ({selectedAssetIds.size})</span>
              </button>
            </>
          )}

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-full bg-white border border-base-border text-charcoal-900 shadow-pill hover:bg-base-cardWarm px-4 py-2 text-xs font-medium transition-all cursor-pointer"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload Images</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
          />
        </div>
      </div>

      {/* Multi-file Drag & Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center transition-all cursor-pointer shadow-soft ${
          dragActive
            ? "border-charcoal-900 bg-pastel-lavender/20 scale-[1.005]"
            : "border-base-border bg-white hover:border-pastel-lavender hover:bg-base-cardWarm"
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pastel-lavender text-charcoal-900 shadow-pill mb-3">
          <UploadCloud className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-semibold text-charcoal-900">
          Drag and drop images here, or <span className="text-charcoal-900 underline font-bold">browse</span>
        </h3>
        <p className="mt-1 text-xs text-charcoal-muted max-w-md">
          PNG &amp; JPG accepted. Files can exceed 4.5MB via Vercel Blob client uploads.
        </p>
      </div>

      {/* Upload Queue Progress */}
      {uploadQueue.length > 0 && (
        <div className="rounded-3xl border border-base-border bg-white p-5 space-y-3 shadow-soft">
          <div className="flex items-center justify-between border-b border-base-border pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
              <UploadCloud className="h-4 w-4" />
              <span>Upload Queue ({uploadQueue.length} files)</span>
            </h3>
            <button
              onClick={() => setUploadQueue([])}
              className="rounded-full p-1 text-charcoal-muted hover:text-charcoal-900"
              title="Clear list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {uploadQueue.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-base-border bg-base-cardWarm px-4 py-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 truncate max-w-[60%]">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      item.status === "success"
                        ? "bg-emerald-500"
                        : item.status === "error"
                        ? "bg-rose-500"
                        : "bg-amber-400 animate-pulse"
                    }`}
                  />
                  <span className="font-medium text-charcoal-900 truncate">{item.file.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {item.duplicateCheck?.isDuplicate && (
                    <span className="rounded-full bg-status-pendingBg border border-status-pendingBorder px-2.5 py-0.5 text-[10px] font-semibold text-status-pendingText">
                      Duplicate (dist: {item.duplicateCheck.minDistance})
                    </span>
                  )}
                  {item.qcResult && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                        item.qcResult.passed
                          ? "bg-status-readyBg border-status-readyBorder text-status-readyText"
                          : "bg-status-rejectedBg border-status-rejectedBorder text-status-rejectedText"
                      }`}
                    >
                      {item.qcResult.megapixels} MP {item.qcResult.passed ? "Pass" : "Fail"}
                    </span>
                  )}
                  <span className="text-[11px] capitalize text-charcoal-muted">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gemini Vision QC Queue Panel (Active Runner) */}
      {qcQueue.length > 0 && (
        <div className="rounded-3xl border border-base-border bg-white p-5 space-y-4 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-base-border pb-3">
            <div className="flex items-center gap-2.5">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  isQcRunning && !isQcPaused ? "bg-amber-500 animate-pulse" : "bg-charcoal-muted"
                }`}
              />
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                <span>Gemini Vision QC Queue</span>
              </h3>
              <span className="text-xs text-charcoal-muted">
                ({qcCompletedCount} / {qcQueue.length} done &bull; {qcProgressPercent}%)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {backoffCountdown !== null && (
                <span className="rounded-full bg-status-pendingBg border border-status-pendingBorder px-3 py-1 text-xs text-status-pendingText animate-pulse">
                  Rate limit backoff: resuming in {backoffCountdown}s
                </span>
              )}

              {isQcRunning && (
                <button
                  onClick={() => setIsQcPaused(!isQcPaused)}
                  className="flex items-center gap-1.5 rounded-full border border-base-border bg-white px-3.5 py-1 text-xs font-medium text-charcoal-900 hover:bg-base-cardWarm shadow-pill"
                >
                  {isQcPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                  <span>{isQcPaused ? "Resume" : "Pause"}</span>
                </button>
              )}

              <button
                onClick={() => setQcQueue([])}
                className="rounded-full p-1 text-charcoal-muted hover:text-charcoal-900"
                title="Dismiss queue"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="h-2 w-full rounded-full bg-[#EBEBE8] overflow-hidden">
            <div
              className="h-full rounded-full bg-charcoal-900 transition-all duration-300"
              style={{ width: `${qcProgressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setActiveStatusFilter("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-all shadow-pill ${
              activeStatusFilter === "all"
                ? "bg-charcoal-900 text-white font-semibold"
                : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
            }`}
          >
            All ({assets.length})
          </button>
          {ASSET_STATUSES.map((st) => {
            const count = assets.filter((a) => a.status === st).length;
            const active = activeStatusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setActiveStatusFilter(st)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-all shadow-pill flex items-center gap-1.5 ${
                  active
                    ? "bg-charcoal-900 text-white font-semibold"
                    : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
                }`}
              >
                <span>{st.replace("_", " ")}</span>
                <span className="text-[10px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {availableSeries.length > 0 && (
            <select
              value={seriesFilter}
              onChange={(e) => setSeriesFilter(e.target.value)}
              className="rounded-full border border-base-border bg-white px-3.5 py-1.5 text-xs text-charcoal-900 shadow-pill focus:outline-none"
            >
              <option value="all">All Series</option>
              {availableSeries.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({s.currentCount}/{s.maxQuota})
                </option>
              ))}
            </select>
          )}

          <div className="relative">
            <Search className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 h-3.5 w-3.5 text-charcoal-muted my-auto" />
            <input
              type="text"
              placeholder="Search filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 rounded-full border border-base-border bg-white py-1.5 pl-8 pr-3 text-xs text-charcoal-900 placeholder-charcoal-muted shadow-pill focus:outline-none"
            />
          </div>

          <button
            onClick={fetchAssets}
            className="rounded-full border border-base-border bg-white p-2 text-charcoal-muted hover:text-charcoal-900 shadow-pill transition-colors cursor-pointer"
            title="Refresh assets"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Assets Table (Reference Style: Separate rounded row cards) */}
      <div className="overflow-x-auto pb-4">
        <table className="w-full text-left text-xs border-separate border-spacing-y-2">
          <thead>
            <tr className="text-[11px] font-semibold uppercase tracking-wider text-charcoal-muted">
              <th scope="col" className="w-10 px-4 py-2">
                <button onClick={handleToggleSelectAll} className="text-charcoal-muted hover:text-charcoal-900">
                  {assets.length > 0 && selectedAssetIds.size === assets.length ? (
                    <CheckSquare className="h-4 w-4 text-charcoal-900" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-4 py-2">Preview</th>
              <th scope="col" className="px-4 py-2">Filename</th>
              <th scope="col" className="px-4 py-2">Dimensions &amp; MP</th>
              <th scope="col" className="px-4 py-2">64-bit pHash</th>
              <th scope="col" className="px-4 py-2">Status</th>
              <th scope="col" className="px-4 py-2">Series</th>
              <th scope="col" className="px-4 py-2 text-right">Inspect</th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center bg-white rounded-3xl border border-base-border shadow-soft">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="rounded-full bg-pastel-lavender/60 p-4 text-charcoal-900 mb-3 shadow-pill">
                      <FileImage className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-charcoal-900">
                      No Assets Matching Filters
                    </h3>
                    <p className="mt-1 text-xs text-charcoal-muted leading-relaxed">
                      Upload new PNG/JPG renders above or adjust the active filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              assets.map((asset) => {
                const isSelected = selectedAssetIds.has(asset.id);
                const badge = STATUS_BADGES[asset.status] || STATUS_BADGES.idea;
                const Icon = badge.icon;
                const megapixels = ((asset.width * asset.height) / 1_000_000).toFixed(1);

                return (
                  <tr
                    key={asset.id}
                    className={`bg-white rounded-2xl border border-base-border shadow-soft hover:shadow-softHover transition-all ${
                      isSelected ? "ring-2 ring-charcoal-900/10" : ""
                    }`}
                  >
                    <td className="px-4 py-3 first:rounded-l-2xl">
                      <button
                        onClick={() => handleToggleSelectOne(asset.id)}
                        className="text-charcoal-muted hover:text-charcoal-900"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-charcoal-900" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div
                        onClick={() => handleInspectAsset(asset, "qc")}
                        className="relative h-11 w-11 rounded-xl border border-base-border bg-base-cardWarm overflow-hidden cursor-pointer hover:border-charcoal-900 transition-colors shadow-sm"
                      >
                        {asset.blobUrl ? (
                          <img
                            src={asset.blobUrl}
                            alt={asset.filename}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-charcoal-muted">
                            <FileImage className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-charcoal-900">
                      <button
                        onClick={() => handleInspectAsset(asset, "qc")}
                        className="text-left hover:text-charcoal-700 transition-colors font-mono text-xs"
                      >
                        {asset.filename}
                      </button>
                    </td>

                    <td className="px-4 py-3">
                      <div className="text-charcoal-900 font-medium">
                        {asset.width} &times; {asset.height}
                      </div>
                      <div className="text-[11px] text-charcoal-muted">
                        {megapixels} MP {Number(megapixels) >= 4 ? "✓" : "⚠ <4MP"}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] bg-base-cardWarm px-2.5 py-1 rounded-full border border-base-border text-charcoal-700">
                        {asset.phashHex || "0000000000000000"}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>
                    </td>

                    <td className="px-4 py-3 text-charcoal-muted">
                      {asset.seriesTitle ? (
                        <div>
                          <span className="text-charcoal-900 font-medium">{asset.seriesTitle}</span>
                          {asset.seriesQuota && asset.seriesCount && (
                            <div className="text-[10px] text-charcoal-muted">
                              Quota: {asset.seriesCount}/{asset.seriesQuota}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-charcoal-muted/50">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right last:rounded-r-2xl">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleInspectAsset(asset, "metadata")}
                          className="inline-flex items-center gap-1 rounded-full border border-base-border bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal-900 hover:bg-pastel-lavender/30 shadow-pill transition-colors cursor-pointer"
                          title="Edit SEO Metadata"
                        >
                          <Tag className="h-3 w-3" />
                          <span>SEO</span>
                        </button>
                        <button
                          onClick={() => handleInspectAsset(asset, "qc")}
                          className="inline-flex items-center gap-1 rounded-full border border-base-border bg-white px-2.5 py-1 text-[11px] font-medium text-charcoal-900 hover:bg-pastel-blue/30 shadow-pill transition-colors cursor-pointer ml-1"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Right Drawer: Quality Control & SEO Metadata Editor */}
      <RightDrawer
        isOpen={inspectDrawerOpen}
        onClose={() => setInspectDrawerOpen(false)}
        title={inspectingAsset ? inspectingAsset.filename : "Asset Inspector"}
        subtitle="Gemini Vision Quality Gate & Adobe SEO Metadata Editor"
        width="max-w-xl"
      >
        {inspectingAsset && (
          <div className="space-y-5 text-sm">
            {/* Image Preview Thumbnail */}
            <div className="rounded-2xl border border-base-border bg-white overflow-hidden flex items-center justify-center p-3 shadow-soft">
              <img
                src={inspectingAsset.blobUrl}
                alt={inspectingAsset.filename}
                className="max-h-64 w-auto rounded-xl object-contain shadow-sm"
              />
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDrawerTab("qc")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
                  drawerTab === "qc"
                    ? "bg-charcoal-900 text-white"
                    : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Vision QC</span>
              </button>

              <button
                onClick={() => setDrawerTab("metadata")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
                  drawerTab === "metadata"
                    ? "bg-charcoal-900 text-white"
                    : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900"
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>SEO Metadata</span>
              </button>

              <button
                onClick={() => setDrawerTab("history")}
                className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer ${
                  drawerTab === "history"
                    ? "bg-charcoal-900 text-white"
                    : "bg-white border border-base-border text-charcoal-muted hover:text-charcoal-900"
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>History</span>
              </button>
            </div>

            {/* TAB 1: VISION QC */}
            {drawerTab === "qc" && (
              <div className="space-y-4">
                {/* Status Bar */}
                <div className="flex items-center justify-between rounded-2xl border border-base-border bg-white p-4 shadow-soft">
                  <div>
                    <span className="text-[11px] uppercase tracking-wider text-charcoal-muted font-semibold">
                      Current Status
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                          (STATUS_BADGES[inspectingAsset.status] || STATUS_BADGES.idea).bg
                        } ${(STATUS_BADGES[inspectingAsset.status] || STATUS_BADGES.idea).text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${(STATUS_BADGES[inspectingAsset.status] || STATUS_BADGES.idea).dot}`} />
                        <span>{(STATUS_BADGES[inspectingAsset.status] || STATUS_BADGES.idea).label}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleRunSingleQc}
                    disabled={isRunningSingleQc}
                    className="flex items-center gap-2 rounded-full bg-charcoal-900 text-white hover:bg-charcoal-800 px-4 py-2 text-xs font-semibold shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isRunningSingleQc ? "animate-spin" : ""}`} />
                    <span>{isRunningSingleQc ? "Analyzing..." : "Re-run Gemini QC"}</span>
                  </button>
                </div>

                {inspectingQcData ? (
                  <div className="rounded-2xl border border-base-border bg-white p-5 space-y-4 shadow-soft">
                    <div className="flex items-center justify-between border-b border-base-border pb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" />
                        <span>Gemini Vision Analysis</span>
                      </h4>
                      <span
                        className={`rounded-full px-3 py-1 text-[11px] font-semibold border ${
                          inspectingQcData.overall_pass
                            ? "bg-status-readyBg text-status-readyText border-status-readyBorder"
                            : "bg-status-rejectedBg text-status-rejectedText border-status-rejectedBorder"
                        }`}
                      >
                        {inspectingQcData.overall_pass ? "Passed Quality Gate" : "Failed Gate"}
                      </span>
                    </div>

                    {/* Sharpness */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-charcoal-muted font-medium">Sharpness Score</span>
                        <span className="font-bold text-charcoal-900">{inspectingQcData.sharpness} / 100</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-[#EBEBE8] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            inspectingQcData.sharpness >= 80
                              ? "bg-emerald-500"
                              : inspectingQcData.sharpness >= 60
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                          style={{ width: `${inspectingQcData.sharpness}%` }}
                        />
                      </div>
                    </div>

                    {/* Copy Space & IP */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-base-border bg-base-cardWarm p-3">
                        <span className="text-charcoal-muted text-[11px]">Copy Space</span>
                        <p className="font-semibold text-charcoal-900 mt-0.5">
                          {inspectingQcData.copy_space.usable ? "Usable" : "Unusable"} ({inspectingQcData.copy_space.percent}%)
                        </p>
                      </div>

                      <div className="rounded-xl border border-base-border bg-base-cardWarm p-3">
                        <span className="text-charcoal-muted text-[11px]">IP Risk Level</span>
                        <p
                          className={`font-semibold capitalize mt-0.5 ${
                            inspectingQcData.ip_risk.level === "low"
                              ? "text-emerald-600"
                              : inspectingQcData.ip_risk.level === "medium"
                              ? "text-amber-600"
                              : "text-rose-600"
                          }`}
                        >
                          {inspectingQcData.ip_risk.level}
                        </p>
                      </div>
                    </div>

                    {/* Artifacts */}
                    <div>
                      <span className="text-xs font-semibold text-charcoal-900 block mb-2">
                        Detected Visual Artifacts ({inspectingQcData.artifacts.length})
                      </span>
                      {inspectingQcData.artifacts.length === 0 ? (
                        <div className="rounded-xl border border-status-readyBorder bg-status-readyBg p-3 text-xs text-status-readyText">
                          Zero optical or generative anomalies detected.
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {inspectingQcData.artifacts.map((art, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between rounded-xl border border-base-border bg-base-cardWarm p-2.5 text-xs"
                            >
                              <span className="text-charcoal-900 font-medium capitalize">{art.type}</span>
                              <span className="text-[10px] text-charcoal-muted">{art.location}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-base-border p-6 text-center text-xs text-charcoal-muted bg-white shadow-soft">
                    <Sparkles className="h-6 w-6 mx-auto mb-2 text-charcoal-muted" />
                    <p>Click &ldquo;Re-run Gemini QC&rdquo; to analyze this asset.</p>
                  </div>
                )}

                {/* Manual Override */}
                <div className="rounded-2xl border border-base-border bg-white p-5 space-y-3 shadow-soft">
                  <div className="flex items-center gap-2 text-charcoal-900 font-semibold text-xs uppercase tracking-wider">
                    <Sliders className="h-4 w-4" />
                    <span>Manual Status Override</span>
                  </div>
                  <div className="space-y-3">
                    <select
                      value={manualOverrideStatus}
                      onChange={(e) => setManualOverrideStatus(e.target.value as AssetStatus)}
                      className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3 py-2 text-xs text-charcoal-900 capitalize focus:outline-none"
                    >
                      {ASSET_STATUSES.map((st) => (
                        <option key={st} value={st}>{st.replace("_", " ")}</option>
                      ))}
                    </select>

                    <textarea
                      rows={2}
                      value={manualOverrideNote}
                      onChange={(e) => setManualOverrideNote(e.target.value)}
                      placeholder="Override reason (e.g. manually inspected text overlays and hands)..."
                      className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                    />

                    <button
                      onClick={handleApplyOverride}
                      disabled={isSubmittingOverride}
                      className="w-full rounded-full bg-charcoal-900 text-white hover:bg-charcoal-800 py-2.5 text-xs font-semibold shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                    >
                      {isSubmittingOverride ? "Saving..." : "Apply Manual Override"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: METADATA & SEO EDITOR */}
            {drawerTab === "metadata" && (
              <div className="space-y-4">
                {/* Auto-generate action */}
                <div className="flex items-center justify-between rounded-2xl border border-base-border bg-pastel-lavender/40 p-4 shadow-soft">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" />
                      <span>Gemini AI Metadata Generator</span>
                    </h4>
                    <p className="text-[11px] text-charcoal-muted">
                      Creates compliant Title (&le;70, no commas) + 15–35 ordered SEO keywords.
                    </p>
                  </div>

                  <button
                    onClick={handleGenerateMetadata}
                    disabled={isGeneratingMeta}
                    className="flex items-center gap-1.5 rounded-full bg-charcoal-900 text-white hover:bg-charcoal-800 px-4 py-2 text-xs font-semibold shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isGeneratingMeta ? "animate-spin" : ""}`} />
                    <span>{isGeneratingMeta ? "Generating..." : "Auto-Generate"}</span>
                  </button>
                </div>

                {/* Title Input & Live Validator */}
                <div className="rounded-2xl border border-base-border bg-white p-4 space-y-2 shadow-soft">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-charcoal-900">
                      Adobe Stock Title
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        metaTitle.length > CONFIG.TITLE.MAX_LENGTH
                          ? "text-rose-600 font-bold"
                          : metaTitle.length >= 60
                          ? "text-amber-600 font-semibold"
                          : "text-charcoal-muted"
                      }`}
                    >
                      {metaTitle.length} / {CONFIG.TITLE.MAX_LENGTH}
                    </span>
                  </div>

                  <input
                    type="text"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder="e.g. Cozy Wooden Cabin In Snowy Mountain Pines"
                    className={`w-full rounded-xl border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none focus:ring-1 ${
                      titleValidation.errors.length > 0 && metaTitle.length > 0
                        ? "border-rose-400 focus:ring-rose-500"
                        : "border-base-border focus:ring-charcoal-900"
                    }`}
                  />

                  {metaTitle.length > 0 && titleValidation.errors.length > 0 && (
                    <div className="space-y-1">
                      {titleValidation.errors.map((err, i) => (
                        <p key={i} className="text-[11px] text-rose-600 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span>{err}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Adobe Category */}
                <div className="rounded-2xl border border-base-border bg-white p-4 space-y-1.5 shadow-soft">
                  <label className="text-xs font-semibold text-charcoal-900">
                    Adobe Category
                  </label>
                  <select
                    value={metaCategoryId}
                    onChange={(e) => setMetaCategoryId(Number(e.target.value))}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3 py-2 text-xs text-charcoal-900 focus:outline-none"
                  >
                    {CONFIG.CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.id}. {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Keywords Tag Manager */}
                <div className="rounded-2xl border border-base-border bg-white p-4 space-y-3 shadow-soft">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-charcoal-900">
                      SEO Keywords ({metaKeywords.length})
                    </label>
                    <span
                      className={`font-mono text-[11px] ${
                        metaKeywords.length >= CONFIG.KEYWORDS.MIN_COUNT &&
                        metaKeywords.length <= CONFIG.KEYWORDS.MAX_COUNT
                          ? "text-emerald-600 font-semibold"
                          : "text-amber-600 font-semibold"
                      }`}
                    >
                      {metaKeywords.length} tags (req: {CONFIG.KEYWORDS.MIN_COUNT}–{CONFIG.KEYWORDS.MAX_COUNT})
                    </span>
                  </div>

                  {/* Add Tag Input */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          handleAddKeyword();
                        }
                      }}
                      placeholder="Type keyword and press Enter..."
                      className="flex-1 rounded-full border border-base-border bg-base-cardWarm px-4 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                    />
                    <button
                      onClick={handleAddKeyword}
                      className="rounded-full border border-base-border bg-white p-2 text-charcoal-900 hover:bg-base-cardWarm shadow-pill"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Keywords Tag Pills Cloud */}
                  <div className="rounded-xl border border-base-border bg-base-cardWarm p-3 min-h-[120px] max-h-56 overflow-y-auto flex flex-wrap gap-1.5">
                    {metaKeywords.length === 0 ? (
                      <span className="text-charcoal-muted text-xs italic">
                        No keywords added yet. Add tags or click Auto-Generate.
                      </span>
                    ) : (
                      metaKeywords.map((tag, idx) => {
                        const isTop10 = idx < 10;
                        const isSubstantive = substantiveTitleWords.includes(tag.toLowerCase());

                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition-all ${
                              isSubstantive && isTop10
                                ? "bg-pastel-yellow border-pastel-yellow text-charcoal-900 font-semibold shadow-sm"
                                : isTop10
                                ? "bg-pastel-lavender/60 border-pastel-lavender text-charcoal-900 font-medium"
                                : "bg-white border-base-border text-charcoal-muted"
                            }`}
                          >
                            <span className="text-[10px] text-charcoal-muted font-mono">
                              #{idx + 1}
                            </span>
                            <span>{tag}</span>
                            <button
                              onClick={() => handleRemoveKeyword(tag)}
                              className="text-charcoal-muted hover:text-charcoal-900 transition-colors ml-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        );
                      })
                    )}
                  </div>

                  {/* Substantive words reminder */}
                  <div className="rounded-xl bg-pastel-blue/30 border border-base-border p-3 text-[11px] text-charcoal-900">
                    <span className="font-semibold block mb-0.5">
                      Adobe Stock SEO Priority:
                    </span>
                    Positions 1–10 carry the highest search weight. Substantive title words ({substantiveTitleWords.join(", ") || "none"}) are prioritized in top 10 tags.
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={handleSaveMetadata}
                    disabled={isSavingMeta}
                    className="flex items-center gap-2 rounded-full bg-charcoal-900 text-white hover:bg-charcoal-800 px-6 py-2.5 text-xs font-semibold shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{isSavingMeta ? "Saving..." : "Save SEO Metadata"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: STATUS HISTORY */}
            {drawerTab === "history" && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
                  Status Transition Audit Trail
                </h4>
                {inspectingHistory.length === 0 ? (
                  <p className="text-xs text-charcoal-muted">No transitions recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {inspectingHistory.map((h) => (
                      <div
                        key={h.id}
                        className="rounded-2xl border border-base-border bg-white p-3.5 text-xs space-y-1 shadow-soft"
                      >
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-charcoal-900 capitalize">
                            {h.fromStatus ? `${h.fromStatus} → ` : ""}
                            {h.toStatus}
                          </span>
                          <span className="text-[10px] text-charcoal-muted">
                            {new Date(h.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {h.reason && (
                          <p className="text-[11px] text-charcoal-muted leading-relaxed">
                            {h.reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </RightDrawer>

      {/* Bulk Rejection Modal (Phase 6) */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <XCircle className="h-5 w-5" />
                <h2 className="text-base font-bold text-charcoal-900">
                  Reject {selectedAssetIds.size} Selected Assets
                </h2>
              </div>
              <button
                onClick={() => setIsRejectModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-charcoal-muted">
              Assign an Adobe Stock rejection taxonomy and optional reviewer notes to log root causes into the feedback loop.
            </p>

            <form onSubmit={handleBulkRejectSubmit} className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Rejection Taxonomy *
                </label>
                <select
                  value={rejectTaxonomyCode}
                  onChange={(e) => setRejectTaxonomyCode(e.target.value)}
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                >
                  <option value="TECHNICAL_ISSUES">TECHNICAL_ISSUES (Quality defects, noise, blur)</option>
                  <option value="SIMILAR_CONTENT">SIMILAR_CONTENT (Too similar to existing file)</option>
                  <option value="INTELLECTUAL_PROPERTY">INTELLECTUAL_PROPERTY (Copyright, logos, trademarks)</option>
                  <option value="METADATA_NON_COMPLIANT">METADATA_NON_COMPLIANT (Spam tags, AI terms)</option>
                  <option value="LOW_COMMERCIAL_VALUE">LOW_COMMERCIAL_VALUE (Lacks buyer utility)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Moderator Feedback / Notes
                </label>
                <textarea
                  rows={3}
                  value={moderatorFeedbackNotes}
                  onChange={(e) => setModeratorFeedbackNotes(e.target.value)}
                  placeholder="e.g., Chromatic aberration in background, or subject lacks contrast..."
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingModeration}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-pill disabled:opacity-50"
                >
                  {submittingModeration ? "Submitting..." : `Confirm Rejection (${selectedAssetIds.size})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
