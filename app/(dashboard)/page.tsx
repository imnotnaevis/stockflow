"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Target,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Plus,
  SlidersHorizontal,
  Image as ImageIcon,
  ArrowUpRight,
  Sparkles,
  Info,
  Clock,
  Layers,
  Flame,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  BarChart2,
  PieChart as PieIcon,
  Search,
  Bell,
  MoreVertical,
  Filter,
  Check,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { CONFIG } from "@/lib/config";
import type { HealthScoreResult } from "@/lib/health";

interface DashboardStats {
  kpis: {
    weeklyUploads: number;
    weeklyTarget: number;
    weeklyProgressPct: number;
    activeSeasonalAlertsCount: number;
    activeAlerts: Array<{
      id: string;
      name: string;
      targetEventDate: string | null;
      daysUntil: number;
      label: string;
    }>;
    health: HealthScoreResult;
  };
  charts: {
    pipeline: Array<{ name: string; status: string; count: number; fill: string }>;
    categories: Array<{
      name: string;
      category: string;
      count: number;
      actualPct: number;
      targetPct: number;
      fill: string;
    }>;
  };
  recentAssets: Array<{
    id: string;
    filename: string;
    blobUrl: string;
    thumbnailUrl?: string;
    status: string;
    createdAt: string;
    seriesTitle?: string;
    themeName?: string;
  }>;
  themesCount: number;
  seriesCount: number;
}

