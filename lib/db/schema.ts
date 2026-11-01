import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  bigint,
  jsonb,
  numeric,
  timestamp,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * 1. Production Themes
 * Categorizes and schedules production goals (e.g., Autumn Lifestyle, Futuristic Tech).
 */
export const productionThemes = pgTable("production_themes", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  season: varchar("season", { length: 50 }),
  targetQuarter: varchar("target_quarter", { length: 20 }),
  targetEventDate: date("target_event_date"),
  category: varchar("category", { length: 50 }).default("seasonal").notNull(), // 'seasonal' | 'evergreen' | 'copy_space'
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 2. Prompt Templates (Versioned)
 * Maintains prompts with explicit versioning and lineage tracking.
 */
export const promptTemplates = pgTable("prompt_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  promptText: text("prompt_text").notNull(),
  negativePrompt: text("negative_prompt"),
  commercialIntent: varchar("commercial_intent", { length: 100 }), // e.g. "Hero Background", "UI Mockup", "Icon Set", "Editorial Lifestyle"
  notes: text("notes"),
  version: integer("version").default(1).notNull(),
  parentId: uuid("parent_id"),
  isLatest: boolean("is_latest").default(true).notNull(),
  parameters: jsonb("parameters").default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 3. Asset Series (Max Quota)
 * A cohesive batch of generative assets bounded by a max production quota.
 */
export const assetSeries = pgTable("asset_series", {
  id: uuid("id").defaultRandom().primaryKey(),
  themeId: uuid("theme_id").references(() => productionThemes.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  maxQuota: integer("max_quota").default(50).notNull(),
  currentCount: integer("current_count").default(0).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 4. Assets
 * Core portfolio items. Stores 64-bit signed pHash, Adobe Content ID (nullable), Blob URL, etc.
 */
export const assets = pgTable(
  "assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adobeContentId: varchar("adobe_content_id", { length: 100 }), // nullable until submitted/approved
    filename: varchar("filename", { length: 30 }).notNull(),
    blobUrl: text("blob_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    phash: bigint("phash", { mode: "bigint" }).notNull(), // signed 64-bit int via BigInt.asIntN(64)
    status: varchar("status", { length: 50 }).default("idea").notNull(), // idea, qc_pending, qc_failed, ready, submitted, approved, rejected
    seriesId: uuid("series_id").references(() => assetSeries.id, { onDelete: "set null" }),
    templateId: uuid("template_id").references(() => promptTemplates.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxAssetsStatus: index("idx_assets_status").on(table.status),
    idxAssetsSeries: index("idx_assets_series").on(table.seriesId),
    idxAssetsAdobeId: index("idx_assets_adobe_id").on(table.adobeContentId),
  })
);

/**
 * 5. Asset Status History
 * Every status change writes here in the exact same transaction.
 */
export const assetStatusHistory = pgTable(
  "asset_status_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull(),
    fromStatus: varchar("from_status", { length: 50 }),
    toStatus: varchar("to_status", { length: 50 }).notNull(),
    reason: text("reason"),
    changedAt: timestamp("changed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxStatusHistoryAsset: index("idx_status_history_asset").on(table.assetId),
    idxStatusHistoryChangedAt: index("idx_status_history_changed_at").on(table.changedAt),
  })
);

/**
 * 6. Gemini Runs
 * Full audit trail of Google Gemini AI executions (model, prompt version, scores, raw payload, cost).
 */
export const geminiRuns = pgTable(
  "gemini_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id").references(() => assets.id, { onDelete: "set null" }),
    model: varchar("model", { length: 100 }).notNull(),
    promptVersion: varchar("prompt_version", { length: 50 }).notNull(),
    raw: jsonb("raw").notNull(),
    scores: jsonb("scores"),
    tokens: integer("tokens").default(0).notNull(),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).default("0.000000").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxGeminiRunsAsset: index("idx_gemini_runs_asset").on(table.assetId),
  })
);

/**
 * 7. Rejection Taxonomies
 * Standardized Adobe Stock rejection root causes.
 */
export const rejectionTaxonomies = pgTable("rejection_taxonomies", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 100 }).notNull().unique(), // TECHNICAL_ISSUES, SIMILAR_CONTENT, etc.
  label: varchar("label", { length: 255 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * 8. Asset Rejections
 * Links rejected assets to specific rejection taxonomy codes and Adobe reviewer notes.
 */
export const assetRejections = pgTable(
  "asset_rejections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull(),
    taxonomyId: uuid("taxonomy_id")
      .references(() => rejectionTaxonomies.id, { onDelete: "restrict" })
      .notNull(),
    notes: text("notes"),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxAssetRejectionsAsset: index("idx_asset_rejections_asset").on(table.assetId),
  })
);

