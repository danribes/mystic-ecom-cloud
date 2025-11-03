/**
 * T126: WCAG 2.1 AA Accessibility Tests
 *
 * Tests for accessibility utility functions, ARIA helpers,
 * keyboard navigation, focus management, and color contrast.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  // ARIA helpers
  getAriaButton,
  getAriaLink,
  getAriaInput,
  getAriaNavigation,
  getAriaDialog,
  getAriaProgressBar,
  getAriaList,
  getAriaListItem,
  getAriaTabPanel,
  getAriaTab,

  // Constants
  ARIA_ROLES,
  ARIA_STATES,
  ARIA_PROPERTIES,
  KEYS,
  LIVE_REGION_POLITENESS,
  SR_ONLY_CLASS,

  // Focus management
  getFocusableElements,

  // Color contrast
  getRelativeLuminance,
  getContrastRatio,
  meetsWCAGAA,
  meetsWCAGAAA,

  // Form helpers
  getAccessibleFieldProps,

  // Heading helpers
  getHeadingLevel,

  // Visibility helpers
  shouldHideFromAT,

  // Skip link helpers
  getSkipLink,
} from '../../src/lib/accessibility';

describe('T126: WCAG 2.1 AA Accessibility', () => {
  describe('Constants', () => {
    it('should have ARIA roles defined', () => {
      expect(ARIA_ROLES.BUTTON).toBe('button');
      expect(ARIA_ROLES.NAVIGATION).toBe('navigation');
      expect(ARIA_ROLES.DIALOG).toBe('dialog');
      expect(ARIA_ROLES.ALERT).toBe('alert');
      expect(ARIA_ROLES.MAIN).toBe('main');
    });

    it('should have ARIA states defined', () => {
      expect(ARIA_STATES.EXPANDED).toBe('aria-expanded');
      expect(ARIA_STATES.PRESSED).toBe('aria-pressed');
      expect(ARIA_STATES.SELECTED).toBe('aria-selected');
      expect(ARIA_STATES.HIDDEN).toBe('aria-hidden');
    });

    it('should have ARIA properties defined', () => {
      expect(ARIA_PROPERTIES.LABEL).toBe('aria-label');
      expect(ARIA_PROPERTIES.LABELLEDBY).toBe('aria-labelledby');
      expect(ARIA_PROPERTIES.DESCRIBEDBY).toBe('aria-describedby');
    });

    it('should have keyboard keys defined', () => {
      expect(KEYS.ENTER).toBe('Enter');
      expect(KEYS.SPACE).toBe(' ');
      expect(KEYS.ESCAPE).toBe('Escape');
      expect(KEYS.TAB).toBe('Tab');
      expect(KEYS.ARROW_UP).toBe('ArrowUp');
    });

    it('should have live region politeness levels', () => {
      expect(LIVE_REGION_POLITENESS.OFF).toBe('off');
      expect(LIVE_REGION_POLITENESS.POLITE).toBe('polite');
      expect(LIVE_REGION_POLITENESS.ASSERTIVE).toBe('assertive');
    });

    it('should have SR_ONLY_CLASS constant', () => {
      expect(SR_ONLY_CLASS).toBe('sr-only');
    });
  });

  describe('getAriaButton()', () => {
    it('should return basic button ARIA attributes', () => {
      const attrs = getAriaButton('Submit');
      expect(attrs.role).toBe('button');
      expect(attrs['aria-label']).toBe('Submit');
    });

    it('should include pressed state when provided', () => {
      const attrs = getAriaButton('Toggle', { pressed: true });
      expect(attrs['aria-pressed']).toBe('true');
    });

    it('should include expanded state when provided', () => {
      const attrs = getAriaButton('Menu', { expanded: false });
      expect(attrs['aria-expanded']).toBe('false');
    });

    it('should include controls when provided', () => {
      const attrs = getAriaButton('Toggle Menu', { controls: 'menu-panel' });
      expect(attrs['aria-controls']).toBe('menu-panel');
    });

    it('should include disabled state when provided', () => {
      const attrs = getAriaButton('Submit', { disabled: true });
      expect(attrs['aria-disabled']).toBe('true');
    });

    it('should handle multiple options', () => {
      const attrs = getAriaButton('Expand', {
        expanded: true,
        controls: 'content',
        disabled: false,
      });
      expect(attrs['aria-expanded']).toBe('true');
      expect(attrs['aria-controls']).toBe('content');
      expect(attrs['aria-disabled']).toBeUndefined();
    });
  });

  describe('getAriaLink()', () => {
    it('should return basic link ARIA attributes', () => {
      const attrs = getAriaLink('Go to homepage');
      expect(attrs['aria-label']).toBe('Go to homepage');
    });

    it('should include current page indicator', () => {
      const attrs = getAriaLink('Home', { current: 'page' });
      expect(attrs['aria-current']).toBe('page');
    });

    it('should handle boolean current value', () => {
      const attrs = getAriaLink('Current Page', { current: true });
      expect(attrs['aria-current']).toBe('page');
    });

    it('should include described by', () => {
      const attrs = getAriaLink('Info', { describedBy: 'help-text' });
      expect(attrs['aria-describedby']).toBe('help-text');
    });
  });

  describe('getAriaInput()', () => {
    it('should return basic input ARIA attributes', () => {
      const attrs = getAriaInput('Email address');
      expect(attrs['aria-label']).toBe('Email address');
    });

    it('should include required attribute', () => {
      const attrs = getAriaInput('Password', { required: true });
      expect(attrs['aria-required']).toBe('true');
    });

    it('should include invalid state', () => {
      const attrs = getAriaInput('Email', { invalid: true });
      expect(attrs['aria-invalid']).toBe('true');
    });

    it('should include described by', () => {
      const attrs = getAriaInput('Username', { describedBy: 'username-help' });
      expect(attrs['aria-describedby']).toBe('username-help');
    });

    it('should include error message', () => {
      const attrs = getAriaInput('Email', { errorMessage: 'email-error' });
      expect(attrs['aria-errormessage']).toBe('email-error');
    });

    it('should handle multiple attributes', () => {
      const attrs = getAriaInput('Password', {
        required: true,
        invalid: true,
        errorMessage: 'password-error',
        describedBy: 'password-help',
      });
      expect(attrs['aria-required']).toBe('true');
      expect(attrs['aria-invalid']).toBe('true');
      expect(attrs['aria-errormessage']).toBe('password-error');
      expect(attrs['aria-describedby']).toBe('password-help');
    });
  });

  describe('getAriaNavigation()', () => {
    it('should return navigation ARIA attributes', () => {
      const attrs = getAriaNavigation('Main navigation');
      expect(attrs.role).toBe('navigation');
      expect(attrs['aria-label']).toBe('Main navigation');
    });
  });

  describe('getAriaDialog()', () => {
    it('should return dialog ARIA attributes', () => {
      const attrs = getAriaDialog('dialog-title');
      expect(attrs.role).toBe('dialog');
      expect(attrs['aria-modal']).toBe('true');
      expect(attrs['aria-labelledby']).toBe('dialog-title');
    });

    it('should include described by when provided', () => {
      const attrs = getAriaDialog('dialog-title', 'dialog-description');
      expect(attrs['aria-describedby']).toBe('dialog-description');
    });
  });

  describe('getAriaProgressBar()', () => {
    it('should return progress bar ARIA attributes', () => {
      const attrs = getAriaProgressBar('Loading', 50);
      expect(attrs.role).toBe('progressbar');
      expect(attrs['aria-label']).toBe('Loading');
      expect(attrs['aria-valuenow']).toBe('50');
      expect(attrs['aria-valuemin']).toBe('0');
      expect(attrs['aria-valuemax']).toBe('100');
    });

    it('should support custom min/max values', () => {
      const attrs = getAriaProgressBar('Volume', 75, { min: 0, max: 200 });
      expect(attrs['aria-valuenow']).toBe('75');
      expect(attrs['aria-valuemin']).toBe('0');
      expect(attrs['aria-valuemax']).toBe('200');
    });

    it('should include value text when provided', () => {
      const attrs = getAriaProgressBar('Progress', 50, { valueText: '50 percent' });
      expect(attrs['aria-valuetext']).toBe('50 percent');
    });
  });

  describe('getAriaList()', () => {
    it('should return list ARIA attributes', () => {
      const attrs = getAriaList();
      expect(attrs.role).toBe('list');
    });

    it('should include label when provided', () => {
      const attrs = getAriaList('Shopping items');
      expect(attrs['aria-label']).toBe('Shopping items');
    });

    it('should include item count when provided', () => {
      const attrs = getAriaList('Items', 5);
      expect(attrs['aria-setsize']).toBe('5');
    });
  });

  describe('getAriaListItem()', () => {
    it('should return list item ARIA attributes', () => {
      const attrs = getAriaListItem();
      expect(attrs.role).toBe('listitem');
    });

    it('should include position when provided', () => {
      const attrs = getAriaListItem(1);
      expect(attrs['aria-posinset']).toBe('1');
    });

    it('should include set size when provided', () => {
      const attrs = getAriaListItem(1, 10);
      expect(attrs['aria-posinset']).toBe('1');
      expect(attrs['aria-setsize']).toBe('10');
    });
  });

  describe('getAriaTabPanel()', () => {
    it('should return tab panel ARIA attributes', () => {
      const attrs = getAriaTabPanel('tab-1');
      expect(attrs.role).toBe('tabpanel');
      expect(attrs['aria-labelledby']).toBe('tab-1');
      expect(attrs.tabindex).toBe('0');
    });

    it('should handle hidden state', () => {
      const attrs = getAriaTabPanel('tab-2', true);
      expect(attrs['aria-hidden']).toBe('true');
      expect(attrs.tabindex).toBe('-1');
    });
  });

  describe('getAriaTab()', () => {
    it('should return tab ARIA attributes', () => {
      const attrs = getAriaTab('Settings');
      expect(attrs.role).toBe('tab');
      expect(attrs['aria-label']).toBe('Settings');
      expect(attrs['aria-selected']).toBe('false');
      expect(attrs.tabindex).toBe('-1');
    });

    it('should handle selected state', () => {
      const attrs = getAriaTab('Profile', { selected: true });
      expect(attrs['aria-selected']).toBe('true');
      expect(attrs.tabindex).toBe('0');
    });

    it('should include controls when provided', () => {
      const attrs = getAriaTab('Settings', { controls: 'settings-panel' });
      expect(attrs['aria-controls']).toBe('settings-panel');
    });
  });

  describe('getFocusableElements()', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      document.body.removeChild(container);
    });

    it('should find all focusable elements', () => {
      container.innerHTML = `
        <a href="/test">Link</a>
        <button>Button</button>
        <input type="text" />
        <textarea></textarea>
        <select></select>
        <div tabindex="0">Focusable div</div>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(6);
    });

    it('should exclude disabled elements', () => {
      container.innerHTML = `
        <button>Enabled</button>
        <button disabled>Disabled</button>
        <input type="text" />
        <input type="text" disabled />
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
    });

    it('should exclude elements with tabindex="-1"', () => {
      container.innerHTML = `
        <div tabindex="0">Focusable</div>
        <div tabindex="-1">Not focusable</div>
        <button>Button</button>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(2);
    });

    it('should return empty array when no focusable elements', () => {
      container.innerHTML = `
        <div>No focusable elements</div>
        <span>Just text</span>
      `;

      const focusable = getFocusableElements(container);
      expect(focusable).toHaveLength(0);
    });
  });

  describe('Color Contrast Utilities', () => {
    describe('getRelativeLuminance()', () => {
      it('should calculate luminance for white', () => {
        const luminance = getRelativeLuminance(255, 255, 255);
        expect(luminance).toBeCloseTo(1, 2);
      });

      it('should calculate luminance for black', () => {
        const luminance = getRelativeLuminance(0, 0, 0);
        expect(luminance).toBe(0);
      });

      it('should calculate luminance for gray', () => {
        const luminance = getRelativeLuminance(128, 128, 128);
        expect(luminance).toBeGreaterThan(0);
        expect(luminance).toBeLessThan(1);
      });
    });

    describe('getContrastRatio()', () => {
      it('should calculate contrast ratio for black and white', () => {
        const ratio = getContrastRatio(
          { r: 0, g: 0, b: 0 },
          { r: 255, g: 255, b: 255 }
        );
        expect(ratio).toBeCloseTo(21, 0); // Maximum ratio
      });

      it('should calculate contrast ratio for same colors', () => {
        const ratio = getContrastRatio(
          { r: 128, g: 128, b: 128 },
          { r: 128, g: 128, b: 128 }
        );
        expect(ratio).toBeCloseTo(1, 1); // Minimum ratio
      });

      it('should work regardless of color order', () => {
        const ratio1 = getContrastRatio(
          { r: 0, g: 0, b: 0 },
          { r: 255, g: 255, b: 255 }
        );
        const ratio2 = getContrastRatio(
          { r: 255, g: 255, b: 255 },
          { r: 0, g: 0, b: 0 }
        );
        expect(ratio1).toBe(ratio2);
      });
    });

    describe('meetsWCAGAA()', () => {
      it('should pass for high contrast ratios (normal text)', () => {
        expect(meetsWCAGAA(4.5)).toBe(true);
        expect(meetsWCAGAA(7)).toBe(true);
        expect(meetsWCAGAA(21)).toBe(true);
      });

      it('should fail for low contrast ratios (normal text)', () => {
        expect(meetsWCAGAA(4.4)).toBe(false);
        expect(meetsWCAGAA(3)).toBe(false);
        expect(meetsWCAGAA(1)).toBe(false);
      });

      it('should have lower threshold for large text', () => {
        expect(meetsWCAGAA(3, true)).toBe(true);
        expect(meetsWCAGAA(4.5, true)).toBe(true);
      });

      it('should fail for low contrast on large text', () => {
        expect(meetsWCAGAA(2.9, true)).toBe(false);
      });
    });

    describe('meetsWCAGAAA()', () => {
      it('should pass for very high contrast (normal text)', () => {
        expect(meetsWCAGAAA(7)).toBe(true);
        expect(meetsWCAGAAA(10)).toBe(true);
      });

      it('should fail for moderate contrast (normal text)', () => {
        expect(meetsWCAGAAA(6.9)).toBe(false);
        expect(meetsWCAGAAA(4.5)).toBe(false);
      });

      it('should have lower threshold for large text', () => {
        expect(meetsWCAGAAA(4.5, true)).toBe(true);
        expect(meetsWCAGAAA(7, true)).toBe(true);
      });
    });
  });

  describe('getAccessibleFieldProps()', () => {
    it('should return basic field props', () => {
      const props = getAccessibleFieldProps({
        id: 'email',
        name: 'email',
        label: 'Email address',
      });

      expect(props.input.id).toBe('email');
      expect(props.input.name).toBe('email');
      expect(props.input['aria-label']).toBe('Email address');
      expect(props.label.for).toBe('email');
    });

    it('should include required attribute', () => {
      const props = getAccessibleFieldProps({
        id: 'password',
        name: 'password',
        label: 'Password',
        required: true,
      });

      expect(props.input['aria-required']).toBe('true');
    });

    it('should include error state', () => {
      const props = getAccessibleFieldProps({
        id: 'email',
        name: 'email',
        label: 'Email',
        error: 'Invalid email',
      });

      expect(props.input['aria-invalid']).toBe('true');
      expect(props.error).toBeDefined();
      expect(props.error?.role).toBe('alert');
      expect(props.error?.['aria-live']).toBe('polite');
    });

    it('should include description', () => {
      const props = getAccessibleFieldProps({
        id: 'username',
        name: 'username',
        label: 'Username',
        description: 'Choose a unique username',
      });

      expect(props.input['aria-describedby']).toContain('username-description');
      expect(props.description).toBeDefined();
      expect(props.description?.id).toBe('username-description');
    });

    it('should combine describedby for description and error', () => {
      const props = getAccessibleFieldProps({
        id: 'password',
        name: 'password',
        label: 'Password',
        description: 'Must be at least 8 characters',
        error: 'Password too short',
      });

      expect(props.input['aria-describedby']).toBe('password-description password-error');
      expect(props.input['aria-errormessage']).toBe('password-error');
    });
  });

  describe('getHeadingLevel()', () => {
    it('should return valid heading levels', () => {
      expect(getHeadingLevel(1)).toBe(1);
      expect(getHeadingLevel(2)).toBe(2);
      expect(getHeadingLevel(3)).toBe(3);
      expect(getHeadingLevel(4)).toBe(4);
      expect(getHeadingLevel(5)).toBe(5);
      expect(getHeadingLevel(6)).toBe(6);
    });

    it('should clamp values below 1', () => {
      expect(getHeadingLevel(0)).toBe(1);
      expect(getHeadingLevel(-1)).toBe(1);
      expect(getHeadingLevel(-100)).toBe(1);
    });

    it('should clamp values above 6', () => {
      expect(getHeadingLevel(7)).toBe(6);
      expect(getHeadingLevel(10)).toBe(6);
      expect(getHeadingLevel(100)).toBe(6);
    });
  });

  describe('shouldHideFromAT()', () => {
    it('should hide decorative elements', () => {
      expect(shouldHideFromAT(true, false)).toBe(true);
    });

    it('should hide hidden elements', () => {
      expect(shouldHideFromAT(false, true)).toBe(true);
    });

    it('should hide decorative and hidden elements', () => {
      expect(shouldHideFromAT(true, true)).toBe(true);
    });

    it('should not hide normal elements', () => {
      expect(shouldHideFromAT(false, false)).toBe(false);
    });
  });

  describe('getSkipLink()', () => {
    it('should return skip link props with default label', () => {
      const props = getSkipLink('main-content');
      expect(props.href).toBe('#main-content');
      expect(props['aria-label']).toBe('Skip to main content');
      expect(props.className).toBe('skip-link');
    });

    it('should accept custom label', () => {
      const props = getSkipLink('search-form', 'Skip to search');
      expect(props.href).toBe('#search-form');
      expect(props['aria-label']).toBe('Skip to search');
    });
  });
});
