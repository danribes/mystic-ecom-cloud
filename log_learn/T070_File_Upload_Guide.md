# T070: File Upload - Learning Guide

## 🎓 What You'll Learn

This guide teaches you how to build a complete file upload system with:
- Server-side file handling and validation
- Client-side drag-and-drop interface
- Image previews and progress indication
- Secure file storage and organization
- Reusable upload components

---

## 📚 Core Concepts

### 1. File Uploads in Web Applications

**The Three Parts**:
1. **Client Side**: UI for selecting/dropping files
2. **Transfer**: Sending file data to server
3. **Server Side**: Validation, storage, and response

**Data Flow**:
```
User selects file
    ↓
Client reads file
    ↓
POST request with FormData
    ↓
Server validates file
    ↓
Server saves to disk/cloud
    ↓
Server returns file URL
    ↓
Client updates form with URL
```

---

### 2. File Input Element

**Basic HTML**:
```html
<input type="file" accept="image/*" />
```

**Attributes**:
- `accept`: Filter file types (e.g., `"image/*"`, `".pdf"`, `"video/mp4"`)
- `multiple`: Allow multiple file selection
- `capture`: Use camera on mobile devices

**Accessing Selected Files**:
```javascript
const input = document.querySelector('input[type="file"]');

input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  console.log(file.name);     // "image.jpg"
  console.log(file.size);     // 524288 (bytes)
  console.log(file.type);     // "image/jpeg"
});
```

---

### 3. FormData API

**Purpose**: Package files for HTTP upload

**Usage**:
```javascript
const formData = new FormData();
formData.append('file', file);
formData.append('userId', '123');

fetch('/api/upload', {
  method: 'POST',
  body: formData, // No Content-Type header needed!
});
```

**Why FormData?**
- Automatically sets correct `Content-Type: multipart/form-data`
- Handles binary data properly
- Can mix files and regular form fields

---

### 4. Reading Files Client-Side

**FileReader API**:
```javascript
const reader = new FileReader();

reader.onload = (e) => {
  const dataUrl = e.target.result;
  // e.g., "data:image/png;base64,iVBORw0KG..."
  img.src = dataUrl;
};

reader.readAsDataURL(file); // For images/preview
// OR
reader.readAsText(file);    // For text files
// OR
reader.readAsArrayBuffer(file); // For binary processing
```

**Common Uses**:
- Image preview before upload
- Validate file contents
- Process data client-side

---

### 5. Drag and Drop API

**HTML Setup**:
```html
<div class="dropzone">Drop files here</div>
```

**JavaScript**:
```javascript
const dropzone = document.querySelector('.dropzone');

// Prevent default to enable drop
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-active');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-active');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-active');
  
  const files = e.dataTransfer.files;
  handleFiles(files);
});
```

**Key Points**:
- Must call `e.preventDefault()` on `dragover` and `drop`
- Access files via `e.dataTransfer.files`
- Provide visual feedback during drag

---

### 6. Server-Side File Handling (Node.js)

**Receiving FormData**:
```typescript
import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  console.log(file.name);
  console.log(file.type);
  console.log(file.size);
  
  // Convert to Buffer for saving
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // ...
};
```

**Saving to Disk**:
```typescript
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'public', 'uploads');
await mkdir(uploadDir, { recursive: true });

const filepath = path.join(uploadDir, filename);
await writeFile(filepath, buffer);
```

---

## 🔨 Step-by-Step Implementation

### Step 1: Create Upload Directory Structure

```bash
mkdir -p public/uploads/images
mkdir -p public/uploads/videos
mkdir -p public/uploads/documents
```

**Why Organize by Type?**
- Easier to manage and find files
- Different permissions/rules per category
- Simpler cleanup and maintenance

---

### Step 2: Build Upload API Endpoint

```typescript
// src/pages/api/upload.ts
import type { APIRoute } from 'astro';
import { writeFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const POST: APIRoute = async ({ request }) => {
  // 1. Get file from FormData
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return new Response(JSON.stringify({ error: 'No file' }), { status: 400 });
  }
  
  // 2. Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return new Response(JSON.stringify({ error: 'Invalid type' }), { status: 400 });
  }
  
  // 3. Validate size
  if (file.size > MAX_SIZE) {
    return new Response(JSON.stringify({ error: 'File too large' }), { status: 400 });
  }
  
  // 4. Generate unique filename
  const ext = path.extname(file.name);
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  
  // 5. Save file
  const filepath = path.join(UPLOAD_DIR, 'images', filename);
  const arrayBuffer = await file.arrayBuffer();
  await writeFile(filepath, Buffer.from(arrayBuffer));
  
  // 6. Return public URL
  return new Response(
    JSON.stringify({
      success: true,
      data: { url: `/uploads/images/${filename}` }
    }),
    { status: 201 }
  );
};
```

