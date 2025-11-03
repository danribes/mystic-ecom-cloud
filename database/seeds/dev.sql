-- Development Seed Data
-- Sample data for testing and development

-- Sample Courses
INSERT INTO courses (title, slug, description, price, duration_hours, level, is_published) VALUES
('Mindfulness Meditation Basics', 'mindfulness-meditation-basics', 'Learn the fundamentals of mindfulness meditation and develop a daily practice that brings peace and clarity to your life.', 49.99, 8, 'Beginner', true),
('Advanced Chakra Healing', 'advanced-chakra-healing', 'Deep dive into the seven chakras, their significance, and techniques for balancing and healing your energy centers.', 79.99, 12, 'Intermediate', true),
('Spiritual Leadership Mastery', 'spiritual-leadership-mastery', 'Transform your leadership style by integrating spiritual principles and authentic presence in your work and life.', 149.99, 20, 'Advanced', true),
('Introduction to Yoga Philosophy', 'intro-yoga-philosophy', 'Explore the ancient wisdom of yoga beyond the physical practice, including the Yoga Sutras and Bhagavad Gita.', 39.99, 6, 'Beginner', true);

-- Sample Digital Products
INSERT INTO digital_products (title, slug, description, price, product_type, file_url, file_size_mb, is_published) VALUES
('Guided Meditation Audio Collection', 'guided-meditation-audio', 'A collection of 10 professionally recorded guided meditations for various purposes: stress relief, sleep, focus, and more.', 19.99, 'audio', '/products/guided-meditation.mp3', 150.5, true),
('Sacred Geometry eBook', 'sacred-geometry-ebook', 'Comprehensive guide to sacred geometry patterns, their meanings, and how to use them in spiritual practice.', 24.99, 'ebook', '/products/sacred-geometry.pdf', 8.2, true),
('Morning Ritual Video Course', 'morning-ritual-video', 'Transform your mornings with this powerful video series teaching you to create an energizing spiritual routine.', 34.99, 'video', '/products/morning-ritual.mp4', 1200.0, true);

-- Sample Events
INSERT INTO events (title, slug, description, price, event_date, duration_hours, venue_name, venue_address, venue_city, venue_country, capacity, available_spots, is_published) VALUES
('Full Moon Meditation Retreat', 'full-moon-retreat-dec', 'Join us for a transformative full moon meditation retreat with guided sessions, fire ceremony, and community sharing.', 150.00, '2025-12-15 18:00:00+00', 4, 'Sacred Space Retreat Center', '123 Mountain View Road', 'Boulder', 'USA', 30, 30, true),
('Kundalini Awakening Workshop', 'kundalini-workshop-jan', 'Experience the power of Kundalini yoga in this intensive one-day workshop led by certified instructors.', 89.00, '2026-01-20 09:00:00+00', 8, 'Yoga Haven Studio', '456 Wellness Avenue', 'Los Angeles', 'USA', 50, 50, true),
('Sound Healing Ceremony', 'sound-healing-feb', 'Immerse yourself in healing vibrations with crystal singing bowls, gongs, and other sacred instruments.', 65.00, '2026-02-08 19:00:00+00', 2, 'Harmony Hall', '789 Peace Street', 'San Francisco', 'USA', 40, 40, true);

-- Sample Test User (password: test123)
INSERT INTO users (email, password_hash, name, role) 
VALUES ('test@example.com', '$2b$10$rCz8L5qF2vx3yqZ5H1V9.uF0qWjP6z5RY.8J.VGqL5qC8x9F.Y0QG', 'Test User', 'user');

-- Get user IDs for subsequent inserts
DO $$
DECLARE
    test_user_id UUID;
    admin_user_id UUID;
    course1_id UUID;
    course2_id UUID;
BEGIN
    -- Get user IDs
    SELECT id INTO test_user_id FROM users WHERE email = 'test@example.com';
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@spirituality.com';
    
    -- Get course IDs
    SELECT id INTO course1_id FROM courses WHERE slug = 'mindfulness-meditation-basics';
    SELECT id INTO course2_id FROM courses WHERE slug = 'advanced-chakra-healing';
    
    -- Sample Reviews
    INSERT INTO reviews (user_id, course_id, rating, comment, is_approved) VALUES
    (test_user_id, course1_id, 5, 'This course completely changed my meditation practice. Highly recommended!', true),
    (test_user_id, course2_id, 4, 'Great content and very informative. Would love more practical exercises.', true);
    
    -- Sample Course Progress
    INSERT INTO course_progress (user_id, course_id, progress_percentage, completed_lessons) VALUES
    (test_user_id, course1_id, 25, '["lesson-1", "lesson-2"]');
END $$;
