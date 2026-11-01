import { CONFIG } from "./config";

/**
 * Seasonal Production Window Status
 * H-90 to H-30 indicates optimal stock asset production window before holiday event.
 */
export type SeasonalStatus = "upcoming" | "produce_now" | "late" | "passed";

export interface SeasonalWindowInfo {
  status: SeasonalStatus;
  daysUntil: number;
  label: string;
  badgeColor: string;
  isOptimal: boolean;
}

/**
 * Computes seasonal production window status based on H-90 to H-30 rules.
 * Adobe Stock buyers start purchasing seasonal assets 30 to 90 days before the event.
 *
 * - Upcoming: > 90 days before event (plan concepts & prompts)
 * - Produce Now: 30 to 90 days before event (prime production & submission window)
 * - Late: 0 to 29 days before event (review queue lag risks missing the peak surge)
 * - Passed: Event has already passed
 */
export function computeSeasonalStatus(
  targetDate: string | Date | null | undefined,
  refDate: Date = new Date()
): SeasonalWindowInfo {
  if (!targetDate) {
    return {
      status: "upcoming",
      daysUntil: 999,
      label: "Evergreen / No Target Date",
      badgeColor: "zinc",
      isOptimal: false,
    };
  }

  const target = new Date(targetDate);
  const now = new Date(refDate);

  // Normalize to UTC start of day to avoid timezone hour skew
  const targetUtc = Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), target.getUTCDate());
  const nowUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.ceil((targetUtc - nowUtc) / (1000 * 60 * 60 * 24));

  const { WINDOW_EARLY_DAYS, WINDOW_LATE_DAYS } = CONFIG.SEASONAL;

  if (diffDays < 0) {
    return {
      status: "passed",
      daysUntil: diffDays,
      label: "Passed",
      badgeColor: "zinc",
      isOptimal: false,
    };
  }

  if (diffDays > WINDOW_EARLY_DAYS) {
    return {
      status: "upcoming",
      daysUntil: diffDays,
      label: `Upcoming (H-${diffDays})`,
      badgeColor: "sky",
      isOptimal: false,
    };
  }

  if (diffDays >= WINDOW_LATE_DAYS && diffDays <= WINDOW_EARLY_DAYS) {
    return {
      status: "produce_now",
      daysUntil: diffDays,
      label: `Produce Now (H-${diffDays})`,
      badgeColor: "emerald",
      isOptimal: true,
    };
  }

  return {
    status: "late",
    daysUntil: diffDays,
    label: `Late (H-${diffDays})`,
    badgeColor: "amber",
    isOptimal: false,
  };
}

/**
 * Health Score Input Metrics
 */
export interface HealthMetrics {
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  activeThemesCount: number;
  targetThemesCount?: number;
  flaggedDuplicatesCount: number;
  totalAssetsCount: number;
  unsoldAgedAssetsCount: number;
  totalLiveAssetsCount: number;
}

export interface HealthScoreComponent {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  details: string;
}

export interface HealthScoreResult {
  score: number; // 0 - 100
  grade: "A" | "B" | "C" | "D";
  gradeLabel: string;
  components: {
    approvalRate: HealthScoreComponent;
    themeDiversity: HealthScoreComponent;
    similaritySafety: HealthScoreComponent;
    freshness: HealthScoreComponent;
  };
}

/**
 * Calculates Portfolio Health Score (0 - 100).
 *
 * Formula Components:
 * 1. Approval Rate (Weight 40%):
 *    Measures Adobe Stock acceptance ratio. High acceptance signals compliance
 *    with Adobe quality guidelines and minimal rejections.
 *
 * 2. Theme Diversity (Weight 20%):
 *    Healthy stock portfolios hedge risk across multiple active themes (seasonal,
 *    evergreen, and copy-space). Target is 5 or more active themes.
 *
 * 3. Similarity Safety (Weight 20%):
 *    Adobe Stock aggressively penalizes portfolios with repetitive spam or near-duplicate
 *    generative variations. Penalizes assets with Hamming distance <= threshold.
 *
 * 4. Freshness & Commercial Velocity (Weight 20%):
 *    Identifies stale inventory (assets approved > 90 days ago with zero customer downloads
 *    or earnings) to prioritize pruning or title/keyword re-optimization.
 */
