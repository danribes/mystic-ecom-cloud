/**
 * Shared TypeScript types for the Spirituality E-Commerce Platform
 */

// ==================== User Types ====================

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ==================== Course Types ====================

export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

export interface CourseLesson {
  title: string;
  duration: number; // in seconds
  type: 'video' | 'text' | 'quiz' | 'assignment';
  videoUrl?: string;
  content?: string;
  order: number;
}

export interface CourseSection {
  title: string;
  description?: string;
  lessons: CourseLesson[];
  order: number;
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  instructorId: string;
  instructorName?: string;
  instructorAvatar?: string;
  price: number; // in cents
  duration: number; // total duration in seconds
  level: CourseLevel;
  category: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  tags: string[];
  learningOutcomes: string[];
  prerequisites: string[];
  curriculum: CourseSection[];
  enrollmentCount: number;
  avgRating?: number;
  reviewCount: number;
  isPublished: boolean;
  isFeatured: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Multilingual content (T167)
  titleEs?: string;
  descriptionEs?: string;
  longDescriptionEs?: string;
  learningOutcomesEs?: string[];
  prerequisitesEs?: string[];
  curriculumEs?: CourseSection[];
}

export interface CourseProgress {
  id: string;
  userId: string;
  courseId: string;
  completedLessons: string[];
  lastAccessedAt: Date;
  completionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Event Types ====================

export type EventType = 'workshop' | 'retreat' | 'webinar' | 'ceremony';
export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  type: EventType;
  status: EventStatus;
  organizerId: string;
  organizerName?: string;
  organizerAvatar?: string;
  startDate: Date;
  endDate: Date;
  location: string;
  isVirtual: boolean;
  meetingUrl?: string;
  price: number; // in cents
  maxAttendees?: number;
  currentAttendees: number;
  imageUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Multilingual content (T167)
  titleEs?: string;
  descriptionEs?: string;
  longDescriptionEs?: string;
  venueNameEs?: string;
  venueAddressEs?: string;
}

export interface EventBooking {
  id: string;
  userId: string;
  eventId: string;
  attendeeCount: number;
  totalPrice: number;
  status: 'confirmed' | 'cancelled' | 'attended';
  paymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Digital Product Types ====================

export type ProductType = 'ebook' | 'audio' | 'video' | 'template' | 'other';

export interface DigitalProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  longDescription?: string;
  type: ProductType;
  authorId: string;
  authorName?: string;
  price: number; // in cents
  fileUrl: string;
  fileSize: number; // in bytes
  fileFormat: string;
  previewUrl?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  tags: string[];
  downloadCount: number;
  avgRating?: number;
  reviewCount: number;
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Multilingual content (T167)
  titleEs?: string;
  descriptionEs?: string;
  longDescriptionEs?: string;
}

export interface DownloadLog {
  id: string;
  userId: string;
  productId: string;
  downloadedAt: Date;
  ipAddress?: string;
}

// ==================== Order Types ====================

export type OrderStatus = 
  | 'pending' 
  | 'payment_pending' 
  | 'paid' 
  | 'processing' 
  | 'completed' 
  | 'cancelled' 
  | 'refunded';

export type OrderItemType = 'course' | 'event' | 'digital_product';

export interface OrderItem {
  id: string;
  orderId: string;
  itemType: OrderItemType;
  itemId: string;
  itemTitle?: string;
  itemSlug?: string;
  itemImageUrl?: string;
  price: number;
  quantity: number;
  subtotal: number;
  createdAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  paymentIntentId?: string;
  paymentMethod?: string;
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ==================== Cart Types ====================

export interface CartItem {
  itemType: OrderItemType;
  itemId: string;
  itemTitle: string;
  itemSlug: string;
  itemImageUrl?: string;
  price: number;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  updatedAt: Date;
}

// ==================== Review Types ====================

export interface Review {
  id: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  itemType: OrderItemType;
  itemId: string;
  rating: number; // 1-5
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Pagination Types ====================

export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

// ==================== API Response Types ====================

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  fields?: Record<string, string>;
}

export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

// ==================== Filter Types ====================

export interface CourseFilters {
  category?: string;
  level?: CourseLevel;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  instructorId?: string;
  isPublished?: boolean;
  isFeatured?: boolean;
  sortBy?: 'price' | 'newest' | 'popular' | 'rating';
  sortOrder?: 'asc' | 'desc';
}

export interface EventFilters {
  type?: EventType;
  status?: EventStatus;
  startDate?: Date;
  endDate?: Date;
  isVirtual?: boolean;
  search?: string;
  tags?: string[];
  isPublished?: boolean;
  sortBy?: 'date' | 'price' | 'popularity';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductFilters {
  type?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  tags?: string[];
  authorId?: string;
  isPublished?: boolean;
  sortBy?: 'price' | 'newest' | 'popular' | 'rating';
  sortOrder?: 'asc' | 'desc';
}
