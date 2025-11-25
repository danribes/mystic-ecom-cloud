/**
 * T104: Cloud Storage Integration
 * 
 * Provides file upload/download functionality for digital products.
 * Supports multiple storage providers: AWS S3, local filesystem (dev), or future providers.
 * 
 * Features:
 * - Multi-provider support (S3, local, extensible)
 * - Secure file upload with validation
 * - Signed URLs for secure downloads
 * - File metadata tracking
 * - Automatic cleanup on delete
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ValidationError } from './errors';

// Generate UUID using Web Crypto API (Cloudflare Workers compatible)
function generateUUID(): string {
  // Use crypto.randomUUID if available (modern browsers/Workers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  const hex = [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Get file extension from filename (path.extname replacement)
function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot > 0 ? fileName.slice(lastDot) : '';
}

// Get base name without extension (path.basename replacement)
function getBaseName(fileName: string, ext?: string): string {
  // Remove any path separators
  const name = fileName.split('/').pop()?.split('\\').pop() || fileName;
  if (ext && name.endsWith(ext)) {
    return name.slice(0, -ext.length);
  }
  return name;
}

// ==================== Types ====================

export interface FileInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  size: number;
}

export interface UploadOptions {
  file: FileInput | Buffer;
  fileName?: string;
  contentType?: string;
  folder?: string;
  maxSizeMB?: number;
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}

export interface DownloadOptions {
  key: string;
  expiresIn?: number; // seconds
}

export type StorageProvider = 'local' | 's3' | 'r2';

// ==================== Configuration ====================

// Helper to get current provider (reads from env dynamically for testing)
function getStorageProvider(): StorageProvider {
  return (process.env.STORAGE_PROVIDER || 'local') as StorageProvider;
}

// Helper functions to get config dynamically
function getLocalStoragePath(): string {
  return process.env.LOCAL_STORAGE_PATH || './uploads';
}

function getPublicUrl(): string {
  return process.env.PUBLIC_URL || 'http://localhost:4321';
}

function getS3Config() {
  // SECURITY: No fallbacks for credentials
  // Region can have a default as it's not sensitive
  return {
    bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || 'us-east-1', // OK: Not sensitive, reasonable default
    endpoint: process.env.S3_ENDPOINT,
    accessKey: process.env.S3_ACCESS_KEY_ID,
    secretKey: process.env.S3_SECRET_ACCESS_KEY,
  };
}

// File validation
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'video/mp4',
  'video/quicktime',
  'application/epub+zip',
  'application/zip',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const DEFAULT_MAX_SIZE_MB = 500; // 500MB default
const DEFAULT_SIGNED_URL_EXPIRY = 3600; // 1 hour

// ==================== S3 Client ====================

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  const provider = getStorageProvider();
  if (!s3Client && (provider === 's3' || provider === 'r2')) {
    const { bucket, region, endpoint, accessKey, secretKey } = getS3Config();
    
    if (!accessKey || !secretKey || !bucket) {
      throw new Error('S3 credentials not configured. Set S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_BUCKET');
    }

    const config: any = {
      region,
      credentials: {
        accessKeyId: accessKey,
        secretAccessKey: secretKey,
      },
    };

    // For Cloudflare R2 or custom S3 endpoints
    if (endpoint) {
      config.endpoint = endpoint;
    }

    s3Client = new S3Client(config);
  }

  return s3Client!;
}

// ==================== Helper Functions ====================

/**
 * Generate a unique file key
 * (Cloudflare Workers compatible - uses Web Crypto API)
 */
function generateFileKey(fileName: string, folder?: string): string {
  const uuid = generateUUID();
  const ext = getFileExtension(fileName);
  const sanitizedName = getBaseName(fileName, ext).replace(/[^a-zA-Z0-9-_]/g, '-');
  const key = `${sanitizedName}-${uuid}${ext}`;

  return folder ? `${folder}/${key}` : key;
}

/**
 * Validate file size
 */
