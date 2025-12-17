/**
 * Date Utilities
 *
 * Shared date formatting and manipulation functions.
 * Supports user-configurable date and time formats.
 */

import type { DateFormat, TimeFormat } from '@/server/db/schema';

/**
 * Pad a number with leading zero if needed
 */
function pad(num: number): string {
  return num.toString().padStart(2, '0');
}

/**
 * Get month abbreviation for a given month number (0-11)
 */
function getMonthAbbr(month: number): string {
  const abbrs = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return abbrs[month] ?? 'Jan';
}

/**
 * Format a date according to the specified format preference
 *
 * Supports ISO, US, EU, and UK date formats:
 * - ISO: YYYY-MM-DD (2025-01-15)
 * - US: MM/DD/YYYY (01/15/2025)
 * - EU: DD/MM/YYYY (15/01/2025)
 * - UK: DD-MMM-YYYY (15-Jan-2025)
 *
 * @param date - Date object, ISO string, or null
 * @param format - Date format preference (defaults to ISO)
 * @returns Formatted date string or null if date is invalid/null
 */
export function formatDate(
  date: Date | string | null,
  format: DateFormat = 'ISO'
): string | null {
  if (!date) return null;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (Number.isNaN(d.getTime())) return null;

    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());

    switch (format) {
      case 'ISO':
        return `${year}-${month}-${day}`;
      case 'US':
        return `${month}/${day}/${year}`;
      case 'EU':
        return `${day}/${month}/${year}`;
      case 'UK':
        return `${day}-${getMonthAbbr(d.getMonth())}-${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  } catch {
    return null;
  }
}

/**
 * Format a time according to the specified format preference
 *
 * Supports 12-hour (with AM/PM) and 24-hour formats:
 * - 12h: 2:30 PM
 * - 24h: 14:30
 *
 * @param date - Date object, ISO string, or null
 * @param format - Time format preference (defaults to 24h)
 * @returns Formatted time string or null if date is invalid/null
 */
export function formatTime(
  date: Date | string | null,
  format: TimeFormat = '24h'
): string | null {
  if (!date) return null;

  try {
    const d = typeof date === 'string' ? new Date(date) : date;

    // Check if date is valid
    if (Number.isNaN(d.getTime())) return null;

    const hours = d.getHours();
    const minutes = pad(d.getMinutes());

    if (format === '12h') {
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12; // Convert 0 to 12 for midnight
      return `${displayHours}:${minutes} ${period}`;
    }

    // 24h format
    return `${pad(hours)}:${minutes}`;
  } catch {
    return null;
  }
}

/**
 * Format a date and time together according to the specified format preferences
 *
 * @param date - Date object, ISO string, or null
 * @param dateFormat - Date format preference (defaults to ISO)
 * @param timeFormat - Time format preference (defaults to 24h)
 * @returns Formatted date-time string or null if date is invalid/null
 */
export function formatDateTime(
  date: Date | string | null,
  dateFormat: DateFormat = 'ISO',
  timeFormat: TimeFormat = '24h'
): string | null {
  const formattedDate = formatDate(date, dateFormat);
  const formattedTime = formatTime(date, timeFormat);

  if (!formattedDate || !formattedTime) return null;

  return `${formattedDate} ${formattedTime}`;
}

/**
 * Format a date string for display in tables (compact format)
 *
 * Returns an em dash (—) if the date is null or invalid, otherwise
 * returns the formatted date string.
 *
 * @param date - Date object, ISO string, or null
 * @param format - Date format preference (defaults to ISO)
 * @returns Formatted date string or em dash
 */
export function formatDateCompact(
  date: Date | string | null,
  format: DateFormat = 'ISO'
): string {
  const formatted = formatDate(date, format);
  return formatted ?? '—';
}

// =============================================================================
// LEGACY FUNCTIONS (for backwards compatibility - to be deprecated)
// =============================================================================

/**
 * @deprecated Use formatDate with 'en-US' style formatting instead
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
 * @deprecated Use formatDateCompact instead
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
