/**
 * StockFlow AI - Revenue, Rejection Patterns & QC Calibration Engine
 */

export interface EarningItem {
  id: string;
  assetId: string;
  adobeContentId?: string | null;
  filename: string;
  templateId?: string | null;
  downloads: number;
  amountUsd: number;
  periodDate: string;
  licenseType: string;
}

export interface AssetRecordItem {
  id: string;
  filename: string;
  adobeContentId?: string | null;
  templateId?: string | null;
  seriesId?: string | null;
  status: string; // idea, qc_pending, qc_failed, ready, submitted, approved, rejected
  qcScore?: number; // 0 - 100
  qcPass?: boolean;
}

export interface TemplateRevenueSummary {
  templateId: string;
  templateName: string;
  version: number;
  totalRevenue: number;
  totalDownloads: number;
  assetCount: number;
  averageRevenuePerAsset: number;
}

/**
 * Aggregates earnings per asset in a subquery structure BEFORE joining to templates.
 * Rule: Avoids duplicated rows when an asset has multiple earning records over time.
 */
export function aggregateRevenuePerTemplate(
  templates: Array<{ id: string; name: string; version: number }>,
  assets: AssetRecordItem[],
  earnings: EarningItem[]
): TemplateRevenueSummary[] {
  // Step 1: Subquery aggregation of earnings by asset_id
  const assetEarningsSubquery = new Map<string, { totalRevenue: number; totalDownloads: number }>();

  for (const record of earnings) {
    const existing = assetEarningsSubquery.get(record.assetId) || { totalRevenue: 0, totalDownloads: 0 };
    existing.totalRevenue += Number(record.amountUsd) || 0;
    existing.totalDownloads += Number(record.downloads) || 0;
    assetEarningsSubquery.set(record.assetId, existing);
  }

  // Step 2: Map assets to their templates and sum aggregated asset values
  const templateMap = new Map<
    string,
    {
      templateId: string;
      templateName: string;
      version: number;
      totalRevenue: number;
      totalDownloads: number;
      assetCount: number;
    }
  >();

  // Initialize templates
  for (const t of templates) {
    templateMap.set(t.id, {
      templateId: t.id,
      templateName: t.name,
      version: t.version,
      totalRevenue: 0,
      totalDownloads: 0,
      assetCount: 0,
    });
  }

  // Group assets under templates with aggregated revenue from the subquery
  for (const asset of assets) {
    if (!asset.templateId) continue;
    const summary = templateMap.get(asset.templateId);
    if (!summary) continue;

    summary.assetCount += 1;
    const assetRevenue = assetEarningsSubquery.get(asset.id);
    if (assetRevenue) {
      summary.totalRevenue += assetRevenue.totalRevenue;
      summary.totalDownloads += assetRevenue.totalDownloads;
    }
  }

  return Array.from(templateMap.values())
    .map((item) => ({
      ...item,
      totalRevenue: Number(item.totalRevenue.toFixed(2)),
      averageRevenuePerAsset:
        item.assetCount > 0 ? Number((item.totalRevenue / item.assetCount).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

/**
 * Calibration view: compare Gemini QC scores against actual approved/rejected outcomes.
 */
export interface CalibrationMetrics {
  totalEvaluated: number;
  approvedCount: number;
  rejectedCount: number;
  truePositives: number; // QC Passed & Approved by Adobe
  falsePositives: number; // QC Passed but Rejected by Adobe (overlooked defect)
  falseNegatives: number; // QC Failed but Approved by Adobe (false alarm / override)
  trueNegatives: number; // QC Failed & Rejected by Adobe
  accuracyPct: number;
  avgSharpnessApproved: number;
  avgSharpnessRejected: number;
  recommendedSharpnessThreshold: number;
}

export function computeQcCalibration(assets: AssetRecordItem[]): CalibrationMetrics {
  let approvedCount = 0;
  let rejectedCount = 0;
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;

  let totalSharpnessApproved = 0;
  let totalSharpnessRejected = 0;

  const reviewedAssets = assets.filter(
    (a) => a.status === "approved" || a.status === "rejected"
  );

  for (const a of reviewedAssets) {
    const score = a.qcScore ?? 80;
    const qcPassed = a.qcPass ?? (score >= 70);

    if (a.status === "approved") {
      approvedCount++;
      totalSharpnessApproved += score;
      if (qcPassed) {
        truePositives++;
      } else {
        falseNegatives++;
      }
    } else if (a.status === "rejected") {
      rejectedCount++;
      totalSharpnessRejected += score;
      if (qcPassed) {
        falsePositives++;
      } else {
        trueNegatives++;
      }
    }
  }

  const totalEvaluated = reviewedAssets.length;
  const correctPredictions = truePositives + trueNegatives;
  const accuracyPct = totalEvaluated > 0 ? Math.round((correctPredictions / totalEvaluated) * 100) : 100;

  const avgSharpnessApproved =
    approvedCount > 0 ? Math.round(totalSharpnessApproved / approvedCount) : 85;
  const avgSharpnessRejected =
    rejectedCount > 0 ? Math.round(totalSharpnessRejected / rejectedCount) : 62;

  // Optimal threshold balances between rejected and approved averages
  const recommendedSharpnessThreshold = Math.min(
    85,
    Math.max(65, Math.round((avgSharpnessApproved + avgSharpnessRejected) / 2))
  );

  return {
    totalEvaluated,
    approvedCount,
    rejectedCount,
    truePositives,
    falsePositives,
    falseNegatives,
    trueNegatives,
    accuracyPct,
    avgSharpnessApproved,
    avgSharpnessRejected,
    recommendedSharpnessThreshold,
  };
}

/**
 * Rejection Pattern Analysis:
 * Groups rejections by taxonomy, template, series, and theme,
 * highlighting templates whose acceptance rate falls below threshold.
 */
export interface TemplateRejectionAnalysis {
  templateId: string;
  templateName: string;
  version: number;
  approvedCount: number;
  rejectedCount: number;
  totalReviewed: number;
  acceptanceRatePct: number;
  isBelowThreshold: boolean;
  topRejectionTaxonomies: Array<{ code: string; count: number }>;
}

export function computeTemplateRejectionPatterns(
  templates: Array<{ id: string; name: string; version: number }>,
  assets: AssetRecordItem[],
  rejections: Array<{ assetId: string; taxonomyCode: string }>,
  minAcceptanceThreshold = 0.70
): TemplateRejectionAnalysis[] {
  const result: TemplateRejectionAnalysis[] = [];

  for (const template of templates) {
    const templateAssets = assets.filter((a) => a.templateId === template.id);
    const approvedCount = templateAssets.filter((a) => a.status === "approved").length;
    const rejectedAssets = templateAssets.filter((a) => a.status === "rejected");
    const rejectedCount = rejectedAssets.length;
    const totalReviewed = approvedCount + rejectedCount;

    const acceptanceRatePct =
      totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 100;

    const isBelowThreshold =
      totalReviewed >= 3 && acceptanceRatePct < minAcceptanceThreshold * 100;

    // Count taxonomies
    const taxonomyCounts = new Map<string, number>();
    for (const rejAsset of rejectedAssets) {
      const matchRej = rejections.find((r) => r.assetId === rejAsset.id);
      const code = matchRej?.taxonomyCode || "TECHNICAL_ISSUES";
      taxonomyCounts.set(code, (taxonomyCounts.get(code) || 0) + 1);
    }

    const topRejectionTaxonomies = Array.from(taxonomyCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    result.push({
      templateId: template.id,
      templateName: template.name,
      version: template.version,
      approvedCount,
      rejectedCount,
      totalReviewed,
      acceptanceRatePct,
      isBelowThreshold,
      topRejectionTaxonomies,
    });
  }

  return result.sort((a, b) => a.acceptanceRatePct - b.acceptanceRatePct);
}

