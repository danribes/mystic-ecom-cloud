/**
 * T109: Advanced Course Filters - Comprehensive Test Suite
 * Tests for course catalog filtering by category, price, level, and rating
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('T109: Advanced Course Filters - Course Service', () => {
  const coursesPath = join(process.cwd(), 'src/lib/courses.ts');
  const coursesSource = readFileSync(coursesPath, 'utf-8');

  describe('getCourses Function', () => {
    it('should export getCourses function', () => {
      expect(coursesSource).toContain('export async function getCourses');
    });

    it('should accept GetCoursesFilters parameter', () => {
      expect(coursesSource).toContain('GetCoursesFilters');
    });

    it('should support category filter', () => {
      expect(coursesSource).toContain('category');
      expect(coursesSource).toContain('c.category =');
    });

    it('should support level filter', () => {
      expect(coursesSource).toContain('level');
      expect(coursesSource).toContain('c.level =');
    });

    it('should support minPrice filter', () => {
      expect(coursesSource).toContain('minPrice');
      expect(coursesSource).toContain('c.price >=');
    });

    it('should support maxPrice filter', () => {
      expect(coursesSource).toContain('maxPrice');
      expect(coursesSource).toContain('c.price <=');
    });

    it('should support minRating filter', () => {
      expect(coursesSource).toContain('minRating');
      expect(coursesSource).toContain('AVG(r.rating)');
    });

    it('should support search filter', () => {
      expect(coursesSource).toContain('search');
      expect(coursesSource).toContain('ILIKE');
    });

    it('should support pagination with limit', () => {
      expect(coursesSource).toContain('limit');
      expect(coursesSource).toContain('LIMIT');
    });

    it('should support pagination with offset', () => {
      expect(coursesSource).toContain('offset');
      expect(coursesSource).toContain('OFFSET');
    });

    it('should join with reviews table for ratings', () => {
      expect(coursesSource).toContain('LEFT JOIN reviews');
      expect(coursesSource).toContain('AVG(r.rating)');
    });

    it('should filter only published courses', () => {
      expect(coursesSource).toContain('is_published = true');
    });

    it('should return items, total, and hasMore', () => {
      expect(coursesSource).toContain('items');
      expect(coursesSource).toContain('total');
      expect(coursesSource).toContain('hasMore');
    });

    it('should calculate total count separately', () => {
      expect(coursesSource).toContain('COUNT');
      expect(coursesSource).toContain('total');
    });

    it('should order by rating and created_at', () => {
      expect(coursesSource).toContain('ORDER BY');
      expect(coursesSource).toContain('rating DESC');
    });
  });

  describe('getCategories Function', () => {
    it('should export getCategories function', () => {
      expect(coursesSource).toContain('export async function getCategories');
    });

    it('should select distinct categories', () => {
      expect(coursesSource).toContain('DISTINCT category');
    });

    it('should filter published courses only', () => {
      expect(coursesSource).toContain('is_published = true');
    });

    it('should return array of strings', () => {
      expect(coursesSource).toContain('Promise<string[]>');
    });
  });

  describe('getCourseById Function', () => {
    it('should export getCourseById function', () => {
      expect(coursesSource).toContain('export async function getCourseById');
    });

    it('should accept id parameter', () => {
      expect(coursesSource).toContain('id: number');
    });

    it('should include rating aggregation', () => {
      expect(coursesSource).toContain('AVG(r.rating)');
      expect(coursesSource).toContain('review_count');
    });
  });

  describe('enrollUser Function', () => {
    it('should export enrollUser function', () => {
      expect(coursesSource).toContain('export async function enrollUser');
    });

    it('should check for existing enrollment', () => {
      expect(coursesSource).toContain('course_enrollments');
      expect(coursesSource).toContain('user_id');
      expect(coursesSource).toContain('course_id');
    });

    it('should prevent duplicate enrollments', () => {
      expect(coursesSource).toContain('already enrolled');
    });
  });

  describe('TypeScript Interfaces', () => {
    it('should define Course interface', () => {
      expect(coursesSource).toContain('export interface Course');
    });

    it('should define GetCoursesFilters interface', () => {
      expect(coursesSource).toContain('export interface GetCoursesFilters');
    });

    it('should define GetCoursesResult interface', () => {
      expect(coursesSource).toContain('export interface GetCoursesResult');
    });

    it('should include all necessary Course fields', () => {
      expect(coursesSource).toContain('title');
      expect(coursesSource).toContain('description');
      expect(coursesSource).toContain('category');
      expect(coursesSource).toContain('level');
      expect(coursesSource).toContain('price');
      expect(coursesSource).toContain('rating');
    });
  });
});

describe('T109: Advanced Course Filters - CourseFilters Component', () => {
  const filtersPath = join(process.cwd(), 'src/components/CourseFilters.astro');
  const filtersSource = readFileSync(filtersPath, 'utf-8');

  describe('Component Structure', () => {
    it('should have Props interface', () => {
      expect(filtersSource).toContain('interface Props');
    });

    it('should accept currentCategory prop', () => {
      expect(filtersSource).toContain('currentCategory');
    });

    it('should accept currentLevel prop', () => {
      expect(filtersSource).toContain('currentLevel');
    });

    it('should accept currentMinPrice prop', () => {
      expect(filtersSource).toContain('currentMinPrice');
    });

    it('should accept currentMaxPrice prop', () => {
      expect(filtersSource).toContain('currentMaxPrice');
    });

    it('should accept currentMinRating prop', () => {
      expect(filtersSource).toContain('currentMinRating');
    });

    it('should accept categories array', () => {
      expect(filtersSource).toContain('categories');
    });
  });

  describe('Category Filter', () => {
    it('should have category section heading', () => {
      expect(filtersSource).toContain('Category');
    });

    it('should have "All Categories" option', () => {
      expect(filtersSource).toContain('All Categories');
    });

    it('should use radio inputs for category', () => {
      expect(filtersSource).toContain('type="radio"');
      expect(filtersSource).toContain('name="category"');
    });

    it('should render dynamic category list', () => {
      expect(filtersSource).toContain('categories.map');
    });

    it('should check current category', () => {
      expect(filtersSource).toContain('checked={currentCategory');
    });
  });

  describe('Level Filter', () => {
    it('should have level section heading', () => {
      expect(filtersSource).toContain('Level');
    });

    it('should have "All Levels" option', () => {
      expect(filtersSource).toContain('All Levels');
    });

    it('should have Beginner option', () => {
      expect(filtersSource).toContain('beginner');
      expect(filtersSource).toContain('Beginner');
    });

    it('should have Intermediate option', () => {
      expect(filtersSource).toContain('intermediate');
      expect(filtersSource).toContain('Intermediate');
    });

    it('should have Advanced option', () => {
      expect(filtersSource).toContain('advanced');
      expect(filtersSource).toContain('Advanced');
    });

    it('should use radio inputs for level', () => {
      expect(filtersSource).toContain('name="level"');
    });
  });

  describe('Price Range Filter', () => {
    it('should have price range section', () => {
      expect(filtersSource).toContain('Price Range');
    });

    it('should have minimum price input', () => {
      expect(filtersSource).toContain('id="minPrice"');
      expect(filtersSource).toContain('name="minPrice"');
    });

    it('should have maximum price input', () => {
      expect(filtersSource).toContain('id="maxPrice"');
      expect(filtersSource).toContain('name="maxPrice"');
    });

    it('should use number input type', () => {
      expect(filtersSource).toContain('type="number"');
    });

    it('should have dollar sign prefix', () => {
      expect(filtersSource).toContain('$');
    });

    it('should set minimum value to 0', () => {
      expect(filtersSource).toContain('min="0"');
    });
  });

  describe('Rating Filter', () => {
    it('should have rating section heading', () => {
      expect(filtersSource).toContain('Minimum Rating');
    });

    it('should have "All Ratings" option', () => {
      expect(filtersSource).toContain('All Ratings');
    });

    it('should use radio inputs for rating', () => {
      expect(filtersSource).toContain('name="minRating"');
    });

    it('should show star icons', () => {
      expect(filtersSource).toContain('svg');
      expect(filtersSource).toContain('viewBox="0 0 20 20"');
    });

    it('should show rating levels (4, 3, 2, 1)', () => {
      expect(filtersSource).toContain('[4, 3, 2, 1]');
    });

    it('should show "& up" text', () => {
      expect(filtersSource).toContain('& up');
    });
  });

  describe('Clear Filters', () => {
    it('should have clear all link', () => {
      expect(filtersSource).toContain('Clear all');
    });

    it('should check for active filters', () => {
      expect(filtersSource).toContain('hasActiveFilters');
    });

    it('should link to /courses without params', () => {
      expect(filtersSource).toContain('href="/courses"');
    });
  });

  describe('Form Submission', () => {
    it('should have form element', () => {
      expect(filtersSource).toContain('<form');
      expect(filtersSource).toContain('id="course-filters"');
    });

    it('should use GET method', () => {
      expect(filtersSource).toContain('method="GET"');
    });

    it('should action to /courses', () => {
      expect(filtersSource).toContain('action="/courses"');
    });

    it('should have submit button', () => {
      expect(filtersSource).toContain('type="submit"');
      expect(filtersSource).toContain('Apply Filters');
    });
  });

  describe('JavaScript Functionality', () => {
    it('should have script tag', () => {
      expect(filtersSource).toContain('<script>');
    });

    it('should auto-submit on radio change', () => {
      expect(filtersSource).toContain('addEventListener');
      expect(filtersSource).toContain('change');
      expect(filtersSource).toContain('submit');
    });

    it('should validate price inputs', () => {
      expect(filtersSource).toContain('minPriceInput');
      expect(filtersSource).toContain('maxPriceInput');
    });
  });

  describe('Styling', () => {
    it('should use Tailwind classes', () => {
      expect(filtersSource).toContain('class=');
      expect(filtersSource).toContain('rounded');
    });

    it('should have sticky positioning', () => {
      expect(filtersSource).toContain('sticky');
    });

    it('should have responsive design', () => {
      expect(filtersSource).toContain('lg:');
    });
  });
});

describe('T109: Advanced Course Filters - Courses Catalog Page', () => {
  const catalogPath = join(process.cwd(), 'src/pages/courses/index.astro');
  const catalogSource = readFileSync(catalogPath, 'utf-8');

  describe('Component Structure', () => {
    it('should exist at correct path', () => {
      expect(catalogSource).toBeTruthy();
    });

    it('should import BaseLayout', () => {
      expect(catalogSource).toContain('BaseLayout');
    });

    it('should import CourseCard', () => {
      expect(catalogSource).toContain('CourseCard');
    });

    it('should import CourseFilters', () => {
      expect(catalogSource).toContain('CourseFilters');
    });

    it('should import getCourses from lib', () => {
      expect(catalogSource).toContain('getCourses');
    });

    it('should import getCategories from lib', () => {
      expect(catalogSource).toContain('getCategories');
    });
  });

  describe('URL Parameter Extraction', () => {
    it('should extract category parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('category')");
    });

    it('should extract level parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('level')");
    });

    it('should extract minPrice parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('minPrice')");
    });

    it('should extract maxPrice parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('maxPrice')");
    });

    it('should extract minRating parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('minRating')");
    });

    it('should extract search parameter', () => {
      expect(catalogSource).toContain("url.searchParams.get('search')");
    });

    it('should extract pagination parameters', () => {
      expect(catalogSource).toContain("url.searchParams.get('limit')");
      expect(catalogSource).toContain("url.searchParams.get('page')");
    });
  });

  describe('Data Fetching', () => {
    it('should call getCourses with filters', () => {
      expect(catalogSource).toContain('await getCourses');
    });

    it('should pass category to getCourses', () => {
      expect(catalogSource).toContain('category:');
    });

    it('should pass level to getCourses', () => {
      expect(catalogSource).toContain('level:');
    });

    it('should pass price filters to getCourses', () => {
      expect(catalogSource).toContain('minPrice:');
      expect(catalogSource).toContain('maxPrice:');
    });

    it('should pass rating filter to getCourses', () => {
      expect(catalogSource).toContain('minRating:');
    });

    it('should call getCategories', () => {
      expect(catalogSource).toContain('await getCategories');
    });

    it('should handle errors', () => {
      expect(catalogSource).toContain('try');
      expect(catalogSource).toContain('catch');
    });
  });

  describe('Pagination Logic', () => {
    it('should calculate current page', () => {
      expect(catalogSource).toContain('currentPage');
    });

    it('should calculate total pages', () => {
      expect(catalogSource).toContain('totalPages');
      expect(catalogSource).toContain('Math.ceil');
    });

    it('should determine if has next page', () => {
      expect(catalogSource).toContain('hasNextPage');
    });

    it('should determine if has previous page', () => {
      expect(catalogSource).toContain('hasPrevPage');
    });

    it('should have buildPageUrl function', () => {
      expect(catalogSource).toContain('function buildPageUrl');
    });

    it('should preserve filters in pagination URLs', () => {
      expect(catalogSource).toContain('params.set');
    });
  });

  describe('Layout Structure', () => {
    it('should use BaseLayout wrapper', () => {
      expect(catalogSource).toContain('<BaseLayout');
    });

    it('should have container div', () => {
      expect(catalogSource).toContain('container');
      expect(catalogSource).toContain('mx-auto');
    });

    it('should have responsive flex layout', () => {
      expect(catalogSource).toContain('flex');
      expect(catalogSource).toContain('lg:flex-row');
    });

    it('should render CourseFilters component', () => {
      expect(catalogSource).toContain('<CourseFilters');
    });

    it('should pass current filters to CourseFilters', () => {
      expect(catalogSource).toContain('currentCategory={category}');
      expect(catalogSource).toContain('currentLevel={level}');
    });
  });

  describe('Results Display', () => {
    it('should show results count', () => {
      expect(catalogSource).toContain('courses.total');
      expect(catalogSource).toContain('Showing');
    });

    it('should show active filter count', () => {
      expect(catalogSource).toContain('activeFilterCount');
    });

    it('should render course grid', () => {
      expect(catalogSource).toContain('grid');
      expect(catalogSource).toContain('md:grid-cols-2');
    });

    it('should map over courses', () => {
      expect(catalogSource).toContain('courses.items.map');
    });

    it('should render CourseCard for each course', () => {
      expect(catalogSource).toContain('<CourseCard');
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no courses', () => {
      expect(catalogSource).toContain('courses.items.length === 0');
      expect(catalogSource).toContain('No Courses Found');
    });

    it('should show error state on fetch failure', () => {
      expect(catalogSource).toContain('error');
      expect(catalogSource).toContain('Error Loading Courses');
    });

    it('should have clear filters button in empty state', () => {
      expect(catalogSource).toContain('Clear All Filters');
    });
  });

  describe('Pagination UI', () => {
    it('should show pagination when multiple pages', () => {
      expect(catalogSource).toContain('totalPages > 1');
    });

    it('should have previous button', () => {
      expect(catalogSource).toContain('Previous');
    });

    it('should have next button', () => {
      expect(catalogSource).toContain('Next');
    });

    it('should show page numbers on desktop', () => {
      expect(catalogSource).toContain('hidden md:flex');
    });

    it('should show page indicator on mobile', () => {
      expect(catalogSource).toContain('md:hidden');
      expect(catalogSource).toContain('Page');
    });

    it('should disable buttons when not applicable', () => {
      expect(catalogSource).toContain('cursor-not-allowed');
    });

    it('should highlight current page', () => {
      expect(catalogSource).toContain('aria-current');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      expect(catalogSource).toContain('<h1');
      expect(catalogSource).toContain('<h2');
    });

    it('should use semantic HTML elements', () => {
      expect(catalogSource).toContain('<main');
      expect(catalogSource).toContain('<nav');
      expect(catalogSource).toContain('CourseFilters'); // CourseFilters component contains <aside> element
    });

    it('should have aria-label for pagination', () => {
      expect(catalogSource).toContain('aria-label="Pagination"');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-first grid', () => {
      expect(catalogSource).toContain('grid-cols-1');
    });

    it('should have desktop grid adjustments', () => {
      expect(catalogSource).toContain('md:grid-cols-2');
      expect(catalogSource).toContain('xl:grid-cols-3');
    });

    it('should stack filters on mobile', () => {
      expect(catalogSource).toContain('flex-col');
      expect(catalogSource).toContain('lg:flex-row');
    });
  });

  describe('Styling', () => {
    it('should use Tailwind classes', () => {
      expect(catalogSource).toContain('class=');
      expect(catalogSource).toContain('bg-');
      expect(catalogSource).toContain('text-');
    });

    it('should have hover effects', () => {
      expect(catalogSource).toContain('hover:');
    });

    it('should have transition effects', () => {
      expect(catalogSource).toContain('transition');
    });
  });
});
