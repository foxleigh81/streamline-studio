/**
 * Video Status Constants
 *
 * Centralized constants for video status colors and labels.
 * Used across video cards, detail pages, and forms.
 */

import type { VideoStatus } from '@/server/db/schema';

/**
 * Status badge color mapping
 * Maps video status to hex color codes
 */
export const STATUS_COLORS: Record<VideoStatus, string> = {
  idea: '#6B7280', // Gray
  scripting: '#3B82F6', // Blue
  filming: '#8B5CF6', // Purple
  editing: '#F59E0B', // Amber
  review: '#EC4899', // Pink
  scheduled: '#14B8A6', // Teal
  published: '#22C55E', // Green
  archived: '#6B7280', // Gray
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
 * Get status label for a given video status
 */
export function getStatusLabel(status: VideoStatus): string {
  return STATUS_LABELS[status];
}
