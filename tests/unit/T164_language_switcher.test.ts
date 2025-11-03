/**
 * T164: LanguageSwitcher Component Tests
 *
 * Tests the language switcher component functionality including:
 * - Component structure and rendering
 * - Dropdown toggle behavior
 * - Keyboard navigation (Enter/Space, Escape, Arrow keys)
 * - Language option rendering
 * - URL generation for locale switching
 * - Cookie persistence integration
 * - ARIA accessibility
 * - Responsive design
 *
 * Testing Strategy: Source-based testing (similar to T107/T108)
 * - Reads component file directly to verify structure
 * - Tests TypeScript logic and HTML structure
 * - Validates CSS styles and JavaScript behavior
 * - Ensures accessibility compliance
 *
 * Integration:
 * - Works with T125 i18n utilities (LOCALES, LOCALE_NAMES)
 * - Uses T163 middleware (Astro.locals.locale)
 * - Sets locale cookie for persistence
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read component source
const componentPath = join(process.cwd(), 'src/components/LanguageSwitcher.astro');
const componentSource = readFileSync(componentPath, 'utf-8');

describe('T164: LanguageSwitcher Component', () => {
  describe('Component Structure', () => {
    it('should import required dependencies', () => {
      expect(componentSource).toContain("import { LOCALES, LOCALE_NAMES, type Locale } from '../i18n'");
    });

    it('should read current locale from Astro.locals', () => {
      expect(componentSource).toContain('Astro.locals.locale');
      expect(componentSource).toMatch(/const currentLocale = Astro\.locals\.locale \|\| 'en'/);
    });

    it('should read current path from Astro.url', () => {
      expect(componentSource).toContain('Astro.url.pathname');
      expect(componentSource).toMatch(/const currentPath = Astro\.url\.pathname/);
    });

    it('should have getCleanPath function to remove locale prefix', () => {
      expect(componentSource).toContain('function getCleanPath(pathname: string): string');
      expect(componentSource).toContain('for (const locale of LOCALES)');
      expect(componentSource).toContain('pathname.startsWith(`/${locale}/`)');
    });

    it('should generate localeUrls for both English and Spanish', () => {
      expect(componentSource).toContain('const localeUrls: Record<Locale, string>');
      expect(componentSource).toContain("en: cleanPath || '/'");
      expect(componentSource).toContain('es: `/es${cleanPath || \'/\'}`');
    });

    it('should define language configuration with flags and names', () => {
      expect(componentSource).toContain('const languages = [');
      expect(componentSource).toContain("code: 'en' as Locale");
      expect(componentSource).toContain("code: 'es' as Locale");
      expect(componentSource).toContain('flag:');
      expect(componentSource).toContain('nativeName:');
    });

    it('should filter current language to show only other languages in dropdown', () => {
      expect(componentSource).toContain('const otherLanguages = languages.filter(lang => lang.code !== currentLocale)');
    });
  });

  describe('Toggle Button Rendering', () => {
    it('should render toggle button with proper structure', () => {
      expect(componentSource).toContain('<button');
      expect(componentSource).toContain('type="button"');
      expect(componentSource).toContain('data-toggle="language-dropdown"');
    });

    it('should have ARIA attributes for accessibility', () => {
      expect(componentSource).toContain('aria-label="Change language"');
      expect(componentSource).toContain('aria-haspopup="true"');
      expect(componentSource).toContain('aria-expanded="false"');
    });

    it('should display current language flag', () => {
      expect(componentSource).toContain('{currentLanguage.flag}');
      expect(componentSource).toContain('aria-hidden="true"');
    });

    it('should display current language code (uppercase)', () => {
      expect(componentSource).toContain('{currentLanguage.code.toUpperCase()}');
    });

    it('should have chevron icon that rotates when open', () => {
      expect(componentSource).toContain('<svg');
      expect(componentSource).toContain('viewBox="0 0 24 24"');
      expect(componentSource).toContain('d="M19 9l-7 7-7-7"'); // Chevron down path
    });

    it('should use Tailwind CSS for button styling', () => {
      expect(componentSource).toMatch(/class="[^"]*flex items-center gap-xs/);
      expect(componentSource).toMatch(/rounded-md border border-border/);
      expect(componentSource).toMatch(/hover:bg-surface/);
      expect(componentSource).toMatch(/focus:ring-2 focus:ring-primary/);
    });
  });

  describe('Dropdown Menu Rendering', () => {
    it('should render dropdown menu with proper role', () => {
      expect(componentSource).toContain('<div');
      expect(componentSource).toContain('role="menu"');
      expect(componentSource).toContain('data-dropdown="language-menu"');
    });

    it('should have dropdown menu hidden by default', () => {
      expect(componentSource).toMatch(/class="[^"]*hidden/);
    });

    it('should position dropdown absolutely below toggle', () => {
      expect(componentSource).toMatch(/absolute right-0 top-\[calc\(100%\+0\.25rem\)\]/);
    });

    it('should have high z-index for proper layering', () => {
      expect(componentSource).toMatch(/z-50/);
    });

    it('should render language options with flags and names', () => {
      expect(componentSource).toContain('{otherLanguages.map((lang, index) => (');
      expect(componentSource).toContain('<a');
      expect(componentSource).toContain('href={localeUrls[lang.code]}');
      expect(componentSource).toContain('{lang.flag}');
      expect(componentSource).toContain('{lang.nativeName}');
      expect(componentSource).toContain('{lang.name}');
    });

    it('should have role menuitem for each option', () => {
      expect(componentSource).toContain('role="menuitem"');
    });

    it('should set tabindex for keyboard navigation', () => {
      expect(componentSource).toContain('tabindex={index === 0 ? 0 : -1}');
    });

    it('should include data attributes for JavaScript interaction', () => {
      expect(componentSource).toContain('data-locale={lang.code}');
      expect(componentSource).toContain('data-language-option');
    });

    it('should use Tailwind CSS for dropdown styling', () => {
      expect(componentSource).toMatch(/rounded-lg border border-border bg-background shadow-lg/);
      expect(componentSource).toMatch(/hover:bg-surface hover:text-primary/);
    });
  });

  describe('CSS Styles', () => {
    it('should have dropdown animation styles', () => {
      expect(componentSource).toContain('.dropdown-menu {');
      expect(componentSource).toContain('opacity: 0;');
      expect(componentSource).toContain('transform: translateY(-8px);');
      expect(componentSource).toContain('transition: opacity 0.2s ease, transform 0.2s ease;');
      expect(componentSource).toContain('pointer-events: none;');
    });

    it('should have show state styles', () => {
      expect(componentSource).toContain('.dropdown-menu.show {');
      expect(componentSource).toContain('display: block;');
      expect(componentSource).toContain('opacity: 1;');
      expect(componentSource).toContain('transform: translateY(0);');
      expect(componentSource).toContain('pointer-events: auto;');
    });

    it('should rotate chevron when dropdown is open', () => {
      expect(componentSource).toContain('[aria-expanded="true"] svg {');
      expect(componentSource).toContain('transform: rotate(180deg);');
    });

    it('should have mobile responsive styles', () => {
      expect(componentSource).toContain('@media (max-width: 640px)');
    });
  });

  describe('JavaScript Functionality', () => {
    it('should have initLanguageSwitcher function', () => {
      expect(componentSource).toContain('function initLanguageSwitcher()');
    });

    it('should query DOM elements on init', () => {
      expect(componentSource).toContain("querySelector('[data-component=\"language-switcher\"]')");
      expect(componentSource).toContain("querySelector('[data-toggle=\"language-dropdown\"]')");
      expect(componentSource).toContain("querySelector('[data-dropdown=\"language-menu\"]')");
      expect(componentSource).toContain("querySelectorAll('[data-language-option]')");
    });

    it('should have open function that shows dropdown', () => {
      expect(componentSource).toContain('function open()');
      expect(componentSource).toContain("dropdown.classList.add('show')");
      expect(componentSource).toContain("toggle.setAttribute('aria-expanded', 'true')");
    });

    it('should focus first option when opening', () => {
      expect(componentSource).toMatch(/options\[0\]\.focus\(\)/);
    });

    it('should have close function that hides dropdown', () => {
      expect(componentSource).toContain('function close()');
      expect(componentSource).toContain("dropdown.classList.remove('show')");
      expect(componentSource).toContain("toggle.setAttribute('aria-expanded', 'false')");
    });

    it('should return focus to toggle when closing', () => {
      expect(componentSource).toMatch(/toggle\.focus\(\)/);
    });

    it('should have toggleDropdown function', () => {
      expect(componentSource).toContain('function toggleDropdown(event: Event)');
      expect(componentSource).toContain('event.preventDefault()');
      expect(componentSource).toContain('event.stopPropagation()');
    });

    it('should have selectLanguage function that sets cookie', () => {
      expect(componentSource).toContain('function selectLanguage(event: MouseEvent, locale: string, url: string)');
      expect(componentSource).toContain("document.cookie = `locale=${locale}; path=/; max-age=31536000; samesite=lax`");
      expect(componentSource).toContain('window.location.href = url');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have handleKeyDown function', () => {
      expect(componentSource).toContain('function handleKeyDown(event: KeyboardEvent)');
    });

    it('should handle Enter and Space to open dropdown', () => {
      expect(componentSource).toContain("event.key === 'Enter'");
      expect(componentSource).toContain("event.key === ' '");
    });

    it('should handle Escape to close dropdown', () => {
      expect(componentSource).toContain("case 'Escape':");
      expect(componentSource).toMatch(/close\(\)/);
    });

    it('should handle ArrowDown to navigate options', () => {
      expect(componentSource).toContain("case 'ArrowDown':");
      expect(componentSource).toContain('currentFocusIndex = Math.min(currentFocusIndex + 1, options.length - 1)');
    });

    it('should handle ArrowUp to navigate options', () => {
      expect(componentSource).toContain("case 'ArrowUp':");
      expect(componentSource).toContain('currentFocusIndex = Math.max(currentFocusIndex - 1, 0)');
    });

    it('should handle Home key to jump to first option', () => {
      expect(componentSource).toContain("case 'Home':");
      expect(componentSource).toContain('currentFocusIndex = 0');
    });

    it('should handle End key to jump to last option', () => {
      expect(componentSource).toContain("case 'End':");
      expect(componentSource).toContain('currentFocusIndex = options.length - 1');
    });

    it('should select language on Enter/Space in dropdown', () => {
      expect(componentSource).toContain("case 'Enter':");
      expect(componentSource).toContain("case ' ':");
      expect(componentSource).toContain('selectLanguage(event as any, locale, url)');
    });
  });

  describe('Click Outside to Close', () => {
    it('should have handleClickOutside function', () => {
      expect(componentSource).toContain('function handleClickOutside(event: MouseEvent)');
    });

    it('should close dropdown when clicking outside', () => {
      expect(componentSource).toContain('!switcher.contains(event.target as Node)');
      expect(componentSource).toMatch(/close\(\)/);
    });

    it('should add click outside listener', () => {
      expect(componentSource).toContain("document.addEventListener('click', handleClickOutside)");
    });

    it('should cleanup listeners on navigation', () => {
      expect(componentSource).toContain("document.addEventListener('astro:before-preparation'");
      expect(componentSource).toContain("document.removeEventListener('click', handleClickOutside)");
    });
  });

  describe('Event Listeners', () => {
    it('should attach click listener to toggle button', () => {
      expect(componentSource).toContain("toggle.addEventListener('click', toggleDropdown)");
    });

    it('should attach keydown listeners for keyboard navigation', () => {
      expect(componentSource).toContain("toggle.addEventListener('keydown', handleKeyDown)");
      expect(componentSource).toContain("dropdown.addEventListener('keydown', handleKeyDown)");
    });

    it('should attach click listeners to language options', () => {
      expect(componentSource).toContain('options.forEach(option =>');
      expect(componentSource).toContain("option.addEventListener('click'");
    });
  });

  describe('Initialization', () => {
    it('should initialize on DOM ready', () => {
      expect(componentSource).toContain("if (document.readyState === 'loading')");
      expect(componentSource).toContain("document.addEventListener('DOMContentLoaded', initLanguageSwitcher)");
    });

    it('should initialize immediately if DOM already loaded', () => {
      expect(componentSource).toContain('initLanguageSwitcher()');
    });

    it('should reinitialize on Astro page transitions', () => {
      expect(componentSource).toContain("document.addEventListener('astro:page-load', initLanguageSwitcher)");
    });
  });

  describe('URL Generation Logic', () => {
    it('should generate English URL by removing locale prefix', () => {
      // English URL should be clean path (no /en prefix)
      expect(componentSource).toContain("en: cleanPath || '/'");
    });

    it('should generate Spanish URL by adding /es prefix', () => {
      expect(componentSource).toContain('es: `/es${cleanPath || \'/\'}`');
    });

    it('should handle root path correctly', () => {
      // Root path should be "/" for English, "/es" for Spanish
      expect(componentSource).toContain("cleanPath || '/'");
    });

    it('should strip locale prefix in getCleanPath', () => {
      expect(componentSource).toContain('pathname.substring(3)'); // Remove '/es/'
      expect(componentSource).toContain("return '/'"); // Root case
    });
  });

  describe('Cookie Integration', () => {
    it('should set locale cookie with proper configuration', () => {
      const cookiePattern = /document\.cookie = `locale=\$\{locale\}; path=\/; max-age=31536000; samesite=lax`/;
      expect(componentSource).toMatch(cookiePattern);
    });

    it('should use 1-year max-age (31536000 seconds)', () => {
      expect(componentSource).toContain('max-age=31536000');
    });

    it('should set cookie path to root', () => {
      expect(componentSource).toContain('path=/');
    });

    it('should use samesite=lax for CSRF protection', () => {
      expect(componentSource).toContain('samesite=lax');
    });
  });

  describe('Accessibility (ARIA)', () => {
    it('should have proper button role and label', () => {
      expect(componentSource).toContain('type="button"');
      expect(componentSource).toContain('aria-label="Change language"');
    });

    it('should indicate dropdown with aria-haspopup', () => {
      expect(componentSource).toContain('aria-haspopup="true"');
    });

    it('should manage aria-expanded state', () => {
      expect(componentSource).toContain('aria-expanded="false"');
      expect(componentSource).toContain("toggle.setAttribute('aria-expanded', 'true')");
      expect(componentSource).toContain("toggle.setAttribute('aria-expanded', 'false')");
    });

    it('should have role menu for dropdown', () => {
      expect(componentSource).toContain('role="menu"');
      expect(componentSource).toContain('aria-label="Language options"');
    });

    it('should have role menuitem for options', () => {
      expect(componentSource).toContain('role="menuitem"');
    });

    it('should hide decorative elements from screen readers', () => {
      expect(componentSource).toContain('aria-hidden="true"');
    });

    it('should manage tabindex for keyboard navigation', () => {
      expect(componentSource).toContain('tabindex={index === 0 ? 0 : -1}');
    });
  });

  describe('Responsive Design', () => {
    it('should hide language code on small screens', () => {
      expect(componentSource).toContain('class="hidden sm:inline"');
    });

    it('should have mobile-specific styles', () => {
      expect(componentSource).toContain('@media (max-width: 640px)');
    });

    it('should adjust dropdown width on mobile', () => {
      expect(componentSource).toMatch(/min-width: 150px/);
    });
  });

  describe('TypeScript Type Safety', () => {
    it('should import Locale type from i18n', () => {
      expect(componentSource).toContain('type Locale');
    });

    it('should type localeUrls as Record<Locale, string>', () => {
      expect(componentSource).toContain('const localeUrls: Record<Locale, string>');
    });

    it('should type language code as Locale', () => {
      expect(componentSource).toContain("code: 'en' as Locale");
      expect(componentSource).toContain("code: 'es' as Locale");
    });

    it('should type event handlers properly', () => {
      expect(componentSource).toContain('event: Event');
      expect(componentSource).toContain('event: MouseEvent');
      expect(componentSource).toContain('event: KeyboardEvent');
    });
  });

  describe('Integration with T125 i18n', () => {
    it('should import from i18n module', () => {
      expect(componentSource).toContain("from '../i18n'");
    });

    it('should use LOCALES constant', () => {
      expect(componentSource).toContain('LOCALES');
    });

    it('should use LOCALE_NAMES constant', () => {
      expect(componentSource).toContain('LOCALE_NAMES');
    });

    it('should use Locale type', () => {
      expect(componentSource).toContain('type Locale');
    });
  });

  describe('Integration with T163 Middleware', () => {
    it('should read locale from Astro.locals', () => {
      expect(componentSource).toContain('Astro.locals.locale');
    });

    it('should set cookie that middleware will read', () => {
      expect(componentSource).toContain("document.cookie = `locale=${locale}");
    });

    it('should use same cookie name as middleware', () => {
      expect(componentSource).toContain('locale=');
    });

    it('should match middleware cookie configuration', () => {
      expect(componentSource).toContain('path=/');
      expect(componentSource).toContain('max-age=31536000');
      expect(componentSource).toContain('samesite=lax');
    });
  });

  describe('Component Documentation', () => {
    it('should have comprehensive JSDoc comments', () => {
      expect(componentSource).toContain('/**');
      expect(componentSource).toContain('* LanguageSwitcher Component');
    });

    it('should document features', () => {
      expect(componentSource).toContain('Features:');
    });

    it('should document integration points', () => {
      expect(componentSource).toContain('Integration:');
    });

    it('should document JavaScript behavior', () => {
      expect(componentSource).toContain('Handles:');
    });
  });

  describe('Error Handling', () => {
    it('should check if component exists before initialization', () => {
      expect(componentSource).toContain('if (!switcher) return');
    });

    it('should check if toggle and dropdown exist', () => {
      expect(componentSource).toContain('if (!toggle || !dropdown) return');
    });

    it('should prevent default events', () => {
      expect(componentSource).toContain('event.preventDefault()');
    });

    it('should stop event propagation for toggle', () => {
      expect(componentSource).toContain('event.stopPropagation()');
    });
  });
});
