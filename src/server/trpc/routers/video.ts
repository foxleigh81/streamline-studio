/**
 * Video tRPC Router
 *
 * Handles all video CRUD operations with workspace scoping.
 * Supports pagination, filtering, and sorting.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
  router,
  simpleChannelProcedure,
  simpleChannelEditorProcedure,
} from '../procedures';
import type { VideoStatus, DocumentType } from '@/server/db/schema';
import {
  logVideoStatusChange,
  logVideoDueDateChange,
  logVideoPublishDateChange,
} from '@/lib/audit-log';

/**
 * Video status enum values for validation
 */
const videoStatusValues: VideoStatus[] = [
  'idea',
  'scripting',
  'filming',
  'editing',
  'review',
  'scheduled',
  'published',
  'archived',
];

/**
 * Document type enum values for validation
 */
const documentTypeValues: DocumentType[] = [
  'script',
  'description',
  'notes',
  'thumbnail_ideas',
];

/**
 * Video list input schema with pagination, filtering, and sorting
 */
const videoListInput = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  status: z
    .enum(videoStatusValues as [VideoStatus, ...VideoStatus[]])
    .optional(),
  categoryId: z.string().uuid().optional(),
  orderBy: z
    .enum(['createdAt', 'updatedAt', 'dueDate', 'title'])
    .default('createdAt'),
  orderDir: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Video create input schema
 */
const videoCreateInput = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z
    .enum(videoStatusValues as [VideoStatus, ...VideoStatus[]])
    .default('idea'),
  dueDate: z.string().optional(), // ISO date string
  publishDate: z.string().optional(), // ISO date string
  categoryIds: z.array(z.string().uuid()).default([]),
});

/**
 * Video update input schema
 */
const videoUpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z
    .enum(videoStatusValues as [VideoStatus, ...VideoStatus[]])
    .optional(),
  dueDate: z.string().nullable().optional(), // ISO date string or null to clear
  publishDate: z.string().nullable().optional(), // ISO date string or null to clear
  youtubeVideoId: z.string().nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  categoryIds: z.array(z.string().uuid()).optional(),
});

/**
 * Video router
 */
export const videoRouter = router({
  /**
   * List videos with pagination, filtering, and sorting
   */
  list: simpleChannelProcedure
    .input(videoListInput)
    .query(async ({ ctx, input }) => {
      const { channelRepository } = ctx;
      const { cursor, limit, status, categoryId, orderBy, orderDir } = input;

      const videos = await channelRepository.getVideos({
        cursor,
        limit: limit + 1, // Fetch one extra to determine if there's a next page
        ...(status && { status }),
        ...(categoryId && { categoryId }),
        orderBy,
        orderDir,
      });

      let nextCursor: string | undefined;
      if (videos.length > limit) {
        const nextItem = videos.pop();
        nextCursor = nextItem?.id;
      }

      return {
        videos,
        nextCursor,
      };
    }),

  /**
   * Get a single video by ID
   */
  get: simpleChannelProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.channelRepository.getVideo(input.id);

      if (!video) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video not found',
        });
      }

      // Also get category IDs
      const categoryIds = await ctx.channelRepository.getVideoCategoryIds(
        input.id
      );

      return {
        ...video,
        categoryIds,
      };
    }),

  /**
   * Create a new video
   * Automatically creates all four document types (script, description, notes, thumbnail_ideas)
   */
  create: simpleChannelEditorProcedure
    .input(videoCreateInput)
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;
      const { categoryIds, ...videoData } = input;

      // Create the video
      const video = await channelRepository.createVideo({
        ...videoData,
        dueDate: videoData.dueDate ?? null,
        publishDate: videoData.publishDate ?? null,
        createdBy: user.id,
      });

      // Set categories if provided
      if (categoryIds.length > 0) {
        await channelRepository.setVideoCategories(video.id, categoryIds);
      }

      // Auto-create all four document types
      const documentTypes: DocumentType[] = documentTypeValues;
      for (const type of documentTypes) {
        await channelRepository.createDocument({
          videoId: video.id,
          type,
          content: '',
          version: 1,
          updatedBy: user.id,
        });
      }

      // Log audit trail
      await channelRepository.createAuditLog({
        userId: user.id,
        action: 'video.created',
        entityType: 'video',
        entityId: video.id,
        metadata: {
          title: video.title,
          status: video.status,
        },
      });

      return video;
    }),

  /**
   * Update a video
   * Logs metadata changes (status, due date, publish date) to audit log
   */
  update: simpleChannelEditorProcedure
    .input(videoUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;
      const { id, categoryIds, ...updateData } = input;

      // Get current video state for audit logging
      const currentVideo = await channelRepository.getVideo(id);
      if (!currentVideo) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video not found',
        });
      }

      // Update the video
      const video = await channelRepository.updateVideo(id, updateData);

      if (!video) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video not found',
        });
      }

      // Update categories if provided
      if (categoryIds !== undefined) {
        await channelRepository.setVideoCategories(id, categoryIds);
      }

      // Log specific metadata changes to audit log
      if (
        updateData.status !== undefined &&
        updateData.status !== currentVideo.status
      ) {
        await logVideoStatusChange(
          channelRepository,
          id,
          user.id,
          currentVideo.status,
          updateData.status
        );
      }

      if (
        updateData.dueDate !== undefined &&
        updateData.dueDate !== currentVideo.dueDate
      ) {
        await logVideoDueDateChange(
          channelRepository,
          id,
          user.id,
          currentVideo.dueDate,
          updateData.dueDate
        );
      }

      if (
        updateData.publishDate !== undefined &&
        updateData.publishDate !== currentVideo.publishDate
      ) {
        await logVideoPublishDateChange(
          channelRepository,
          id,
          user.id,
          currentVideo.publishDate,
          updateData.publishDate
        );
      }

      // Log general audit trail
      await channelRepository.createAuditLog({
        userId: user.id,
        action: 'video.updated',
        entityType: 'video',
        entityId: id,
        metadata: updateData,
      });

      return video;
    }),

  /**
   * Delete a video
   * Cascades to documents and category associations
   */
  delete: simpleChannelEditorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;

      // Get video details before deletion for audit log
      const video = await channelRepository.getVideo(input.id);
      if (!video) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Video not found',
        });
      }

      // Delete the video (cascades to documents and category associations)
      const deleted = await channelRepository.deleteVideo(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete video',
        });
      }

      // Log audit trail
      await channelRepository.createAuditLog({
        userId: user.id,
        action: 'video.deleted',
        entityType: 'video',
        entityId: input.id,
        metadata: {
          title: video.title,
          status: video.status,
        },
      });

      return { success: true };
    }),
});
