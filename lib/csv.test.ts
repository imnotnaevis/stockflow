import { describe, it, expect } from "vitest";
import { formatCsvRow, generateAdobeStockCsvBatches, type CsvAssetRow } from "./csv";

describe("Adobe Stock CSV Generator", () => {
  it("formats row correctly with comma-separated keywords in double quotes", () => {
    const row: CsvAssetRow = {
      filename: "wooden_cabin_01",
      title: "Cozy Wooden Cabin In Snowy Mountain Pines",
      keywords: ["cabin", "wooden", "snow", "mountain", "winter", "forest"],
      categoryId: 2, // Buildings and Architecture
    };

    const formatted = formatCsvRow(row);
    expect(formatted).toBe(
      'wooden_cabin_01.jpg,Cozy Wooden Cabin In Snowy Mountain Pines,"cabin, wooden, snow, mountain, winter, forest",2'
    );
  });

  it("ensures CSV output is UTF-8 without BOM", () => {
    const rows: CsvAssetRow[] = [
      {
        filename: "test_01",
        title: "Test Image One",
        keywords: Array.from({ length: 15 }, (_, i) => `kw${i}`),
        categoryId: 11,
      },
    ];

    const batches = generateAdobeStockCsvBatches(rows);
    expect(batches.length).toBe(1);

    const content = batches[0].csvContent;
    // Must NOT start with \uFEFF BOM
    expect(content.charCodeAt(0)).not.toBe(0xfeff);
    expect(content.startsWith("Filename,Title,Keywords,Category")).toBe(true);
  });

  it("splits batches when row count exceeds 5,000", () => {
    // Generate 5,005 mock rows
    const mockRows: CsvAssetRow[] = Array.from({ length: 5005 }, (_, i) => ({
      filename: `asset_${i}`,
      title: `Sample Stock Image Title Number ${i}`,
      keywords: ["stock", "photo", "creative", "commercial", "asset"],
      categoryId: 1,
    }));

    const batches = generateAdobeStockCsvBatches(mockRows);
    expect(batches.length).toBe(2);
    expect(batches[0].rowCount).toBe(5000);
    expect(batches[1].rowCount).toBe(5);
    expect(batches[0].filename).toBe("adobe_stock_batch_1.csv");
    expect(batches[1].filename).toBe("adobe_stock_batch_2.csv");
  });
});

