/**
 * Audit Log Service
 *
 * Centralized service for creating audit log entries for important operations.
 * Helps ensure consistent audit logging across the application.
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */

import type { ChannelRepository } from '@/server/repositories/channel-repository';
import type { VideoStatus } from '@/server/db/schema';

/**
 * Log a video status change
 */
export async function logVideoStatusChange(
  repository: ChannelRepository,
  videoId: string,
  userId: string,
  oldStatus: VideoStatus,
  newStatus: VideoStatus
): Promise<void> {
  await repository.createAuditLog({
    userId,
    action: 'video.status_changed',
    entityType: 'video',
    entityId: videoId,
    metadata: {
      oldStatus,
      newStatus,
    },
  });
}

/**
 * Log a video due date change
 */
export async function logVideoDueDateChange(
  repository: ChannelRepository,
  videoId: string,
  userId: string,
  oldDueDate: string | null,
  newDueDate: string | null
): Promise<void> {
  await repository.createAuditLog({
    userId,
    action: 'video.due_date_changed',
    entityType: 'video',
    entityId: videoId,
    metadata: {
      oldDueDate,
      newDueDate,
    },
  });
}

/**
 * Log a video publish date change
 */
export async function logVideoPublishDateChange(
  repository: ChannelRepository,
  videoId: string,
  userId: string,
  oldPublishDate: string | null,
  newPublishDate: string | null
): Promise<void> {
  await repository.createAuditLog({
    userId,
    action: 'video.publish_date_changed',
    entityType: 'video',
    entityId: videoId,
    metadata: {
      oldPublishDate,
      newPublishDate,
    },
  });
}

/**
 * Log category creation
 */
export async function logCategoryCreated(
  repository: ChannelRepository,
  categoryId: string,
  userId: string,
  categoryName: string,
  categoryColor: string
): Promise<void> {
  await repository.createAuditLog({
    userId,
    action: 'category.created',
    entityType: 'category',
    entityId: categoryId,
    metadata: {
      name: categoryName,
      color: categoryColor,
    },
  });
}

/**
 * Log category update
 */
export async function logCategoryUpdated(
  repository: ChannelRepository,
  categoryId: string,
  userId: string,
  oldName: string,
  newName: string | undefined,
  oldColor: string,
  newColor: string | undefined
): Promise<void> {
  const changes: Record<string, unknown> = {};

  if (newName && newName !== oldName) {
    changes.name = { from: oldName, to: newName };
  }

  if (newColor && newColor !== oldColor) {
    changes.color = { from: oldColor, to: newColor };
  }

  // Only log if there were actual changes
  if (Object.keys(changes).length > 0) {
    await repository.createAuditLog({
      userId,
      action: 'category.updated',
      entityType: 'category',
      entityId: categoryId,
      metadata: changes,
    });
  }
}

/**
 * Log category deletion
 */
export async function logCategoryDeleted(
  repository: ChannelRepository,
  categoryId: string,
  userId: string,
  categoryName: string
): Promise<void> {
  await repository.createAuditLog({
    userId,
    action: 'category.deleted',
    entityType: 'category',
    entityId: categoryId,
    metadata: {
      name: categoryName,
    },
  });
}
