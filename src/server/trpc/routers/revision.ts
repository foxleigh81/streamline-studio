/**
 * Revision tRPC Router
 *
 * Handles document revision history operations.
 * All operations are workspace-scoped through the document's video.
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, workspaceProcedure, editorProcedure } from '../trpc';

/**
 * Revision list input schema
 */
const revisionListInput = z.object({
  documentId: z.string().uuid(),
  limit: z.number().min(1).max(100).default(100),
});

/**
 * Revision get input schema
 */
const revisionGetInput = z.object({
  id: z.string().uuid(),
});

/**
 * Revision restore input schema
 */
const revisionRestoreInput = z.object({
  documentId: z.string().uuid(),
  revisionId: z.string().uuid(),
});

/**
 * Revision router
 */
export const revisionRouter = router({
  /**
   * List revisions for a document
   * Returns revisions in descending order (newest first)
   * Limited to 100 revisions per page
   */
  list: workspaceProcedure
    .input(revisionListInput)
    .query(async ({ ctx, input }) => {
      const { repository } = ctx;
      const { documentId, limit } = input;

      // Verify document exists and belongs to workspace
      const document = await repository.getDocument(documentId);
      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      const revisions = await repository.getDocumentRevisions(documentId, {
        limit,
      });

      return revisions;
    }),

  /**
   * Get a single revision by ID
   */
  get: workspaceProcedure
    .input(revisionGetInput)
    .query(async ({ ctx, input }) => {
      const { repository } = ctx;
      const revision = await repository.getDocumentRevision(input.id);

      if (!revision) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Revision not found',
        });
      }

      return revision;
    }),

  /**
   * Restore a revision
   * Creates a new version with the content from the specified revision
   * Does not rewrite history - appends to version history
   */
  restore: editorProcedure
    .input(revisionRestoreInput)
    .mutation(async ({ ctx, input }) => {
      const { repository, user } = ctx;
      const { documentId, revisionId } = input;

      // Restore the revision (creates new version with old content)
      const restoredDoc = await repository.restoreDocumentRevision(
        documentId,
        revisionId,
        user.id
      );

      // Log audit trail
      await repository.createAuditLog({
        userId: user.id,
        action: 'document.revision_restored',
        entityType: 'document',
        entityId: documentId,
        metadata: {
          revisionId,
          newVersion: restoredDoc.version,
          videoId: restoredDoc.videoId,
          type: restoredDoc.type,
        },
      });

      return restoredDoc;
    }),
});