function validateFileSize(size: number, maxSizeMB: number): void {
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (size > maxBytes) {
    throw new ValidationError(`File size exceeds maximum allowed size of ${maxSizeMB}MB`);
  }
}

/**
 * Validate file type
 */
function validateFileType(contentType: string): void {
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    throw new ValidationError(
      `File type ${contentType} not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
  }
}

/**
 * Get file size from FileInput or Buffer
 */
function getFileSize(file: FileInput | Buffer): number {
  if (file instanceof Buffer) {
    return file.length;
  }
  return (file as FileInput).size;
}

/**
 * Get file buffer from FileInput or Buffer
 */
function getFileBuffer(file: FileInput | Buffer): Buffer {
  if (file instanceof Buffer) {
    return file;
  }
  
  // FileInput already has buffer
  return (file as FileInput).buffer as Buffer;
}

/**
 * Ensure local storage directory exists
 * Note: Local storage is not supported in Cloudflare Workers
 */
async function ensureLocalStorageDir(folder?: string): Promise<string> {
  // Dynamically import fs/path modules (only works in Node.js, not Workers)
  try {
    const { existsSync } = await import('fs');
    const { mkdir } = await import('fs/promises');
    const path = await import('path');

    const basePath = path.resolve(getLocalStoragePath());
    const fullPath = folder ? path.join(basePath, folder) : basePath;

    if (!existsSync(fullPath)) {
      await mkdir(fullPath, { recursive: true });
    }

    return fullPath;
  } catch (error) {
    throw new Error(
      'Local storage is not available in this environment. ' +
      'Use S3 or R2 storage by setting STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=r2'
    );
  }
}

// ==================== Local Storage Implementation ====================

async function uploadToLocal(options: UploadOptions): Promise<UploadResult> {
  const { file, fileName, contentType, folder, maxSizeMB = DEFAULT_MAX_SIZE_MB } = options;

  // Validation
  const size = getFileSize(file);
  validateFileSize(size, maxSizeMB);

  if (contentType) {
    validateFileType(contentType);
  }

  // Generate unique key
  const actualFileName = fileName || (!(file instanceof Buffer) ? (file as FileInput).originalName : 'file');
  const key = generateFileKey(actualFileName, folder);

  // Dynamically import fs/path modules (only works in Node.js, not Workers)
  try {
    const { writeFile } = await import('fs/promises');
    const path = await import('path');

    // Ensure directory exists
    const storageDir = await ensureLocalStorageDir(folder);
    const filePath = path.join(storageDir, path.basename(key));

    // Write file
    const buffer = getFileBuffer(file);
    await writeFile(filePath, buffer);

    // Generate public URL
    const keyBaseName = getBaseName(key);
    const relativePath = folder ? `${folder}/${keyBaseName}` : keyBaseName;
    const url = `${getPublicUrl()}/uploads/${relativePath}`;

    return {
      url,
      key,
      size,
      contentType: contentType || 'application/octet-stream',
    };
  } catch (error) {
    throw new Error(
      'Local storage is not available in this environment. ' +
      'Use S3 or R2 storage by setting STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=r2'
    );
  }
}

async function deleteFromLocal(key: string): Promise<void> {
  // Dynamically import fs/path modules (only works in Node.js, not Workers)
  try {
    const { unlink } = await import('fs/promises');
    const path = await import('path');

    const filePath = path.join(path.resolve(getLocalStoragePath()), key);

    try {
      await unlink(filePath);
    } catch (unlinkError: any) {
      if (unlinkError.code !== 'ENOENT') {
        throw unlinkError;
      }
      // File doesn't exist, which is fine for delete operation
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, fine for delete
      return;
    }
    throw new Error(
      'Local storage is not available in this environment. ' +
      'Use S3 or R2 storage by setting STORAGE_PROVIDER=s3 or STORAGE_PROVIDER=r2'
    );
  }
}

async function getSignedUrlLocal(options: DownloadOptions): Promise<string> {
  const { key } = options;
  const relativePath = key;
  return `${getPublicUrl()}/uploads/${relativePath}`;
}

// ==================== S3 Storage Implementation ====================

async function uploadToS3(options: UploadOptions): Promise<UploadResult> {
  const { file, fileName, contentType, folder, maxSizeMB = DEFAULT_MAX_SIZE_MB } = options;
  
  // Validation
  const size = await getFileSize(file);
  validateFileSize(size, maxSizeMB);
  
  if (contentType) {
    validateFileType(contentType);
  }
  
  // Generate unique key
  const actualFileName = fileName || (file instanceof File ? file.name : 'file');
  const key = generateFileKey(actualFileName, folder);
  
  // Get file buffer
  const buffer = await getFileBuffer(file);
  
  // Upload to S3
  const { bucket, region, endpoint } = getS3Config();
  const client = getS3Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });
  
  await client.send(command);
  
  // Generate public URL (if bucket is public) or use signed URL
  const url = endpoint 
    ? `${endpoint}/${bucket}/${key}`
    : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  
  return {
    url,
    key,
    size,
    contentType: contentType || 'application/octet-stream',
  };
}

async function deleteFromS3(key: string): Promise<void> {
  const { bucket } = getS3Config();
  const client = getS3Client();
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  await client.send(command);
}

async function getSignedUrlS3(options: DownloadOptions): Promise<string> {
  const { key, expiresIn = DEFAULT_SIGNED_URL_EXPIRY } = options;
  
  const { bucket } = getS3Config();
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  
  const signedUrl = await getSignedUrl(client, command, { expiresIn });
  return signedUrl;
}

// ==================== Public API ====================

/**
 * Upload a file to configured storage provider
 * 
 * @example
 * const result = await uploadFile({
 *   file: fileBuffer,
 *   fileName: 'my-ebook.pdf',
 *   contentType: 'application/pdf',
 *   folder: 'products',
 *   maxSizeMB: 50
 * });
 * console.log(result.url); // Public URL or S3 key
 */
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  try {
    const provider = getStorageProvider();
    switch (provider) {
      case 's3':
      case 'r2':
        return await uploadToS3(options);
      
      case 'local':
      default:
        return await uploadToLocal(options);
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete a file from storage
 * 
 * @example
 * await deleteFile('products/my-ebook-uuid.pdf');
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const provider = getStorageProvider();
    switch (provider) {
      case 's3':
      case 'r2':
        return await deleteFromS3(key);
      
      case 'local':
      default:
        return await deleteFromLocal(key);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Get a signed URL for secure file download
 * 
 * @example
 * const downloadUrl = await getDownloadUrl({
 *   key: 'products/my-ebook-uuid.pdf',
 *   expiresIn: 3600 // 1 hour
 * });
 */
export async function getDownloadUrl(options: DownloadOptions): Promise<string> {
  try {
    const provider = getStorageProvider();
    switch (provider) {
      case 's3':
      case 'r2':
        return await getSignedUrlS3(options);
      
      case 'local':
      default:
        return await getSignedUrlLocal(options);
    }
  } catch (error) {
    console.error('Error generating download URL:', error);
    throw error;
  }
}

/**
 * Upload multiple files
 * 
 * @example
 * const results = await uploadMultipleFiles([
 *   { file: file1, fileName: 'file1.pdf' },
 *   { file: file2, fileName: 'file2.mp3' }
 * ]);
 */
export async function uploadMultipleFiles(
  files: UploadOptions[]
): Promise<UploadResult[]> {
  return Promise.all(files.map(options => uploadFile(options)));
}

/**
 * Get storage provider info
 */
export function getStorageInfo() {
  const provider = getStorageProvider();
  const { bucket: s3Bucket } = getS3Config();
  return {
    provider,
    bucket: provider === 'local' ? getLocalStoragePath() : s3Bucket,
    maxSizeMB: DEFAULT_MAX_SIZE_MB,
    allowedTypes: ALLOWED_MIME_TYPES,
  };
}

/**
 * Calculate file size in MB
 */
export function bytesToMB(bytes: number): number {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
