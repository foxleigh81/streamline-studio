/**
 * Theme Management Utilities
 *
 * Provides type-safe utilities for managing theme state.
 * Use in React components or vanilla TypeScript.
 *
 * @example
 * ```tsx
 * import { setTheme, getTheme, getResolvedTheme } from '@/lib/theme';
 *
 * // Set theme
 * setTheme('dark');
 *
 * // Get current preference
 * const theme = getTheme(); // 'light' | 'dark' | 'system'
 *
 * // Get actual applied theme
 * const resolved = getResolvedTheme(); // 'light' | 'dark'
 * ```
 */

/**
 * Theme preference options.
 * - 'light': Force light mode
 * - 'dark': Force dark mode
 * - 'system': Follow system preference
 */
export type ThemePreference = 'light' | 'dark' | 'system';

/**
 * Resolved theme value (what's actually displayed).
 */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Local storage key for theme preference.
 */
const THEME_STORAGE_KEY = 'streamline-studio-theme';

/**
 * Sets the theme preference and updates the DOM.
 *
 * @param theme - The theme preference to set
 *
 * @example
 * ```ts
 * setTheme('dark'); // Force dark mode
 * setTheme('system'); // Use system preference
 * ```
 */
export function setTheme(theme: ThemePreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Update DOM
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Persist preference
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage may be unavailable (private browsing, etc.)
  }
}

/**
 * Gets the stored theme preference.
 *
 * @returns The stored theme preference, defaults to 'system'
 *
 * @example
 * ```ts
 * const theme = getTheme();
 * console.log(theme); // 'light' | 'dark' | 'system'
 * ```
 */
export function getTheme(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system';
  }

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
  } catch {
    // localStorage may be unavailable
  }

  return 'system';
}

/**
 * Gets the actual resolved theme (what's displayed).
 * Resolves 'system' to actual light/dark based on media query.
 *
 * @returns The resolved theme ('light' or 'dark')
 *
 * @example
 * ```ts
 * const resolved = getResolvedTheme();
 * console.log(resolved); // 'light' or 'dark'
 * ```
 */
export function getResolvedTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const preference = getTheme();

  if (preference !== 'system') {
    return preference;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Toggles between light and dark themes.
 * If currently on 'system', resolves it first then toggles.
 *
 * @returns The new theme after toggling
 *
 * @example
 * ```ts
 * const newTheme = toggleTheme();
 * console.log(newTheme); // 'light' or 'dark'
 * ```
 */
export function toggleTheme(): ResolvedTheme {
  const current = getResolvedTheme();
  const newTheme: ResolvedTheme = current === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
  return newTheme;
}

/**
 * Subscribes to system theme changes.
 * Useful for updating UI when system preference changes.
 *
 * @param callback - Function called when system theme changes
 * @returns Cleanup function to remove the listener
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToSystemTheme((isDark) => {
 *   console.log('System prefers dark:', isDark);
 * });
 *
 * // Later: cleanup
 * unsubscribe();
 * ```
 */
export function subscribeToSystemTheme(
  callback: (isDark: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent) => {
    callback(event.matches);
  };

  mediaQuery.addEventListener('change', handler);

  return () => {
    mediaQuery.removeEventListener('change', handler);
  };
}

/**
 * Initialises theme from stored preference.
 * Call this early (e.g., in a script tag or layout effect) to prevent flash.
 *
 * @example
 * ```ts
 * // In _document.tsx or layout.tsx
 * initTheme();
 * ```
 */
export function initTheme(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const theme = getTheme();
  if (theme !== 'system') {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

/**
 * Inline script string to prevent theme flash.
 * Add this to <head> as an inline script.
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <head>
 *   <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
 * </head>
 * ```
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var theme = localStorage.getItem('${THEME_STORAGE_KEY}');
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch (e) {}
})();
`.trim();
