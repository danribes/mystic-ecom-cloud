/**
 * Accessibility Utilities (WCAG 2.1 AA Compliant)
 *
 * Provides utilities, constants, and helper functions for implementing
 * WCAG 2.1 Level AA accessibility standards across the platform.
 *
 * Features:
 * - ARIA attribute helpers
 * - Keyboard navigation utilities
 * - Focus management
 * - Screen reader announcements
 * - Color contrast validation
 * - Accessible form helpers
 */

/**
 * ARIA Roles
 * Common ARIA roles for semantic HTML enhancement
 */
export const ARIA_ROLES = {
  // Landmark roles
  NAVIGATION: 'navigation',
  MAIN: 'main',
  COMPLEMENTARY: 'complementary',
  CONTENTINFO: 'contentinfo',
  BANNER: 'banner',
  SEARCH: 'search',
  REGION: 'region',
  FORM: 'form',

  // Widget roles
  BUTTON: 'button',
  LINK: 'link',
  TAB: 'tab',
  TABPANEL: 'tabpanel',
  TABLIST: 'tablist',
  DIALOG: 'dialog',
  ALERTDIALOG: 'alertdialog',
  MENU: 'menu',
  MENUBAR: 'menubar',
  MENUITEM: 'menuitem',
  MENUITEMCHECKBOX: 'menuitemcheckbox',
  MENUITEMRADIO: 'menuitemradio',
  LISTBOX: 'listbox',
  OPTION: 'option',
  COMBOBOX: 'combobox',
  PROGRESSBAR: 'progressbar',
  SLIDER: 'slider',
  SPINBUTTON: 'spinbutton',
  TOOLTIP: 'tooltip',

  // Document structure roles
  ARTICLE: 'article',
  LIST: 'list',
  LISTITEM: 'listitem',
  HEADING: 'heading',
  IMG: 'img',
  TABLE: 'table',
  ROW: 'row',
  CELL: 'cell',
  ROWHEADER: 'rowheader',
  COLUMNHEADER: 'columnheader',

  // Live region roles
  ALERT: 'alert',
  LOG: 'log',
  STATUS: 'status',
  TIMER: 'timer',
} as const;

/**
 * ARIA States
 * Common ARIA state attributes
 */
export const ARIA_STATES = {
  EXPANDED: 'aria-expanded',
  PRESSED: 'aria-pressed',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  INVALID: 'aria-invalid',
  REQUIRED: 'aria-required',
  READONLY: 'aria-readonly',
  BUSY: 'aria-busy',
  GRABBED: 'aria-grabbed',
  DROPEFFECT: 'aria-dropeffect',
  CURRENT: 'aria-current',
  HASPOPUP: 'aria-haspopup',
  MODAL: 'aria-modal',
} as const;

/**
 * ARIA Properties
 * Common ARIA property attributes
 */
export const ARIA_PROPERTIES = {
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',
  LEVEL: 'aria-level',
  VALUENOW: 'aria-valuenow',
  VALUEMIN: 'aria-valuemin',
  VALUEMAX: 'aria-valuemax',
  VALUETEXT: 'aria-valuetext',
  ORIENTATION: 'aria-orientation',
  AUTOCOMPLETE: 'aria-autocomplete',
  MULTISELECTABLE: 'aria-multiselectable',
  ACTIVEDESCENDANT: 'aria-activedescendant',
  POSINSET: 'aria-posinset',
  SETSIZE: 'aria-setsize',
  PLACEHOLDER: 'aria-placeholder',
  ERRORMESSAGE: 'aria-errormessage',
} as const;

/**
 * Keyboard Keys
 * Standard keyboard key codes for keyboard navigation
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
  DELETE: 'Delete',
  BACKSPACE: 'Backspace',
} as const;

/**
 * Live Region Politeness Levels
 */
export const LIVE_REGION_POLITENESS = {
  OFF: 'off',
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
} as const;

/**
 * Generate ARIA attributes for a button
 */
export function getAriaButton(label: string, options: {
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  disabled?: boolean;
} = {}) {
  return {
    'role': ARIA_ROLES.BUTTON,
    'aria-label': label,
    ...(options.pressed !== undefined && { 'aria-pressed': String(options.pressed) }),
    ...(options.expanded !== undefined && { 'aria-expanded': String(options.expanded) }),
    ...(options.controls && { 'aria-controls': options.controls }),
    ...(options.disabled && { 'aria-disabled': 'true' }),
  };
}

/**
 * Generate ARIA attributes for a link
 */
