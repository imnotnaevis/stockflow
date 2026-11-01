import fs from "fs/promises";
import path from "path";
import { CONFIG } from "./config";
import { computeSeasonalStatus, computePortfolioHealthScore, SeasonalWindowInfo, HealthScoreResult } from "./health";
import {
  aggregateRevenuePerTemplate,
  computeQcCalibration,
  computeTemplateRejectionPatterns,
  TemplateRevenueSummary,
  CalibrationMetrics,
  TemplateRejectionAnalysis,
  AssetRecordItem,
} from "./revenue";

export interface ThemeRecord {
  id: string;
  name: string;
  description: string;
  season: string;
  targetQuarter: string;
  targetEventDate: string | null;
  category: "seasonal" | "evergreen" | "copy_space";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeriesRecord {
  id: string;
  themeId: string | null;
  themeName?: string;
  title: string;
  maxQuota: number;
  currentCount: number;
  status: "active" | "completed" | "archived";
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromptTemplateRecord {
  id: string;
  name: string;
  promptText: string;
  negativePrompt?: string | null;
  commercialIntent?: string | null;
  notes?: string | null;
  version: number;
  parentId?: string | null;
  isLatest: boolean;
  parameters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RejectionRecord {
  id: string;
  assetId: string;
  filename: string;
  templateId?: string | null;
  seriesId?: string | null;
  themeId?: string | null;
  taxonomyCode: string;
  taxonomyLabel: string;
  notes?: string | null;
  rejectedAt: string;
}

export interface EarningRecord {
  id: string;
  assetId: string;
  adobeContentId?: string | null;
  filename: string;
  templateId?: string | null;
  downloads: number;
  amountUsd: number;
  periodDate: string;
  licenseType: string;
  importedAt: string;
}

export interface StoredData {
  themes: ThemeRecord[];
  series: SeriesRecord[];
  prompts: PromptTemplateRecord[];
  brandBlacklist: string[];
  rejections: RejectionRecord[];
  earnings: EarningRecord[];
  assets: AssetRecordItem[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

const INITIAL_THEMES: ThemeRecord[] = [
  {
    id: "theme-christmas-2026",
    name: "Winter Holidays & Cozy Christmas",
    description: "Festive holiday celebrations, warm interior textures, gift wrapping, and holiday gatherings for Q4 advertising campaigns.",
    season: "Winter",
    targetQuarter: "Q4",
    targetEventDate: "2026-12-25",
    category: "seasonal",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "theme-black-friday-2026",
    name: "Black Friday & Cyber Week E-Commerce",
    description: "High-energy shopping concepts, shopping bags, 3D retail sale banners, and tech discount promotions.",
    season: "Autumn",
    targetQuarter: "Q4",
    targetEventDate: "2026-11-27",
    category: "seasonal",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "theme-valentines-2027",
    name: "Valentine's Day Romance & Gifting",
    description: "Romantic culinary, heartfelt gift ideas, elegant floral arrangements, and confectionery for early spring commercial buyers.",
    season: "Winter",
    targetQuarter: "Q1",
    targetEventDate: "2027-02-14",
    category: "seasonal",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "theme-b2b-corporate",
    name: "B2B Corporate Teamwork & Fintech",
    description: "Modern diverse tech professionals collaborating in sustainable architecture offices with glassboards and laptops.",
    season: "All-Year",
    targetQuarter: "Evergreen",
    targetEventDate: null,
    category: "evergreen",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "theme-minimalist-copy-space",
    name: "Minimalist Tech Copy-Space & Mockups",
    description: "Clean aesthetic stone and concrete pedestals with intentional negative copy-space for marketing typography and product placement.",
    season: "All-Year",
    targetQuarter: "Evergreen",
    targetEventDate: null,
    category: "copy_space",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "theme-spring-bloom-2027",
    name: "Spring Bloom & Outdoor Wellness",
    description: "Fresh botanical landscapes, springtime gardening, and healthy lifestyle outdoor portraits.",
    season: "Spring",
    targetQuarter: "Q2",
    targetEventDate: "2027-04-05",
    category: "seasonal",
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_SERIES: SeriesRecord[] = [
  {
    id: "series-xmas-flatlays",
    themeId: "theme-christmas-2026",
    title: "Festive Flatlays & Hot Cocoa",
    maxQuota: 25,
    currentCount: 18,
    status: "active",
    description: "Top-down cozy arrangements with cinnamon, ceramic mugs, and soft knit blankets.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-cyber-neon",
    themeId: "theme-black-friday-2026",
    title: "Cyber Sale 3D Neon Banners",
    maxQuota: 20,
    currentCount: 19,
    status: "active",
    description: "Dark mode neon typographic discount signage and isometric gift boxes.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-b2b-fintech",
    themeId: "theme-b2b-corporate",
    title: "Fintech Workspace Overhead",
    maxQuota: 50,
    currentCount: 12,
    status: "active",
    description: "Contemporary collaborative tech office spaces and data dash overviews.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "series-clean-copyspace",
    themeId: "theme-minimalist-copy-space",
    title: "Clean Pastel Copy-Space Mockups",
    maxQuota: 30,
    currentCount: 6,
    status: "active",
    description: "Geometric neutral surfaces with soft natural window shadows and empty side banners.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_PROMPTS: PromptTemplateRecord[] = [
  {
    id: "prompt-festive-warmth",
    name: "Commercial Flatlay - Festive Warmth",
    promptText: "Overhead top-down flatlay composition of steaming cinnamon cocoa in a ceramic mug, warm wool knit blanket, pine cones, soft natural window light, muted scandinavian palette, 8k commercial stock photography --ar 3:2 --v 6.1",
    negativePrompt: "deformed, blurry, watermark, text, signature, low quality, oversaturated, noisy, artifacts, cartoon",
    commercialIntent: "Hero Background / Ad Banner",
    notes: "Proven high sales potential during November/December buying surge on Adobe Stock.",
    version: 2,
    parentId: null,
    isLatest: true,
    parameters: { aspectRatio: "3:2", engine: "Midjourney v6.1" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prompt-fintech-data",
    name: "Futuristic Fintech Data Visualization",
    promptText: "Abstract holographic financial data streams, sleek glass interface elements, subtle blue and violet neon illumination, depth of field, high-end enterprise SaaS commercial graphic --ar 16:9",
    negativePrompt: "cartoon, 3d render plastic, low resolution, grainy, garish colors, clutter, text labels",
    commercialIntent: "Tech Website Hero",
    notes: "Targeting enterprise fintech and corporate digital transformation publishers.",
    version: 1,
    parentId: null,
    isLatest: true,
    parameters: { aspectRatio: "16:9", engine: "Flux.1 Dev" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "prompt-copyspace-studio",
    name: "Minimalist Aesthetic Studio Copy-Space",
    promptText: "Minimalist concrete pedestal podium in soft morning shadow, generous negative copy space on the right, architectural clean lines, neutral beige and stone textures, editorial aesthetic --ar 4:3",
    negativePrompt: "busy, crowded, distorted, human figures, high contrast harsh shadows, oversaturated",
    commercialIntent: "Graphic Design Copy-Space",
    notes: "Essential stock asset type: graphic designers specifically search for copy space to lay out headings.",
    version: 1,
    parentId: null,
    isLatest: true,
    parameters: { aspectRatio: "4:3", engine: "Midjourney v6.1" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_ASSETS: AssetRecordItem[] = [
  { id: "asset-xmas-01", filename: "cozy_hot_cocoa_01.jpg", adobeContentId: "591029101", templateId: "prompt-festive-warmth", seriesId: "series-xmas-flatlays", status: "approved", qcScore: 92, qcPass: true },
  { id: "asset-xmas-02", filename: "festive_cinnamon_mug_02.jpg", adobeContentId: "591029102", templateId: "prompt-festive-warmth", seriesId: "series-xmas-flatlays", status: "approved", qcScore: 89, qcPass: true },
  { id: "asset-xmas-03", filename: "pinecone_knit_table_03.jpg", adobeContentId: "591029103", templateId: "prompt-festive-warmth", seriesId: "series-xmas-flatlays", status: "approved", qcScore: 94, qcPass: true },
  { id: "asset-xmas-04", filename: "winter_blanket_steam_04.jpg", adobeContentId: "591029104", templateId: "prompt-festive-warmth", seriesId: "series-xmas-flatlays", status: "rejected", qcScore: 68, qcPass: false },
  { id: "asset-cyber-01", filename: "neon_sale_box_01.jpg", adobeContentId: "591029201", templateId: "prompt-fintech-data", seriesId: "series-cyber-neon", status: "approved", qcScore: 88, qcPass: true },
  { id: "asset-cyber-02", filename: "neon_sale_box_02.jpg", adobeContentId: "591029202", templateId: "prompt-fintech-data", seriesId: "series-cyber-neon", status: "rejected", qcScore: 76, qcPass: true },
  { id: "asset-cyber-03", filename: "neon_sale_box_03.jpg", adobeContentId: "591029203", templateId: "prompt-fintech-data", seriesId: "series-cyber-neon", status: "rejected", qcScore: 54, qcPass: false },
  { id: "asset-fintech-01", filename: "fintech_hologram_dash_01.jpg", adobeContentId: "591029301", templateId: "prompt-fintech-data", seriesId: "series-b2b-fintech", status: "approved", qcScore: 96, qcPass: true },
  { id: "asset-fintech-02", filename: "fintech_glass_interface_02.jpg", adobeContentId: "591029302", templateId: "prompt-fintech-data", seriesId: "series-b2b-fintech", status: "approved", qcScore: 90, qcPass: true },
  { id: "asset-copyspace-01", filename: "minimal_podium_stone_01.jpg", adobeContentId: "591029401", templateId: "prompt-copyspace-studio", seriesId: "series-clean-copyspace", status: "approved", qcScore: 95, qcPass: true },
  { id: "asset-copyspace-02", filename: "concrete_shadow_empty_02.jpg", adobeContentId: "591029402", templateId: "prompt-copyspace-studio", seriesId: "series-clean-copyspace", status: "approved", qcScore: 91, qcPass: true },
  { id: "asset-copyspace-03", filename: "beige_pedestal_banner_03.jpg", adobeContentId: "591029403", templateId: "prompt-copyspace-studio", seriesId: "series-clean-copyspace", status: "rejected", qcScore: 62, qcPass: false },
];

const INITIAL_REJECTIONS: RejectionRecord[] = [
  {
    id: "rej-1",
    assetId: "asset-xmas-04",
    filename: "winter_blanket_steam_04.jpg",
    templateId: "prompt-festive-warmth",
    seriesId: "series-xmas-flatlays",
    taxonomyCode: "TECHNICAL_ISSUES",
    taxonomyLabel: "Technical Issues",
    notes: "Excessive chromatic fringing along wool blanket edge and slight motion blur in steam.",
    rejectedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "rej-2",
    assetId: "asset-cyber-02",
    filename: "neon_sale_box_02.jpg",
    templateId: "prompt-fintech-data",
    seriesId: "series-cyber-neon",
    taxonomyCode: "SIMILAR_CONTENT",
    taxonomyLabel: "Similar Content",
    notes: "Nearly indistinguishable from neon_sale_box_01.jpg; minor rotation of same geometry.",
    rejectedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: "rej-3",
    assetId: "asset-cyber-03",
    filename: "neon_sale_box_03.jpg",
    templateId: "prompt-fintech-data",
    seriesId: "series-cyber-neon",
    taxonomyCode: "TECHNICAL_ISSUES",
    taxonomyLabel: "Technical Issues",
    notes: "Severe compression noise in dark background gradients.",
    rejectedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "rej-4",
    assetId: "asset-copyspace-03",
    filename: "beige_pedestal_banner_03.jpg",
    templateId: "prompt-copyspace-studio",
    seriesId: "series-clean-copyspace",
    taxonomyCode: "LOW_COMMERCIAL_VALUE",
    taxonomyLabel: "Low Commercial Value",
    notes: "Lacks focal point; lighting flat and pedestal undifferentiated from floor.",
    rejectedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_EARNINGS: EarningRecord[] = [
  { id: "earn-1", assetId: "asset-xmas-01", adobeContentId: "591029101", filename: "cozy_hot_cocoa_01.jpg", templateId: "prompt-festive-warmth", downloads: 12, amountUsd: 14.80, periodDate: "2026-10", licenseType: "Standard", importedAt: new Date().toISOString() },
  { id: "earn-2", assetId: "asset-xmas-01", adobeContentId: "591029101", filename: "cozy_hot_cocoa_01.jpg", templateId: "prompt-festive-warmth", downloads: 4, amountUsd: 39.60, periodDate: "2026-10", licenseType: "Extended", importedAt: new Date().toISOString() },
  { id: "earn-3", assetId: "asset-xmas-02", adobeContentId: "591029102", filename: "festive_cinnamon_mug_02.jpg", templateId: "prompt-festive-warmth", downloads: 8, amountUsd: 9.90, periodDate: "2026-10", licenseType: "Standard", importedAt: new Date().toISOString() },
  { id: "earn-4", assetId: "asset-fintech-01", adobeContentId: "591029301", filename: "fintech_hologram_dash_01.jpg", templateId: "prompt-fintech-data", downloads: 22, amountUsd: 28.50, periodDate: "2026-10", licenseType: "Subscription", importedAt: new Date().toISOString() },
  { id: "earn-5", assetId: "asset-copyspace-01", adobeContentId: "591029401", filename: "minimal_podium_stone_01.jpg", templateId: "prompt-copyspace-studio", downloads: 15, amountUsd: 18.20, periodDate: "2026-10", licenseType: "Standard", importedAt: new Date().toISOString() },
];

async function ensureDataFile(): Promise<StoredData> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const content = await fs.readFile(DATA_FILE, "utf-8");
    const data = JSON.parse(content) as StoredData;
    data.rejections = data.rejections || INITIAL_REJECTIONS;
    data.earnings = data.earnings || INITIAL_EARNINGS;
    data.assets = data.assets || INITIAL_ASSETS;
    return data;
  } catch {
    const initial: StoredData = {
      themes: INITIAL_THEMES,
      series: INITIAL_SERIES,
      prompts: INITIAL_PROMPTS,
      brandBlacklist: [
        "apple", "iphone", "ipad", "macbook", "nike", "adidas", "coca-cola",
        "pepsi", "starbucks", "mcdonalds", "gucci", "louis vuitton", "disney",
        "lego", "tesla", "microsoft", "windows", "playstation", "xbox", "amazon",
      ],
      rejections: INITIAL_REJECTIONS,
      earnings: INITIAL_EARNINGS,
      assets: INITIAL_ASSETS,
    };
    try {
      await fs.writeFile(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8");
    } catch (writeErr) {
      console.warn("Could not write store.json:", writeErr);
    }
    return initial;
  }
}

async function writeDataFile(data: StoredData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export const localStore = {
  // Themes
  async getThemes(): Promise<(ThemeRecord & { seasonalInfo: SeasonalWindowInfo; seriesCount: number })[]> {
    const data = await ensureDataFile();
    return data.themes.map((theme) => {
      const seasonalInfo = computeSeasonalStatus(theme.targetEventDate);
      const seriesCount = data.series.filter((s) => s.themeId === theme.id).length;
      return {
        ...theme,
        seasonalInfo,
        seriesCount,
      };
    });
  },

  async createTheme(theme: Omit<ThemeRecord, "id" | "createdAt" | "updatedAt">): Promise<ThemeRecord> {
    const data = await ensureDataFile();
    const newTheme: ThemeRecord = {
      ...theme,
      id: "theme_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.themes.push(newTheme);
    await writeDataFile(data);
    return newTheme;
  },

  async updateTheme(id: string, updates: Partial<ThemeRecord>): Promise<ThemeRecord | null> {
    const data = await ensureDataFile();
    const idx = data.themes.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    data.themes[idx] = {
      ...data.themes[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeDataFile(data);
    return data.themes[idx];
  },

  async deleteTheme(id: string): Promise<boolean> {
    const data = await ensureDataFile();
    const prevLen = data.themes.length;
    data.themes = data.themes.filter((t) => t.id !== id);
    // Unlink series from deleted theme
    data.series.forEach((s) => {
      if (s.themeId === id) s.themeId = null;
    });
    await writeDataFile(data);
    return data.themes.length < prevLen;
  },

  // Series
  async getSeries(): Promise<(SeriesRecord & { usagePct: number; isWarning: boolean; isOverQuota: boolean })[]> {
    const data = await ensureDataFile();
    return data.series.map((s) => {
      const theme = data.themes.find((t) => t.id === s.themeId);
      const usagePct = s.maxQuota > 0 ? Math.round((s.currentCount / s.maxQuota) * 100) : 0;
      return {
        ...s,
        themeName: theme ? theme.name : "Uncategorized",
        usagePct,
        isWarning: usagePct >= 80 && usagePct <= 100,
        isOverQuota: usagePct > 100,
      };
    });
  },

  async createSeries(series: Omit<SeriesRecord, "id" | "createdAt" | "updatedAt">): Promise<SeriesRecord> {
    const data = await ensureDataFile();
    const newSeries: SeriesRecord = {
      ...series,
      id: "series_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.series.push(newSeries);
    await writeDataFile(data);
    return newSeries;
  },

  async updateSeries(id: string, updates: Partial<SeriesRecord>): Promise<SeriesRecord | null> {
    const data = await ensureDataFile();
    const idx = data.series.findIndex((s) => s.id === id);
    if (idx === -1) return null;
    data.series[idx] = {
      ...data.series[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeDataFile(data);
    return data.series[idx];
  },

  async deleteSeries(id: string): Promise<boolean> {
    const data = await ensureDataFile();
    const prevLen = data.series.length;
    data.series = data.series.filter((s) => s.id !== id);
    await writeDataFile(data);
    return data.series.length < prevLen;
  },

  // Prompts
  async getPrompts(): Promise<PromptTemplateRecord[]> {
    const data = await ensureDataFile();
    return data.prompts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  async createPrompt(prompt: Omit<PromptTemplateRecord, "id" | "createdAt" | "updatedAt">): Promise<PromptTemplateRecord> {
    const data = await ensureDataFile();
    const newPrompt: PromptTemplateRecord = {
      ...prompt,
      id: "prompt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.prompts.push(newPrompt);
    await writeDataFile(data);
    return newPrompt;
  },

  async updatePrompt(
    id: string,
    updates: Partial<PromptTemplateRecord>,
    createNewVersion = false
  ): Promise<PromptTemplateRecord | null> {
    const data = await ensureDataFile();
    const idx = data.prompts.findIndex((p) => p.id === id);
    if (idx === -1) return null;

    if (createNewVersion) {
      // Mark old version as not latest
      const old = data.prompts[idx];
      old.isLatest = false;
      const newVersionNum = (old.version || 1) + 1;
      const newPrompt: PromptTemplateRecord = {
        ...old,
        ...updates,
        id: "prompt_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        version: newVersionNum,
        parentId: old.id,
        isLatest: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      data.prompts.push(newPrompt);
      await writeDataFile(data);
      return newPrompt;
    }

    data.prompts[idx] = {
      ...data.prompts[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await writeDataFile(data);
    return data.prompts[idx];
  },

  async deletePrompt(id: string): Promise<boolean> {
    const data = await ensureDataFile();
    const prevLen = data.prompts.length;
    data.prompts = data.prompts.filter((p) => p.id !== id);
    await writeDataFile(data);
    return data.prompts.length < prevLen;
  },

  // Category Balance Calculation
  async getCategoryQuotaBalance() {
    const data = await ensureDataFile();
    const counts = { seasonal: 0, evergreen: 0, copy_space: 0 };

    data.themes.forEach((t) => {
      const cat = t.category || "seasonal";
      if (cat in counts) counts[cat as keyof typeof counts]++;
    });

    const total = counts.seasonal + counts.evergreen + counts.copy_space || 1;
    const actualPct = {
      seasonal: Math.round((counts.seasonal / total) * 100),
      evergreen: Math.round((counts.evergreen / total) * 100),
      copy_space: Math.round((counts.copy_space / total) * 100),
    };

    return {
      counts,
      total,
      actualPct,
      targets: CONFIG.PORTFOLIO.CATEGORY_QUOTA_TARGETS,
    };
  },

  // Assets & Feedback Loop Moderation
  async moderateAssets(
    assetIds: string[],
    status: "approved" | "rejected",
    taxonomyCode?: string,
    moderatorFeedback?: string
  ): Promise<{ success: boolean; modifiedCount: number }> {
    const data = await ensureDataFile();
    let modifiedCount = 0;

    for (const id of assetIds) {
      let asset = data.assets.find((a) => a.id === id);
      if (!asset) {
        // If asset was uploaded in assets table, record it
        asset = {
          id,
          filename: `asset_${id.slice(-6)}.jpg`,
          status,
          qcScore: 82,
          qcPass: status === "approved",
          templateId: data.prompts[0]?.id || null,
        };
        data.assets.push(asset);
      }

      asset.status = status;
      modifiedCount++;

      if (status === "rejected" && taxonomyCode) {
        data.rejections.push({
          id: "rej_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          assetId: asset.id,
          filename: asset.filename,
          templateId: asset.templateId,
          seriesId: asset.seriesId,
          taxonomyCode,
          taxonomyLabel: taxonomyCode.replace(/_/g, " "),
          notes: moderatorFeedback || null,
          rejectedAt: new Date().toISOString(),
        });
      }
    }

    await writeDataFile(data);
    return { success: true, modifiedCount };
  },

  // Rejections
  async getRejections(): Promise<RejectionRecord[]> {
    const data = await ensureDataFile();
    return data.rejections.sort((a, b) => new Date(b.rejectedAt).getTime() - new Date(a.rejectedAt).getTime());
  },

  async getRejectionAnalysis(threshold: number = CONFIG.PORTFOLIO.MIN_ACCEPTANCE_RATE_THRESHOLD): Promise<TemplateRejectionAnalysis[]> {
    const data = await ensureDataFile();
    return computeTemplateRejectionPatterns(data.prompts, data.assets, data.rejections, threshold);
  },

  // Earnings CSV Import & Aggregated Revenue (Subquery Aggregated)
  async importEarnings(
    records: Array<{
      adobeContentId?: string;
      filename?: string;
      downloads: number;
      amountUsd: number;
      periodDate?: string;
      licenseType?: string;
    }>
  ): Promise<{ importedCount: number; matchedCount: number }> {
    const data = await ensureDataFile();
    let matchedCount = 0;

    for (const row of records) {
      let matchedAsset = data.assets.find(
        (a) =>
          (row.adobeContentId && a.adobeContentId === row.adobeContentId) ||
          (row.filename && a.filename.toLowerCase() === row.filename.toLowerCase())
      );

      if (!matchedAsset) {
        matchedAsset = {
          id: "imported_asset_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
          filename: row.filename || `asset_${row.adobeContentId || Date.now()}.jpg`,
          adobeContentId: row.adobeContentId,
          templateId: data.prompts[0]?.id || null,
          status: "approved",
          qcScore: 88,
          qcPass: true,
        };
        data.assets.push(matchedAsset);
      } else {
        matchedCount++;
      }

      data.earnings.push({
        id: "earn_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        assetId: matchedAsset.id,
        adobeContentId: row.adobeContentId || matchedAsset.adobeContentId,
        filename: matchedAsset.filename,
        templateId: matchedAsset.templateId,
        downloads: Number(row.downloads) || 0,
        amountUsd: Number(row.amountUsd) || 0,
        periodDate: row.periodDate || new Date().toISOString().slice(0, 7),
        licenseType: row.licenseType || "Standard",
        importedAt: new Date().toISOString(),
      });
    }

    await writeDataFile(data);
    return { importedCount: records.length, matchedCount };
  },

  async getEarnings(): Promise<EarningRecord[]> {
    const data = await ensureDataFile();
    return data.earnings;
  },

  async getTemplateRevenue(): Promise<TemplateRevenueSummary[]> {
    const data = await ensureDataFile();
    return aggregateRevenuePerTemplate(data.prompts, data.assets, data.earnings);
  },

  async getCalibrationMetrics(): Promise<CalibrationMetrics> {
    const data = await ensureDataFile();
    return computeQcCalibration(data.assets);
  },
};

