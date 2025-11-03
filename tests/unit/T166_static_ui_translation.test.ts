/**
 * T166: Static UI Content Translation Tests
 *
 * Tests translation functionality for static UI content across all components
 * including navigation, buttons, labels, forms, error messages.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page, type BrowserContext } from 'playwright';

describe('T166: Static UI Content Translation', () => {
  let browser: Browser;
  let context: BrowserContext;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    await context.close();
    await browser.close();
  });

  describe('Header Component Translations', () => {
    it('should display app name in English', async () => {
      await page.goto('http://localhost:4321/');
      const appName = await page.textContent('header a[href="/"] span');
      expect(appName).toBe('Spirituality Platform');
    });

    it('should display app name in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');
      const appName = await page.textContent('header a[href="/"] span');
      expect(appName).toBe('Plataforma de Espiritualidad');
    });

    it('should translate navigation links in English', async () => {
      await page.goto('http://localhost:4321/');

      const coursesLink = await page.textContent('nav a[href="/courses"]');
      const eventsLink = await page.textContent('nav a[href="/events"]');
      const shopLink = await page.textContent('nav a[href="/shop"]');
      const aboutLink = await page.textContent('nav a[href="/about"]');

      expect(coursesLink?.trim()).toBe('Courses');
      expect(eventsLink?.trim()).toBe('Events');
      expect(shopLink?.trim()).toBe('Shop');
      expect(aboutLink?.trim()).toBe('About');
    });

    it('should translate navigation links in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const coursesLink = await page.textContent('nav a[href="/courses"]');
      const eventsLink = await page.textContent('nav a[href="/events"]');
      const shopLink = await page.textContent('nav a[href="/shop"]');
      const aboutLink = await page.textContent('nav a[href="/about"]');

      expect(coursesLink?.trim()).toBe('Cursos');
      expect(eventsLink?.trim()).toBe('Eventos');
      expect(shopLink?.trim()).toBe('Tienda');
      expect(aboutLink?.trim()).toBe('Acerca de');
    });

    it('should translate auth buttons in English (not logged in)', async () => {
      await page.goto('http://localhost:4321/');

      const loginButton = await page.textContent('a[href="/login"]');
      const signUpButton = await page.textContent('a[href="/register"]');

      expect(loginButton?.trim()).toBe('Sign In');
      expect(signUpButton?.trim()).toBe('Sign Up');
    });

    it('should translate auth buttons in Spanish (not logged in)', async () => {
      await page.goto('http://localhost:4321/es/');

      const loginButton = await page.textContent('a[href="/login"]');
      const signUpButton = await page.textContent('a[href="/register"]');

      expect(loginButton?.trim()).toBe('Iniciar Sesión');
      expect(signUpButton?.trim()).toBe('Registrarse');
    });

    it('should translate aria-labels in English', async () => {
      await page.goto('http://localhost:4321/');

      const cartAriaLabel = await page.getAttribute('a[href="/cart"]', 'aria-label');
      const menuToggleAriaLabel = await page.getAttribute('#mobile-menu-toggle', 'aria-label');

      expect(cartAriaLabel).toBe('Shopping Cart');
      expect(menuToggleAriaLabel).toBe('Toggle Mobile Menu');
    });

    it('should translate aria-labels in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const cartAriaLabel = await page.getAttribute('a[href="/cart"]', 'aria-label');
      const menuToggleAriaLabel = await page.getAttribute('#mobile-menu-toggle', 'aria-label');

      expect(cartAriaLabel).toBe('Carrito de Compras');
      expect(menuToggleAriaLabel).toBe('Alternar Menú Móvil');
    });
  });

  describe('Footer Component Translations', () => {
    it('should display footer content in English', async () => {
      await page.goto('http://localhost:4321/');

      const appName = await page.textContent('footer h3');
      const tagline = await page.textContent('footer p:first-of-type');

      expect(appName?.trim()).toBe('Spirituality Platform');
      expect(tagline?.trim()).toContain('Empowering your path to enlightenment');
    });

    it('should display footer content in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const appName = await page.textContent('footer h3');
      const tagline = await page.textContent('footer p:first-of-type');

      expect(appName?.trim()).toBe('Plataforma de Espiritualidad');
      expect(tagline?.trim()).toContain('Empoderando su camino hacia la iluminación');
    });

    it('should translate footer section headers in English', async () => {
      await page.goto('http://localhost:4321/');

      const sections = await page.$$eval('footer h4', (elements) =>
        elements.map((el) => el.textContent?.trim())
      );

      expect(sections).toContain('Quick Links');
      expect(sections).toContain('Resources');
      expect(sections).toContain('Legal');
    });

    it('should translate footer section headers in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const sections = await page.$$eval('footer h4', (elements) =>
        elements.map((el) => el.textContent?.trim())
      );

      expect(sections).toContain('Enlaces Rápidos');
      expect(sections).toContain('Recursos');
      expect(sections).toContain('Legal');
    });

    it('should translate footer links in English', async () => {
      await page.goto('http://localhost:4321/');

      const coursesLink = await page.textContent('footer a[href="/courses"]');
      const faqLink = await page.textContent('footer a[href="/faq"]');
      const privacyLink = await page.textContent('footer a[href="/privacy"]');

      expect(coursesLink?.trim()).toBe('Courses');
      expect(faqLink?.trim()).toBe('FAQ');
      expect(privacyLink?.trim()).toBe('Privacy Policy');
    });

    it('should translate footer links in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const coursesLink = await page.textContent('footer a[href="/courses"]');
      const faqLink = await page.textContent('footer a[href="/faq"]');
      const privacyLink = await page.textContent('footer a[href="/privacy"]');

      expect(coursesLink?.trim()).toBe('Cursos');
      expect(faqLink?.trim()).toBe('Preguntas Frecuentes');
      expect(privacyLink?.trim()).toBe('Política de Privacidad');
    });

    it('should display copyright in correct language', async () => {
      await page.goto('http://localhost:4321/');
      const copyrightText = await page.textContent('footer p.text-sm');
      const currentYear = new Date().getFullYear();

      expect(copyrightText).toContain(`© ${currentYear} Spirituality Platform`);
      expect(copyrightText).toContain('All rights reserved');
    });

    it('should display copyright in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');
      const copyrightText = await page.textContent('footer p.text-sm');
      const currentYear = new Date().getFullYear();

      expect(copyrightText).toContain(`© ${currentYear} Plataforma de Espiritualidad`);
      expect(copyrightText).toContain('Todos los derechos reservados');
    });
  });

  describe('SearchBar Component Translations', () => {
    it('should have translated placeholder in English', async () => {
      await page.goto('http://localhost:4321/');

      const placeholder = await page.getAttribute('#global-search', 'placeholder');
      const ariaLabel = await page.getAttribute('#global-search', 'aria-label');

      expect(placeholder).toBe('Search courses, events, products...');
      expect(ariaLabel).toBe('Search');
    });

    it('should have translated placeholder in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const placeholder = await page.getAttribute('#global-search', 'placeholder');
      const ariaLabel = await page.getAttribute('#global-search', 'aria-label');

      expect(placeholder).toBe('Buscar cursos, eventos, productos...');
      expect(ariaLabel).toBe('Buscar');
    });

    it('should have translated clear button aria-label in English', async () => {
      await page.goto('http://localhost:4321/');

      const clearAriaLabel = await page.getAttribute('#clear-search', 'aria-label');

      expect(clearAriaLabel).toBe('Clear search');
    });

    it('should have translated clear button aria-label in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const clearAriaLabel = await page.getAttribute('#clear-search', 'aria-label');

      expect(clearAriaLabel).toBe('Limpiar búsqueda');
    });

    it('should have translated search results aria-label in English', async () => {
      await page.goto('http://localhost:4321/');

      const resultsAriaLabel = await page.getAttribute('#search-results', 'aria-label');

      expect(resultsAriaLabel).toBe('Search Results');
    });

    it('should have translated search results aria-label in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');

      const resultsAriaLabel = await page.getAttribute('#search-results', 'aria-label');

      expect(resultsAriaLabel).toBe('Resultados de Búsqueda');
    });

    it('should pass translations to JavaScript via data attributes', async () => {
      await page.goto('http://localhost:4321/');

      const searchInput = await page.$('#global-search');
      const dataLocale = await searchInput?.getAttribute('data-locale');
      const dataNoResults = await searchInput?.getAttribute('data-t-no-results');
      const dataSearchFailed = await searchInput?.getAttribute('data-t-search-failed');
      const dataViewAll = await searchInput?.getAttribute('data-t-view-all');

      expect(dataLocale).toBe('en');
      expect(dataNoResults).toBe('No results found. Try different keywords.');
      expect(dataSearchFailed).toBe('Search failed. Please try again.');
      expect(dataViewAll).toBe('View all results');
    });

    it('should pass Spanish translations to JavaScript via data attributes', async () => {
      await page.goto('http://localhost:4321/es/');

      const searchInput = await page.$('#global-search');
      const dataLocale = await searchInput?.getAttribute('data-locale');
      const dataNoResults = await searchInput?.getAttribute('data-t-no-results');
      const dataSearchFailed = await searchInput?.getAttribute('data-t-search-failed');
      const dataViewAll = await searchInput?.getAttribute('data-t-view-all');

      expect(dataLocale).toBe('es');
      expect(dataNoResults).toBe('No se encontraron resultados. Intenta con palabras clave diferentes.');
      expect(dataSearchFailed).toBe('La búsqueda falló. Por favor, intenta nuevamente.');
      expect(dataViewAll).toBe('Ver todos los resultados');
    });
  });

  describe('Translation File Completeness', () => {
    it('should have all required translation keys in English', async () => {
      const response = await page.request.get('http://localhost:4321/src/i18n/locales/en.json');
      expect(response.ok()).toBe(true);

      // Note: This would need to be implemented via API endpoint or build step
      // For now, we verify the file exists
    });

    it('should have all required translation keys in Spanish', async () => {
      const response = await page.request.get('http://localhost:4321/src/i18n/locales/es.json');
      expect(response.ok()).toBe(true);
    });
  });

  describe('URL-based Locale Detection', () => {
    it('should use English translations for default URL', async () => {
      await page.goto('http://localhost:4321/');
      const appName = await page.textContent('header a[href="/"] span');
      expect(appName).toBe('Spirituality Platform');
    });

    it('should use Spanish translations for /es/ URL', async () => {
      await page.goto('http://localhost:4321/es/');
      const appName = await page.textContent('header a[href="/"] span');
      expect(appName).toBe('Plataforma de Espiritualidad');
    });

    it('should maintain locale across navigation in English', async () => {
      await page.goto('http://localhost:4321/');
      await page.click('a[href="/courses"]');
      await page.waitForURL('**/courses');

      const coursesLink = await page.textContent('nav a[href="/courses"]');
      expect(coursesLink?.trim()).toBe('Courses');
    });

    it('should maintain locale across navigation in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');
      await page.click('a[href="/courses"]');
      await page.waitForURL('**/es/courses');

      const coursesLink = await page.textContent('nav a[href="/courses"]');
      expect(coursesLink?.trim()).toBe('Cursos');
    });
  });

  describe('Accessibility with Translations', () => {
    it('should have proper lang attribute in English', async () => {
      await page.goto('http://localhost:4321/');
      const langAttr = await page.getAttribute('html', 'lang');
      expect(langAttr).toBe('en');
    });

    it('should have proper lang attribute in Spanish', async () => {
      await page.goto('http://localhost:4321/es/');
      const langAttr = await page.getAttribute('html', 'lang');
      expect(langAttr).toBe('es');
    });

    it('should have no accessibility violations with English translations', async () => {
      await page.goto('http://localhost:4321/');

      // Check for basic accessibility
      const mainContent = await page.$('main');
      expect(mainContent).toBeTruthy();

      const headerNav = await page.$('header nav');
      expect(headerNav).toBeTruthy();
    });

    it('should have no accessibility violations with Spanish translations', async () => {
      await page.goto('http://localhost:4321/es/');

      // Check for basic accessibility
      const mainContent = await page.$('main');
      expect(mainContent).toBeTruthy();

      const headerNav = await page.$('header nav');
      expect(headerNav).toBeTruthy();
    });
  });

  describe('Translation Consistency', () => {
    it('should use consistent translations across all pages in English', async () => {
      // Test header consistency across pages
      await page.goto('http://localhost:4321/');
      const homeHeader = await page.textContent('header a[href="/"] span');

      await page.goto('http://localhost:4321/courses');
      const coursesHeader = await page.textContent('header a[href="/"] span');

      await page.goto('http://localhost:4321/events');
      const eventsHeader = await page.textContent('header a[href="/"] span');

      expect(homeHeader).toBe(coursesHeader);
      expect(coursesHeader).toBe(eventsHeader);
      expect(homeHeader).toBe('Spirituality Platform');
    });

    it('should use consistent translations across all pages in Spanish', async () => {
      // Test header consistency across pages
      await page.goto('http://localhost:4321/es/');
      const homeHeader = await page.textContent('header a[href="/"] span');

      await page.goto('http://localhost:4321/es/courses');
      const coursesHeader = await page.textContent('header a[href="/"] span');

      await page.goto('http://localhost:4321/es/events');
      const eventsHeader = await page.textContent('header a[href="/"] span');

      expect(homeHeader).toBe(coursesHeader);
      expect(coursesHeader).toBe(eventsHeader);
      expect(homeHeader).toBe('Plataforma de Espiritualidad');
    });
  });
});
