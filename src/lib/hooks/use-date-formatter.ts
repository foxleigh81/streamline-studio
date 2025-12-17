/**
 * useDateFormatter Hook
 *
 * Provides date and time formatting functions that respect user preferences.
 * Automatically fetches the user's date/time format preferences from the API
 * and provides convenient formatting functions.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { formatDate, formatTime, formatDateTime, isLoading } = useDateFormatter();
 *
 *   return (
 *     <div>
 *       <p>Date: {formatDate(new Date())}</p>
 *       <p>Time: {formatTime(new Date())}</p>
 *       <p>DateTime: {formatDateTime(new Date())}</p>
 *     </div>
 *   );
 * }
 * ```
 */

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import {
  formatDate as formatDateUtil,
  formatTime as formatTimeUtil,
  formatDateTime as formatDateTimeUtil,
  formatDateCompact as formatDateCompactUtil,
} from '@/lib/utils/date';
import type { DateFormat, TimeFormat } from '@/server/db/schema';

/**
 * Return type for the useDateFormatter hook
 */
export interface DateFormatter {
  /**
   * Format a date according to user's preferred format
   * @param date - Date to format (Date object, ISO string, or null)
   * @returns Formatted date string or null
   */
  formatDate: (date: Date | string | null) => string | null;

  /**
   * Format a time according to user's preferred format
   * @param date - Date to format (Date object, ISO string, or null)
   * @returns Formatted time string or null
   */
  formatTime: (date: Date | string | null) => string | null;

  /**
   * Format a date and time together according to user's preferred formats
   * @param date - Date to format (Date object, ISO string, or null)
   * @returns Formatted date-time string or null
   */
  formatDateTime: (date: Date | string | null) => string | null;

  /**
   * Format a date with fallback to em dash for null/invalid dates
   * @param date - Date to format (Date object, ISO string, or null)
   * @returns Formatted date string or em dash (—)
   */
  formatDateCompact: (date: Date | string | null) => string;

  /**
   * Whether preferences are currently being loaded
   */
  isLoading: boolean;

  /**
   * User's current date format preference
   */
  dateFormat: DateFormat;

  /**
   * User's current time format preference
   */
  timeFormat: TimeFormat;
}

/**
 * Hook for formatting dates and times according to user preferences
 *
 * Fetches user preferences from the API and provides formatting functions
 * that automatically apply the user's preferred date and time formats.
 *
 * Falls back to ISO date format and 24-hour time format if preferences
 * are not yet loaded or if there's an error.
 */
export function useDateFormatter(): DateFormatter {
  // Fetch user preferences
  const { data: preferences, isLoading } = trpc.user.getPreferences.useQuery();

  // Extract format preferences with defaults
  const dateFormat = preferences?.dateFormat ?? 'ISO';
  const timeFormat = preferences?.timeFormat ?? '24h';

  // Memoize formatting functions to avoid recreating on every render
  const formatters = useMemo(
    () => ({
      formatDate: (date: Date | string | null) =>
        formatDateUtil(date, dateFormat),
      formatTime: (date: Date | string | null) =>
        formatTimeUtil(date, timeFormat),
      formatDateTime: (date: Date | string | null) =>
        formatDateTimeUtil(date, dateFormat, timeFormat),
      formatDateCompact: (date: Date | string | null) =>
        formatDateCompactUtil(date, dateFormat),
    }),
    [dateFormat, timeFormat]
  );

  return {
    ...formatters,
    isLoading,
    dateFormat,
    timeFormat,
  };
}
