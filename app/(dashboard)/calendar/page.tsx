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
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CalendarDays,
  ListFilter,
  CheckCircle2,
} from "lucide-react";
import type { ThemeRecord } from "@/lib/store";
import type { SeasonalWindowInfo } from "@/lib/health";

interface CalendarEvent {
  date: string; // YYYY-MM-DD
  title: string;
  category: "holiday" | "h90_kickoff" | "h30_deadline" | "theme";
  description: string;
  badgeColor: string; // pastel class
  textColor: string;
  commercialTip: string;
  suggestedPrompt: string;
}

// Built-in Comprehensive Global Commercial & Adobe Stock Events
const GLOBAL_COMMERCIAL_EVENTS: CalendarEvent[] = [
  // 2026 Q4 (Nov - Dec)
  {
    date: "2026-11-01",
    title: "All Saints' Day & Q4 Ad Sprint",
    category: "holiday",
    badgeColor: "bg-pastel-lavender/50 border-pastel-lavender",
    textColor: "text-pastel-lavenderDeep",
    description: "Launch of peak Q4 marketing and high-budget brand ad campaigns worldwide.",
    commercialTip: "Buyers urgently license cozy autumn family portraits, baking, and early holiday gift concepts.",
    suggestedPrompt: "Warm cozy kitchen, mother and daughter baking cinnamon holiday cookies, soft golden morning light, authentic candid expressions, copy space on top right --ar 16:9",
  },
  {
    date: "2026-11-05",
    title: "Produce for Valentine's Day (H-90)",
    category: "h90_kickoff",
    badgeColor: "bg-pastel-sage/50 border-pastel-sage",
    textColor: "text-pastel-sageDeep",
    description: "H-90 Start: Produce romantic, culinary, and luxury gifting visuals for February 14.",
    commercialTip: "Start submitting early so assets accumulate rank before agency buyers start searching in January.",
    suggestedPrompt: "Artisan luxury chocolate truffles in elegant matte packaging, fresh red roses in background with soft focus bokeh, studio commercial lighting, premium flat lay --ar 1:1",
  },
  {
    date: "2026-11-11",
    title: "Singles' Day & Veterans Day",
    category: "holiday",
    badgeColor: "bg-pastel-blue/50 border-pastel-blue",
    textColor: "text-pastel-blueDeep",
    description: "Massive global e-commerce retail flash sales and patriotic memorial content.",
    commercialTip: "High demand for mobile shopping mockups, delivery parcels, and retail sale 3D typography.",
    suggestedPrompt: "Minimalist pastel parcel delivery boxes with subtle ribbon accents, smartphone displaying mock checkout, clean commercial isometric 3D render --ar 4:3",
  },
  {
    date: "2026-11-20",
    title: "Cyber Week Final Upload Window (H-30)",
    category: "h30_deadline",
    badgeColor: "bg-pastel-peach/50 border-pastel-peach",
    textColor: "text-pastel-peachDeep",
    description: "Final cutoff to license last-minute promotional banners and shopping graphics.",
    commercialTip: "Focus on clean copy-space discount templates and neon retail tags.",
    suggestedPrompt: "Minimalist shopping podium with neon discount tag, soft warm shadows, elegant empty copy space for sales text, modern aesthetic --ar 16:9",
  },
  {
    date: "2026-11-26",
    title: "Thanksgiving Day",
    category: "holiday",
    badgeColor: "bg-pastel-yellow/50 border-pastel-yellow",
    textColor: "text-pastel-yellowDeep",
    description: "Traditional feast, gratitude gatherings, roasted harvest meals, and family reunions.",
    commercialTip: "Autumn harvest dinner table flat-lays with roast turkey, pumpkin pie, and warm linen textures.",
    suggestedPrompt: "Abundant Thanksgiving dinner table viewed from above, roasted turkey with rosemary, autumn floral arrangement, warm candlelight, rustic wood tabletop --ar 16:9",
  },
  {
    date: "2026-11-27",
    title: "Black Friday Shopping Event",
    category: "holiday",
    badgeColor: "bg-charcoal-900 border-charcoal-900 text-white",
    textColor: "text-white",
    description: "Largest annual retail discount event with unprecedented consumer search volume.",
    commercialTip: "Black Friday retail badges, smiling customers with paper bags, and online sale mockups.",
    suggestedPrompt: "Excited diverse shoppers holding sleek shopping bags walking past minimalist boutique windows, candid natural daylight, cinematic depth of field --ar 16:9",
  },
  {
    date: "2026-11-30",
    title: "Cyber Monday E-Commerce",
    category: "holiday",
    badgeColor: "bg-pastel-blue/50 border-pastel-blue",
    textColor: "text-pastel-blueDeep",
    description: "Global online tech, software, and consumer electronics discount extravaganza.",
    commercialTip: "Laptops, credit cards, glowing digital discount graphics, and modern workspace setups.",
    suggestedPrompt: "Modern desk with open laptop showing abstract colorful screen, coffee cup, credit card on terrazzo coaster, clean workspace lighting --ar 16:9",
  },
  {
    date: "2026-12-05",
    title: "Produce for Easter & Spring Bloom (H-90)",
    category: "h90_kickoff",
    badgeColor: "bg-pastel-sage/50 border-pastel-sage",
    textColor: "text-pastel-sageDeep",
    description: "H-90 Start: Botanical, gardening, fresh springtime recipes, and Easter confectionery.",
    commercialTip: "Buyers start scheduling spring lifestyle magazine layouts in December and January.",
    suggestedPrompt: "Pastel painted Easter eggs nestled in natural woven moss basket, fresh spring tulips and daffodil blossoms, bright airy morning sunlight --ar 1:1",
  },
  {
    date: "2026-12-10",
    title: "Hanukkah Begins",
    category: "holiday",
    badgeColor: "bg-pastel-blue/50 border-pastel-blue",
    textColor: "text-pastel-blueDeep",
    description: "Festival of Lights: Menorah candles, traditional dreidels, and celebratory gatherings.",
    commercialTip: "Blue and silver themed holiday imagery, lit brass Menorah with warm glowing flame bokeh.",
    suggestedPrompt: "Traditional polished brass menorah with lit blue and white candles, glowing flame bokeh, wooden dreidels scattered on rustic table --ar 16:9",
  },
  {
    date: "2026-12-21",
    title: "Winter Solstice",
    category: "holiday",
    badgeColor: "bg-pastel-lavender/50 border-pastel-lavender",
    textColor: "text-pastel-lavenderDeep",
    description: "First day of astronomical winter, snowbound landscapes, and cozy hygge lifestyle.",
    commercialTip: "Misty pine forests dusted with snow, woolen blankets, hot cocoa with marshmallows.",
    suggestedPrompt: "Steaming ceramic mug of hot chocolate with fluffy marshmallows, knitted wool blanket beside frosted window overlooking pine trees, tranquil hygge ambiance --ar 4:3",
  },
  {
    date: "2026-12-24",
    title: "Christmas Eve",
    category: "holiday",
    badgeColor: "bg-pastel-yellow/50 border-pastel-yellow",
    textColor: "text-pastel-yellowDeep",
    description: "Evening celebrations, fireplace glow, gift exchanges, and anticipation.",
    commercialTip: "Stocking mantels, lit Christmas tree lights reflected in glass ornaments.",
    suggestedPrompt: "Warm rustic brick fireplace with hanging personalized stockings, lit cedar garland, glowing Christmas tree in background, soft evening light --ar 16:9",
  },
  {
    date: "2026-12-25",
    title: "Christmas Day",
    category: "holiday",
    badgeColor: "bg-pastel-lavender/50 border-pastel-lavender",
    textColor: "text-pastel-lavenderDeep",
    description: "Peak global holiday: gift unwrapping, joyous family gatherings, and festive feasts.",
    commercialTip: "Highest single-day downloads for seasonal greetings, card backgrounds, and banners.",
    suggestedPrompt: "Elegantly wrapped holiday gift boxes tied with velvet ribbons under pine tree, scattered pinecones and gold glitter, generous copy space in center --ar 16:9",
  },
  {
    date: "2026-12-31",
    title: "New Year's Eve Celebration",
    category: "holiday",
    badgeColor: "bg-pastel-yellow/50 border-pastel-yellow",
    textColor: "text-pastel-yellowDeep",
    description: "Midnight countdown, champagne toasts, glitter confetti, and festive galas.",
    commercialTip: "Champagne flute clinking with golden effervescent bubbles, 2027 metallic balloons.",
    suggestedPrompt: "Two crystal champagne glasses clinking in celebratory toast, golden sparkling effervescence, blurred gold and silver bokeh in background, luxury celebration --ar 16:9",
  },
  // 2027 Q1 (Jan - Mar)
  {
    date: "2027-01-01",
    title: "New Year's Day & Wellness Sprint",
    category: "holiday",
    badgeColor: "bg-pastel-sage/50 border-pastel-sage",
    textColor: "text-pastel-sageDeep",
    description: "Fresh start resolutions: health, fitness, financial planning, and productivity.",
    commercialTip: "High surge in gym, organic nutrition, clean diaries, and workspace organization assets.",
    suggestedPrompt: "Healthy breakfast smoothie bowl with fresh berries, chia seeds, and mint, arranged beside workout gear on clean bright granite counter --ar 1:1",
  },
  {
    date: "2027-01-29",
    title: "Lunar New Year (Spring Festival)",
    category: "holiday",
    badgeColor: "bg-pastel-peach/50 border-pastel-peach",
    textColor: "text-pastel-peachDeep",
    description: "Year of the Snake/Horse celebrations, red envelopes, lanterns, and family reunion feasts.",
    commercialTip: "Red and gold lanterns, traditional Chinese dumplings, calligraphy couplets.",
    suggestedPrompt: "Vibrant red silk lanterns glowing under evening sky, gold tassel accents, festive traditional Asian courtyard in background, cinematic commercial lighting --ar 16:9",
  },
  {
    date: "2027-02-14",
    title: "Valentine's Day",
    category: "holiday",
    badgeColor: "bg-pastel-blush/50 border-pastel-blush",
    textColor: "text-pastel-blushDeep",
    description: "Romance, floral gifts, gourmet dining, and jewelry commercial peak.",
    commercialTip: "Heart-shaped pastries, minimalist pastel gift boxes, bouquet of red and pink garden roses.",
    suggestedPrompt: "Delicate bouquet of assorted blush pink and deep red roses in glass vase, soft window light, handwritten love note on textured cardstock, copy space --ar 4:3",
  },
  {
    date: "2027-02-17",
    title: "Ramadan Holy Month Begins",
    category: "holiday",
    badgeColor: "bg-pastel-blue/50 border-pastel-blue",
    textColor: "text-pastel-blueDeep",
    description: "Fasting, spiritual contemplation, charity, and evening Iftar meals.",
    commercialTip: "Crescent moon and Arabic brass fanous lantern, dates and water on ornate brass tray.",
    suggestedPrompt: "Intricately carved brass Islamic lantern with warm glowing candle inside, bowl of organic Medjool dates on geometric patterned cloth, serene evening twilight --ar 16:9",
  },
  {
    date: "2027-03-08",
    title: "International Women's Day",
    category: "holiday",
    badgeColor: "bg-pastel-lavender/50 border-pastel-lavender",
    textColor: "text-pastel-lavenderDeep",
    description: "Empowerment, leadership, female tech founders, and diverse professional teamwork.",
    commercialTip: "Female engineers, artists, doctors, and executives in collaborative modern work settings.",
    suggestedPrompt: "Confident diverse group of female business leaders collaborating around boardroom table with architectural plans, bright natural sunlit office --ar 16:9",
  },
  {
    date: "2027-03-19",
    title: "Eid al-Fitr Feast",
    category: "holiday",
    badgeColor: "bg-pastel-sage/50 border-pastel-sage",
    textColor: "text-pastel-sageDeep",
    description: "Joyful celebration marking end of Ramadan, festive sweets, and family hospitality.",
    commercialTip: "Traditional Middle Eastern and Southeast Asian sweets, cookies, and ornate tea service.",
    suggestedPrompt: "Artfully arranged platter of festive Eid cookies, ma'amoul and baklava dusted with powdered sugar, ornate brass tea pot, bright joyous holiday atmosphere --ar 16:9",
  },
  {
    date: "2027-03-20",
    title: "Spring Equinox (First Day of Spring)",
    category: "holiday",
    badgeColor: "bg-pastel-sage/50 border-pastel-sage",
    textColor: "text-pastel-sageDeep",
    description: "Blooming flora, outdoor picnics, gardening, and eco-friendly lifestyle concepts.",
    commercialTip: "Macro shots of cherry blossoms, greenhouse plants, and sustainable organic farming.",
    suggestedPrompt: "Delicate pink cherry blossoms on branch bathed in soft golden morning sunlight, clear blue sky background with subtle depth, crisp macro detail --ar 16:9",
  },
  {
    date: "2027-03-28",
    title: "Easter Sunday",
    category: "holiday",
    badgeColor: "bg-pastel-yellow/50 border-pastel-yellow",
    textColor: "text-pastel-yellowDeep",
    description: "Family brunch, spring flowers, chocolate bunnies, and festive confectionery.",
    commercialTip: "Easter Sunday table decor with pastel dyed eggs, linen napkins, and fresh tulips.",
    suggestedPrompt: "Pastel Easter table setting with speckled eggs in porcelain cups, fresh yellow and white tulips in vase, sunlit airy breakfast room --ar 16:9",
  },
];

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

  // View Mode: Daily interactive grid vs Themes list
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Calendar Month State (Defaults to Nov 2026)
  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(10); // 10 = November
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

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

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const getEventsForDate = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const builtIn = GLOBAL_COMMERCIAL_EVENTS.filter((e) => e.date === dateStr);
    const custom = themes
      .filter((t) => t.targetEventDate === dateStr)
      .map((t) => ({
        date: dateStr,
        title: t.name,
        category: "theme" as const,
        description: t.description || "Custom user theme",
        badgeColor: "bg-pastel-lavender/60 border-pastel-lavenderDeep/30",
        textColor: "text-pastel-lavenderDeep",
        commercialTip: `Target holiday for ${t.season} (${t.targetQuarter}).`,
        suggestedPrompt: `${t.name}, commercial stock style, clean studio lighting, high resolution --ar 16:9`,
      }));

    return [...builtIn, ...custom];
  };

  const copyPromptText = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-charcoal-900 flex items-center gap-2.5">
            <span>Seasonal Commercial Calendar</span>
            <span className="rounded-full bg-pastel-lavender/60 text-charcoal-900 px-3 py-0.5 text-xs font-semibold">
              {themes.length} custom themes
            </span>
          </h1>
          <p className="mt-1 text-sm text-charcoal-muted">
            Interactive daily calendar of global commercial holidays, H-90 production kickoffs, and buyer demand windows.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex items-center bg-white border border-base-border rounded-full p-1 shadow-sm">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-charcoal-900 text-white shadow-pill"
                  : "text-charcoal-muted hover:text-charcoal-900"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span>Daily Calendar</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "list"
                  ? "bg-charcoal-900 text-white shadow-pill"
                  : "text-charcoal-muted hover:text-charcoal-900"
              }`}
            >
              <ListFilter className="h-3.5 w-3.5" />
              <span>Themes &amp; Quotas</span>
            </button>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white font-semibold px-4 py-2 text-xs shadow-pill transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Adobe Stock Rule Banner */}
      <div className="rounded-3xl border border-base-border bg-pastel-lavender/30 p-5 shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-2xl bg-white border border-base-border text-charcoal-900 flex items-center justify-center flex-shrink-0 shadow-pill">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-charcoal-900">Adobe Stock H-90 to H-30 Buying Window</h3>
              <p className="text-xs text-charcoal-muted mt-0.5 max-w-2xl leading-relaxed">
                Advertisers and creative agencies license seasonal visuals <span className="text-charcoal-900 font-semibold underline">30 to 90 days before holidays</span>. Produce during <span className="text-emerald-700 font-semibold">H-90</span> to rank at the top when buyer searches surge.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-3.5 py-1.5 rounded-full border border-base-border shadow-pill">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs text-charcoal-900 font-semibold">{produceNowCount} Active Windows</span>
          </div>
        </div>
      </div>

      {/* VIEW 1: DAILY MONTHLY CALENDAR GRID */}
      {viewMode === "grid" && (
        <div className="rounded-3xl border border-base-border bg-white p-6 shadow-soft space-y-6">
          {/* Calendar Header Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-base-border pb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-base-bg rounded-full border border-base-border p-1">
                <button
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className="p-1.5 rounded-full hover:bg-white text-charcoal-900 transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className="p-1.5 rounded-full hover:bg-white text-charcoal-900 transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-xl font-bold tracking-tight text-charcoal-900">
                {monthNames[currentMonth]} {currentYear}
              </h2>

              <button
                onClick={() => {
                  setCurrentYear(2026);
                  setCurrentMonth(10);
                }}
                className="text-xs font-semibold px-3 py-1 rounded-full border border-base-border hover:bg-base-bg text-charcoal-muted hover:text-charcoal-900 transition-all cursor-pointer"
              >
                Today (Nov 2026)
              </button>
            </div>

            {/* Quick Jumps */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: "Nov '26", y: 2026, m: 10 },
                { label: "Dec '26", y: 2026, m: 11 },
                { label: "Jan '27", y: 2027, m: 0 },
                { label: "Feb '27", y: 2027, m: 1 },
                { label: "Mar '27", y: 2027, m: 2 },
              ].map((jump) => (
                <button
                  key={jump.label}
                  onClick={() => {
                    setCurrentYear(jump.y);
                    setCurrentMonth(jump.m);
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    currentYear === jump.y && currentMonth === jump.m
                      ? "bg-charcoal-900 text-white shadow-pill"
                      : "bg-base-bg text-charcoal-muted hover:text-charcoal-900 border border-base-border"
                  }`}
                >
                  {jump.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-charcoal-muted">
            <span className="font-semibold text-charcoal-900">Event Tags:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-pastel-lavenderDeep" />
              <span>Commercial Holiday</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>H-90 Produce Kickoff</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>H-30 Final Cutoff</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
              <span>Custom Themes</span>
            </span>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Weekday Headers */}
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <div
                key={dayName}
                className="text-center font-bold text-xs uppercase tracking-wider text-charcoal-muted py-2"
              >
                {dayName}
              </div>
            ))}

            {/* Leading Empty Days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[115px] rounded-2xl bg-base-cardWarm/40 border border-base-border/50 p-2 opacity-40"
              />
            ))}

            {/* Active Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const isToday = currentYear === 2026 && currentMonth === 10 && day === 1;

              return (
                <div
                  key={`day-${day}`}
                  className={`min-h-[115px] rounded-2xl border p-2.5 flex flex-col justify-between transition-all group ${
                    dayEvents.length > 0
                      ? "bg-white border-base-border hover:border-pastel-lavenderDeep/40 hover:shadow-soft"
                      : "bg-white/70 border-base-border/70 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        isToday
                          ? "bg-charcoal-900 text-white shadow-pill"
                          : "text-charcoal-900"
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-semibold text-charcoal-muted font-mono">
                        {dayEvents.length} event{dayEvents.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {/* Events in Day */}
                  <div className="space-y-1.5 overflow-hidden">
                    {dayEvents.map((evt, idx) => (
                      <button
                        key={`${evt.title}-${idx}`}
                        onClick={() => setSelectedEvent(evt)}
                        title={evt.title}
                        className={`w-full text-left rounded-xl px-2 py-1 border text-[11px] font-semibold leading-tight line-clamp-2 transition-all hover:scale-[1.02] cursor-pointer shadow-xs ${evt.badgeColor} ${evt.textColor}`}
                      >
                        {evt.title}
                      </button>
                    ))}
                  </div>

                  {dayEvents.length === 0 && (
                    <div className="text-[10px] text-charcoal-muted/50 italic py-1">
                      No events
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Details Drawer/Modal */}
      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/40 backdrop-blur-xs p-4"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-base-border bg-white p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-base-border pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-charcoal-muted">
                    {selectedEvent.date}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-base-bg border border-base-border text-charcoal-900">
                    {selectedEvent.category.replace("_", " ")}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-charcoal-900 mt-1">
                  {selectedEvent.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-full hover:bg-base-bg text-charcoal-muted hover:text-charcoal-900 transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal-muted mb-1">
                  Commercial Event Overview
                </h4>
                <p className="text-xs text-charcoal-900 leading-relaxed">
                  {selectedEvent.description}
                </p>
              </div>

              <div className="rounded-2xl bg-pastel-yellow/20 border border-pastel-yellow/40 p-4 space-y-1">
                <h4 className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-amber-700" />
                  <span>Adobe Stock Buyer Intelligence</span>
                </h4>
                <p className="text-xs text-charcoal-900/90 leading-relaxed">
                  {selectedEvent.commercialTip}
                </p>
              </div>

              <div className="rounded-2xl bg-base-bg border border-base-border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-charcoal-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-pastel-lavenderDeep" />
                    <span>Recommended Commercial AI Prompt</span>
                  </h4>
                  <button
                    onClick={() => copyPromptText(selectedEvent.suggestedPrompt)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-charcoal-900 hover:underline cursor-pointer"
                  >
                    {copiedPrompt ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-mono text-charcoal-700 bg-white p-3 rounded-xl border border-base-border select-all leading-relaxed">
                  {selectedEvent.suggestedPrompt}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-border">
              <button
                onClick={() => {
                  setSelectedEvent(null);
                  openCreateModal();
                  setName(selectedEvent.title);
                  setTargetEventDate(selectedEvent.date);
                  setDescription(selectedEvent.description);
                }}
                className="flex items-center gap-1.5 rounded-full bg-charcoal-900 hover:bg-charcoal-800 text-white px-5 py-2 text-xs font-semibold shadow-pill transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Save as Active Theme</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: TRADITIONAL LIST & QUOTA VIEW */}
      {viewMode === "list" && (
        <>

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
      </>
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
