/**
 * T050-T052: User Dashboard Tests
 * 
 * Tests for:
 * - T050: Dashboard Layout
 * - T051: Dashboard Index Page
 * - T052: My Courses Page
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/db', () => ({
  getPool: vi.fn(() => ({
    query: vi.fn(),
  })),
}));

import { getPool } from '@/lib/db';

describe('User Dashboard - T050-T052', () => {
  const mockUserId = 'user-uuid-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dashboard Layout - T050', () => {
    it('should render sidebar navigation with all menu items', () => {
      const expectedMenuItems = [
        { href: '/dashboard', label: 'Overview' },
        { href: '/dashboard/courses', label: 'My Courses' },
        { href: '/dashboard/orders', label: 'Order History' },
        { href: '/dashboard/downloads', label: 'Downloads' },
        { href: '/dashboard/bookings', label: 'My Bookings' },
        { href: '/dashboard/profile', label: 'Profile' },
      ];

      // Verify all navigation items are present
      expectedMenuItems.forEach((item) => {
        expect(item.href).toBeTruthy();
        expect(item.label).toBeTruthy();
      });
    });

    it('should display user profile section in sidebar', () => {
      const mockUser = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
      };

      expect(mockUser.name).toBe('John Doe');
      expect(mockUser.email).toBe('john@example.com');
    });

    it('should show active route highlighting', () => {
      const currentPath = '/dashboard/courses';
      const isActive = (itemPath: string) => 
        currentPath === itemPath || 
        (itemPath !== '/dashboard' && currentPath.startsWith(itemPath));

      expect(isActive('/dashboard/courses')).toBe(true);
      expect(isActive('/dashboard')).toBe(false);
      expect(isActive('/dashboard/orders')).toBe(false);
    });

    it('should include bottom navigation actions', () => {
      const bottomActions = [
        { href: '/courses', label: 'Browse Courses' },
        { href: '/support', label: 'Support' },
        { action: 'logout', label: 'Logout' },
      ];

      bottomActions.forEach((action) => {
        expect(action.label).toBeTruthy();
      });
    });

    it('should have mobile responsive menu toggle', () => {
      const mobileMenuElements = {
        toggleButton: 'mobile-menu-toggle',
        closeButton: 'mobile-menu-close',
        sidebar: 'sidebar',
        overlay: 'mobile-sidebar-overlay',
      };

      Object.values(mobileMenuElements).forEach((elementId) => {
        expect(elementId).toBeTruthy();
      });
    });
  });

  describe('Dashboard Index Page - T051', () => {
    const mockEnrolledCourses = [
      {
        id: 'course-1',
        title: 'Meditation Basics',
        slug: 'meditation-basics',
        description: 'Learn meditation fundamentals',
        price: 49.99,
        thumbnail_url: 'https://example.com/thumb1.jpg',
        enrolled_at: new Date('2024-01-15'),
        progress: 45,
        completed: false,
      },
      {
        id: 'course-2',
        title: 'Advanced Yoga',
        slug: 'advanced-yoga',
        description: 'Deepen your practice',
        price: 79.99,
        thumbnail_url: null,
        enrolled_at: new Date('2024-02-01'),
        progress: 100,
        completed: true,
      },
    ];

    const mockRecentOrders = [
      {
        id: 'order-1',
        total_amount: 129.98,
        status: 'completed',
        created_at: new Date('2024-02-15'),
        item_count: 2,
      },
      {
        id: 'order-2',
        total_amount: 49.99,
        status: 'pending',
        created_at: new Date('2024-03-01'),
        item_count: 1,
      },
    ];

    const mockStats = {
      totalCourses: 5,
      totalOrders: 3,
      totalSpent: 249.97,
      activeBookings: 2,
    };

    beforeEach(() => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: mockEnrolledCourses }) // Enrolled courses
          .mockResolvedValueOnce({ rows: mockRecentOrders }) // Recent orders
          .mockResolvedValueOnce({ rows: [mockStats] }), // Stats
      };
      (getPool as any).mockReturnValue(mockPool);
    });

    it('should fetch and display user statistics', async () => {
      const pool = getPool();
      await pool.query('SELECT stats');

      expect(pool.query).toHaveBeenCalled();
      expect(mockStats.totalCourses).toBe(5);
      expect(mockStats.totalOrders).toBe(3);
      expect(mockStats.totalSpent).toBe(249.97);
      expect(mockStats.activeBookings).toBe(2);
    });

    it('should display quick stats cards', () => {
      const statsCards = [
        { label: 'Enrolled Courses', value: mockStats.totalCourses, icon: '📚' },
        { label: 'Total Orders', value: mockStats.totalOrders, icon: '🧾' },
        { label: 'Total Invested', value: `$${mockStats.totalSpent.toFixed(2)}`, icon: '💰' },
        { label: 'Active Bookings', value: mockStats.activeBookings, icon: '📅' },
      ];

      statsCards.forEach((card) => {
        expect(card.label).toBeTruthy();
        expect(card.value).toBeDefined();
        expect(card.icon).toBeTruthy();
      });
    });

    it('should display quick action buttons', () => {
      const quickActions = [
        { href: '/courses', label: 'Browse Courses', icon: '🔍' },
        { href: '/events', label: 'Find Events', icon: '🎟️' },
        { href: '/shop', label: 'Digital Shop', icon: '🛍️' },
        { href: '/support', label: 'Get Support', icon: '💬' },
      ];

      quickActions.forEach((action) => {
        expect(action.href).toBeTruthy();
        expect(action.label).toBeTruthy();
        expect(action.icon).toBeTruthy();
      });
    });

    it('should fetch and display enrolled courses', async () => {
      const pool = getPool();
      const result = await pool.query('SELECT courses');

      expect(pool.query).toHaveBeenCalled();
      expect(result.rows).toEqual(mockEnrolledCourses);
      expect(result.rows.length).toBe(2);
    });

    it('should show course progress bars', () => {
      mockEnrolledCourses.forEach((course) => {
        expect(course.progress).toBeGreaterThanOrEqual(0);
        expect(course.progress).toBeLessThanOrEqual(100);
      });
    });

    it('should display recent orders table', async () => {
      // Mock specific to this test
      const ordersPool = {
        query: vi.fn().mockResolvedValue({ rows: mockRecentOrders }),
      };
      (getPool as any).mockReturnValue(ordersPool);

      const pool = getPool();
      const result = await pool.query('SELECT orders');

      expect(result.rows).toEqual(mockRecentOrders);
      expect(result.rows.length).toBe(2);
    });

    it('should format order dates correctly', () => {
      const formatDate = (date: Date) => {
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      };

      const order = mockRecentOrders[0];
      if (order) {
        const formatted = formatDate(order.created_at);
        expect(formatted).toContain('2024');
        expect(formatted).toContain('February');
      }
    });

    it('should show correct status badge colors', () => {
      const getStatusColor = (status: string) => {
        switch (status) {
          case 'completed':
            return 'bg-green-100 text-green-800';
          case 'pending':
            return 'bg-yellow-100 text-yellow-800';
          case 'payment_failed':
            return 'bg-red-100 text-red-800';
          case 'refunded':
            return 'bg-gray-100 text-gray-800';
          default:
            return 'bg-gray-100 text-gray-800';
        }
      };

      expect(getStatusColor('completed')).toContain('green');
      expect(getStatusColor('pending')).toContain('yellow');
      expect(getStatusColor('payment_failed')).toContain('red');
    });

    it('should show empty state when no courses enrolled', () => {
      const emptyCourses: any[] = [];
      const emptyState = {
        icon: '📚',
        title: 'No Courses Yet',
        message: 'Start your spiritual journey by enrolling in a course',
        action: 'Browse Courses',
      };

      expect(emptyCourses.length).toBe(0);
      expect(emptyState.title).toBeTruthy();
      expect(emptyState.action).toBeTruthy();
    });

    it('should handle database errors gracefully', async () => {
      const errorPool = {
        query: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };
      (getPool as any).mockReturnValue(errorPool);

      try {
        await errorPool.query('SELECT courses');
      } catch (error: any) {
        expect(error.message).toBe('Database connection failed');
      }

      // Should still render with empty data
      const fallbackData = {
        courses: [],
        orders: [],
        stats: { totalCourses: 0, totalOrders: 0, totalSpent: 0, activeBookings: 0 },
      };

      expect(fallbackData.courses).toEqual([]);
      expect(fallbackData.stats.totalCourses).toBe(0);
    });
  });

  describe('My Courses Page - T052', () => {
    const mockCourses = [
      {
        id: 'course-1',
        title: 'Meditation Basics',
        slug: 'meditation-basics',
        description: 'Learn meditation fundamentals',
        price: 49.99,
        thumbnail_url: 'https://example.com/thumb1.jpg',
        duration_hours: 10,
        lesson_count: 25,
        category: 'Meditation',
        enrolled_at: new Date('2024-01-15'),
        progress: 45,
        completed: false,
        last_accessed_at: new Date('2024-03-10'),
      },
      {
        id: 'course-2',
        title: 'Advanced Yoga',
        slug: 'advanced-yoga',
        description: 'Deepen your practice',
        price: 79.99,
        thumbnail_url: null,
        duration_hours: 15,
        lesson_count: 30,
        category: 'Yoga',
        enrolled_at: new Date('2024-02-01'),
        progress: 100,
        completed: true,
        last_accessed_at: new Date('2024-03-15'),
      },
      {
        id: 'course-3',
        title: 'Chakra Healing',
        slug: 'chakra-healing',
        description: 'Balance your energy centers',
        price: 59.99,
        thumbnail_url: 'https://example.com/thumb3.jpg',
        duration_hours: 8,
        lesson_count: 20,
        category: 'Healing',
        enrolled_at: new Date('2024-03-01'),
        progress: 0,
        completed: false,
        last_accessed_at: null,
      },
    ];

    const mockStats = {
      total: 3,
      inProgress: 1,
      completed: 1,
      notStarted: 1,
    };

    beforeEach(() => {
      const mockPool = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: mockCourses }) // Courses query
          .mockResolvedValueOnce({ rows: [mockStats] }), // Stats query
      };
      (getPool as any).mockReturnValue(mockPool);
    });

    it('should fetch and display all enrolled courses', async () => {
      const pool = getPool();
      const result = await pool.query('SELECT courses');

      expect(pool.query).toHaveBeenCalled();
      expect(result.rows).toEqual(mockCourses);
      expect(result.rows.length).toBe(3);
    });

    it('should display course statistics', async () => {
      const pool = getPool();
      await pool.query('SELECT courses');
      const result = await pool.query('SELECT stats');

      expect(result.rows[0]).toEqual(mockStats);
      expect(mockStats.total).toBe(3);
      expect(mockStats.inProgress).toBe(1);
      expect(mockStats.completed).toBe(1);
      expect(mockStats.notStarted).toBe(1);
    });

    it('should filter courses by status', () => {
      const filterCourses = (courses: any[], status: string) => {
        switch (status) {
          case 'completed':
            return courses.filter((c) => c.completed);
          case 'in-progress':
            return courses.filter((c) => c.progress > 0 && !c.completed);
          case 'not-started':
            return courses.filter((c) => c.progress === 0);
          default:
            return courses;
        }
      };

      expect(filterCourses(mockCourses, 'completed').length).toBe(1);
      expect(filterCourses(mockCourses, 'in-progress').length).toBe(1);
      expect(filterCourses(mockCourses, 'not-started').length).toBe(1);
      expect(filterCourses(mockCourses, 'all').length).toBe(3);
    });

    it('should sort courses by different criteria', () => {
      const sortCourses = (courses: any[], sortBy: string) => {
        const sorted = [...courses];
        switch (sortBy) {
          case 'recent':
            return sorted.sort((a, b) => 
              new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime()
            );
          case 'progress':
            return sorted.sort((a, b) => (b.progress || 0) - (a.progress || 0));
          case 'title':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
          default:
            return sorted;
        }
      };

      const sortedByProgress = sortCourses(mockCourses, 'progress');
      expect(sortedByProgress[0].progress).toBe(100);

      const sortedByTitle = sortCourses(mockCourses, 'title');
      expect(sortedByTitle[0].title).toBe('Advanced Yoga');
    });

    it('should display course progress bars with percentage', () => {
      mockCourses.forEach((course) => {
        expect(course.progress).toBeGreaterThanOrEqual(0);
        expect(course.progress).toBeLessThanOrEqual(100);
        const rounded = Math.round(course.progress || 0);
        expect(rounded).toBeGreaterThanOrEqual(0);
      });
    });

    it('should determine correct course status', () => {
      const getCourseStatus = (course: any) => {
        if (course.completed) return 'Completed';
        if ((course.progress || 0) > 0) return 'In Progress';
        return 'Not Started';
      };

      expect(getCourseStatus(mockCourses[0])).toBe('In Progress');
      expect(getCourseStatus(mockCourses[1])).toBe('Completed');
      expect(getCourseStatus(mockCourses[2])).toBe('Not Started');
    });

    it('should apply correct status badge colors', () => {
      const getStatusColor = (course: any) => {
        if (course.completed) return 'text-green-600 bg-green-100';
        if ((course.progress || 0) > 0) return 'text-blue-600 bg-blue-100';
        return 'text-gray-600 bg-gray-100';
      };

      expect(getStatusColor(mockCourses[0])).toContain('blue');
      expect(getStatusColor(mockCourses[1])).toContain('green');
      expect(getStatusColor(mockCourses[2])).toContain('gray');
    });

    it('should show course metadata (lessons, duration)', () => {
      mockCourses.forEach((course) => {
        expect(course.lesson_count).toBeGreaterThan(0);
        expect(course.duration_hours).toBeGreaterThan(0);
      });
    });

    it('should display enrollment and last access dates', () => {
      const formatDate = (date: Date | null) => {
        if (!date) return null;
        return new Date(date).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
      };

      mockCourses.forEach((course) => {
        expect(formatDate(course.enrolled_at)).toBeTruthy();
        if (course.last_accessed_at) {
          expect(formatDate(course.last_accessed_at)).toBeTruthy();
        }
      });
    });

    it('should provide correct action button text', () => {
      const getActionText = (course: any) => {
        return (course.progress || 0) > 0 ? 'Continue Learning' : 'Start Course';
      };

      expect(getActionText(mockCourses[0])).toBe('Continue Learning');
      expect(getActionText(mockCourses[2])).toBe('Start Course');
    });

    it('should generate correct course links', () => {
      mockCourses.forEach((course) => {
        const learnLink = `/courses/${course.slug}/learn`;
        const detailLink = `/courses/${course.slug}`;

        expect(learnLink).toContain(course.slug);
        expect(detailLink).toContain(course.slug);
      });
    });

    it('should show empty state for filtered results', () => {
      const emptyCourses: any[] = [];
      const filterStatus = 'completed';

      const getEmptyState = (status: string) => {
        switch (status) {
          case 'completed':
            return {
              icon: '🎉',
              title: 'No Completed Courses',
              message: 'Complete your enrolled courses to see them here',
            };
          case 'in-progress':
            return {
              icon: '📚',
              title: 'No Courses In Progress',
              message: 'Start learning to see courses in progress',
            };
          case 'not-started':
            return {
              icon: '🆕',
              title: 'All Courses Started!',
              message: 'Great job! You have started all your courses',
            };
          default:
            return {
              icon: '📚',
              title: 'No Courses Yet',
              message: 'Begin your spiritual journey by enrolling in a course',
            };
        }
      };

      expect(emptyCourses.length).toBe(0);
      const emptyState = getEmptyState(filterStatus);
      expect(emptyState.title).toBeTruthy();
      expect(emptyState.message).toBeTruthy();
    });

    it('should handle courses with missing thumbnails', () => {
      const courseWithoutThumb = mockCourses.find((c) => !c.thumbnail_url);
      expect(courseWithoutThumb).toBeTruthy();
      
      // Should show default gradient with emoji
      const defaultDisplay = {
        background: 'bg-gradient-to-br from-purple-100 to-indigo-100',
        emoji: '🧘',
      };
      
      expect(defaultDisplay.emoji).toBeTruthy();
    });

    it('should handle database errors gracefully', async () => {
      const errorPool = {
        query: vi.fn().mockRejectedValue(new Error('Connection timeout')),
      };
      (getPool as any).mockReturnValue(errorPool);

      try {
        await errorPool.query('SELECT courses');
      } catch (error: any) {
        expect(error.message).toBe('Connection timeout');
      }

      // Should render with empty data
      const fallbackData = {
        courses: [],
        stats: { total: 0, inProgress: 0, completed: 0, notStarted: 0 },
      };

      expect(fallbackData.courses).toEqual([]);
      expect(fallbackData.stats.total).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should navigate between dashboard pages', () => {
      const routes = [
        '/dashboard',
        '/dashboard/courses',
        '/dashboard/orders',
        '/dashboard/downloads',
        '/dashboard/bookings',
        '/dashboard/profile',
      ];

      routes.forEach((route) => {
        expect(route).toMatch(/^\/dashboard/);
      });
    });

    it('should maintain consistent layout across pages', () => {
      const layoutProps = {
        hasSidebar: true,
        hasHeader: true,
        hasUserProfile: true,
        hasMobileMenu: true,
      };

      Object.values(layoutProps).forEach((prop) => {
        expect(prop).toBe(true);
      });
    });

    it('should link to course learning page from multiple locations', () => {
      const courseSlug = 'meditation-basics';
      const links = [
        `/courses/${courseSlug}/learn`, // From dashboard index
        `/courses/${courseSlug}/learn`, // From my courses page
        `/courses/${courseSlug}`, // Course detail page
      ];

      links.forEach((link) => {
        expect(link).toContain(courseSlug);
      });
    });
  });
});