export function getAriaLink(label: string, options: {
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  describedBy?: string;
} = {}) {
  return {
    'aria-label': label,
    ...(options.current !== undefined && {
      'aria-current': options.current === true ? 'page' : String(options.current)
    }),
    ...(options.describedBy && { 'aria-describedby': options.describedBy }),
  };
}

/**
 * Generate ARIA attributes for a form input
 */
export function getAriaInput(label: string, options: {
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  errorMessage?: string;
  placeholder?: string;
} = {}) {
  return {
    'aria-label': label,
    ...(options.required && { 'aria-required': 'true' }),
    ...(options.invalid !== undefined && { 'aria-invalid': String(options.invalid) }),
    ...(options.describedBy && { 'aria-describedby': options.describedBy }),
    ...(options.errorMessage && { 'aria-errormessage': options.errorMessage }),
    ...(options.placeholder && { 'aria-placeholder': options.placeholder }),
  };
}

/**
 * Generate ARIA attributes for a navigation menu
 */
export function getAriaNavigation(label: string) {
  return {
    'role': ARIA_ROLES.NAVIGATION,
    'aria-label': label,
  };
}

/**
 * Generate ARIA attributes for a dialog/modal
 */
export function getAriaDialog(labelledBy: string, describedBy?: string) {
  return {
    'role': ARIA_ROLES.DIALOG,
    'aria-modal': 'true',
    'aria-labelledby': labelledBy,
    ...(describedBy && { 'aria-describedby': describedBy }),
  };
}

/**
 * Generate ARIA attributes for a progress bar
 */
export function getAriaProgressBar(
  label: string,
  value: number,
  options: {
    min?: number;
    max?: number;
    valueText?: string;
  } = {}
) {
  const min = options.min ?? 0;
  const max = options.max ?? 100;

  return {
    'role': ARIA_ROLES.PROGRESSBAR,
    'aria-label': label,
    'aria-valuenow': String(value),
    'aria-valuemin': String(min),
    'aria-valuemax': String(max),
    ...(options.valueText && { 'aria-valuetext': options.valueText }),
  };
}

/**
 * Generate ARIA attributes for a list
 */
export function getAriaList(label?: string, itemCount?: number) {
  return {
    'role': ARIA_ROLES.LIST,
    ...(label && { 'aria-label': label }),
    ...(itemCount !== undefined && { 'aria-setsize': String(itemCount) }),
  };
}

/**
 * Generate ARIA attributes for a list item
 */
export function getAriaListItem(position?: number, setSize?: number) {
  return {
    'role': ARIA_ROLES.LISTITEM,
    ...(position !== undefined && { 'aria-posinset': String(position) }),
    ...(setSize !== undefined && { 'aria-setsize': String(setSize) }),
  };
}

/**
 * Generate ARIA attributes for a tab panel
 */
export function getAriaTabPanel(labelledBy: string, hidden: boolean = false) {
  return {
    'role': ARIA_ROLES.TABPANEL,
    'aria-labelledby': labelledBy,
    ...(hidden && { 'aria-hidden': 'true' }),
    'tabindex': hidden ? '-1' : '0',
  };
}

/**
 * Generate ARIA attributes for a tab
 */
export function getAriaTab(label: string, options: {
  selected?: boolean;
  controls?: string;
} = {}) {
  return {
    'role': ARIA_ROLES.TAB,
    'aria-label': label,
    'aria-selected': String(options.selected ?? false),
    ...(options.controls && { 'aria-controls': options.controls }),
    'tabindex': options.selected ? '0' : '-1',
  };
}

/**
 * Focus Management Utilities
 */

/**
 * Trap focus within a container (for modals/dialogs)
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  function handleTabKey(e: KeyboardEvent) {
    if (e.key !== KEYS.TAB) return;

    if (e.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }

  container.addEventListener('keydown', handleTabKey);

  // Focus first element
  firstElement?.focus();

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const elements = container.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  return Array.from(elements);
}

/**
 * Screen Reader Announcements
 */

/**
 * Create a live region for screen reader announcements
 */
export function createLiveRegion(politeness: 'polite' | 'assertive' = 'polite'): HTMLElement {
  const region = document.createElement('div');
  region.setAttribute('role', 'status');
  region.setAttribute('aria-live', politeness);
  region.setAttribute('aria-atomic', 'true');
  region.className = 'sr-only'; // Screen reader only
  document.body.appendChild(region);
  return region;
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite'): void {
  const region = createLiveRegion(politeness);
  region.textContent = message;

  // Remove after announcement
  setTimeout(() => {
    region.remove();
  }, 1000);
}

