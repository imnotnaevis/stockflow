import { describe, it, expect } from "vitest";
import {
  aggregateRevenuePerTemplate,
  computeQcCalibration,
  computeTemplateRejectionPatterns,
} from "./revenue";

describe("Revenue Subquery Aggregation Before Joining", () => {
  it("prevents row multiplication when an asset has multiple earning events", () => {
    const templates = [
      { id: "tmpl-1", name: "Cozy Holiday Flatlay", version: 1 },
      { id: "tmpl-2", name: "B2B Tech Team", version: 1 },
    ];

    const assets = [
      { id: "asset-1", filename: "xmas_01.jpg", templateId: "tmpl-1", status: "approved" },
      { id: "asset-2", filename: "xmas_02.jpg", templateId: "tmpl-1", status: "approved" },
      { id: "asset-3", filename: "tech_01.jpg", templateId: "tmpl-2", status: "approved" },
    ];

    // Asset-1 was sold 3 separate times across months!
    const earnings = [
      { id: "earn-1", assetId: "asset-1", filename: "xmas_01.jpg", downloads: 2, amountUsd: 1.98, periodDate: "2026-09", licenseType: "standard" },
      { id: "earn-2", assetId: "asset-1", filename: "xmas_01.jpg", downloads: 5, amountUsd: 4.95, periodDate: "2026-10", licenseType: "standard" },
      { id: "earn-3", assetId: "asset-1", filename: "xmas_01.jpg", downloads: 1, amountUsd: 9.90, periodDate: "2026-10", licenseType: "extended" },
      // Asset-2 sold once
      { id: "earn-4", assetId: "asset-2", filename: "xmas_02.jpg", downloads: 1, amountUsd: 0.99, periodDate: "2026-10", licenseType: "standard" },
      // Asset-3 sold once
      { id: "earn-5", assetId: "asset-3", filename: "tech_01.jpg", downloads: 10, amountUsd: 15.00, periodDate: "2026-10", licenseType: "subscription" },
    ];

    const results = aggregateRevenuePerTemplate(templates, assets, earnings);

    const tmpl1 = results.find((r) => r.templateId === "tmpl-1")!;
    expect(tmpl1).toBeDefined();
    expect(tmpl1.assetCount).toBe(2); // exactly 2 assets, NOT multiplied by 4 earnings rows!
    // Total tmpl1 revenue: 1.98 + 4.95 + 9.90 + 0.99 = 17.82
    expect(tmpl1.totalRevenue).toBe(17.82);
    // Total tmpl1 downloads: 2 + 5 + 1 + 1 = 9
    expect(tmpl1.totalDownloads).toBe(9);

    const tmpl2 = results.find((r) => r.templateId === "tmpl-2")!;
    expect(tmpl2.assetCount).toBe(1);
    expect(tmpl2.totalRevenue).toBe(15.00);
    expect(tmpl2.totalDownloads).toBe(10);
  });
});

describe("QC Calibration vs Outcome Comparison", () => {
  it("accurately computes confusion matrix and recommends threshold", () => {
    const assets = [
      // True Positive: QC pass & Approved
      { id: "a1", filename: "1.jpg", status: "approved", qcScore: 92, qcPass: true },
      { id: "a2", filename: "2.jpg", status: "approved", qcScore: 88, qcPass: true },
      // False Positive: QC pass but Adobe Rejected
      { id: "a3", filename: "3.jpg", status: "rejected", qcScore: 78, qcPass: true },
      // True Negative: QC fail & Adobe Rejected
      { id: "a4", filename: "4.jpg", status: "rejected", qcScore: 50, qcPass: false },
      // False Negative: QC fail but Approved after override
      { id: "a5", filename: "5.jpg", status: "approved", qcScore: 65, qcPass: false },
    ];

    const calibration = computeQcCalibration(assets);

    expect(calibration.totalEvaluated).toBe(5);
    expect(calibration.approvedCount).toBe(3);
    expect(calibration.rejectedCount).toBe(2);
    expect(calibration.truePositives).toBe(2);
    expect(calibration.falsePositives).toBe(1);
    expect(calibration.trueNegatives).toBe(1);
    expect(calibration.falseNegatives).toBe(1);
    expect(calibration.accuracyPct).toBe(60); // 3 correct out of 5
    expect(calibration.avgSharpnessApproved).toBeGreaterThan(calibration.avgSharpnessRejected);
  });
});

describe("Rejection Pattern Analysis & Threshold Warning", () => {
  it("flags templates whose acceptance rate falls below configured threshold", () => {
    const templates = [
      { id: "tmpl-good", name: "High Performer", version: 1 },
      { id: "tmpl-bad", name: "Flawed Concept", version: 1 },
    ];

    const assets = [
      // tmpl-good: 4 approved, 0 rejected (100% acceptance)
      { id: "g1", filename: "g1.jpg", templateId: "tmpl-good", status: "approved" },
      { id: "g2", filename: "g2.jpg", templateId: "tmpl-good", status: "approved" },
      { id: "g3", filename: "g3.jpg", templateId: "tmpl-good", status: "approved" },
      { id: "g4", filename: "g4.jpg", templateId: "tmpl-good", status: "approved" },
      // tmpl-bad: 1 approved, 3 rejected (25% acceptance -> below 70%)
      { id: "b1", filename: "b1.jpg", templateId: "tmpl-bad", status: "approved" },
      { id: "b2", filename: "b2.jpg", templateId: "tmpl-bad", status: "rejected" },
      { id: "b3", filename: "b3.jpg", templateId: "tmpl-bad", status: "rejected" },
      { id: "b4", filename: "b4.jpg", templateId: "tmpl-bad", status: "rejected" },
    ];

    const rejections = [
      { assetId: "b2", taxonomyCode: "SIMILAR_CONTENT" },
      { assetId: "b3", taxonomyCode: "SIMILAR_CONTENT" },
      { assetId: "b4", taxonomyCode: "TECHNICAL_ISSUES" },
    ];

    const analysis = computeTemplateRejectionPatterns(templates, assets, rejections, 0.70);

    const badTmpl = analysis.find((t) => t.templateId === "tmpl-bad")!;
    expect(badTmpl.isBelowThreshold).toBe(true);
    expect(badTmpl.acceptanceRatePct).toBe(25);
    expect(badTmpl.topRejectionTaxonomies[0].code).toBe("SIMILAR_CONTENT");
    expect(badTmpl.topRejectionTaxonomies[0].count).toBe(2);

    const goodTmpl = analysis.find((t) => t.templateId === "tmpl-good")!;
    expect(goodTmpl.isBelowThreshold).toBe(false);
    expect(goodTmpl.acceptanceRatePct).toBe(100);
  });
});

