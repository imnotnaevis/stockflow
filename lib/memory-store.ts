// Shared in-memory asset store for local development & fallback
export interface MemoryAsset {
  id: string;
  filename: string;
  blobUrl: string;
  thumbnailUrl: string | null;
  width: number;
  height: number;
  phash: string;
  phashHex: string;
  phashBigInt: string;
  status: string;
  adobeContentId: string | null;
  seriesId: string | null;
  templateId: string | null;
  createdAt: string;
  seriesTitle?: string | null;
  seriesQuota?: number | null;
  seriesCount?: number | null;
  themeName?: string | null;
  metadata?: {
    title: string;
    categoryId: number;
    keywords: string[];
  } | null;
}

export const memoryAssets: MemoryAsset[] = [];
