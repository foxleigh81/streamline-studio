/**
 * Color Constants
 *
 * Centralized color constants used across the application.
 */

/**
 * Default category color (Slate Gray)
 * Used when creating new categories without a color selection
 */
export const DEFAULT_CATEGORY_COLOR = '#6B7280';

/**
 * Color palette categories
 */
export const COLOR_PALETTE = {
  neutrals: ['#6B7280', '#374151', '#1F2937'],
  blues: ['#3B82F6', '#2563EB', '#1E40AF'],
  greens: ['#22C55E', '#16A34A', '#14B8A6'],
  yellows: ['#F59E0B', '#EAB308', '#CA8A04'],
  oranges: ['#F97316', '#EF4444', '#DC2626'],
  purples: ['#8B5CF6', '#7C3AED', '#EC4899'],
} as const;
