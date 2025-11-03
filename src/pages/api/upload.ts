/**
 * File Upload API Endpoint
 * 
 * POST /api/upload
 * - Upload files (images, documents, videos) for courses
 * - Validates file types and sizes
 * - Stores files in local uploads directory
 * - Returns public URL for the uploaded file
 */

import type { APIRoute } from 'astro';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

// ==================== Configuration ====================

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/zip'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES, ...ALLOWED_DOCUMENT_TYPES];

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
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(subdir?: string): Promise<string> {
  const targetDir = subdir ? path.join(UPLOAD_DIR, subdir) : UPLOAD_DIR;
  
  if (!existsSync(targetDir)) {
    await mkdir(targetDir, { recursive: true });
  }
  
  return targetDir;
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
export const POST: APIRoute = async ({ request }) => {
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
    const uploadDir = await ensureUploadDir(category);

    // Generate unique filename
    const filename = generateFilename(file.name);
    const filepath = path.join(uploadDir, filename);

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
