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
 * Document import input schema
 * File size limited to 1MB as per ADR-010
 */
const documentImportInput = z.object({
  id: z.string().uuid(),
  content: z
    .string()
    .max(1000000, 'Document import exceeds 1MB limit')
    .refine(
      (val) => {
        // Validate UTF-8 by checking if string is valid
        try {
          new TextEncoder().encode(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Invalid UTF-8 encoding' }
    ),
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
   * This endpoint uses version checking with SELECT FOR UPDATE to prevent
   * concurrent edit conflicts. If the expectedVersion doesn't match the
   * current version, it returns a CONFLICT error with the current document state.
   *
   * On successful update, a revision is created atomically in a transaction.
   *
   * @see ADR-009: Versioning and Audit Approach
   */
  update: editorProcedure
    .input(documentUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { repository, user } = ctx;
      const { id, content, expectedVersion } = input;

      // Update document with optimistic locking and revision creation
      const result = await repository.updateDocumentWithRevision(
        id,
        content,
        expectedVersion,
        user.id
      );

      // Check if version matched
      if (!result.versionMatch) {
        throw new TRPCError({
          code: 'CONFLICT',
          message:
            'Document has been modified by another user. Please review the changes and try again.',
          cause: {
            currentVersion: result.document.version,
            expectedVersion,
            currentContent: result.document.content,
          },
        });
      }

      const updatedDoc = result.document;

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

  /**
   * Import document content from uploaded file
   * Creates a new version (preserves history)
   *
   * @see ADR-010: Markdown Import/Export
   */
  import: editorProcedure
    .input(documentImportInput)
    .mutation(async ({ ctx, input }) => {
      const { repository, user } = ctx;
      const { id, content } = input;

      // Get current document
      const currentDoc = await repository.getDocument(id);
      if (!currentDoc) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Import creates a new version with imported content
      const result = await repository.updateDocumentWithRevision(
        id,
        content,
        currentDoc.version, // Use current version
        user.id
      );

      if (!result.versionMatch) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Document was modified during import. Please try again.',
          cause: {
            currentVersion: result.document.version,
            expectedVersion: currentDoc.version,
          },
        });
      }

      // Log audit trail
      await repository.createAuditLog({
        userId: user.id,
        action: 'document.imported',
        entityType: 'document',
        entityId: id,
        metadata: {
          videoId: result.document.videoId,
          type: result.document.type,
          version: result.document.version,
          contentLength: content.length,
        },
      });

      return result.document;
    }),

  /**
   * Export document content as markdown
   * Returns content and metadata for download
   *
   * @see ADR-010: Markdown Import/Export
   */
  export: workspaceProcedure
    .input(documentGetInput)
    .query(async ({ ctx, input }) => {
      const { repository } = ctx;
      const document = await repository.getDocument(input.id);

      if (!document) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Document not found',
        });
      }

      // Get video details for filename
      const video = await repository.getVideo(document.videoId);
      if (!video) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Associated video not found',
        });
      }

      // Sanitize filename: replace special characters with dashes
      const sanitizeFilename = (name: string): string => {
        return name
          .toLowerCase()
          .replace(/[^a-z0-9-]/gi, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
      };

      const filename = `${sanitizeFilename(video.title)}-${document.type}.md`;

      return {
        content: document.content,
        filename,
        metadata: {
          videoTitle: video.title,
          documentType: document.type,
          version: document.version,
          updatedAt: document.updatedAt,
        },
      };
    }),
});
