import { describe, it, expect } from "vitest";
import { computeSeasonalStatus, computePortfolioHealthScore } from "./health";

describe("Seasonal Window Calculations (H-90 to H-30)", () => {
  const refDate = new Date("2026-11-01T00:00:00Z");

  it("identifies events more than 90 days away as 'upcoming'", () => {
    // 100 days away -> 2027-02-09
    const target = new Date("2027-02-09T00:00:00Z");
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("upcoming");
    expect(result.isOptimal).toBe(false);
    expect(result.daysUntil).toBe(100);
  });

  it("identifies events between 30 and 90 days as 'produce_now'", () => {
    // 60 days away (Christmas/New Year window) -> 2026-12-31
    const target = new Date("2026-12-31T00:00:00Z");
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("produce_now");
    expect(result.isOptimal).toBe(true);
    expect(result.daysUntil).toBe(60);
  });

  it("identifies events exactly at H-90 boundary as 'produce_now'", () => {
    const target = new Date("2027-01-30T00:00:00Z"); // 90 days
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("produce_now");
    expect(result.isOptimal).toBe(true);
  });

  it("identifies events exactly at H-30 boundary as 'produce_now'", () => {
    const target = new Date("2026-12-01T00:00:00Z"); // 30 days
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("produce_now");
    expect(result.isOptimal).toBe(true);
  });

  it("identifies events closer than 30 days as 'late'", () => {
    // 15 days away -> 2026-11-16
    const target = new Date("2026-11-16T00:00:00Z");
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("late");
    expect(result.isOptimal).toBe(false);
  });

  it("identifies past events as 'passed'", () => {
    const target = new Date("2026-10-15T00:00:00Z");
    const result = computeSeasonalStatus(target, refDate);
    expect(result.status).toBe("passed");
    expect(result.isOptimal).toBe(false);
  });

  it("handles null or missing target date as evergreen", () => {
    const result = computeSeasonalStatus(null, refDate);
    expect(result.status).toBe("upcoming");
    expect(result.label).toContain("Evergreen");
  });
});

describe("Portfolio Health Score Calculation", () => {
  it("computes high health score (Grade A) for well-maintained portfolio", () => {
    const result = computePortfolioHealthScore({
      totalSubmitted: 100,
      totalApproved: 95,
      totalRejected: 5,
      activeThemesCount: 6,
      targetThemesCount: 5,
      flaggedDuplicatesCount: 2,
      totalAssetsCount: 120,
      unsoldAgedAssetsCount: 5,
      totalLiveAssetsCount: 100,
    });

    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.grade).toBe("A");
    expect(result.components.approvalRate.score).toBeCloseTo(38, 0);
    expect(result.components.themeDiversity.score).toBe(20);
  });

  it("penalizes high rejection rates, duplicates, and stale inventory", () => {
    const result = computePortfolioHealthScore({
      totalSubmitted: 50,
      totalApproved: 15,
      totalRejected: 35, // 30% approval rate
      activeThemesCount: 1, // low diversity
      targetThemesCount: 5,
      flaggedDuplicatesCount: 25, // 50% duplicate flags
      totalAssetsCount: 50,
      unsoldAgedAssetsCount: 30, // 75% stale
      totalLiveAssetsCount: 40,
    });

    expect(result.score).toBeLessThan(60);
    expect(result.grade).toBe("D");
    expect(result.gradeLabel).toBe("Needs Optimization");
  });

  it("provides balanced baseline when portfolio is brand new", () => {
    const result = computePortfolioHealthScore({
      totalSubmitted: 0,
      totalApproved: 0,
      totalRejected: 0,
      activeThemesCount: 3,
      targetThemesCount: 5,
      flaggedDuplicatesCount: 0,
      totalAssetsCount: 5,
      unsoldAgedAssetsCount: 0,
      totalLiveAssetsCount: 0,
    });

    expect(result.score).toBeGreaterThan(60);
    expect(result.components.approvalRate.details).toContain("baseline");
  });
});