---

### Step 3: Create Reusable Upload Component

```astro
---
// src/components/FileUpload.astro
interface Props {
  name: string;
  label: string;
  accept?: string;
  currentValue?: string;
}

const { name, label, accept = 'image/*', currentValue } = Astro.props;
---

<div>
  <label>{label}</label>
  
  <!-- Hidden input for the URL -->
  <input type="hidden" name={name} id={name} value={currentValue || ''} />
  
  <!-- File input (hidden) -->
  <input 
    type="file" 
    id={`file-${name}`}
    accept={accept}
    class="sr-only"
  />
  
  <!-- Upload area -->
  <div data-dropzone>
    <label for={`file-${name}`}>
      Choose file or drop here
    </label>
  </div>
  
  <!-- Preview -->
  <img data-preview class="hidden" />
</div>

<script>
  // JavaScript for handling upload (see below)
</script>
```

---

### Step 4: Add Upload Logic

```javascript
document.querySelectorAll('[data-dropzone]').forEach((dropzone) => {
  const fileInput = dropzone.querySelector('input[type="file"]');
  const hiddenInput = dropzone.querySelector('input[type="hidden"]');
  const preview = dropzone.querySelector('[data-preview]');
  
  // Handle file selection
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) await uploadFile(file);
  });
  
  // Handle drag and drop
  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) await uploadFile(file);
  });
  
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
  });
  
  async function uploadFile(file) {
    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    
    // Upload to server
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    
    if (result.success) {
      hiddenInput.value = result.data.url;
    }
  }
});
```

---

## 🎯 Common Patterns

### Pattern 1: Unique Filenames

**Why?**
- Prevent overwriting existing files
- Avoid conflicts with similar names
- Add security (no guessable filenames)

**Implementation**:
```javascript
function generateFilename(originalName) {
  const ext = path.extname(originalName);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${timestamp}-${random}${ext}`;
}
```

**Result**: `1698787200000-a1b2c3d4e5f6g7h8.jpg`

---

### Pattern 2: File Type Validation

**Client-Side** (UX improvement):
```javascript
const accept = 'image/*';
input.setAttribute('accept', accept);

input.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file');
    input.value = '';
  }
});
```

**Server-Side** (Security requirement):
```typescript
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

if (!ALLOWED_TYPES.includes(file.type)) {
  throw new Error('Invalid file type');
}
```

**Why Both?**
- Client-side: Better UX (immediate feedback)
- Server-side: Security (can't trust client)

---

### Pattern 3: Size Validation

```typescript
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

if (file.size > MAX_SIZE) {
  return new Response(
    JSON.stringify({
      error: 'File too large',
      message: `Max size: ${MAX_SIZE / (1024 * 1024)}MB`,
      received: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
    }),
    { status: 400 }
  );
}
```

---

### Pattern 4: Progress Indication

**Using XMLHttpRequest** (has progress events):
```javascript
function uploadWithProgress(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);
    
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        onProgress(percent);
      }
    });
    
    xhr.addEventListener('load', () => {
      resolve(JSON.parse(xhr.responseText));
    });
    
    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed'));
    });
    
    xhr.open('POST', '/api/upload');
    xhr.send(formData);
  });
}

// Usage
uploadWithProgress(file, (percent) => {
  progressBar.style.width = `${percent}%`;
});
```

**Note**: Fetch API doesn't support upload progress yet.

---

## ⚠️ Common Mistakes

### Mistake 1: Not Preventing Default on Drop

❌ **Wrong**:
```javascript
dropzone.addEventListener('drop', (e) => {
  const files = e.dataTransfer.files;
  // Browser will open the file!
});
```

✅ **Correct**:
```javascript
dropzone.addEventListener('drop', (e) => {
  e.preventDefault(); // Critical!
  const files = e.dataTransfer.files;
});
```

---

### Mistake 2: Using User-Provided Filenames

❌ **Wrong** (Security risk):
```javascript
const filename = file.name; // Could be "../../../etc/passwd"
await writeFile(path.join(uploadDir, filename), buffer);
```

✅ **Correct**:
```javascript
const ext = path.extname(file.name);
const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
await writeFile(path.join(uploadDir, filename), buffer);
```

---

### Mistake 3: Only Validating Client-Side

❌ **Wrong**:
```javascript
// Client
if (file.size > MAX_SIZE) {
  alert('Too large');
  return;
}
// No server validation!
```

✅ **Correct**:
```javascript
// Client
if (file.size > MAX_SIZE) {
  alert('Too large');
  return;
}

