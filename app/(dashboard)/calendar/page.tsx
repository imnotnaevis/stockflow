"use client";

import { useEffect, useState } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Flame,
  Clock,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  X,
  BarChart2,
} from "lucide-react";
import type { ThemeRecord } from "@/lib/store";
import type { SeasonalWindowInfo } from "@/lib/health";

interface ThemeWithSeasonal extends ThemeRecord {
  seasonalInfo: SeasonalWindowInfo;
  seriesCount: number;
}

interface CategoryBalance {
  counts: { seasonal: number; evergreen: number; copy_space: number };
  total: number;
  actualPct: { seasonal: number; evergreen: number; copy_space: number };
  targets: { seasonal: number; evergreen: number; copy_space: number };
}

export default function CalendarPage() {
  const [themes, setThemes] = useState<ThemeWithSeasonal[]>([]);
  const [balance, setBalance] = useState<CategoryBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "produce_now" | "upcoming" | "late" | "evergreen">("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<ThemeWithSeasonal | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"seasonal" | "evergreen" | "copy_space">("seasonal");
  const [targetEventDate, setTargetEventDate] = useState("");
  const [season, setSeason] = useState("Autumn");
  const [targetQuarter, setTargetQuarter] = useState("Q4");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/themes");
      if (res.ok) {
        const data = await res.json();
        setThemes(data.themes || []);
        setBalance(data.balance || null);
      }
    } catch (err) {
      console.error("Failed to load themes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingTheme(null);
    setName("");
    setCategory("seasonal");
    setTargetEventDate("");
    setSeason("Autumn");
    setTargetQuarter("Q4");
    setDescription("");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const openEditModal = (t: ThemeWithSeasonal) => {
    setEditingTheme(t);
    setName(t.name);
    setCategory(t.category);
    setTargetEventDate(t.targetEventDate || "");
    setSeason(t.season || "Autumn");
    setTargetQuarter(t.targetQuarter || "Q4");
    setDescription(t.description || "");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter a theme name.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg("");

      const payload = {
        name: name.trim(),
        category,
        targetEventDate: category === "seasonal" ? targetEventDate || null : null,
        season,
        targetQuarter,
        description: description.trim(),
      };

      if (editingTheme) {
        const res = await fetch(`/api/themes/${editingTheme.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to update theme");
      } else {
        const res = await fetch("/api/themes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Failed to create theme");
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setErrorMsg((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTheme = async (id: string, themeName: string) => {
    if (!confirm(`Are you sure you want to delete theme "${themeName}"?`)) return;
    try {
      const res = await fetch(`/api/themes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setThemes((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const filteredThemes = themes.filter((t) => {
    if (filter === "all") return true;
    if (filter === "evergreen") return t.category === "evergreen" || t.category === "copy_space";
    return t.seasonalInfo?.status === filter;
  });

  const produceNowCount = themes.filter((t) => t.seasonalInfo?.status === "produce_now").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Seasonal Calendar</span>
            <span className="rounded-full bg-pastel-lavender/60 text-charcoal-900 px-3 py-0.5 text-xs font-semibold">
              {themes.length} themes
            </span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Track commercial holiday windows (H-90 to H-30) and balance seasonal, evergreen, and copy-space quotas.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold px-5 py-2.5 text-xs shadow-pill transition-all cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Theme / Event</span>
        </button>
      </div>

      {/* Adobe Stock Rule Banner */}
      <div className="rounded-3xl border border-base-border bg-pastel-lavender/30 p-6 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-white border border-base-border text-charcoal-900 flex items-center justify-center flex-shrink-0 shadow-pill">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-charcoal-900">Adobe Stock H-90 to H-30 Buying Window</h3>
              <p className="text-xs text-charcoal-muted mt-1 max-w-2xl leading-relaxed">
                Stock buyers (advertisers, agencies, publishers) search and download seasonal assets 30 to 90
                days before holidays. Produce and submit assets during <span className="text-charcoal-900 font-semibold underline">H-90 to H-30</span> to maximize download velocity upon acceptance.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-base-border shadow-pill">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-charcoal-900 font-semibold">{produceNowCount} Active Windows</span>
          </div>
        </div>
      </div>

      {/* Category Quota Balance Meter */}
      {balance && (
        <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-4 w-4 text-charcoal-900" />
              <h2 className="text-sm font-semibold text-charcoal-900">Portfolio Category Quota Balance</h2>
            </div>
            <span className="text-xs text-charcoal-muted">Target: 40% Seasonal &bull; 40% Evergreen &bull; 20% Copy-Space</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Seasonal */}
            <div className="rounded-2xl border border-base-border bg-pastel-lavender/20 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-charcoal-900">Seasonal Holiday</span>
                <span className="text-charcoal-muted font-mono">
                  {balance.actualPct.seasonal}% <span className="text-charcoal-muted/70">/ 40% target</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-pastel-lavenderDeep rounded-full transition-all"
                  style={{ width: `${Math.min(100, balance.actualPct.seasonal)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-charcoal-muted">
                {balance.counts.seasonal} themes &bull; High surge in Q4 / holiday cycles
              </p>
            </div>

            {/* Evergreen */}
            <div className="rounded-2xl border border-base-border bg-pastel-blue/20 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-charcoal-900">Evergreen Commercial</span>
                <span className="text-charcoal-muted font-mono">
                  {balance.actualPct.evergreen}% <span className="text-charcoal-muted/70">/ 40% target</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-pastel-blueDeep rounded-full transition-all"
                  style={{ width: `${Math.min(100, balance.actualPct.evergreen)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-charcoal-muted">
                {balance.counts.evergreen} themes &bull; Consistent year-round commercial sales
              </p>
            </div>

            {/* Copy-Space */}
            <div className="rounded-2xl border border-base-border bg-pastel-yellow/20 p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-charcoal-900">Minimalist Copy-Space</span>
                <span className="text-charcoal-muted font-mono">
                  {balance.actualPct.copy_space}% <span className="text-charcoal-muted/70">/ 20% target</span>
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white overflow-hidden">
                <div
                  className="h-full bg-pastel-yellowDeep rounded-full transition-all"
                  style={{ width: `${Math.min(100, balance.actualPct.copy_space)}%` }}
                />
              </div>
              <p className="mt-2 text-[11px] text-charcoal-muted">
                {balance.counts.copy_space} themes &bull; Essential negative space for typography
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-pill ${
            filter === "all"
              ? "bg-charcoal-900 text-white font-semibold"
              : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          All Themes ({themes.length})
        </button>
        <button
          onClick={() => setFilter("produce_now")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-pill flex items-center gap-1.5 ${
            filter === "produce_now"
              ? "bg-charcoal-900 text-white font-semibold"
              : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Produce Now (H-90 to H-30)
        </button>
        <button
          onClick={() => setFilter("upcoming")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-pill ${
            filter === "upcoming"
              ? "bg-charcoal-900 text-white font-semibold"
              : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          Upcoming (&gt; 90 Days)
        </button>
        <button
          onClick={() => setFilter("late")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-pill ${
            filter === "late"
              ? "bg-charcoal-900 text-white font-semibold"
              : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          Late (&lt; 30 Days)
        </button>
        <button
          onClick={() => setFilter("evergreen")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all shadow-pill ${
            filter === "evergreen"
              ? "bg-charcoal-900 text-white font-semibold"
              : "border border-base-border bg-white text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm"
          }`}
        >
          Evergreen / Copy-Space
        </button>
      </div>

      {/* Themes Grid */}
      {loading ? (
        <div className="py-16 text-center text-charcoal-muted text-sm bg-white rounded-3xl border border-base-border shadow-soft">
          Loading seasonal themes...
        </div>
      ) : filteredThemes.length === 0 ? (
        <div className="py-16 text-center border border-dashed border-base-border rounded-3xl p-8 bg-white shadow-soft">
          <CalendarIcon className="h-8 w-8 text-charcoal-muted mx-auto mb-2" />
          <p className="text-charcoal-muted text-sm">No themes found matching filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredThemes.map((theme) => {
            const isProduceNow = theme.seasonalInfo?.status === "produce_now";
            const isLate = theme.seasonalInfo?.status === "late";
            const isUpcoming = theme.seasonalInfo?.status === "upcoming";

            return (
              <div
                key={theme.id}
                className="relative flex flex-col justify-between rounded-3xl border border-base-border bg-white p-6 shadow-soft hover:shadow-softHover transition-all"
              >
                <div>
                  {/* Top Bar Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                        isProduceNow
                          ? "bg-status-readyBg text-status-readyText border-status-readyBorder"
                          : isLate
                          ? "bg-status-pendingBg text-status-pendingText border-status-pendingBorder"
                          : isUpcoming
                          ? "bg-status-submittedBg text-status-submittedText border-status-submittedBorder"
                          : "bg-base-cardWarm text-charcoal-muted border-base-border"
                      }`}
                    >
                      {isProduceNow && <Flame className="h-3.5 w-3.5 text-emerald-600" />}
                      {isLate && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                      {isUpcoming && <Clock className="h-3.5 w-3.5 text-sky-600" />}
                      {theme.seasonalInfo?.label || "Evergreen"}
                    </span>

                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-base-cardWarm border border-base-border text-charcoal-muted">
                      {theme.targetQuarter || "Evergreen"}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-semibold text-charcoal-900">{theme.name}</h3>
                  <p className="mt-2 text-xs text-charcoal-muted line-clamp-2 leading-relaxed">
                    {theme.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-base-border flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-charcoal-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      {theme.seriesCount} series
                    </span>
                    <span className="capitalize px-2 py-0.5 rounded-full bg-base-cardWarm border border-base-border text-[11px]">
                      {theme.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(theme)}
                      className="p-2 rounded-full text-charcoal-muted hover:text-charcoal-900 hover:bg-base-cardWarm transition-colors"
                      title="Edit Theme"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTheme(theme.id, theme.name)}
                      className="p-2 rounded-full text-charcoal-muted hover:text-rose-600 hover:bg-base-cardWarm transition-colors"
                      title="Delete Theme"
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

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-charcoal-900">
                {editingTheme ? "Edit Production Theme" : "Create Production Theme"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-charcoal-muted hover:text-charcoal-900 bg-base-cardWarm"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="rounded-2xl bg-status-rejectedBg border border-status-rejectedBorder p-3 text-xs text-status-rejectedText">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveTheme} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Theme Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Winter Holidays & Cozy Christmas"
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as "seasonal" | "evergreen" | "copy_space")}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                  >
                    <option value="seasonal">Seasonal Holiday</option>
                    <option value="evergreen">Evergreen Commercial</option>
                    <option value="copy_space">Minimalist Copy-Space</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Target Event Date
                  </label>
                  <input
                    type="date"
                    disabled={category !== "seasonal"}
                    value={targetEventDate}
                    onChange={(e) => setTargetEventDate(e.target.value)}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 disabled:opacity-40 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Season
                  </label>
                  <select
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                  >
                    <option value="Winter">Winter</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Autumn">Autumn</option>
                    <option value="All-Year">All-Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                    Target Quarter
                  </label>
                  <select
                    value={targetQuarter}
                    onChange={(e) => setTargetQuarter(e.target.value)}
                    className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 focus:outline-none"
                  >
                    <option value="Q1">Q1 (Jan - Mar)</option>
                    <option value="Q2">Q2 (Apr - Jun)</option>
                    <option value="Q3">Q3 (Jul - Sep)</option>
                    <option value="Q4">Q4 (Oct - Dec)</option>
                    <option value="Evergreen">Evergreen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-charcoal-900 mb-1.5">
                  Production Description &amp; Niche
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe visual concepts, props, lighting, and buyer use cases..."
                  className="w-full rounded-xl border border-base-border bg-base-cardWarm px-3.5 py-2.5 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full text-xs font-medium text-charcoal-muted hover:text-charcoal-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold text-xs shadow-pill disabled:opacity-50 transition-all cursor-pointer"
                >
                  {submitting ? "Saving..." : editingTheme ? "Update Theme" : "Create Theme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
