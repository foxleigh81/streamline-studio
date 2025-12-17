/**
 * useDateFormatter Hook Tests
 *
 * Tests for the useDateFormatter hook covering:
 * - Date formatting with different format preferences
 * - Time formatting with different format preferences
 * - DateTime formatting
 * - Compact date formatting with fallback
 * - Loading states
 * - Error handling
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDateFormatter } from '../use-date-formatter';

// Mock tRPC client
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    user: {
      getPreferences: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Type for mock query return - using unknown to satisfy tRPC's complex type requirements
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test mock types don't need full tRPC type compatibility
type MockQueryReturn = any;

describe('useDateFormatter', () => {
  const mockDate = new Date('2025-12-17T14:30:00Z');
  const mockISOString = '2025-12-17T14:30:00Z';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading states', () => {
    it('should indicate loading when preferences are being fetched', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: undefined,
        isLoading: true,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.isLoading).toBe(true);
    });

    it('should not indicate loading when preferences are loaded', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('default formats', () => {
    it('should use ISO date format by default when preferences are not loaded', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.dateFormat).toBe('ISO');
      expect(result.current.timeFormat).toBe('24h');
    });

    it('should format with default formats when preferences are not available', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      // ISO format: YYYY-MM-DD
      expect(result.current.formatDate(mockDate)).toBe('2025-12-17');
      // 24h format: HH:MM (in UTC, so 14:30)
      expect(result.current.formatTime(mockDate)).toBe('14:30');
    });
  });

  describe('date formatting', () => {
    it('should format date with ISO format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDate(mockDate)).toBe('2025-12-17');
      expect(result.current.formatDate(mockISOString)).toBe('2025-12-17');
    });

    it('should format date with US format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'US' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDate(mockDate)).toBe('12/17/2025');
      expect(result.current.formatDate(mockISOString)).toBe('12/17/2025');
    });

    it('should format date with EU format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'EU' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDate(mockDate)).toBe('17/12/2025');
      expect(result.current.formatDate(mockISOString)).toBe('17/12/2025');
    });

    it('should format date with UK format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'UK' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      // UK format: DD-MMM-YYYY (e.g., "17-Dec-2025")
      expect(result.current.formatDate(mockDate)).toBe('17-Dec-2025');
      expect(result.current.formatDate(mockISOString)).toBe('17-Dec-2025');
    });

    it('should return null for null date input', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDate(null)).toBeNull();
    });

    it('should return null for invalid date input', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDate('invalid-date')).toBeNull();
    });
  });

  describe('time formatting', () => {
    it('should format time with 24h format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatTime(mockDate)).toBe('14:30');
      expect(result.current.formatTime(mockISOString)).toBe('14:30');
    });

    it('should format time with 12h format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatTime(mockDate)).toBe('2:30 PM');
      expect(result.current.formatTime(mockISOString)).toBe('2:30 PM');
    });

    it('should format midnight correctly in 12h format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      const midnight = new Date('2025-12-17T00:00:00Z');
      expect(result.current.formatTime(midnight)).toBe('12:00 AM');
    });

    it('should format noon correctly in 12h format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      const noon = new Date('2025-12-17T12:00:00Z');
      expect(result.current.formatTime(noon)).toBe('12:00 PM');
    });

    it('should return null for null time input', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatTime(null)).toBeNull();
    });
  });

  describe('datetime formatting', () => {
    it('should format datetime with ISO date and 24h time', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateTime(mockDate)).toBe('2025-12-17 14:30');
      expect(result.current.formatDateTime(mockISOString)).toBe(
        '2025-12-17 14:30'
      );
    });

    it('should format datetime with US date and 12h time', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'US' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateTime(mockDate)).toBe(
        '12/17/2025 2:30 PM'
      );
      expect(result.current.formatDateTime(mockISOString)).toBe(
        '12/17/2025 2:30 PM'
      );
    });

    it('should format datetime with EU date and 24h time', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'EU' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateTime(mockDate)).toBe('17/12/2025 14:30');
    });

    it('should return null for null datetime input', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateTime(null)).toBeNull();
    });
  });

  describe('compact date formatting', () => {
    it('should format date with compact format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateCompact(mockDate)).toBe('2025-12-17');
    });

    it('should return em dash for null date in compact format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateCompact(null)).toBe('—');
    });

    it('should return em dash for invalid date in compact format', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.formatDateCompact('invalid-date')).toBe('—');
    });
  });

  describe('format preferences', () => {
    it('should expose current date format preference', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'EU' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.dateFormat).toBe('EU');
    });

    it('should expose current time format preference', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result } = renderHook(() => useDateFormatter());

      expect(result.current.timeFormat).toBe('12h');
    });
  });

  describe('memoization', () => {
    it('should memoize formatting functions when preferences do not change', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      vi.mocked(trpc.user.getPreferences.useQuery).mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result, rerender } = renderHook(() => useDateFormatter());

      const firstFormatDate = result.current.formatDate;
      const firstFormatTime = result.current.formatTime;

      rerender();

      // Functions should be the same reference (memoized)
      expect(result.current.formatDate).toBe(firstFormatDate);
      expect(result.current.formatTime).toBe(firstFormatTime);
    });

    it('should recreate formatting functions when preferences change', async () => {
      const { trpc } = await import('@/lib/trpc/client');
      const mockUseQuery = vi.mocked(trpc.user.getPreferences.useQuery);

      mockUseQuery.mockReturnValue({
        data: {
          dateFormat: 'ISO' as const,
          timeFormat: '24h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      const { result, rerender } = renderHook(() => useDateFormatter());

      const firstFormatDate = result.current.formatDate;

      // Change preferences
      mockUseQuery.mockReturnValue({
        data: {
          dateFormat: 'US' as const,
          timeFormat: '12h' as const,
        },
        isLoading: false,
        error: null,
      } as MockQueryReturn);

      rerender();

      // Functions should be different references (re-memoized with new formats)
      expect(result.current.formatDate).not.toBe(firstFormatDate);
      expect(result.current.formatDate(mockDate)).toBe('12/17/2025');
    });
  });
});
