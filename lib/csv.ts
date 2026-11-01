import { CONFIG } from "./config";

export interface CsvAssetRow {
  filename: string;
  title: string;
  keywords: string[];
  categoryId: number;
}

export interface CsvBatchFile {
  batchIndex: number;
  filename: string;
  csvContent: string;
  rowCount: number;
  byteSize: number;
}

/**
 * Formats an individual row for Adobe Stock CSV export.
 * Rule: Columns: Filename,Title,Keywords,Category
 * Keywords must be a comma-separated list enclosed in double quotes.
 */
export function formatCsvRow(item: CsvAssetRow): string {
  // Ensure filename has .jpg extension for Adobe Stock Contributor portal matching
  const filename = item.filename.endsWith(".jpg") || item.filename.endsWith(".jpeg")
    ? item.filename
    : `${item.filename}.jpg`;

  // Sanitize title (no commas, escape quotes if any)
  const title = item.title.replace(/,/g, " ").replace(/"/g, '""').trim();

  // Keywords joined with comma-space and wrapped in double quotes
  const keywordsJoined = item.keywords.join(", ");
  const keywordsEscaped = `"${keywordsJoined.replace(/"/g, '""')}"`;

  const category = item.categoryId.toString();

  return `${filename},${title},${keywordsEscaped},${category}`;
}

/**
 * Generates Adobe Stock compliant CSV content.
 * Enforces:
 * - UTF-8 without BOM
 * - Standard headers: Filename,Title,Keywords,Category
 * - Automatic splitting if > 5000 rows or > 1 MB (1,048,576 bytes)
 */
export function generateAdobeStockCsvBatches(rows: CsvAssetRow[]): CsvBatchFile[] {
  const header = CONFIG.CSV.COLUMNS.join(",");
  const headerByteSize = Buffer.byteLength(header + "\n", "utf8");

  const batches: CsvBatchFile[] = [];

  let currentBatchIndex = 1;
  let currentRows: string[] = [];
  let currentByteSize = headerByteSize;

  for (let i = 0; i < rows.length; i++) {
    const rowStr = formatCsvRow(rows[i]);
    const rowByteSize = Buffer.byteLength(rowStr + "\n", "utf8");

    // Check if adding this row exceeds max rows (5,000) or max size (1 MB = 1,048,576 bytes)
    const exceedsRows = currentRows.length >= CONFIG.CSV.MAX_ROWS;
    const exceedsSize = currentByteSize + rowByteSize > CONFIG.CSV.MAX_SIZE_BYTES;

    if (currentRows.length > 0 && (exceedsRows || exceedsSize)) {
      // Seal current batch
      const csvContent = [header, ...currentRows].join("\n");
      batches.push({
        batchIndex: currentBatchIndex,
        filename: `adobe_stock_batch_${currentBatchIndex}.csv`,
        csvContent,
        rowCount: currentRows.length,
        byteSize: Buffer.byteLength(csvContent, "utf8"),
      });

      // Start new batch
      currentBatchIndex++;
      currentRows = [];
      currentByteSize = headerByteSize;
    }

    currentRows.push(rowStr);
    currentByteSize += rowByteSize;
  }

  // Push final batch
  if (currentRows.length > 0 || batches.length === 0) {
    const csvContent = [header, ...currentRows].join("\n");
    batches.push({
      batchIndex: currentBatchIndex,
      filename: `adobe_stock_batch_${currentBatchIndex}.csv`,
      csvContent,
      rowCount: currentRows.length,
      byteSize: Buffer.byteLength(csvContent, "utf8"),
    });
  }

  return batches;
}