// Server (MUST HAVE)
if (file.size > MAX_SIZE) {
  return new Response(JSON.stringify({ error: 'Too large' }), { status: 400 });
}
```

---

### Mistake 4: Not Handling Upload Errors

❌ **Wrong**:
```javascript
async function upload(file) {
  const response = await fetch('/api/upload', { ... });
  const result = await response.json();
  hiddenInput.value = result.data.url; // Crashes if error!
}
```

✅ **Correct**:
```javascript
async function upload(file) {
  try {
    const response = await fetch('/api/upload', { ... });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }
    
    const result = await response.json();
    hiddenInput.value = result.data.url;
  } catch (error) {
    alert(`Upload failed: ${error.message}`);
  }
}
```

---

### Mistake 5: Forgetting to Set Content-Type

❌ **Wrong**:
```javascript
fetch('/api/upload', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', // Wrong for files!
  },
  body: formData,
});
```

✅ **Correct**:
```javascript
fetch('/api/upload', {
  method: 'POST',
  // No Content-Type header! FormData sets it automatically
  body: formData,
});
```

---

## 🧪 Testing File Uploads

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { generateFilename } from './upload';

describe('generateFilename', () => {
  it('should create unique filenames', () => {
    const name1 = generateFilename('test.jpg');
    const name2 = generateFilename('test.jpg');
    
    expect(name1).not.toBe(name2);
    expect(name1).toMatch(/^\d+-[a-f0-9]{16}\.jpg$/);
  });
});
```

### E2E Test Example

```typescript
test('should upload file', async ({ page }) => {
  await page.goto('/admin/courses/new');
  
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/test.png');
  
  await page.waitForTimeout(1000);
  
  const urlInput = page.locator('input[name="imageUrl"]');
  const url = await urlInput.inputValue();
  expect(url).toContain('/uploads/images/');
});
```

---

## 🚀 Advanced Topics

### 1. Image Optimization

**Install Sharp**:
```bash
npm install sharp
```

**Resize and Optimize**:
```typescript
import sharp from 'sharp';

// Resize to max 1200px width, optimize
const optimized = await sharp(buffer)
  .resize(1200, null, { withoutEnlargement: true })
  .webp({ quality: 85 })
  .toBuffer();

await writeFile(filepath, optimized);
```

---

### 2. Cloud Storage (S3)

**Install AWS SDK**:
```bash
npm install @aws-sdk/client-s3
```

**Upload to S3**:
```typescript
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'us-east-1' });

await s3.send(new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: `uploads/images/${filename}`,
  Body: buffer,
  ContentType: file.type,
}));

const url = `https://my-bucket.s3.amazonaws.com/uploads/images/${filename}`;
```

---

### 3. Direct Upload to S3 (Bypass Server)

**Generate Presigned URL**:
```typescript
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const command = new PutObjectCommand({
  Bucket: 'my-bucket',
  Key: filename,
  ContentType: 'image/jpeg',
});

const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
```

**Client Uploads Directly**:
```javascript
await fetch(presignedUrl, {
  method: 'PUT',
  body: file,
  headers: {
    'Content-Type': file.type,
  },
});
```

**Benefits**:
- Faster (no server hop)
- Reduces server load
- Better for large files

---

## 💡 Key Takeaways

1. **Always validate server-side** - Client validation is UX only
2. **Generate unique filenames** - Never trust user input
3. **Organize files** - Use subdirectories by type/date
4. **Show progress** - Users need feedback for large uploads
5. **Handle errors gracefully** - Network failures happen
6. **Test with real files** - File operations are complex
7. **Plan for scale** - Local storage works until it doesn't

---

## 📖 Related Topics

- [FormData API](https://developer.mozilla.org/en-US/docs/Web/API/FormData)
- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)
- [Sharp (Image Processing)](https://sharp.pixelplumbing.com/)
- [AWS S3 SDK](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

---

**Remember**: File uploads are one of the most complex features in web development. Start simple, validate thoroughly, and enhance progressively!