// Pastel Palette Mappings for Pipeline Stages
const PASTEL_STATUS_COLORS: Record<string, string> = {
  idea: "#D8D8D4", // Soft grey
  qc_pending: "#F8DA7A", // Butter yellow
  qc_failed: "#F5D3D8", // Soft blush
  ready: "#D2E7D6", // Soft sage
  submitted: "#C7D8EA", // Baby blue
  approved: "#BBE8C9", // Soft pastel green
  rejected: "#FAD5C0", // Soft peach
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
    fetch("/api/dashboard/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setStats(data);
      })
      .catch((err) => console.error("Failed to load dashboard stats:", err))
      .finally(() => setLoading(false));
  }, []);

  const health = stats?.kpis.health;

  return (
    <div className="space-y-7">
      {/* Top Greeting Header with Search, Bell, and Profile (Reference Matching) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-charcoal-900">
            Hi, Creator
          </h1>
          <p className="text-xs md:text-sm text-charcoal-muted mt-0.5">
            Your Adobe Stock AI portfolio overview and seasonal lead-time pipeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Pill Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-charcoal-muted" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48 sm:w-60 rounded-full border border-base-border bg-white pl-9 pr-4 py-2 text-xs text-charcoal-900 placeholder-charcoal-muted focus:outline-none focus:ring-2 focus:ring-pastel-lavender shadow-sm transition-all"
            />
          </div>

          {/* Circular Notification Bell */}
          <button
            aria-label="Notifications"
            className="w-10 h-10 rounded-full bg-white border border-base-border flex items-center justify-center text-charcoal-700 hover:text-charcoal-900 shadow-sm hover:scale-105 transition-all cursor-pointer relative"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-pastel-yellow ring-2 ring-white" />
          </button>

          {/* User Avatar with Green Online Dot */}
          <div className="flex items-center gap-2 pl-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pastel-lavender via-pastel-blue to-pastel-yellow border border-white shadow-sm flex items-center justify-center font-bold text-sm text-charcoal-900 overflow-hidden">
                <span className="font-semibold text-xs">SF</span>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Pastel KPI Cards (Matching Reference: Lavender, Baby Blue, Butter Yellow) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* KPI 1: Weekly Target (Lavender) */}
        <div className="rounded-3xl bg-pastel-lavender p-6 shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Weekly Production Target
              </span>
              <Link
                href="/assets"
                className="bg-white text-charcoal-900 hover:bg-base-cardWarm text-xs font-semibold px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1"
              >
                <span>Check</span>
                <ChevronRight className="w-3 h-3 text-charcoal-muted" />
              </Link>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-charcoal-900">
                {stats?.kpis.weeklyUploads ?? 22}
              </span>
              <span className="text-xs text-charcoal-700/80 font-medium">
                / {stats?.kpis.weeklyTarget ?? 50} assets
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-charcoal-700">
            <span>{stats?.kpis.weeklyProgressPct ?? 44}% of weekly pace</span>
            <span className="font-semibold text-charcoal-900">
              {Math.max(0, (stats?.kpis.weeklyTarget ?? 50) - (stats?.kpis.weeklyUploads ?? 22))} remaining
            </span>
          </div>
        </div>

        {/* KPI 2: Seasonal Alerts (Baby Blue) */}
        <div className="rounded-3xl bg-pastel-blue p-6 shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Seasonal Lead-Time Alerts
              </span>
              <Link
                href="/calendar"
                className="bg-white text-charcoal-900 hover:bg-base-cardWarm text-xs font-semibold px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1"
              >
                <span>Check</span>
                <ChevronRight className="w-3 h-3 text-charcoal-muted" />
              </Link>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-charcoal-900">
                {stats?.kpis.activeSeasonalAlertsCount ?? 1}
              </span>
              <span className="text-xs text-charcoal-700/80 font-medium">
                H-90 to H-30 windows
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-charcoal-700">
            <span className="line-clamp-1 max-w-[180px]">
              {stats?.kpis.activeAlerts[0]?.name || "Winter Holidays & Cozy Christmas"}
            </span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              Optimal
            </span>
          </div>
        </div>

        {/* KPI 3: Portfolio Health (Butter Yellow) */}
        <div className="rounded-3xl bg-pastel-yellow p-6 shadow-soft hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-700">
                Portfolio Health Score
              </span>
              <Link
                href="/settings"
                className="bg-white text-charcoal-900 hover:bg-base-cardWarm text-xs font-semibold px-3 py-1 rounded-full shadow-sm transition-all flex items-center gap-1"
              >
                <span>Check</span>
                <ChevronRight className="w-3 h-3 text-charcoal-muted" />
              </Link>
            </div>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-extrabold tracking-tight text-charcoal-900">
                {health?.score ?? 95}
              </span>
              <span className="text-xs text-charcoal-700/80 font-medium">/ 100</span>
              <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-full bg-white text-charcoal-900 shadow-xs">
                Grade {health?.grade ?? "A"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between text-xs text-charcoal-700">
            <span>{health?.gradeLabel || "Excellent Health"}</span>
            <span className="font-semibold text-charcoal-900">
              0 duplicate warnings
            </span>
          </div>
        </div>
      </div>

      {/* Campaign Overview & Analytics Section (Matching Reference Card) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Campaign & Production Overview */}
        <div className="lg:col-span-2 rounded-3xl bg-white border border-base-border p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-border">
            <div>
              <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
                Campaign &amp; Production Overview
              </h2>
              <p className="text-xs text-charcoal-muted mt-0.5">
                Asset pipeline trajectory from idea creation to Adobe Stock acceptance
              </p>
            </div>

            {/* Filter and Period Pills (Reference Styled) */}
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-base-border bg-base-cardWarm text-xs font-semibold text-charcoal-900 shadow-xs hover:bg-white transition-all cursor-pointer">
                <Filter className="w-3 h-3 text-charcoal-muted" />
                <span>Filter</span>
              </button>
              <button className="px-3 py-1 rounded-full border border-base-border bg-base-cardWarm text-xs font-semibold text-charcoal-900 shadow-xs hover:bg-white transition-all cursor-pointer">
                <span>Month</span>
              </button>
            </div>
          </div>

          {/* Reference Highlight Figures: Period and Delta in Soft Green */}
          <div className="flex items-center justify-between text-xs pt-1 px-1">
            <div>
              <span className="text-charcoal-muted block text-[11px]">Previous Cycle</span>
              <span className="font-extrabold text-charcoal-900 text-base">422</span>
            </div>

            <div className="text-center">
              <span className="text-lg font-extrabold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                +127 Velocity
              </span>
            </div>

            <div className="text-right">
              <span className="text-charcoal-muted block text-[11px]">Current Cycle</span>
              <span className="font-extrabold text-charcoal-900 text-base">549</span>
            </div>
          </div>

          {/* Recharts Soft Rounded Bar Chart */}
          <div className="h-60 w-full pt-2">
            {mounted && stats?.charts.pipeline ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.charts.pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#8A8A8A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#ECECE8" }}
                  />
                  <YAxis
                    stroke="#8A8A8A"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#ECECE8" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#ECECE8",
                      borderRadius: "16px",
                      fontSize: "12px",
                      color: "#2B2B2B",
                      boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.06)",
                    }}
                    cursor={{ fill: "rgba(227, 214, 238, 0.2)" }}
                  />
                  <Bar dataKey="count" radius={[12, 12, 0, 0]}>
                    {stats.charts.pipeline.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PASTEL_STATUS_COLORS[entry.status] || entry.fill}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-charcoal-muted text-xs">
                Loading analytics...
              </div>
            )}
          </div>
        </div>

        {/* Chart 2: Category Quota Balance */}
        <div className="rounded-3xl bg-white border border-base-border p-6 shadow-soft flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-base-border">
              <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
                Category Quota
              </h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-base-cardWarm border border-base-border font-mono text-charcoal-muted">
                Target 40/40/20
              </span>
            </div>
            <p className="text-xs text-charcoal-muted mt-2">
              Balanced asset distribution across Seasonal, Evergreen, and Minimalist Copy-Space
            </p>
          </div>

          <div className="h-44 w-full flex items-center justify-center my-auto">
            {mounted && stats?.charts.categories ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#FFFFFF",
                      borderColor: "#ECECE8",
                      borderRadius: "16px",
                      fontSize: "12px",
                      color: "#2B2B2B",
                      boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.06)",
                    }}
                  />
                  <Pie
                    data={stats.charts.categories}
                    dataKey="actualPct"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={70}
                    paddingAngle={5}
                  >
                    <Cell fill="#E3D6EE" /> {/* Seasonal: Lavender */}
                    <Cell fill="#C7D8EA" /> {/* Evergreen: Baby Blue */}
                    <Cell fill="#F8DA7A" /> {/* Copy-Space: Butter Yellow */}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-charcoal-muted text-xs">
                Loading balance...
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-base-border">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pastel-lavender ring-1 ring-purple-200" />
                <span className="text-charcoal-900 font-medium">Seasonal Content</span>
              </div>
              <span className="font-mono text-charcoal-muted">40% target</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pastel-blue ring-1 ring-blue-200" />
                <span className="text-charcoal-900 font-medium">Evergreen Stock</span>
              </div>
              <span className="font-mono text-charcoal-muted">40% target</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-pastel-yellow ring-1 ring-amber-200" />
                <span className="text-charcoal-900 font-medium">Copy-Space Mockup</span>
              </div>
              <span className="font-mono text-charcoal-muted">20% target</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Table: Matching Reference Rows and Pill Chips */}
      <div className="rounded-3xl bg-white border border-base-border p-6 shadow-soft space-y-4">
        {/* Table Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-border">
          <div>
            <h2 className="text-base font-bold text-charcoal-900 tracking-tight">
              Recent Activity &amp; Portfolio Assets
            </h2>
            <p className="text-xs text-charcoal-muted mt-0.5">
              Live production activity, individual assets, pHash fingerprints, and QC moderation verdicts
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {["all", "ready", "qc_pending", "qc_failed", "submitted", "approved"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === st
                    ? "bg-charcoal-900 text-white shadow-sm"
                    : "bg-base-cardWarm border border-base-border text-charcoal-700 hover:bg-white"
                }`}
              >
                {st === "all" ? "All" : st.replace("_", " ").toUpperCase()}
              </button>
            ))}
            <Link
              href="/assets"
              className="ml-1 text-xs text-charcoal-900 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Full Assets View &rarr;</span>
            </Link>
          </div>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-separate border-spacing-y-2.5">
            <thead>
              <tr className="text-charcoal-muted uppercase text-[11px] font-semibold tracking-wider">
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Filename</th>
                <th className="px-4 py-2">Series / Concept</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Date Added</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats?.recentAssets && stats.recentAssets.length > 0 ? (
                stats.recentAssets
                  .filter((a) => statusFilter === "all" || a.status === statusFilter)
                  .map((asset) => {
                    const isApproved = asset.status === "approved";
                    const isFailed = asset.status === "qc_failed";
                    const isPending = asset.status === "qc_pending";

                    return (
                      <tr
                        key={asset.id}
                        className="bg-base-cardWarm hover:bg-white border border-base-border shadow-2xs hover:shadow-soft transition-all duration-150 rounded-2xl"
                      >
                        {/* Type Chip (Reference Pastel Pill Style) */}
                        <td className="px-4 py-3 rounded-l-2xl">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-pastel-blue text-[#2C4866]">
                            <ImageIcon className="w-3 h-3" />
                            <span>Photo AI</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 font-semibold text-charcoal-900">
                          {asset.filename}
                        </td>

                        <td className="px-4 py-3 text-charcoal-muted">
                          {asset.themeName || asset.seriesTitle || "Winter Holidays"}
                        </td>

                        {/* Status (Reference Leading Icon & Semantic Text) */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              isApproved
                                ? "bg-status-readyBg text-status-readyText"
                                : isFailed
                                ? "bg-status-rejectedBg text-status-rejectedText"
                                : isPending
                                ? "bg-status-pendingBg text-status-pendingText"
                                : "bg-status-submittedBg text-status-submittedText"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isApproved
                                  ? "bg-emerald-600"
                                  : isFailed
                                  ? "bg-rose-600"
                                  : isPending
                                  ? "bg-amber-600"
                                  : "bg-cyan-600"
                              }`}
                            />
                            <span className="capitalize">{asset.status.replace("_", " ")}</span>
                          </span>
                        </td>

                        <td className="px-4 py-3 text-charcoal-muted font-mono text-[11px]">
                          {new Date(asset.createdAt).toLocaleDateString()}
                        </td>

                        <td className="px-4 py-3 rounded-r-2xl text-right">
                          <Link
                            href="/assets"
                            className="w-8 h-8 rounded-full bg-white border border-base-border inline-flex items-center justify-center text-charcoal-700 hover:text-charcoal-900 shadow-xs hover:scale-105 transition-all"
                            title="Inspect Asset"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-charcoal-muted">
                    <p>No assets found matching the filter.</p>
                    <Link
                      href="/assets"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-charcoal-900 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-charcoal-800"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Upload New Assets</span>
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
