/**
 * Validation Utilities
 * 
 * Zod schemas for common validation patterns.
 * Provides reusable validators for forms and API endpoints.
 */

import { z } from 'zod';

/**
 * Email validation schema
 */
export const emailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .toLowerCase()
  .trim();

/**
 * Password validation schema
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

/**
 * Name validation schema
 */
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .trim();

/**
 * UUID validation schema
 */
export const uuidSchema = z.string().uuid('Invalid UUID');

/**
 * Slug validation schema
 */
export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format')
  .min(3, 'Slug must be at least 3 characters')
  .max(100, 'Slug must not exceed 100 characters');

/**
 * URL validation schema
 */
export const urlSchema = z.string().url('Invalid URL');

/**
 * Phone number validation schema (US format)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^\+?1?\d{10}$/,
    'Invalid phone number (use format: +1234567890 or 1234567890)'
  );

/**
 * Price validation schema (in cents)
 */
export const priceSchema = z
  .number()
  .int('Price must be an integer')
  .min(0, 'Price must be non-negative');

/**
 * Pagination schema
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * Date range schema
 */
export const dateRangeSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .refine((data) => data.end >= data.start, {
    message: 'End date must be after start date',
    path: ['end'],
  });

/**
 * User registration schema
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: nameSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Course creation schema
 */
export const courseSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  slug: slugSchema,
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  price: priceSchema,
  instructorId: uuidSchema,
  categoryId: uuidSchema.optional(),
  thumbnail: urlSchema.optional(),
  isPublished: z.boolean().default(false),
});

/**
 * Event creation schema
 */
export const eventSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  slug: slugSchema,
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  location: z.string().min(5, 'Location must be at least 5 characters'),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  price: priceSchema,
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  thumbnail: urlSchema.optional(),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

/**
 * Digital product schema
 */
export const digitalProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must not exceed 200 characters'),
  slug: slugSchema,
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description must not exceed 5000 characters'),
  price: priceSchema,
  fileUrl: z.string().min(1, 'File URL is required'),
  fileSize: z.number().int().min(1, 'File size must be positive'),
  thumbnail: urlSchema.optional(),
  isPublished: z.boolean().default(false),
});

/**
 * Review schema
 */
export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must not exceed 5'),
  comment: z
    .string()
    .min(10, 'Comment must be at least 10 characters')
    .max(1000, 'Comment must not exceed 1000 characters')
    .optional(),
  courseId: uuidSchema.optional(),
  eventId: uuidSchema.optional(),
}).refine((data) => data.courseId || data.eventId, {
  message: 'Either courseId or eventId must be provided',
});

/**
 * Helper to extract validation errors from Zod error
 */
export function extractZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    errors[path] = err.message;
  });
  
  return errors;
}

/**
 * Safe parse helper with error extraction
 */
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return {
    success: false,
    errors: extractZodErrors(result.error),
  };
}
