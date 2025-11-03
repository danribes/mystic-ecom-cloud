# T177: Add SEO Metadata per Language - Learning Guide

**Task ID:** T177
**Purpose:** Educational guide on implementing multilingual SEO
**Audience:** Developers learning about international SEO and structured data
**Date:** 2025-11-02

---

## Table of Contents

1. [Introduction to SEO](#introduction-to-seo)
2. [What is Multilingual SEO?](#what-is-multilingual-seo)
3. [Key SEO Concepts](#key-seo-concepts)
4. [hreflang Implementation](#hreflang-implementation)
5. [Structured Data (JSON-LD)](#structured-data-json-ld)
6. [Open Graph & Social](#open-graph--social)
7. [Best Practices](#best-practices)
8. [Common Mistakes](#common-mistakes)
9. [Testing & Validation](#testing--validation)
10. [Real-World Examples](#real-world-examples)

---

## Introduction to SEO

### What is SEO?

**SEO (Search Engine Optimization)** is the practice of improving your website's visibility in search engine results. When done correctly, it helps:
- Drive organic (free) traffic
- Reach target audiences
- Improve user experience
- Build brand authority

### Why SEO Matters

**Without SEO:**
```
User searches "meditation courses" → Doesn't find your site → Goes to competitor
```

**With SEO:**
```
User searches "meditation courses" → Finds your site on page 1 → Clicks → Converts
```

### The Three Pillars of SEO

1. **Technical SEO** ← T177 focuses here
   - Site structure
   - Meta tags
   - Schema markup
   - Page speed
   - Mobile-friendliness

2. **On-Page SEO**
   - Content quality
   - Keyword optimization
   - Internal linking
   - Image optimization

3. **Off-Page SEO**
   - Backlinks
   - Social signals
   - Brand mentions
   - Domain authority

---

## What is Multilingual SEO?

### The Challenge

When you have content in multiple languages, search engines need to know:
1. Which language each page is in
2. Which pages are translations of each other
3. Which version to show to which users

**Without Multilingual SEO:**
```
Spanish user searches in Spanish
→ Google shows English version
→ User bounces (bad experience)
→ Rankings drop
```

**With Multilingual SEO:**
```
Spanish user searches in Spanish
→ Google shows Spanish version  ← hreflang tells Google
→ User stays and converts
→ Rankings improve
```

### The Solution: hreflang

**hreflang** is an HTML attribute that tells search engines:
- "This page is in English"
- "This page has a Spanish version at this URL"
- "Show the right version to the right users"

---

## Key SEO Concepts

### 1. Meta Tags

**What:** HTML tags in `<head>` that provide metadata about the page

**Example:**
```html
<head>
  <title>Meditation Courses | Quantum Healing Portal</title>
  <meta name="description" content="Discover powerful meditation techniques..." />
</head>
```

**Why Important:**
- Title shows in search results (blue clickable link)
- Description shows below title (preview text)
- Affects click-through rate (CTR)

**Best Practices:**
- Title: 50-60 characters
- Description: 150-160 characters
- Include target keywords naturally
- Make it compelling (users click interesting titles)

### 2. Canonical URLs

**What:** Tells search engines the "official" version of a page

**Problem Without Canonical:**
```
https://example.com/courses
https://example.com/courses?utm_source=facebook
https://example.com/courses?page=1

Search engine sees 3 different pages → splits ranking signals → weaker rankings
```

**Solution With Canonical:**
```html
<link rel="canonical" href="https://example.com/courses" />
```

All versions point to the same canonical URL → search engine treats as one page → stronger rankings

### 3. Structured Data (Schema)

**What:** Code that explicitly tells search engines what your content means

**Without Structured Data:**
```
Search engine reads: "Meditation Course - $99"
Search engine thinks: "Is this a course? A product? A service?"
```

**With Structured Data:**
```json
{
  "@type": "Course",
  "name": "Meditation Course",
  "offers": {
    "@type": "Offer",
    "price": "99.00",
    "priceCurrency": "USD"
  }
}
```

Search engine knows: "This is definitely a course with this exact price"

**Benefits:**
- Rich snippets in search results (⭐⭐⭐⭐⭐ ratings, prices, etc.)
- Better understanding of content
- Higher CTR
- Voice search optimization

### 4. Open Graph Tags

**What:** Meta tags for social media sharing

**Example:**
```html
<meta property="og:title" content="Amazing Meditation Course" />
<meta property="og:description" content="Transform your life..." />
<meta property="og:image" content="https://example.com/course.jpg" />
```

**When Shared:**
```
Facebook/LinkedIn/WhatsApp shows:
┌─────────────────────┐
│  [Preview Image]    │
│  Amazing Meditation │
│  Transform your...  │
│  example.com        │
└─────────────────────┘
```

**Without Open Graph:**
- Generic preview
- No image
- Plain URL
- Low click rate

---

## hreflang Implementation

### What is hreflang?

**hreflang** tells search engines about language and regional variations of your pages.

### Syntax

```html
<link rel="alternate" hreflang="LANGUAGE-REGION" href="URL" />
```

**Components:**
- `rel="alternate"` - Indicates alternative version
- `hreflang="en"` - Language code (ISO 639-1)
- `href="URL"` - URL of that version

### Our Implementation

```html
<!-- English version -->
<link rel="alternate" hreflang="en" href="https://example.com/courses" />

<!-- Spanish version -->
<link rel="alternate" hreflang="es" href="https://example.com/es/courses" />

<!-- Default version (for unknown languages) -->
<link rel="alternate" hreflang="x-default" href="https://example.com/courses" />
```

### Why Three Tags?

1. **hreflang="en"** - For English users
2. **hreflang="es"** - For Spanish users
3. **hreflang="x-default"** - For everyone else (fallback)

### How It Works

**Scenario 1: English User in USA**
```
User searches "meditation courses"
→ Google sees hreflang="en"
→ Shows https://example.com/courses
→ User sees English content
```

**Scenario 2: Spanish User in Mexico**
```
User searches "cursos de meditación"
→ Google sees hreflang="es"
→ Shows https://example.com/es/courses
→ User sees Spanish content
```

**Scenario 3: French User in France**
```
User searches "cours de méditation"
→ Google sees hreflang="x-default"
→ Shows https://example.com/courses (English)
→ Better than nothing
```

### Common hreflang Patterns

**Pattern 1: Language Only**
```html
<link rel="alternate" hreflang="en" href="..." />
<link rel="alternate" hreflang="es" href="..." />
<link rel="alternate" hreflang="fr" href="..." />
```
Use when: Content is same for all regions speaking that language

**Pattern 2: Language + Region**
```html
<link rel="alternate" hreflang="en-US" href="..." />
<link rel="alternate" hreflang="en-GB" href="..." />
<link rel="alternate" hreflang="es-ES" href="..." />
<link rel="alternate" hreflang="es-MX" href="..." />
```
Use when: Content differs by region (prices, spellings, cultural differences)

**Pattern 3: Our Pattern (Hybrid)**
```html
<link rel="alternate" hreflang="en" href="..." />
<link rel="alternate" hreflang="es" href="..." />
<link rel="alternate" hreflang="x-default" href="..." />
```
Use when: Starting with two languages, room to expand

### hreflang Rules

**Rule 1: Self-Referencing**
Every page must include hreflang to itself:
```html
<!-- On English page -->
<link rel="alternate" hreflang="en" href="https://example.com/courses" />

<!-- On Spanish page -->
<link rel="alternate" hreflang="es" href="https://example.com/es/courses" />
```

**Rule 2: Bidirectional**
If page A links to page B, page B must link back to page A:
```html
<!-- English page links to Spanish -->
<link rel="alternate" hreflang="es" href=".../es/courses" />

<!-- Spanish page must link back to English -->
<link rel="alternate" hreflang="en" href=".../courses" />
```

**Rule 3: Absolute URLs**
Always use full URLs, not relative:
```html
<!-- ❌ Wrong -->
<link rel="alternate" hreflang="es" href="/es/courses" />

<!-- ✅ Correct -->
<link rel="alternate" hreflang="es" href="https://example.com/es/courses" />
```

---

## Structured Data (JSON-LD)

### What is JSON-LD?

**JSON-LD** (JSON for Linking Data) is a format for structured data that search engines can read.

### Why JSON-LD?

**Other Formats:**
- **Microdata:** Inline with HTML (messy)
- **RDFa:** Complex syntax
- **JSON-LD:** Separate `<script>` tag (clean) ← Google's preference

### Basic Structure

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "TypeName",
  "property": "value"
}
</script>
```

### Schema Types We Implemented

#### 1. Organization Schema

**Purpose:** Tells search engines about your organization

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Quantum Healing Portal",
  "description": "Transform your mind...",
  "url": "https://quantumhealingportal.com",
  "logo": "https://quantumhealingportal.com/logo.png"
}
```

**Benefits:**
- Knowledge Graph entry (info box on Google)
- Logo in search results
- Brand recognition

#### 2. Breadcrumb Schema

**Purpose:** Shows navigation path

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Courses",
      "item": "https://example.com/courses"
    }
  ]
}
```

**Benefits:**
- Breadcrumbs in search results:
  ```
  example.com › Courses › Meditation 101
  ```
- Better UX
- Helps Google understand site structure

#### 3. Product Schema

**Purpose:** Describes products for sale

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Meditation Guide",
  "description": "Complete guide...",
  "image": "https://example.com/guide.jpg",
  "offers": {
    "@type": "Offer",
    "price": "29.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  }
}
```

**Benefits:**
- Price in search results
- Availability status
- Rich product cards
- Google Shopping integration

#### 4. Course Schema

**Purpose:** Describes educational courses

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "Quantum Healing 101",
  "description": "Learn quantum healing...",
  "provider": {
    "@type": "Organization",
    "name": "Quantum Healing Portal"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD"
  }
}
```

**Benefits:**
- Course rich results
- Provider information
- Price display
- Course duration (if added)

#### 5. Event Schema

**Purpose:** Describes events and workshops

```json
{
  "@context": "https://schema.org",
  "@type": "Event",
  "name": "Meditation Workshop",
  "startDate": "2025-03-15T18:00:00Z",
  "endDate": "2025-03-15T20:00:00Z",
  "location": {
    "@type": "Place",
    "name": "Online Platform"
  },
  "offers": {
    "@type": "Offer",
    "price": "49.99",
    "priceCurrency": "USD"
  }
}
```

**Benefits:**
- Event rich results
- Date and time display
- Add to calendar feature
- Location maps

### How to Use Our Functions

**Example 1: Product Page**
```typescript
import { generateProductSchema } from '@/lib/seoMetadata';

const product = {
  name: 'Meditation Guide',
  description: 'Complete meditation guide',
  image: '/images/guide.jpg',
  price: 29.99,
  currency: 'USD',
  sku: 'MED-001'
};

const schema = generateProductSchema(product, locale, baseUrl);
```

**In Astro:**
```astro
<script type="application/ld+json" set:html={schema} />
```

---

## Open Graph & Social

### Open Graph Protocol

**Created by:** Facebook
**Used by:** Facebook, LinkedIn, WhatsApp, Slack, Discord

**Basic Tags:**
```html
<meta property="og:title" content="Page Title" />
<meta property="og:description" content="Page description" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta property="og:url" content="https://example.com/page" />
<meta property="og:type" content="website" />
```

### Multilingual Open Graph

**Key Tags for i18n:**
```html
<meta property="og:locale" content="en_US" />
<meta property="og:locale:alternate" content="es_ES" />
```

**How It Works:**
- `og:locale` - Current page language
- `og:locale:alternate` - Other available languages

### Twitter Cards

**Similar to Open Graph, but for Twitter:**
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Page Title" />
<meta name="twitter:description" content="Description" />
<meta name="twitter:image" content="https://example.com/image.jpg" />
```

**Card Types:**
- `summary` - Small image
- `summary_large_image` - Large image (we use this)
- `app` - Mobile app
- `player` - Video/audio player

### Image Best Practices

**Dimensions:**
- **Facebook:** 1200x630px (1.91:1 ratio)
- **Twitter:** 1200x675px (16:9 ratio)
- **LinkedIn:** 1200x627px

**Our Standard:** 1200x630px (works everywhere)

**File Size:** < 5MB (< 1MB ideal)
**Format:** JPG or PNG

---

## Best Practices

### 1. Meta Description Optimization

**Length:**
- Desktop: ~155-160 characters
- Mobile: ~120 characters
- Our target: 155 (safe for both)

**Content:**
- Include target keyword
- Compelling call-to-action
- Unique for each page
- Accurate representation

**Example:**
```
❌ Bad: "Welcome to our website. We have courses."
✅ Good: "Discover powerful quantum healing techniques and meditation practices. Transform your life with expert-led courses. Join thousands on their wellness journey."
```

### 2. Title Tag Optimization

**Structure:** `[Page Title] | [Site Name]`

**Example:**
```
Meditation Courses | Quantum Healing Portal
```

**Why This Structure:**
- Page title first (most important)
- Site name for branding
- Separator (| or -) for clarity

**Length:** 50-60 characters total

### 3. hreflang Best Practices

✅ **DO:**
- Use ISO 639-1 language codes (en, es, fr)
- Include x-default for fallback
- Use absolute URLs
- Self-reference on every page
- Be bidirectional

❌ **DON'T:**
- Mix language-only and language-region codes
- Forget x-default
- Use relative URLs
- Create circular references
- Link to different content

### 4. Structured Data Best Practices

✅ **DO:**
- Validate with Google's Rich Results Test
- Include all required properties
- Use accurate, honest information
- Keep schemas up to date
- Test in Search Console

❌ **DON'T:**
- Add markup for invisible content
- Provide misleading information
- Use markup on irrelevant pages
- Duplicate markup
- Ignore validation errors

---

## Common Mistakes

### Mistake 1: Broken hreflang

**Problem:**
```html
<!-- English page -->
<link rel="alternate" hreflang="en" href="/courses" />
<link rel="alternate" hreflang="es" href="/es/courses" />

<!-- Spanish page - MISSING hreflang to English -->
<link rel="alternate" hreflang="es" href="/es/courses" />
```

**Fix:**
```html
<!-- Spanish page must also link back -->
<link rel="alternate" hreflang="en" href="/courses" />
<link rel="alternate" hreflang="es" href="/es/courses" />
```

### Mistake 2: Wrong Meta Description Length

**Problem:**
```html
<meta name="description" content="This is our website where we offer meditation courses and quantum healing programs and spiritual transformation workshops and..." />
<!-- 250+ characters - gets cut off in search results -->
```

**Fix:**
```html
<meta name="description" content="Discover meditation courses, quantum healing programs, and spiritual workshops. Transform your life with expert guidance." />
<!-- 145 characters - fits perfectly -->
```

### Mistake 3: Invalid JSON-LD

**Problem:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Course",
  "price": "$99.99"  ← Wrong! Should be number
}
```

**Fix:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Course",
  "offers": {
    "@type": "Offer",
    "price": "99.99",  ← Correct: string number
    "priceCurrency": "USD"
  }
}
```

### Mistake 4: Missing og:image

**Problem:** No image specified
**Result:** Social platforms show ugly placeholder or nothing

**Fix:**
```html
<meta property="og:image" content="https://example.com/share-image.jpg" />
```

Always include a good quality image!

---

## Testing & Validation

### Tools We Can Use

#### 1. Google Rich Results Test
**URL:** https://search.google.com/test/rich-results
**Tests:** Structured data validity
**Use for:** Product, Course, Event schemas

#### 2. Google Search Console
**URL:** https://search.google.com/search-console
**Features:**
- URL inspection
- hreflang errors
- Coverage reports
- Performance data

#### 3. Facebook Sharing Debugger
**URL:** https://developers.facebook.com/tools/debug/
**Tests:** Open Graph tags
**Use for:** Preview how links appear on Facebook

#### 4. Twitter Card Validator
**URL:** https://cards-dev.twitter.com/validator
**Tests:** Twitter Card tags
**Use for:** Preview how links appear on Twitter

#### 5. hreflang Tags Generator/Validator
**URL:** https://www.aleydasolis.com/english/international-seo-tools/hreflang-tags-generator/
**Tests:** hreflang implementation
**Use for:** Validate language alternates

### How to Test Our Implementation

**Step 1: Validate Structured Data**
```
1. Go to https://search.google.com/test/rich-results
2. Enter URL or paste HTML
3. Check for errors
4. Fix any issues
```

**Step 2: Check hreflang**
```
1. View page source
2. Search for "hreflang"
3. Verify all alternates present
4. Check URLs are absolute
5. Verify bidirectional links
```

**Step 3: Test Social Sharing**
```
1. Go to Facebook Debugger
2. Enter URL
3. Click "Scrape Again"
4. Verify image, title, description
5. Repeat for Twitter
```

---

## Real-World Examples

### Example 1: Homepage

**Requirements:**
- Localized title and description
- Organization schema
- Open Graph tags
- hreflang for English and Spanish

**Implementation:**
```astro
---
import SEOHead from '@/components/SEOHead.astro';
import { generateSEOMetadata, generateOrganizationSchema } from '@/lib/seoMetadata';

const locale = Astro.locals.locale;
const metadata = generateSEOMetadata(locale, {
  titleKey: 'seo.homeTitle',
  descriptionKey: 'seo.homeDescription',
  ogImage: '/images/home-hero.jpg'
});

const orgSchema = generateOrganizationSchema(locale, baseUrl);
---

<html>
<head>
  <SEOHead
    title={metadata.title}
    description={metadata.description}
    locale={locale}
    canonicalPath="/"
    ogImage={metadata.ogImage}
  />
  <script type="application/ld+json" set:html={orgSchema} />
</head>
<body>
  <!-- Page content -->
</body>
</html>
```

**Result:**
- ✅ Localized meta tags
- ✅ hreflang tags
- ✅ Organization schema
- ✅ Open Graph tags
- ✅ Twitter Cards

### Example 2: Course Page

**Requirements:**
- Localized course info
- Course schema
- Breadcrumb schema
- Dynamic title based on course name

**Implementation:**
```astro
---
import { generateSEOTitle, generateCourseSchema, generateBreadcrumbSchema } from '@/lib/seoMetadata';

const course = await getLocalizedCourseById(courseId, locale);
const title = generateSEOTitle(course.title, locale);

const breadcrumbs = [
  { name: t(locale, 'nav.home'), path: '/' },
  { name: t(locale, 'nav.courses'), path: '/courses' },
  { name: course.title, path: `/courses/${course.slug}` }
];

const courseSchema = generateCourseSchema({
  name: course.title,
  description: course.description,
  image: course.imageUrl,
  price: course.price,
  currency: 'USD',
  instructor: course.instructor
}, locale, baseUrl);

const breadcrumbSchema = generateBreadcrumbSchema(breadcrumbs, baseUrl);
---

<head>
  <SEOHead
    title={title}
    description={truncateDescription(course.description)}
    locale={locale}
    canonicalPath={`/courses/${course.slug}`}
    ogImage={course.imageUrl}
    ogType="product"
  />
  <script type="application/ld+json" set:html={courseSchema} />
  <script type="application/ld+json" set:html={breadcrumbSchema} />
</head>
```

**Result:**
- ✅ Course appears in Google Course carousel
- ✅ Price shown in search results
- ✅ Breadcrumbs in SERPs
- ✅ Rich preview when shared

---

## Conclusion

### Key Takeaways

1. **SEO is Essential**
   - Drives free traffic
   - Improves discoverability
   - Enhances user experience

2. **Multilingual SEO Requires Special Care**
   - hreflang tells search engines about languages
   - Localized meta tags improve relevance
   - Each language needs proper optimization

3. **Structured Data Provides Rich Results**
   - JSON-LD is cleanest format
   - Schema.org defines standard types
   - Rich snippets increase CTR

4. **Social Meta Tags Improve Sharing**
   - Open Graph for most platforms
   - Twitter Cards for Twitter
   - Good images are crucial

5. **Testing is Important**
   - Use validation tools
   - Check in Search Console
   - Monitor performance

### Further Learning

- [Google Search Central](https://developers.google.com/search)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Moz SEO Learning Center](https://moz.com/learn/seo)
- [Ahrefs Blog](https://ahrefs.com/blog/)

---

**Guide Version:** 1.0
**Last Updated:** 2025-11-02
**Maintainer:** Development Team