/**
 * 9. Asset Keywords
 * Position-indexed keywords (1–49). Adobe Stock weights top keywords highest.
 */
export const assetKeywords = pgTable(
  "asset_keywords",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull(),
    keyword: varchar("keyword", { length: 100 }).notNull(),
    position: integer("position").notNull(), // 1 through 49
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxKeywordsAsset: index("idx_keywords_asset").on(table.assetId),
    idxKeywordsAssetPos: index("idx_keywords_asset_pos").on(table.assetId, table.position),
  })
);

/**
 * 10. Asset Metadata
 * Compliant metadata: Title (max 70), Adobe category, release declarations.
 */
export const assetMetadata = pgTable(
  "asset_metadata",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    title: varchar("title", { length: 70 }).notNull(),
    description: text("description"),
    categoryId: integer("category_id").notNull(), // 1 to 21
    releaseStatus: varchar("release_status", { length: 100 }).default("none_required").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxMetadataAsset: index("idx_metadata_asset").on(table.assetId),
  })
);

/**
 * 11. Asset Earnings
 * Tracks downloads and revenue generated on Adobe Stock.
 */
export const assetEarnings = pgTable(
  "asset_earnings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    assetId: uuid("asset_id")
      .references(() => assets.id, { onDelete: "cascade" })
      .notNull(),
    downloads: integer("downloads").default(0).notNull(),
    revenueUsd: numeric("revenue_usd", { precision: 10, scale: 4 }).default("0.0000").notNull(),
    periodDate: date("period_date"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    idxEarningsAsset: index("idx_earnings_asset").on(table.assetId),
  })
);

/**
 * 12. App Settings
 * Stores global configurations such as user-customizable brand blacklist.
 */
export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(), // e.g., 'brand_blacklist'
  value: jsonb("value").notNull(), // array or object
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Drizzle Relations definitions for queries
export const productionThemesRelations = relations(productionThemes, ({ many }) => ({
  series: many(assetSeries),
}));

export const assetSeriesRelations = relations(assetSeries, ({ one, many }) => ({
  theme: one(productionThemes, {
    fields: [assetSeries.themeId],
    references: [productionThemes.id],
  }),
  assets: many(assets),
}));

export const promptTemplatesRelations = relations(promptTemplates, ({ one, many }) => ({
  parent: one(promptTemplates, {
    fields: [promptTemplates.parentId],
    references: [promptTemplates.id],
  }),
  assets: many(assets),
}));

export const assetsRelations = relations(assets, ({ one, many }) => ({
  series: one(assetSeries, {
    fields: [assets.seriesId],
    references: [assetSeries.id],
  }),
  template: one(promptTemplates, {
    fields: [assets.templateId],
    references: [promptTemplates.id],
  }),
  metadata: one(assetMetadata, {
    fields: [assets.id],
    references: [assetMetadata.assetId],
  }),
  statusHistory: many(assetStatusHistory),
  geminiRuns: many(geminiRuns),
  rejections: many(assetRejections),
  keywords: many(assetKeywords),
  earnings: many(assetEarnings),
}));

export const assetStatusHistoryRelations = relations(assetStatusHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [assetStatusHistory.assetId],
    references: [assets.id],
  }),
}));

export const geminiRunsRelations = relations(geminiRuns, ({ one }) => ({
  asset: one(assets, {
    fields: [geminiRuns.assetId],
    references: [assets.id],
  }),
}));

export const rejectionTaxonomiesRelations = relations(rejectionTaxonomies, ({ many }) => ({
  rejections: many(assetRejections),
}));

export const assetRejectionsRelations = relations(assetRejections, ({ one }) => ({
  asset: one(assets, {
    fields: [assetRejections.assetId],
    references: [assets.id],
  }),
  taxonomy: one(rejectionTaxonomies, {
    fields: [assetRejections.taxonomyId],
    references: [rejectionTaxonomies.id],
  }),
}));

export const assetKeywordsRelations = relations(assetKeywords, ({ one }) => ({
  asset: one(assets, {
    fields: [assetKeywords.assetId],
    references: [assets.id],
  }),
}));

export const assetMetadataRelations = relations(assetMetadata, ({ one }) => ({
  asset: one(assets, {
    fields: [assetMetadata.assetId],
    references: [assets.id],
  }),
}));

export const assetEarningsRelations = relations(assetEarnings, ({ one }) => ({
  asset: one(assets, {
    fields: [assetEarnings.assetId],
    references: [assets.id],
  }),
}));
