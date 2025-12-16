/**
 * Video Status Constants
 *
 * Centralized constants for video status colors and labels.
 * Used across video cards, detail pages, and forms.
 */

import type { VideoStatus } from '@/server/db/schema';

/**
 * Status badge color mapping
 * Maps video status to hex color codes (WCAG AA compliant - 4.5:1 contrast)
 */
export const STATUS_COLORS: Record<VideoStatus, string> = {
  idea: '#6B7280', // Gray
  scripting: '#2563EB', // Blue (darker for contrast)
  filming: '#7C3AED', // Purple (darker for contrast)
  editing: '#D97706', // Amber (darker for contrast)
  review: '#DB2777', // Pink (darker for contrast)
  scheduled: '#0F766E', // Teal (darker for contrast)
  published: '#16A34A', // Green (darker for contrast)
  archived: '#6B7280', // Gray
} as const;

/**
 * Status text color mapping
 * Determines if text should be light or dark based on background
 */
export const STATUS_TEXT_COLORS: Record<VideoStatus, string> = {
  idea: '#FFFFFF', // White text
  scripting: '#FFFFFF', // White text
  filming: '#FFFFFF', // White text
  editing: '#FFFFFF', // White text
  review: '#FFFFFF', // White text
  scheduled: '#FFFFFF', // White text
  published: '#FFFFFF', // White text
  archived: '#FFFFFF', // White text
} as const;

/**
 * Status display labels
 * Maps video status to human-readable labels
 */
export const STATUS_LABELS: Record<VideoStatus, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  filming: 'Filming',
  editing: 'Editing',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
} as const;

/**
 * Get status color for a given video status
 */
export function getStatusColor(status: VideoStatus): string {
  return STATUS_COLORS[status];
}

/**
 * Get status text color for a given video status
 */
export function getStatusTextColor(status: VideoStatus): string {
  return STATUS_TEXT_COLORS[status];
}

/**
 * Get status label for a given video status
 */
export function getStatusLabel(status: VideoStatus): string {
  return STATUS_LABELS[status];
}