export function computePortfolioHealthScore(metrics: HealthMetrics): HealthScoreResult {
  const targetThemes = metrics.targetThemesCount || 5;

  // 1. Approval Rate Component (40 max)
  const reviewedCount = metrics.totalApproved + metrics.totalRejected;
  let approvalRatePct = 0.85; // baseline assumption if no rejections/approvals yet
  let approvalDetails = "No reviewed assets yet; standard baseline applied.";

  if (reviewedCount > 0) {
    approvalRatePct = metrics.totalApproved / reviewedCount;
    approvalDetails = `${metrics.totalApproved} approved / ${reviewedCount} reviewed (${Math.round(approvalRatePct * 100)}%)`;
  }
  const approvalScore = Math.min(40, Math.max(0, Math.round(approvalRatePct * 40 * 10) / 10));

  // 2. Theme Diversity Component (20 max)
  const diversityRatio = Math.min(1, metrics.activeThemesCount / targetThemes);
  const diversityScore = Math.min(20, Math.max(0, Math.round(diversityRatio * 20 * 10) / 10));
  const diversityDetails = `${metrics.activeThemesCount} of target ${targetThemes} active production themes`;

  // 3. Similarity Safety Component (20 max)
  let similarityScore = 20;
  let similarityDetails = "0 duplicate flags detected.";
  if (metrics.totalAssetsCount > 0) {
    const duplicateRatio = Math.min(1, metrics.flaggedDuplicatesCount / metrics.totalAssetsCount);
    similarityScore = Math.min(20, Math.max(0, Math.round((1 - duplicateRatio) * 20 * 10) / 10));
    similarityDetails = `${metrics.flaggedDuplicatesCount} near-duplicates flagged across ${metrics.totalAssetsCount} assets`;
  }

  // 4. Freshness & Commercial Velocity (20 max)
  let freshnessScore = 20;
  let freshnessDetails = "No aged unsold inventory detected.";
  if (metrics.totalLiveAssetsCount > 0) {
    const unsoldRatio = Math.min(1, metrics.unsoldAgedAssetsCount / metrics.totalLiveAssetsCount);
    freshnessScore = Math.min(20, Math.max(0, Math.round((1 - unsoldRatio) * 20 * 10) / 10));
    freshnessDetails = `${metrics.unsoldAgedAssetsCount} unsold assets >90 days old (${Math.round(unsoldRatio * 100)}% of live portfolio)`;
  }

  const totalScore = Math.min(100, Math.max(0, Math.round(approvalScore + diversityScore + similarityScore + freshnessScore)));

  let grade: "A" | "B" | "C" | "D" = "C";
  let gradeLabel = "Moderate Quality";

  if (totalScore >= 90) {
    grade = "A";
    gradeLabel = "Excellent Health";
  } else if (totalScore >= 80) {
    grade = "B";
    gradeLabel = "Strong Quality";
  } else if (totalScore >= 70) {
    grade = "C";
    gradeLabel = "Moderate Quality";
  } else {
    grade = "D";
    gradeLabel = "Needs Optimization";
  }

  return {
    score: totalScore,
    grade,
    gradeLabel,
    components: {
      approvalRate: {
        name: "Approval Rate",
        weight: 0.4,
        score: approvalScore,
        maxScore: 40,
        details: approvalDetails,
      },
      themeDiversity: {
        name: "Theme Diversity",
        weight: 0.2,
        score: diversityScore,
        maxScore: 20,
        details: diversityDetails,
      },
      similaritySafety: {
        name: "Similarity Safety",
        weight: 0.2,
        score: similarityScore,
        maxScore: 20,
        details: similarityDetails,
      },
      freshness: {
        name: "Freshness & Velocity",
        weight: 0.2,
        score: freshnessScore,
        maxScore: 20,
        details: freshnessDetails,
      },
    },
  };
}

