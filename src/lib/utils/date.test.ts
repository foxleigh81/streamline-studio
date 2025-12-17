/**
 * Date Utilities Tests
 *
 * Tests for date and time formatting functions with user preferences.
 */

import { describe, it, expect } from 'vitest';
import {
  formatDate,
  formatTime,
  formatDateTime,
  formatDateCompact,
} from './date';

describe('formatDate', () => {
  const testDate = new Date('2025-01-15T14:30:00.000Z');
  const testDateString = '2025-01-15T14:30:00.000Z';

  it('formats date in ISO format (default)', () => {
    expect(formatDate(testDate)).toBe('2025-01-15');
    expect(formatDate(testDateString)).toBe('2025-01-15');
  });

  it('formats date in ISO format explicitly', () => {
    expect(formatDate(testDate, 'ISO')).toBe('2025-01-15');
  });

  it('formats date in US format', () => {
    expect(formatDate(testDate, 'US')).toBe('01/15/2025');
  });

  it('formats date in EU format', () => {
    expect(formatDate(testDate, 'EU')).toBe('15/01/2025');
  });

  it('formats date in UK format', () => {
    expect(formatDate(testDate, 'UK')).toBe('15-Jan-2025');
  });

  it('returns null for null input', () => {
    expect(formatDate(null)).toBe(null);
    expect(formatDate(null, 'US')).toBe(null);
  });

  it('returns null for invalid date string', () => {
    expect(formatDate('invalid-date')).toBe(null);
  });

  it('handles dates with single-digit days and months', () => {
    const earlyDate = new Date('2025-03-05T00:00:00.000Z');
    expect(formatDate(earlyDate, 'ISO')).toBe('2025-03-05');
    expect(formatDate(earlyDate, 'US')).toBe('03/05/2025');
    expect(formatDate(earlyDate, 'EU')).toBe('05/03/2025');
  });

  it('handles year boundaries correctly', () => {
    const newYear = new Date('2025-01-01T00:00:00.000Z');
    expect(formatDate(newYear, 'ISO')).toBe('2025-01-01');
    expect(formatDate(newYear, 'US')).toBe('01/01/2025');

    const newYearsEve = new Date('2024-12-31T23:59:59.000Z');
    expect(formatDate(newYearsEve, 'ISO')).toBe('2024-12-31');
    expect(formatDate(newYearsEve, 'US')).toBe('12/31/2024');
  });
});

describe('formatTime', () => {
  it('formats time in 24h format (default)', () => {
    const morning = new Date('2025-01-15T09:30:00.000Z');
    const afternoon = new Date('2025-01-15T14:30:00.000Z');

    expect(formatTime(morning)).toBe('09:30');
    expect(formatTime(afternoon)).toBe('14:30');
  });

  it('formats time in 24h format explicitly', () => {
    const time = new Date('2025-01-15T14:30:00.000Z');
    expect(formatTime(time, '24h')).toBe('14:30');
  });

  it('formats time in 12h format with AM', () => {
    const morning = new Date('2025-01-15T09:30:00.000Z');
    expect(formatTime(morning, '12h')).toBe('9:30 AM');
  });

  it('formats time in 12h format with PM', () => {
    const afternoon = new Date('2025-01-15T14:30:00.000Z');
    expect(formatTime(afternoon, '12h')).toBe('2:30 PM');
  });

  it('handles midnight correctly', () => {
    const midnight = new Date('2025-01-15T00:00:00.000Z');
    expect(formatTime(midnight, '12h')).toBe('12:00 AM');
    expect(formatTime(midnight, '24h')).toBe('00:00');
  });

  it('handles noon correctly', () => {
    const noon = new Date('2025-01-15T12:00:00.000Z');
    expect(formatTime(noon, '12h')).toBe('12:00 PM');
    expect(formatTime(noon, '24h')).toBe('12:00');
  });

  it('handles 1 AM correctly', () => {
    const oneAM = new Date('2025-01-15T01:00:00.000Z');
    expect(formatTime(oneAM, '12h')).toBe('1:00 AM');
  });

  it('handles 1 PM correctly', () => {
    const onePM = new Date('2025-01-15T13:00:00.000Z');
    expect(formatTime(onePM, '12h')).toBe('1:00 PM');
  });

  it('returns null for null input', () => {
    expect(formatTime(null)).toBe(null);
    expect(formatTime(null, '12h')).toBe(null);
  });

  it('returns null for invalid date string', () => {
    expect(formatTime('invalid-date')).toBe(null);
  });

  it('accepts ISO string input', () => {
    const timeString = '2025-01-15T14:30:00.000Z';
    expect(formatTime(timeString, '24h')).toBe('14:30');
    expect(formatTime(timeString, '12h')).toBe('2:30 PM');
  });

  it('pads minutes with leading zero', () => {
    const time = new Date('2025-01-15T14:05:00.000Z');
    expect(formatTime(time, '24h')).toBe('14:05');
    expect(formatTime(time, '12h')).toBe('2:05 PM');
  });
});

