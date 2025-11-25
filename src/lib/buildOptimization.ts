/**
 * Build Optimization Utilities
 *
 * Provides utilities for analyzing and optimizing production builds:
 * - Bundle size analysis
 * - Asset compression
 * - Cache headers
 * - Build statistics
 *
 * Part of T144: Minify and bundle assets for production
 * Cloudflare Workers compatible - uses Web Crypto API
 */

export interface AssetInfo {
  path: string;
  size: number;
  gzipSize?: number;
  hash: string;
  type: 'js' | 'css' | 'image' | 'font' | 'other';
}

export interface BundleStats {
  totalSize: number;
  totalGzipSize: number;
  assets: AssetInfo[];
  byType: Record<string, { count: number; size: number; gzipSize: number }>;
  largestAssets: AssetInfo[];
}

/**
 * Determines asset type from file extension
 */
export function getAssetType(path: string): AssetInfo['type'] {
  const ext = path.split('.').pop()?.toLowerCase();

  if (['js', 'mjs', 'cjs'].includes(ext || '')) return 'js';
  if (['css'].includes(ext || '')) return 'css';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext || '')) return 'image';
  if (['woff', 'woff2', 'ttf', 'eot', 'otf'].includes(ext || '')) return 'font';
  return 'other';
}

/**
 * Generates hash for cache busting (Web Crypto API compatible)
 */
export async function generateAssetHash(content: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder();
  const data = typeof content === 'string' ? encoder.encode(content) : content;
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex.substring(0, 8);
}

/**
 * Formats file size in human-readable format
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculates compression ratio
 */
export function getCompressionRatio(originalSize: number, compressedSize: number): number {
  if (originalSize === 0) return 0;
  return parseFloat((((originalSize - compressedSize) / originalSize) * 100).toFixed(2));
}

/**
 * Analyzes bundle statistics
 */
export function analyzeBundleStats(assets: AssetInfo[]): BundleStats {
  const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
  const totalGzipSize = assets.reduce((sum, asset) => sum + (asset.gzipSize || 0), 0);

  // Group by type
  const byType: Record<string, { count: number; size: number; gzipSize: number }> = {};

  assets.forEach(asset => {
    if (!byType[asset.type]) {
      byType[asset.type] = { count: 0, size: 0, gzipSize: 0 };
    }
    byType[asset.type].count++;
    byType[asset.type].size += asset.size;
    byType[asset.type].gzipSize += asset.gzipSize || 0;
  });

  // Find largest assets
  const largestAssets = [...assets]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  return {
    totalSize,
    totalGzipSize,
    assets,
    byType,
    largestAssets
  };
}

/**
 * Generates bundle size report
 */
export function generateBundleReport(stats: BundleStats): string {
  const lines: string[] = [];

  lines.push('='.repeat(60));
  lines.push('📦 Bundle Size Report');
  lines.push('='.repeat(60));
  lines.push('');

  // Overall stats
  lines.push('Overall Statistics:');
  lines.push(`  Total Size:      ${formatSize(stats.totalSize)}`);
  lines.push(`  Total Gzip:      ${formatSize(stats.totalGzipSize)}`);
  lines.push(`  Compression:     ${getCompressionRatio(stats.totalSize, stats.totalGzipSize)}%`);
  lines.push(`  Asset Count:     ${stats.assets.length}`);
  lines.push('');

  // By type
  lines.push('By Asset Type:');
  Object.entries(stats.byType)
    .sort(([, a], [, b]) => b.size - a.size)
    .forEach(([type, data]) => {
      const ratio = getCompressionRatio(data.size, data.gzipSize);
      lines.push(`  ${type.toUpperCase().padEnd(8)} ${formatSize(data.size).padEnd(12)} (gzip: ${formatSize(data.gzipSize)}, ${ratio}%) - ${data.count} files`);
    });
  lines.push('');

  // Largest assets
  lines.push('Largest Assets (Top 10):');
  stats.largestAssets.forEach((asset, i) => {
    const ratio = asset.gzipSize ? getCompressionRatio(asset.size, asset.gzipSize) : 0;
    const gzipInfo = asset.gzipSize ? ` (gzip: ${formatSize(asset.gzipSize)}, ${ratio}%)` : '';
    lines.push(`  ${(i + 1).toString().padStart(2)}. ${formatSize(asset.size).padEnd(12)} ${asset.path}${gzipInfo}`);
  });
  lines.push('');
  lines.push('='.repeat(60));

  return lines.join('\n');
}

/**
 * Checks if bundle size exceeds thresholds
 */
export interface SizeThresholds {
  maxTotalSize?: number;        // Max total bundle size (bytes)
  maxJsSize?: number;            // Max total JS size (bytes)
  maxCssSize?: number;           // Max total CSS size (bytes)
  maxAssetSize?: number;         // Max single asset size (bytes)
  warnTotalSize?: number;        // Warning threshold for total size
  warnAssetSize?: number;        // Warning threshold for single asset
}

