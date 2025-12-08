/**
 * Document tRPC Router
 *
 * Handles document retrieval and updates with workspace scoping.
 * Documents are automatically created when a video is created,
 * so this router only handles get and update operations.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/009-versioning-and-audit-approach.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, workspaceProcedure, editorProcedure } from '../trpc';
import type { DocumentType } from '@/server/db/schema';

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
 * Document get input schema
 */
const documentGetInput = z.object({
  id: z.string().uuid(),
});

/**
 * Document get by video and type input schema
 */
const documentGetByVideoInput = z.object({
  videoId: z.string().uuid(),
  type: z.enum(documentTypeValues as [DocumentType, ...DocumentType[]]),
});

/**
 * Document update input schema with version checking
 * Content is limited to 500KB (512,000 bytes) as per ADR-009
 */
const documentUpdateInput = z.object({
  id: z.string().uuid(),
  content: z.string().max(512000, 'Document content exceeds 500KB limit'),
  expectedVersion: z.number().int().positive(),
});

/**
 * Document router
 */
export const documentRouter = router({
  /**
   * Get a document by ID
   */
  get: workspaceProcedure
    .input(documentGetInput)
    .query(async ({ ctx, input }) => {
      const document = await ctx.repository.getDocument(input.id);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      return document;
    }),

  /**
   * Get a document by video ID and type
   * This is the primary way to retrieve documents in the UI
   */
  getByVideo: workspaceProcedure
    .input(documentGetByVideoInput)
    .query(async ({ ctx, input }) => {
      const document = await ctx.repository.getDocumentByVideoAndType(
        input.videoId,
        input.type
      );

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      return document;
    }),

  /**
   * Get all documents for a video
   */
  listByVideo: workspaceProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const documents = await ctx.repository.getDocumentsByVideo(input.videoId);
      return documents;
    }),

  /**
   * Update a document with optimistic concurrency control
   *
   * This endpoint uses version checking to prevent concurrent edit conflicts.
   * If the expectedVersion doesn't match the current version, it returns
   * a CONFLICT error, allowing the client to handle the conflict.
   *
   * In Phase 3, we'll add full conflict resolution with document revisions.
   * For now, we use basic version checking.
   */
  update: editorProcedure
    .input(documentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { repository, user } = ctx;
      const { id, content, expectedVersion } = input;

      // Get current document to check version
      const currentDoc = await repository.getDocument(id);

      if (!currentDoc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Check version for optimistic concurrency control
      if (currentDoc.version !== expectedVersion) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'Document has been modified by another user. Please refresh and try again.',
          cause: {
            currentVersion: currentDoc.version,
            expectedVersion,
          },
        });
      }

      // Update document with incremented version
      const updatedDoc = await repository.updateDocument(id, {
        content,
        version: currentDoc.version + 1,
        updatedBy: user.id,
      });

      if (!updatedDoc) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update document',
        });
      }

      // Log audit trail
      await repository.createAuditLog({
        userId: user.id,
        action: 'document.updated',
        entityType: 'document',
        entityId: id,
        metadata: {
          videoId: updatedDoc.videoId,
          type: updatedDoc.type,
          version: updatedDoc.version,
          contentLength: content.length,
        },
      });

      return updatedDoc;
    }),
});
