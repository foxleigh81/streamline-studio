import { formatDistanceToNow } from 'date-fns';

/**
 * Formats a date as a relative time string (e.g., "2 hours ago")
 *
 * @param date - The date to format (Date object or ISO string)
 * @returns A human-readable relative time string
 *
 * @example
 * ```ts
 * formatRelativeTime(new Date(Date.now() - 1000 * 60 * 30))
 * // => "30 minutes ago"
 *
 * formatRelativeTime("2024-01-15T10:00:00Z")
 * // => "2 hours ago" (depending on current time)
 * ```
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}
