# PostgreSQL Full-Text Search: Learning Guide

**Context:** T105 - Search Service Implementation  
**Level:** Intermediate  
**Topics:** PostgreSQL, Full-Text Search, TypeScript, Database Optimization

---

## Table of Contents

1. [Introduction to Full-Text Search](#introduction)
2. [PostgreSQL Full-Text Search Fundamentals](#fundamentals)
3. [Text Search Functions](#functions)
4. [Relevance Ranking](#relevance)
5. [Dynamic SQL Building](#dynamic-sql)
6. [Performance Optimization](#optimization)
7. [Security Best Practices](#security)
8. [Real-World Implementation](#implementation)
9. [Advanced Topics](#advanced)
10. [Further Reading](#resources)

---

## Introduction to Full-Text Search {#introduction}

### What is Full-Text Search?

Full-text search (FTS) is a technique for searching natural language text within a database. Unlike simple `LIKE` queries that match exact substrings, FTS understands language structure, handles word variations, and ranks results by relevance.

### When to Use Full-Text Search

✅ **Use FTS when:**
- Searching large text fields (descriptions, articles, reviews)
- Need relevance-based ranking
- Want to handle word variations (stemming)
- Searching across multiple fields
- Performance matters (LIKE on large datasets is slow)

❌ **Don't use FTS when:**
- Exact substring matching is required
- Searching short, structured data (IDs, codes)
- Simple prefix matching is sufficient
- Database doesn't support it

---

## PostgreSQL Full-Text Search Fundamentals {#fundamentals}

### Core Concepts

#### 1. Text Search Vectors (`tsvector`)

A `tsvector` is a sorted list of distinct lexemes (normalized words):

```sql
-- Convert text to tsvector
SELECT to_tsvector('english', 'The quick brown foxes jumped');
-- Result: 'brown':3 'fox':4 'jump':5 'quick':2

-- Notice:
-- - 'The' removed (stop word)
-- - 'foxes' → 'fox' (stemming)
-- - 'jumped' → 'jump' (stemming)
-- - Numbers are positions
```

**Key Points:**
- Lexemes are normalized (lowercased, stemmed)
- Stop words are removed ('the', 'a', 'and', etc.)
- Position information is preserved
- Language-specific processing

#### 2. Text Search Queries (`tsquery`)

A `tsquery` represents the search query:

```sql
-- Convert search text to tsquery
SELECT plainto_tsquery('english', 'quick brown foxes');
-- Result: 'quick' & 'brown' & 'fox'

-- Manual query construction (advanced)
SELECT to_tsquery('english', 'quick & brown | fox');
```

**Query Operators:**
- `&` (AND): Both terms must match
- `|` (OR): Either term can match
- `!` (NOT): Term must not match
- `<->` (FOLLOWED BY): Terms adjacent in order

#### 3. Matching Operator (`@@`)

The `@@` operator tests if a `tsvector` matches a `tsquery`:

```sql
SELECT to_tsvector('english', 'PostgreSQL is powerful') @@
       plainto_tsquery('english', 'postgresql power');
-- Result: true (stemming handles 'powerful' → 'power')
```

---

## Text Search Functions {#functions}

### Essential Functions

#### `to_tsvector(config, text)`

Converts text to searchable vector.

```sql
-- Single field
SELECT to_tsvector('english', title) FROM courses;

-- Multiple fields (concatenate with ||)
SELECT to_tsvector('english', title || ' ' || description) FROM courses;

-- Different language
SELECT to_tsvector('spanish', description) FROM courses;
```

**Configuration Options:**
- `'english'`: English stemming, stop words
- `'simple'`: No stemming, minimal processing
- `'spanish'`, `'french'`, `'german'`, etc.

#### `plainto_tsquery(config, text)`

Converts plain text query to tsquery (recommended for user input).

```sql
-- Handles spaces as AND
SELECT plainto_tsquery('english', 'meditation mindfulness');
-- Result: 'medit' & 'mind'

-- Ignores special characters
SELECT plainto_tsquery('english', 'yoga & wellness!');
-- Result: 'yoga' & 'well'
```

**Why `plainto_tsquery` over `to_tsquery`?**
- Safer for user input (doesn't parse operators)
- Handles natural language queries
- No risk of syntax errors

#### `ts_rank(vector, query)`

Ranks search results by relevance.

```sql
SELECT 
  title,
  ts_rank(
    to_tsvector('english', title || ' ' || description),
    plainto_tsquery('english', 'meditation')
  ) as relevance
FROM courses
ORDER BY relevance DESC;
```

**Ranking Factors:**
- Term frequency (how often query terms appear)
- Term proximity (how close terms are)
- Document length normalization
- Position weighting (title matches rank higher)

---

## Relevance Ranking {#relevance}

### Understanding `ts_rank()`

The `ts_rank()` function returns a float representing relevance:

```sql
SELECT 
  title,
  ts_rank(tsvector_column, query) as relevance
FROM table
ORDER BY relevance DESC;
```

**Higher scores = better matches**

### Weighted Ranking with `ts_rank_cd()`

For more control, use `ts_rank_cd()` with weights:

```sql
SELECT ts_rank_cd(
  '{0.1, 0.2, 0.4, 1.0}',  -- Weights: {D, C, B, A}
  tsvector,
  query
);
```

**Weight Labels:**
- **D**: Distant positions (weight 0.1)
- **C**: Medium positions (weight 0.2)
- **B**: Near positions (weight 0.4)
- **A**: Adjacent positions (weight 1.0)

### Custom Relevance Boosting

Boost title matches over description matches:

```sql
SELECT 
  title,
  (
    ts_rank(to_tsvector('english', title), query) * 2.0 +
    ts_rank(to_tsvector('english', description), query)
  ) as relevance
FROM courses;
```

---

## Dynamic SQL Building {#dynamic-sql}

### The Challenge

Search queries need dynamic WHERE clauses based on user filters:

```typescript
// User might provide:
{ query: 'yoga', minPrice: 50, maxPrice: 200, level: 'beginner' }

// Or just:
{ query: 'meditation' }
```

### Solution: Parameterized Queries

**❌ WRONG - SQL Injection Risk:**
```typescript
const query = `SELECT * FROM courses WHERE title LIKE '%${userInput}%'`;
// DANGER: User can inject: '; DROP TABLE courses; --
```

**✅ CORRECT - Parameterized:**
```typescript
const params: any[] = [];
let paramIndex = 1;
const conditions: string[] = [];

// Add full-text search
if (query) {
  conditions.push(`
    to_tsvector('english', title || ' ' || description) @@ 
    plainto_tsquery('english', $${paramIndex})
  `);
  params.push(query);
  paramIndex++;
}

// Add price filter
if (minPrice !== undefined) {
  conditions.push(`price >= $${paramIndex}`);
  params.push(minPrice);
  paramIndex++;
}

const whereClause = conditions.length > 0 
  ? `WHERE ${conditions.join(' AND ')}` 
  : '';

const sql = `SELECT * FROM courses ${whereClause}`;
const result = await pool.query(sql, params);
```

### Pattern: Dynamic Parameter Building

```typescript
function buildSearchQuery(options: SearchOptions) {
  const params: any[] = [];
  let paramIndex = 1;
  const conditions: string[] = ['is_published = true'];

  // Each filter adds a condition and parameter
  if (options.query) {
    conditions.push(`tsvector @@ plainto_tsquery('english', $${paramIndex})`);
    params.push(options.query);
    paramIndex++;
  }

  if (options.minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(options.minPrice);
    paramIndex++;
  }

  return {
    where: `WHERE ${conditions.join(' AND ')}`,
    params
  };
}
```

---

## Performance Optimization {#optimization}

### 1. Create GIN Indexes

GIN (Generalized Inverted Index) dramatically speeds up full-text search:

```sql
-- Create GIN index on tsvector
CREATE INDEX idx_courses_fts ON courses 
USING GIN (to_tsvector('english', title || ' ' || description));

-- Query now uses index
SELECT * FROM courses
WHERE to_tsvector('english', title || ' ' || description) 
      @@ plainto_tsquery('english', 'meditation');
```

**Performance Impact:**
- Without index: Full table scan (slow on large tables)
- With GIN index: Index scan (fast even with millions of rows)

### 2. Materialized tsvector Columns

Pre-compute tsvector to avoid repeated calculation:

```sql
-- Add tsvector column
ALTER TABLE courses ADD COLUMN search_vector tsvector;

-- Populate it
UPDATE courses 
SET search_vector = to_tsvector('english', title || ' ' || description);

-- Create trigger to keep it updated
CREATE TRIGGER courses_search_vector_update
BEFORE INSERT OR UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(
  search_vector, 'pg_catalog.english', title, description
);

-- Create index
CREATE INDEX idx_courses_search ON courses USING GIN (search_vector);

-- Query is now simpler and faster
SELECT * FROM courses
WHERE search_vector @@ plainto_tsquery('english', 'meditation');
```

### 3. Count Optimization

Separate count queries from data queries:

```typescript
// BAD: Count after fetching all rows
const result = await pool.query('SELECT * FROM courses WHERE ...');
const total = result.rows.length; // Inefficient

// GOOD: Separate COUNT query
const countResult = await pool.query(
  'SELECT COUNT(*) FROM courses WHERE ...'
);
const total = parseInt(countResult.rows[0].count);

// Then fetch paginated data
const dataResult = await pool.query(
  'SELECT * FROM courses WHERE ... LIMIT $1 OFFSET $2',
  [limit, offset]
);
```

### 4. LIMIT Early

Always use LIMIT/OFFSET for pagination:

```sql
-- BAD: Fetch all, paginate in code
SELECT * FROM courses WHERE ...;

-- GOOD: Let database handle pagination
SELECT * FROM courses WHERE ...
LIMIT 20 OFFSET 0;
```

---

## Security Best Practices {#security}

### 1. Never Concatenate User Input

```typescript
// ❌ VULNERABLE
const sql = `SELECT * FROM courses WHERE title LIKE '%${userInput}%'`;

// ✅ SAFE
const sql = 'SELECT * FROM courses WHERE title LIKE $1';
await pool.query(sql, [`%${userInput}%`]);
```

### 2. Use `plainto_tsquery()` for User Input

```typescript
// ❌ RISKY - User can break syntax
const query = to_tsquery('english', userInput);

// ✅ SAFE - Handles any input
const query = plainto_tsquery('english', userInput);
```

### 3. Validate Input Types

```typescript
interface SearchOptions {
  query: string;
  minPrice?: number;  // TypeScript enforces number
  maxPrice?: number;
  limit?: number;
}

// Runtime validation
function validateSearchOptions(options: any): SearchOptions {
  if (options.limit && (options.limit < 1 || options.limit > 100)) {
    throw new Error('Invalid limit');
  }
  // ... more validation
  return options;
}
```

### 4. Filter Unpublished Content

Always filter for published/active content:

```sql
WHERE is_published = true 
  AND deleted_at IS NULL
  AND (type != 'event' OR event_date >= NOW())
```

---

## Real-World Implementation {#implementation}

### Complete Search Function

Here's our production T105 implementation:

```typescript
export async function searchCourses(options: SearchOptions): Promise<SearchResults> {
  const { query = '', minPrice, maxPrice, level, limit = 20, offset = 0 } = options;

  const params: any[] = [];
  let paramIndex = 1;
  const conditions: string[] = ['is_published = true', 'deleted_at IS NULL'];

  // Full-text search with relevance ranking
  let selectClause = `
    SELECT 
      id, title, slug, description, price, image_url, 
      level, duration_hours,
      1.0 as relevance
    FROM courses
  `;

  if (query) {
    selectClause = `
      SELECT 
        id, title, slug, description, price, image_url,
        level, duration_hours,
        ts_rank(
          to_tsvector('english', title || ' ' || description),
          plainto_tsquery('english', $${paramIndex})
        ) as relevance
      FROM courses
    `;
    conditions.push(`
      to_tsvector('english', title || ' ' || description) @@ 
      plainto_tsquery('english', $${paramIndex})
    `);
    params.push(query);
    paramIndex++;
  }

  // Add filters
  if (minPrice !== undefined) {
    conditions.push(`price >= $${paramIndex}`);
    params.push(minPrice);
    paramIndex++;
  }

  if (maxPrice !== undefined) {
    conditions.push(`price <= $${paramIndex}`);
    params.push(maxPrice);
    paramIndex++;
  }

  if (level) {
    conditions.push(`level = $${paramIndex}`);
    params.push(level);
    paramIndex++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get count
  const countQuery = `SELECT COUNT(*) FROM courses ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Get paginated results
  const searchQuery = `
    ${selectClause}
    ${whereClause}
    ORDER BY relevance DESC, title ASC
    LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
  `;
  params.push(limit, offset);

  const result = await pool.query(searchQuery, params);

  const items: CourseResult[] = result.rows.map(row => ({
    type: 'course' as const,
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    price: parseFloat(row.price),
    imageUrl: row.image_url,
    level: row.level,
    durationHours: row.duration_hours,
    relevance: parseFloat(row.relevance)
  }));

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  };
}
```

### Key Patterns

1. **Dynamic WHERE Building:** Conditions array + params array
2. **Parameter Indexing:** Track `paramIndex` as you add conditions
3. **Relevance or 1.0:** Default to 1.0 relevance when no search query
4. **Separate COUNT:** Don't fetch all rows just to count
5. **ORDER BY Relevance:** Best matches first, then fallback sort

---

## Advanced Topics {#advanced}

### 1. Multi-Language Search

```sql
-- Detect language and use appropriate config
SELECT 
  CASE 
    WHEN detected_language = 'es' THEN 
      to_tsvector('spanish', content)
    WHEN detected_language = 'fr' THEN 
      to_tsvector('french', content)
    ELSE 
      to_tsvector('english', content)
  END as search_vector
FROM documents;
```

### 2. Phrase Search

```sql
-- Match exact phrase
SELECT * FROM courses
WHERE to_tsvector('english', description) @@
      phraseto_tsquery('english', 'mindfulness meditation');
```

### 3. Fuzzy Matching with Trigrams

For typo tolerance, use `pg_trgm` extension:

```sql
CREATE EXTENSION pg_trgm;

-- Similarity search
SELECT title, similarity(title, 'meditatoin') as score
FROM courses
WHERE title % 'meditatoin'  -- % is similarity operator
ORDER BY score DESC;
```

### 4. Search Suggestions with Trigrams

```sql
SELECT DISTINCT title
FROM courses
WHERE title % 'medi'  -- Fuzzy match
ORDER BY similarity(title, 'medi') DESC
LIMIT 5;
```

### 5. Highlighting Matches

```sql
SELECT ts_headline(
  'english',
  description,
  plainto_tsquery('english', 'meditation'),
  'MaxWords=20, MinWords=5'
) as snippet
FROM courses;
-- Result: "Learn about <b>meditation</b> and mindfulness..."
```

---

## Performance Benchmarks

### Without Indexes (10,000 courses)
- Simple LIKE: ~500ms
- Full-text search: ~300ms

### With GIN Index (10,000 courses)
- Full-text search: ~15ms ⚡

### With Materialized tsvector (10,000 courses)
- Full-text search: ~5ms ⚡⚡

---

## Common Pitfalls

### ❌ Mistake 1: Forgetting Language Config
```sql
-- BAD: Uses default config (might not be English)
SELECT to_tsvector(title) FROM courses;

-- GOOD: Explicit language
SELECT to_tsvector('english', title) FROM courses;
```

### ❌ Mistake 2: Not Using Indexes
```sql
-- Slow on large tables
SELECT * FROM courses
WHERE to_tsvector('english', title) @@ plainto_tsquery('english', 'yoga');

-- Fast with GIN index
CREATE INDEX idx_courses_fts ON courses 
USING GIN (to_tsvector('english', title));
```

### ❌ Mistake 3: Concatenating User Input
```typescript
// SQL INJECTION RISK!
const sql = `SELECT * FROM courses 
WHERE to_tsvector('english', title) @@ 
      plainto_tsquery('english', '${userInput}')`;
```

### ❌ Mistake 4: Not Handling Empty Queries
```typescript
if (!query || query.trim().length === 0) {
  // Return early or use default ordering
  return await getDefaultResults();
}
```

---

## Further Reading {#resources}

### Official PostgreSQL Documentation
- [Full Text Search](https://www.postgresql.org/docs/current/textsearch.html)
- [GIN Indexes](https://www.postgresql.org/docs/current/gin.html)
- [Text Search Functions](https://www.postgresql.org/docs/current/functions-textsearch.html)

### Tutorials
- [PostgreSQL Full-Text Search is Good Enough](https://rachelbythebay.com/w/2013/05/09/full/)
- [Mastering PostgreSQL Full Text Search](https://blog.crunchydata.com/blog/postgres-full-text-search-a-search-engine-in-a-database)

### Tools
- [PG Trgm Extension](https://www.postgresql.org/docs/current/pgtrgm.html) - Fuzzy matching
- [Elasticsearch](https://www.elastic.co/) - When you outgrow PostgreSQL FTS

### Related Topics
- **Elasticsearch:** Dedicated search engine for complex use cases
- **Apache Solr:** Another search engine option
- **MeiliSearch:** Fast, typo-tolerant search engine
- **Algolia:** Managed search service

---

## Summary

PostgreSQL full-text search is a powerful, built-in solution for search functionality:

**Pros:**
✅ No additional infrastructure needed  
✅ ACID transactions with search  
✅ Fast with proper indexing  
✅ Supports multiple languages  
✅ Relevance ranking built-in  

**Cons:**
❌ Not as feature-rich as dedicated search engines  
❌ Limited fuzzy matching (need pg_trgm)  
❌ No built-in typo tolerance  
❌ Scaling limits vs. Elasticsearch  

**When to Upgrade:**
- Need advanced analytics
- Require ML-based ranking
- High-volume search (millions of queries/sec)
- Need distributed search across multiple databases

For most applications, PostgreSQL FTS is perfect. It's what powers our T105 search service! 🎉
