# T104: Cloud Storage Integration - Learning Guide

## Overview

This guide explains the cloud storage integration system implemented for digital product file management. Learn about multi-provider storage architecture, security practices, and AWS S3 integration.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Provider Pattern](#provider-pattern)
3. [File Handling in Node.js](#file-handling-in-nodejs)
4. [AWS SDK v3](#aws-sdk-v3)
5. [Security Considerations](#security-considerations)
6. [Testing Strategies](#testing-strategies)
7. [Configuration Management](#configuration-management)
8. [Common Patterns](#common-patterns)

## Architecture Overview

### The Problem

Digital products require file storage:
- **Development**: Local filesystem for quick iteration
- **Production**: Cloud storage (S3/R2) for scalability, CDN, global distribution

Need a **unified interface** that works with multiple backends.

### The Solution

**Provider pattern** with abstraction layer:
```
API Endpoint → uploadFile() → [Local | S3 | R2]
```

Single function interface, multiple implementations.

### Key Design Principles

1. **Separation of Concerns**: Storage logic separate from business logic
2. **Provider Abstraction**: Switch providers via environment variable
3. **Type Safety**: TypeScript interfaces prevent runtime errors
4. **Security First**: Validation before storage
5. **Testability**: Dynamic configuration enables mocking

## Provider Pattern

### What is it?

Design pattern where interface remains constant but implementation changes based on configuration.

### Implementation

```typescript
export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const provider = getStorageProvider(); // Read from env
  
  switch (provider) {
    case 's3':
    case 'r2':
      return await uploadToS3(options);
    case 'local':
    default:
      return await uploadToLocal(options);
  }
}
```

### Benefits

- **Flexibility**: Change providers without code changes
- **Testing**: Mock specific providers
- **Extensibility**: Add new providers easily
- **Consistency**: Same interface across providers

### Adding a New Provider

Example: Azure Blob Storage

```typescript
// 1. Add to provider type
export type StorageProvider = 'local' | 's3' | 'r2' | 'azure';

// 2. Implement upload function
async function uploadToAzure(options: UploadOptions): Promise<UploadResult> {
  // Azure-specific code
}

// 3. Add case to switch statement
case 'azure':
  return await uploadToAzure(options);
```

## File Handling in Node.js

### Browser vs Node.js

**Browser** has `File` API:
```javascript
// Browser
const file: File = inputElement.files[0];
console.log(file.name, file.size, file.type);
const buffer = await file.arrayBuffer();
```

**Node.js** does NOT have File API. Uses `Buffer`:
```javascript
// Node.js
const buffer: Buffer = Buffer.from('data');
console.log(buffer.length);
```

### The FileInput Interface

Created custom interface for server-side file handling:

```typescript
export interface FileInput {
  buffer: Buffer;        // Actual file data
  originalName: string;  // Original filename
  mimeType: string;      // MIME type (e.g., 'application/pdf')
  size: number;          // File size in bytes
}
```

### Converting Browser File to FileInput

In API endpoint:

```typescript
// 1. Get File from FormData
const file = formData.get('file') as File;

// 2. Convert to Buffer
const arrayBuffer = await file.arrayBuffer();
const buffer = Buffer.from(arrayBuffer);

// 3. Create FileInput
const fileInput: FileInput = {
  buffer,
  originalName: file.name,
  mimeType: file.type,
  size: file.size,
};

// 4. Upload
await uploadFile({ file: fileInput, contentType: file.type });
```

### Union Types: FileInput | Buffer

Functions accept either:
```typescript
function uploadFile(options: { file: FileInput | Buffer }) { }
```

**Discriminating the union**:
```typescript
if (file instanceof Buffer) {
  // It's a Buffer
  size = file.length;
} else {
  // It's a FileInput
  size = file.size;
}
```

## AWS SDK v3

### What Changed from v2?

**v2** (old):
```javascript
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
```

**v3** (new):
```javascript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const client = new S3Client({ region: 'us-east-1' });
```

### Benefits of v3

1. **Modular**: Import only what you need (smaller bundle)
2. **TypeScript Native**: Better type safety
3. **Middleware**: Customize request/response handling
4. **Modern**: Promises, async/await

### S3Client Pattern

```typescript
// 1. Create client (once)
const client = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'YOUR_KEY',
    secretAccessKey: 'YOUR_SECRET',
  },
});

// 2. Create command
const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: 'path/to/file.pdf',
  Body: buffer,
  ContentType: 'application/pdf',
});

// 3. Send command
const result = await client.send(command);
```

### Presigned URLs

**Problem**: Don't want to expose S3 credentials to client  
**Solution**: Generate time-limited signed URL

```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const command = new GetObjectCommand({
  Bucket: 'my-bucket',
  Key: 'file.pdf',
});

const url = await getSignedUrl(client, command, {
  expiresIn: 3600, // 1 hour
});

// Client can download from this URL for 1 hour
```

### Cloudflare R2

R2 is S3-compatible. Only difference: custom endpoint

```typescript
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://<account-id>.r2.cloudflarestorage.com',
  credentials: { accessKeyId, secretAccessKey },
});

// Same commands work!
```

## Security Considerations

### 1. MIME Type Whitelisting

**Allowlist approach** (only permit known-safe types):

```typescript
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'audio/mpeg',
  'video/mp4',
  // ...
];

function validateFileType(mimeType: string) {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new ValidationError(`File type ${mimeType} not allowed`);
  }
}
```

**Why not blocklist?** Impossible to list all dangerous types.

### 2. File Size Limits

Prevent abuse and resource exhaustion:

```typescript
function validateFileSize(sizeBytes: number, maxMB: number) {
  const sizeMB = bytesToMB(sizeBytes);
  if (sizeMB > maxMB) {
    throw new ValidationError(`File size exceeds maximum ${maxMB}MB`);
  }
}
```

### 3. UUID-Based Keys

**Problem**: User-provided filenames can:
- Collide (overwrite existing files)
- Contain path traversal (../../etc/passwd)
- Reveal patterns

**Solution**: Generate unique keys with UUID:

```typescript
function generateFileKey(fileName: string, folder?: string): string {
  const uuid = randomUUID();
  const ext = path.extname(fileName);
  const base = folder || 'uploads';
  return `${base}/${uuid}${ext}`;
}
```

Result: `uploads/a1b2c3d4-e5f6-7890-abcd-ef1234567890.pdf`

### 4. Signed URLs

**Direct S3 URLs** are permanent:
```
https://bucket.s3.region.amazonaws.com/file.pdf
```

**Presigned URLs** expire:
```
https://bucket.s3.region.amazonaws.com/file.pdf?
  X-Amz-Algorithm=...&
  X-Amz-Expires=3600&
  X-Amz-Signature=...
```

Good for:
- Download links
- Time-limited access
- Purchase verification

## Testing Strategies

### 1. Dynamic Configuration

**Problem**: Module-level constants evaluated once
```typescript
// BAD: Evaluated at import time
const PROVIDER = process.env.STORAGE_PROVIDER;
```

**Solution**: Functions that read env each time
```typescript
// GOOD: Evaluated at call time
function getStorageProvider() {
  return process.env.STORAGE_PROVIDER || 'local';
}
```

Enables test environment variable overrides.

### 2. Mocking AWS SDK

**Vitest mock**:
```typescript
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(), // Mock send method
  })),
  PutObjectCommand: vi.fn(),
}));
```

Tests run without:
- AWS credentials
- Network calls
- S3 bucket access

### 3. Test Isolation

```typescript
beforeEach(async () => {
  // Set test environment
  process.env.STORAGE_PROVIDER = 'local';
  process.env.LOCAL_STORAGE_PATH = './test-uploads';
  
  // Clean slate
  await fs.rm('./test-uploads', { recursive: true, force: true });
});

afterEach(async () => {
  // Cleanup
  await fs.rm('./test-uploads', { recursive: true, force: true });
});
```

Each test starts fresh, no pollution.

## Configuration Management

### Environment Variables

**.env file**:
```
# Local Development
STORAGE_PROVIDER=local
LOCAL_STORAGE_PATH=./uploads
PUBLIC_URL=http://localhost:4321

# Production (S3)
STORAGE_PROVIDER=s3
S3_BUCKET=my-product-files
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Reading Configuration

```typescript
function getS3Config() {
  return {
    bucket: process.env.S3_BUCKET || '',
    region: process.env.S3_REGION || 'us-east-1',
    accessKey: process.env.S3_ACCESS_KEY_ID || '',
    secretKey: process.env.S3_SECRET_ACCESS_KEY || '',
  };
}
```

### Never Commit Secrets

**Add to .gitignore**:
```
.env
.env.local
*.key
*.pem
```

**Use .env.example** for documentation:
```
STORAGE_PROVIDER=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

## Common Patterns

### 1. Singleton Pattern (S3 Client)

Create once, reuse:
```typescript
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ /* config */ });
  }
  return s3Client;
}
```

Avoids repeated initialization overhead.

### 2. Error Wrapping

```typescript
try {
  return await uploadToS3(options);
} catch (error) {
  console.error('Error uploading file:', error);
  throw error; // Re-throw after logging
}
```

Logs for debugging, preserves error for caller.

### 3. Validation Before Action

```typescript
// Validate FIRST
validateFileSize(size, maxSizeMB);
validateFileType(contentType);

// Then act
await writeFile(filePath, buffer);
```

Fail fast, don't waste resources.

### 4. Explicit Return Types

```typescript
export async function uploadFile(
  options: UploadOptions
): Promise<UploadResult> {
  // TypeScript ensures we return UploadResult
}
```

Documents intent, prevents errors.

## Key Takeaways

1. **Provider pattern** enables flexible, testable storage solutions
2. **FileInput interface** bridges browser File API and Node.js Buffer
3. **AWS SDK v3** uses modular, command-based architecture
4. **Security** requires validation, UUIDs, signed URLs, whitelists
5. **Testing** needs dynamic configuration and mocking
6. **Configuration** should be environment-based, never committed
7. **Type safety** prevents runtime errors, documents contracts

## Further Reading

- [AWS SDK for JavaScript v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Node.js Buffer Documentation](https://nodejs.org/api/buffer.html)
- [Design Patterns: Strategy Pattern](https://refactoring.guru/design-patterns/strategy)
- [OWASP File Upload Security](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
