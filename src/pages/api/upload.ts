/**
 * File Upload API Endpoint
 *
 * POST /api/upload
 * - Upload files (images, documents, videos) for courses
 * - Validates file types and sizes
 * - Stores files in local uploads directory
 * - Returns public URL for the uploaded file
 *
 * Security: T199 - Rate limited to 10 uploads per 10 minutes per IP
 */

import type { APIRoute } from 'astro';
import { rateLimit, RateLimitProfiles } from '@/lib/ratelimit';
import { withCSRF } from '@/lib/csrf';

// ==================== Configuration ====================

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/zip'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

// ==================== Web Crypto API Helper Functions ====================

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot) : '';
}

// ==================== Helper Functions ====================

/**
 * Check if user is authenticated
 */
function isAuthenticated(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  return !!authHeader;
}

/**
 * Check if user has admin/instructor role
 */
function hasUploadPermission(request: Request): boolean {
  const authHeader = request.headers.get('Authorization');
  // TODO: Decode JWT and check user.role === 'admin' || user.role === 'instructor'
  return !!authHeader;
}

/**
 * Generate unique filename
 */
function generateFilename(originalName: string): string {
  const ext = getFileExtension(originalName);
  const timestamp = Date.now();
  const random = toHex(getRandomBytes(8));
  return `${timestamp}-${random}${ext}`;
}

/**
 * Get file category from mime type
 */
function getFileCategory(mimeType: string): string {
  if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'images';
  if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'videos';
  if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'documents';
  return 'other';
}

// ==================== POST Handler ====================

/**
 * POST /api/upload
 * Upload file and return public URL
 */
const postHandler: APIRoute = async (context) => {
  const { request } = context;

  // Rate limiting: 10 uploads per 10 minutes (prevents storage abuse)
  const rateLimitResult = await rateLimit(context, RateLimitProfiles.UPLOAD);
  if (!rateLimitResult.allowed) {
    const retryAfter = rateLimitResult.resetAt - Math.floor(Date.now() / 1000);
    console.warn('[UPLOAD] Rate limit exceeded:', {
      ip: context.clientAddress,
      resetAt: new Date(rateLimitResult.resetAt * 1000).toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too many upload attempts. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        resetAt: rateLimitResult.resetAt,
        retryAfter: retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter > 0 ? retryAfter : 1),
        },
      }
    );
  }

  try {
    // Check authentication and authorization
    if (!isAuthenticated(request)) {
      return new Response(
        JSON.stringify({
          error: 'Authentication required',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    if (!hasUploadPermission(request)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions. Admin or instructor role required.',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({
          error: 'No file provided',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid file type',
          message: `Allowed types: images (JPEG, PNG, WebP, GIF), videos (MP4, WebM), documents (PDF, ZIP)`,
          received: file.type,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({
          error: 'File too large',
          message: `Maximum file size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
          received: `${(file.size / (1024 * 1024)).toFixed(2)}MB`,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get file category for subdirectory organization
    const category = getFileCategory(file.type);

    // Generate unique filename
    const filename = generateFilename(file.name);

    // Try to use local storage (only works in Node.js, not Workers)
    try {
      const { writeFile, mkdir } = await import('fs/promises');
      const { existsSync } = await import('fs');
      const path = await import('path');

      const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
      const targetDir = category ? path.join(UPLOAD_DIR, category) : UPLOAD_DIR;

      if (!existsSync(targetDir)) {
        await mkdir(targetDir, { recursive: true });
      }

      const filepath = path.join(targetDir, filename);

      // Convert file to buffer and save
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await writeFile(filepath, buffer);

      // Generate public URL
      const publicUrl = `/uploads/${category}/${filename}`;

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            url: publicUrl,
            filename: filename,
            originalName: file.name,
            size: file.size,
            type: file.type,
            category: category,
          },
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (fsError) {
      // Local filesystem not available (Cloudflare Workers)
      // Return error suggesting to use S3/R2 storage
      return new Response(
        JSON.stringify({
          error: 'Local file storage not available in this environment',
          message: 'Configure S3 or R2 storage by setting STORAGE_PROVIDER environment variable',
        }),
        {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error) {
    console.error('Error uploading file:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to upload file',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Export handler with CSRF protection (T138)
export const POST = withCSRF(postHandler);
