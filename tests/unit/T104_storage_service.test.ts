import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  uploadFile, 
  deleteFile, 
  getDownloadUrl, 
  uploadMultipleFiles,
  getStorageInfo,
  formatFileSize,
  bytesToMB,
  type FileInput
} from '../storage';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(() => Promise.resolve('https://example.com/signed-url')),
}));

describe('Storage Module - Local Provider', () => {
  const testUploadDir = path.join(process.cwd(), 'test-uploads');
  
  beforeEach(async () => {
    // Set local provider
    process.env.STORAGE_PROVIDER = 'local';
    process.env.LOCAL_STORAGE_PATH = testUploadDir;
    process.env.PUBLIC_URL = 'http://localhost:4321';
    
    // Clean up test directory
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch (e) {
      // Directory might not exist
    }
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testUploadDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore errors
    }
  });

  describe('uploadFile - Local', () => {
    it('should upload a file to local storage', async () => {
      const testBuffer = Buffer.from('test file content');
      const fileInput: FileInput = {
        buffer: testBuffer,
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: testBuffer.length,
      };

      const result = await uploadFile({
        file: fileInput,
        contentType: 'application/pdf',
      });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.size).toBe(testBuffer.length);
      expect(result.contentType).toBe('application/pdf');
      expect(result.url).toContain('http://localhost:4321/uploads/');
    });

    it('should upload a file with folder', async () => {
      const testBuffer = Buffer.from('test content');
      const fileInput: FileInput = {
        buffer: testBuffer,
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: testBuffer.length,
      };

      const result = await uploadFile({
        file: fileInput,
        contentType: 'application/pdf',
        folder: 'products',
      });

      expect(result.key).toContain('products/');
      expect(result.url).toContain('products/');
    });

    it('should reject files exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      const fileInput: FileInput = {
        buffer: largeBuffer,
        originalName: 'large.pdf',
        mimeType: 'application/pdf',
        size: largeBuffer.length,
      };

      await expect(
        uploadFile({
          file: fileInput,
          contentType: 'application/pdf',
          maxSizeMB: 5, // Only allow 5MB
        })
      ).rejects.toThrow('File size exceeds');
    });

    it('should reject invalid MIME types', async () => {
      const testBuffer = Buffer.from('executable content');
      const fileInput: FileInput = {
        buffer: testBuffer,
        originalName: 'malware.exe',
        mimeType: 'application/x-msdownload',
        size: testBuffer.length,
      };

      await expect(
        uploadFile({
          file: fileInput,
          contentType: 'application/x-msdownload',
        })
      ).rejects.toThrow('not allowed');
    });

    it('should accept Buffer directly', async () => {
      const testBuffer = Buffer.from('direct buffer test');

      const result = await uploadFile({
        file: testBuffer,
        contentType: 'application/pdf',
        fileName: 'buffer-test.pdf',
      });

      expect(result).toHaveProperty('url');
      expect(result.size).toBe(testBuffer.length);
    });
  });

  describe('deleteFile - Local', () => {
    it('should delete a file from local storage', async () => {
      // First upload a file
      const testBuffer = Buffer.from('to be deleted');
      const fileInput: FileInput = {
        buffer: testBuffer,
        originalName: 'delete-me.pdf',
        mimeType: 'application/pdf',
        size: testBuffer.length,
      };

      const uploadResult = await uploadFile({
        file: fileInput,
        contentType: 'application/pdf',
      });

      // Delete the file
      await expect(deleteFile(uploadResult.key)).resolves.not.toThrow();

      // Verify file is deleted
      const filePath = path.join(testUploadDir, path.basename(uploadResult.key));
      await expect(fs.access(filePath)).rejects.toThrow();
    });
  });

  describe('getDownloadUrl - Local', () => {
    it('should generate a public URL for local files', async () => {
      const result = await getDownloadUrl({
        key: 'test-file.pdf',
      });

      expect(result).toContain('http://localhost:4321/uploads/');
      expect(result).toContain('test-file.pdf');
    });
  });

  describe('uploadMultipleFiles', () => {
    it('should upload multiple files', async () => {
      const files: FileInput[] = [
        {
          buffer: Buffer.from('file 1'),
          originalName: 'file1.pdf',
          mimeType: 'application/pdf',
          size: 6,
        },
        {
          buffer: Buffer.from('file 2'),
          originalName: 'file2.pdf',
          mimeType: 'application/pdf',
          size: 6,
        },
      ];

      const uploadOptions = files.map(file => ({
        file,
        contentType: file.mimeType,
      }));

      const results = await uploadMultipleFiles(uploadOptions);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('url');
      expect(results[1]).toHaveProperty('url');
    });
  });
});

describe('Storage Module - S3 Provider', () => {
  beforeEach(() => {
    // Clean up any local env vars
    delete process.env.LOCAL_STORAGE_PATH;
    delete process.env.PUBLIC_URL;
    
    // Set S3 provider
    process.env.STORAGE_PROVIDER = 's3';
    process.env.S3_BUCKET = 'test-bucket';
    process.env.S3_REGION = 'us-east-1';
    process.env.S3_ACCESS_KEY_ID = 'test-key';
    process.env.S3_SECRET_ACCESS_KEY = 'test-secret';
  });

  describe('uploadFile - S3', () => {
    it('should upload a file to S3', async () => {
      const testBuffer = Buffer.from('s3 test content');
      const fileInput: FileInput = {
        buffer: testBuffer,
        originalName: 's3-test.pdf',
        mimeType: 'application/pdf',
        size: testBuffer.length,
      };

      const result = await uploadFile({
        file: fileInput,
        contentType: 'application/pdf',
      });

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.size).toBe(testBuffer.length);
    });
  });

  describe('getDownloadUrl - S3', () => {
    it('should generate a signed URL for S3 files', async () => {
      const result = await getDownloadUrl({
        key: 's3-file.pdf',
        expiresIn: 7200,
      });

      expect(result).toBe('https://example.com/signed-url');
    });
  });
});

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    });
  });

  describe('bytesToMB', () => {
    it('should convert bytes to MB', () => {
      expect(bytesToMB(0)).toBe(0);
      expect(bytesToMB(1024 * 1024)).toBe(1);
      expect(bytesToMB(5 * 1024 * 1024)).toBeCloseTo(5, 2);
    });
  });

  describe('getStorageInfo', () => {
    it('should return storage configuration', () => {
      process.env.STORAGE_PROVIDER = 'local';
      const info = getStorageInfo();

      expect(info).toHaveProperty('provider');
      expect(info).toHaveProperty('maxSizeMB');
      expect(info).toHaveProperty('allowedTypes');
    });
  });
});