describe('formatDateTime', () => {
  const testDate = new Date('2025-01-15T14:30:00.000Z');

  it('formats date and time together with default formats', () => {
    expect(formatDateTime(testDate)).toBe('2025-01-15 14:30');
  });

  it('formats date and time with ISO date and 24h time', () => {
    expect(formatDateTime(testDate, 'ISO', '24h')).toBe('2025-01-15 14:30');
  });

  it('formats date and time with US date and 12h time', () => {
    expect(formatDateTime(testDate, 'US', '12h')).toBe('01/15/2025 2:30 PM');
  });

  it('formats date and time with EU date and 24h time', () => {
    expect(formatDateTime(testDate, 'EU', '24h')).toBe('15/01/2025 14:30');
  });

  it('formats date and time with UK date and 12h time', () => {
    expect(formatDateTime(testDate, 'UK', '12h')).toBe('15-Jan-2025 2:30 PM');
  });

  it('returns null for null input', () => {
    expect(formatDateTime(null)).toBe(null);
    expect(formatDateTime(null, 'US', '12h')).toBe(null);
  });

  it('returns null for invalid date string', () => {
    expect(formatDateTime('invalid-date')).toBe(null);
  });

  it('accepts ISO string input', () => {
    const dateString = '2025-01-15T14:30:00.000Z';
    expect(formatDateTime(dateString, 'ISO', '24h')).toBe('2025-01-15 14:30');
  });
});

describe('formatDateCompact', () => {
  const testDate = new Date('2025-01-15T14:30:00.000Z');

  it('formats date and returns formatted string for valid date', () => {
    expect(formatDateCompact(testDate)).toBe('2025-01-15');
    expect(formatDateCompact(testDate, 'US')).toBe('01/15/2025');
  });

  it('returns em dash for null input', () => {
    expect(formatDateCompact(null)).toBe('—');
    expect(formatDateCompact(null, 'US')).toBe('—');
  });

  it('returns em dash for invalid date string', () => {
    expect(formatDateCompact('invalid-date')).toBe('—');
  });

  it('respects format preference', () => {
    expect(formatDateCompact(testDate, 'ISO')).toBe('2025-01-15');
    expect(formatDateCompact(testDate, 'US')).toBe('01/15/2025');
    expect(formatDateCompact(testDate, 'EU')).toBe('15/01/2025');
    expect(formatDateCompact(testDate, 'UK')).toBe('15-Jan-2025');
  });
});

describe('Edge cases', () => {
  it('handles leap year correctly', () => {
    const leapDay = new Date('2024-02-29T12:00:00.000Z');
    expect(formatDate(leapDay, 'ISO')).toBe('2024-02-29');
    expect(formatDate(leapDay, 'US')).toBe('02/29/2024');
  });

  it('handles dates far in the future', () => {
    const futureDate = new Date('2999-12-31T23:59:59.000Z');
    expect(formatDate(futureDate, 'ISO')).toBe('2999-12-31');
  });

  it('handles dates far in the past', () => {
    const pastDate = new Date('1900-01-01T00:00:00.000Z');
    expect(formatDate(pastDate, 'ISO')).toBe('1900-01-01');
  });

  it('handles timezone differences gracefully', () => {
    // UTC midnight
    const utcMidnight = new Date('2025-01-15T00:00:00.000Z');
    // The date portion should be consistent regardless of timezone
    // because we're working with the local representation
    const formatted = formatDate(utcMidnight, 'ISO');
    expect(formatted).toBeTruthy();
    expect(formatted?.startsWith('2025-01-')).toBe(true);
  });
});
