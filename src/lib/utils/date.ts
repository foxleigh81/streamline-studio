/**
 * Date Utilities
 *
 * Shared date formatting and manipulation functions.
 */

/**
 * Format a date string for display
 *
 * Converts an ISO date string to a localized short format (e.g., "Jan 15, 2024").
 * Returns null if the date is null or invalid.
 *
 * @param date - ISO date string or null
 * @returns Formatted date string or null
 */
export function formatDueDate(date: string | null): string | null {
  if (!date) return null;
  try {
    const d = new Date(date);
    // Check if date is valid
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

/**
 * Format a date string for display in tables (compact format)
 *
 * Returns an em dash (—) if the date is null or invalid, otherwise
 * returns the formatted date string.
 *
 * @param date - ISO date string or null
 * @returns Formatted date string or em dash
 */
export function formatDueDateCompact(date: string | null): string {
  const formatted = formatDueDate(date);
  return formatted ?? '—';
}