/**
 * Keyboard Navigation Helpers
 */

/**
 * Handle roving tabindex for a list of items
 */
export function setupRovingTabIndex(items: HTMLElement[]): void {
  if (items.length === 0) return;

  // Set initial state: first item is tabbable
  items.forEach((item, index) => {
    item.setAttribute('tabindex', index === 0 ? '0' : '-1');
  });

  items.forEach((item, index) => {
    item.addEventListener('keydown', (e: KeyboardEvent) => {
      let newIndex = -1;

      switch (e.key) {
        case KEYS.ARROW_DOWN:
        case KEYS.ARROW_RIGHT:
          e.preventDefault();
          newIndex = (index + 1) % items.length;
          break;
        case KEYS.ARROW_UP:
        case KEYS.ARROW_LEFT:
          e.preventDefault();
          newIndex = (index - 1 + items.length) % items.length;
          break;
        case KEYS.HOME:
          e.preventDefault();
          newIndex = 0;
          break;
        case KEYS.END:
          e.preventDefault();
          newIndex = items.length - 1;
          break;
      }

      if (newIndex !== -1) {
        // Update tabindex
        items.forEach((el, i) => {
          el.setAttribute('tabindex', i === newIndex ? '0' : '-1');
        });
        // Focus new item
        items[newIndex]?.focus();
      }
    });
  });
}

/**
 * Handle escape key to close dialogs/dropdowns
 */
export function handleEscape(callback: () => void): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key === KEYS.ESCAPE) {
      e.preventDefault();
      callback();
    }
  };
}

/**
 * Color Contrast Utilities
 */

/**
 * Calculate relative luminance of a color (WCAG formula)
 */
export function getRelativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: { r: number; g: number; b: number }, color2: { r: number; g: number; b: number }): number {
  const l1 = getRelativeLuminance(color1.r, color1.g, color1.b);
  const l2 = getRelativeLuminance(color2.r, color2.g, color2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if color contrast meets WCAG AA standards
 * @param ratio - Contrast ratio from getContrastRatio
 * @param isLargeText - Text is 18pt+ or 14pt+ bold
 * @returns true if contrast meets WCAG AA
 */
export function meetsWCAGAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Check if color contrast meets WCAG AAA standards
 * @param ratio - Contrast ratio from getContrastRatio
 * @param isLargeText - Text is 18pt+ or 14pt+ bold
 * @returns true if contrast meets WCAG AAA
 */
export function meetsWCAGAAA(ratio: number, isLargeText: boolean = false): boolean {
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Skip Link Utilities
 */

/**
 * Generate skip link props
 */
export function getSkipLink(targetId: string, label: string = 'Skip to main content') {
  return {
    href: `#${targetId}`,
    'aria-label': label,
    className: 'skip-link',
  };
}

/**
 * Form Accessibility Helpers
 */

/**
 * Generate accessible field props
 */
export interface AccessibleFieldProps {
  id: string;
  name: string;
  label: string;
  required?: boolean;
  error?: string;
  description?: string;
}

export function getAccessibleFieldProps(props: AccessibleFieldProps) {
  const descriptionId = props.description ? `${props.id}-description` : undefined;
  const errorId = props.error ? `${props.id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  return {
    input: {
      id: props.id,
      name: props.name,
      'aria-label': props.label,
      'aria-required': props.required ? 'true' : undefined,
      'aria-invalid': props.error ? 'true' : undefined,
      'aria-describedby': describedBy,
      ...(errorId && { 'aria-errormessage': errorId }),
    },
    label: {
      for: props.id,
    },
    description: descriptionId ? {
      id: descriptionId,
    } : undefined,
    error: errorId ? {
      id: errorId,
      role: 'alert',
      'aria-live': 'polite',
    } : undefined,
  };
}

/**
 * Heading Level Management
 */

/**
 * Get accessible heading level (ensures hierarchy)
 */
export function getHeadingLevel(level: number): 1 | 2 | 3 | 4 | 5 | 6 {
  const clampedLevel = Math.max(1, Math.min(6, level));
  return clampedLevel as 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Visibility Utilities
 */

/**
 * Classes for screen-reader-only content
 * (Visually hidden but accessible to screen readers)
 */
export const SR_ONLY_CLASS = 'sr-only';

/**
 * Check if element should be hidden from assistive tech
 */
export function shouldHideFromAT(decorative: boolean, hidden: boolean): boolean {
  return decorative || hidden;
}
