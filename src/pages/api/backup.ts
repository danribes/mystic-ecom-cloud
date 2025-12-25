/**
 * Database Backup API Endpoint
 *
 * Provides REST API for backup management:
 * - GET /api/backup - List all backups
 * - POST /api/backup - Create new backup
 * - GET /api/backup/stats - Get backup statistics
 * - DELETE /api/backup/:filename - Delete specific backup
 *
 * Authentication: Requires admin role
 * Rate Limiting: 10 requests per hour
 */

import type { APIRoute } from 'astro';
import { captureException, addBreadcrumb } from '../../lib/sentry';

// Dynamic import for backup functions (not available in Cloudflare Workers)
type BackupModule = typeof import('../../lib/backup');
let backupModule: BackupModule | null = null;

async function getBackupModule(): Promise<BackupModule | null> {
  if (backupModule) return backupModule;
  try {
    backupModule = await import('../../lib/backup');
    return backupModule;
  } catch (error) {
    console.warn('Backup module not available in this environment:', error);
    return null;
  }
}

function notAvailableResponse(): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Backup functionality is not available in Cloudflare Workers',
      message: 'Database backups require pg_dump and file system access, which are not available in serverless environments. Use the CLI tools or a dedicated backup service instead.',
    }),
    {
      status: 501,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Check if user is admin (simplified - implement proper auth)
 */
function isAdmin(request: Request): boolean {
  // TODO: Implement proper authentication check
  // For now, check for API key in header
  const apiKey = request.headers.get('X-API-Key');
  const validApiKey = process.env.BACKUP_API_KEY || 'dev-backup-key';

  return apiKey === validApiKey;
}

/**
 * GET /api/backup
 * GET /api/backup?action=stats
 *
 * List all backups or get statistics
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    // Check authentication
    if (!isAdmin(request)) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin access required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to load backup module
    const backup = await getBackupModule();
    if (!backup) {
      return notAvailableResponse();
    }

    const action = url.searchParams.get('action');

    // Get statistics
    if (action === 'stats') {
      addBreadcrumb({
        message: 'Backup stats requested',
        category: 'backup_api',
        level: 'info',
      });

      const stats = await backup.getBackupStats();

      return new Response(
        JSON.stringify({
          success: true,
          stats: {
            totalBackups: stats.totalBackups,
            totalSize: stats.totalSize,
            totalSizeFormatted: formatBytes(stats.totalSize),
            oldestBackup: stats.oldestBackup,
            newestBackup: stats.newestBackup,
            averageSize:
              stats.totalBackups > 0
                ? stats.totalSize / stats.totalBackups
                : 0,
            averageSizeFormatted:
              stats.totalBackups > 0
                ? formatBytes(stats.totalSize / stats.totalBackups)
                : '0 Bytes',
          },
          retentionPolicy: {
            days: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
            count: parseInt(process.env.BACKUP_RETENTION_COUNT || '10'),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // List backups
    addBreadcrumb({
      message: 'Backup list requested',
      category: 'backup_api',
      level: 'info',
    });

    const backups = await backup.listBackups();

    const backupsWithFormatted = backups.map((backup) => ({
      ...backup,
      sizeFormatted: formatBytes(backup.size),
      path: undefined, // Don't expose full path in API
    }));

    return new Response(
      JSON.stringify({
        success: true,
        count: backups.length,
        backups: backupsWithFormatted,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Backup API error (GET):', error);

    captureException(error, {
      context: 'backup_api',
      operation: 'get',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * POST /api/backup
 * POST /api/backup?action=cleanup
 *
 * Create a new backup or cleanup old backups
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    // Check authentication
    if (!isAdmin(request)) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin access required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to load backup module
    const backup = await getBackupModule();
    if (!backup) {
      return notAvailableResponse();
    }

    const action = url.searchParams.get('action');

    // Cleanup old backups
    if (action === 'cleanup') {
      addBreadcrumb({
        message: 'Backup cleanup requested',
        category: 'backup_api',
        level: 'info',
      });

      const deletedCount = await backup.cleanupOldBackups();

      return new Response(
        JSON.stringify({
          success: true,
          message: `Cleaned up ${deletedCount} old backup(s)`,
          deletedCount,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if pg_dump is available
    const pgDumpAvailable = await backup.checkPgDumpAvailable();
    if (!pgDumpAvailable) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'pg_dump is not available. Please install PostgreSQL client tools.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Create backup
    addBreadcrumb({
      message: 'Backup creation requested',
      category: 'backup_api',
      level: 'info',
    });

    const result = await backup.createBackup();

    if (result.success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Backup created successfully',
          backup: {
            filename: result.filename,
            size: result.size,
            sizeFormatted: formatBytes(result.size!),
            duration: result.duration,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Backup API error (POST):', error);

    captureException(error, {
      context: 'backup_api',
      operation: 'post',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

/**
 * DELETE /api/backup?filename=backup.dump
 *
 * Delete a specific backup
 */
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    // Check authentication
    if (!isAdmin(request)) {
      return new Response(
        JSON.stringify({
          error: 'Unauthorized',
          message: 'Admin access required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Try to load backup module
    const backup = await getBackupModule();
    if (!backup) {
      return notAvailableResponse();
    }

    const filename = url.searchParams.get('filename');

    if (!filename) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'filename parameter is required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    addBreadcrumb({
      message: 'Backup deletion requested',
      category: 'backup_api',
      level: 'info',
      data: { filename },
    });

    const success = await backup.deleteBackup(filename);

    if (success) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Backup ${filename} deleted successfully`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to delete backup',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Backup API error (DELETE):', error);

    captureException(error, {
      context: 'backup_api',
      operation: 'delete',
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