export interface SizeCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export function checkBundleSize(stats: BundleStats, thresholds: SizeThresholds): SizeCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check total size
  if (thresholds.maxTotalSize && stats.totalSize > thresholds.maxTotalSize) {
    errors.push(
      `Total bundle size ${formatSize(stats.totalSize)} exceeds limit ${formatSize(thresholds.maxTotalSize)}`
    );
  }

  if (thresholds.warnTotalSize && stats.totalSize > thresholds.warnTotalSize) {
    warnings.push(
      `Total bundle size ${formatSize(stats.totalSize)} exceeds warning threshold ${formatSize(thresholds.warnTotalSize)}`
    );
  }

  // Check JS size
  if (thresholds.maxJsSize && stats.byType.js && stats.byType.js.size > thresholds.maxJsSize) {
    errors.push(
      `JavaScript size ${formatSize(stats.byType.js.size)} exceeds limit ${formatSize(thresholds.maxJsSize)}`
    );
  }

  // Check CSS size
  if (thresholds.maxCssSize && stats.byType.css && stats.byType.css.size > thresholds.maxCssSize) {
    errors.push(
      `CSS size ${formatSize(stats.byType.css.size)} exceeds limit ${formatSize(thresholds.maxCssSize)}`
    );
  }

  // Check individual assets
  stats.assets.forEach(asset => {
    if (thresholds.maxAssetSize && asset.size > thresholds.maxAssetSize) {
      errors.push(
        `Asset ${asset.path} (${formatSize(asset.size)}) exceeds limit ${formatSize(thresholds.maxAssetSize)}`
      );
    }

    if (thresholds.warnAssetSize && asset.size > thresholds.warnAssetSize) {
      warnings.push(
        `Asset ${asset.path} (${formatSize(asset.size)}) exceeds warning threshold ${formatSize(thresholds.warnAssetSize)}`
      );
    }
  });

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Cache control headers for different asset types
 */
export const CACHE_HEADERS = {
  // Immutable assets (with hash in filename)
  immutable: {
    'Cache-Control': 'public, max-age=31536000, immutable',
  },

  // HTML pages (revalidate frequently)
  html: {
    'Cache-Control': 'public, max-age=0, must-revalidate',
  },

  // API responses (no cache)
  api: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },

  // Static assets (cache but revalidate)
  static: {
    'Cache-Control': 'public, max-age=86400, must-revalidate',
  },

  // Images (long cache)
  images: {
    'Cache-Control': 'public, max-age=2592000, immutable',
  },
} as const;

/**
 * Gets appropriate cache headers for a file path
 */
export function getCacheHeaders(path: string): Record<string, string> {
  // Check if file has hash (e.g., main.abc123.js)
  const hasHash = /\.[a-f0-9]{8,}\.(js|css)$/.test(path);

  if (hasHash) {
    return CACHE_HEADERS.immutable;
  }

  if (path.endsWith('.html')) {
    return CACHE_HEADERS.html;
  }

  if (path.startsWith('/api/')) {
    return CACHE_HEADERS.api;
  }

  const type = getAssetType(path);
  if (type === 'image') {
    return CACHE_HEADERS.images;
  }

  return CACHE_HEADERS.static;
}

/**
 * Build optimization recommendations
 */
export interface OptimizationRecommendation {
  type: 'error' | 'warning' | 'info';
  category: 'size' | 'performance' | 'caching' | 'compression';
  message: string;
  asset?: string;
}

export function generateRecommendations(stats: BundleStats): OptimizationRecommendation[] {
  const recommendations: OptimizationRecommendation[] = [];

  // Check for large assets
  stats.assets.forEach(asset => {
    if (asset.size > 500 * 1024) { // > 500KB
      recommendations.push({
        type: 'warning',
        category: 'size',
        message: `Large asset detected: ${asset.path} (${formatSize(asset.size)}). Consider code splitting or lazy loading.`,
        asset: asset.path
      });
    }

    // Check compression ratio
    if (asset.gzipSize) {
      const ratio = getCompressionRatio(asset.size, asset.gzipSize);
      if (ratio < 30 && asset.size > 10 * 1024) { // < 30% compression on files > 10KB
        recommendations.push({
          type: 'info',
          category: 'compression',
          message: `Low compression ratio for ${asset.path} (${ratio}%). File may already be compressed or binary.`,
          asset: asset.path
        });
      }
    }
  });

  // Check total JS size
  if (stats.byType.js && stats.byType.js.size > 1 * 1024 * 1024) { // > 1MB
    recommendations.push({
      type: 'warning',
      category: 'size',
      message: `Total JavaScript size is ${formatSize(stats.byType.js.size)}. Consider code splitting and lazy loading.`
    });
  }

  // Check total CSS size
  if (stats.byType.css && stats.byType.css.size > 200 * 1024) { // > 200KB
    recommendations.push({
      type: 'warning',
      category: 'size',
      message: `Total CSS size is ${formatSize(stats.byType.css.size)}. Consider purging unused CSS.`
    });
  }

  // Performance recommendations
  if (stats.assets.length > 50) {
    recommendations.push({
      type: 'info',
      category: 'performance',
      message: `Build contains ${stats.assets.length} assets. Consider combining smaller assets or using HTTP/2 server push.`
    });
  }

  return recommendations;
}

/**
 * Default build optimization thresholds
 */
export const DEFAULT_THRESHOLDS: SizeThresholds = {
  maxTotalSize: 5 * 1024 * 1024,      // 5 MB
  maxJsSize: 2 * 1024 * 1024,          // 2 MB
  maxCssSize: 500 * 1024,              // 500 KB
  maxAssetSize: 1 * 1024 * 1024,       // 1 MB per asset
  warnTotalSize: 3 * 1024 * 1024,      // 3 MB warning
  warnAssetSize: 500 * 1024,           // 500 KB warning
};
