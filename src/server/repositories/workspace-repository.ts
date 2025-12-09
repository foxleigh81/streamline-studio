/**
 * Workspace Repository
 *
 * The ONLY interface for accessing workspace-scoped data.
 * All queries MUST go through this pattern to ensure proper isolation.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { eq, and, desc, asc, gt, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  videos,
  documents,
  categories,
  videoCategories,
  auditLog,
  documentRevisions,
  type Video,
  type NewVideo,
  type Document,
  type NewDocument,
  type Category,
  type NewCategory,
  type VideoStatus,
  type DocumentType,
  type AuditLogEntry,
  type NewAuditLogEntry,
  type DocumentRevision,
} from '@/server/db/schema';
import type * as schema from '@/server/db/schema';

/**
 * Pagination options for list queries
 */
export interface PaginationOptions {
  cursor?: string;
  limit?: number;
}

/**
 * Video list options
 */
export interface VideoListOptions extends PaginationOptions {
  status?: VideoStatus;
  orderBy?: 'createdAt' | 'updatedAt' | 'dueDate' | 'title';
  orderDir?: 'asc' | 'desc';
}

/**
 * Document list options
 */
export interface DocumentListOptions extends PaginationOptions {
  videoId?: string;
  type?: DocumentType;
}

/**
 * Category list options
 */
export interface CategoryListOptions extends PaginationOptions {
  orderBy?: 'name' | 'createdAt';
  orderDir?: 'asc' | 'desc';
}

/**
 * Default pagination limit
 */
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * WorkspaceRepository - Enforces workspace scoping on ALL queries
 *
 * This class is the ONLY way to access workspace-scoped data.
 * Every method automatically includes workspace_id filtering.
 *
 * SECURITY: Never bypass this class for direct database queries.
 *
 * @example
 * ```typescript
 * const repo = new WorkspaceRepository(db, workspaceId);
 * const videos = await repo.getVideos({ status: 'scripting' });
 * const video = await repo.getVideo(videoId); // Returns null if wrong workspace
 * ```
 */
export class WorkspaceRepository {
  private readonly db: NodePgDatabase<typeof schema>;
  private readonly workspaceId: string;

  constructor(db: NodePgDatabase<typeof schema>, workspaceId: string) {
    if (!workspaceId) {
      throw new Error('WorkspaceRepository requires a workspaceId');
    }
    this.db = db;
    this.workspaceId = workspaceId;
  }

  /**
   * Get the workspace ID this repository is scoped to
   */
  getWorkspaceId(): string {
    return this.workspaceId;
  }

  // ===========================================================================
  // VIDEOS
  // ===========================================================================

  /**
   * Get all videos in the workspace with optional filtering
   */
  async getVideos(options?: VideoListOptions): Promise<Video[]> {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);
    const conditions: SQL[] = [eq(videos.workspaceId, this.workspaceId)];

    if (options?.status) {
      conditions.push(eq(videos.status, options.status));
    }

    if (options?.cursor) {
      // Cursor-based pagination - get items after the cursor using gt (greater than)
      conditions.push(gt(videos.id, options.cursor));
    }

    let orderColumn:
      | typeof videos.createdAt
      | typeof videos.updatedAt
      | typeof videos.dueDate
      | typeof videos.title;
    switch (options?.orderBy) {
      case 'updatedAt':
        orderColumn = videos.updatedAt;
        break;
      case 'dueDate':
        orderColumn = videos.dueDate;
        break;
      case 'title':
        orderColumn = videos.title;
        break;
      default:
        orderColumn = videos.createdAt;
    }

    const orderFn = options?.orderDir === 'asc' ? asc : desc;

    return this.db
      .select()
      .from(videos)
      .where(and(...conditions))
      .orderBy(orderFn(orderColumn))
      .limit(limit);
  }

  /**
   * Get a single video by ID
   * Returns null if video doesn't exist or belongs to a different workspace
   */
  async getVideo(id: string): Promise<Video | null> {
    const result = await this.db
      .select()
      .from(videos)
      .where(and(eq(videos.id, id), eq(videos.workspaceId, this.workspaceId)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Create a new video in the workspace
   */
  async createVideo(
    data: Omit<NewVideo, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<Video> {
    const result = await this.db
      .insert(videos)
      .values({
        ...data,
        workspaceId: this.workspaceId,
      })
      .returning();

    const video = result[0];
    if (!video) {
      throw new Error('Failed to create video');
    }
    return video;
  }

  /**
   * Update a video by ID
   * Returns null if video doesn't exist or belongs to a different workspace
   */
  async updateVideo(
    id: string,
    data: Partial<Omit<NewVideo, 'id' | 'workspaceId' | 'createdAt'>>
  ): Promise<Video | null> {
    const result = await this.db
      .update(videos)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(videos.id, id), eq(videos.workspaceId, this.workspaceId)))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete a video by ID
   * Returns true if deleted, false if not found or wrong workspace
   */
  async deleteVideo(id: string): Promise<boolean> {
    const result = await this.db
      .delete(videos)
      .where(and(eq(videos.id, id), eq(videos.workspaceId, this.workspaceId)))
      .returning({ id: videos.id });

    return result.length > 0;
  }

  // ===========================================================================
  // DOCUMENTS
  // ===========================================================================

  /**
   * Get all documents with optional filtering
   * Note: Documents are scoped via their video's workspace
   */
  async getDocuments(options?: DocumentListOptions): Promise<Document[]> {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    // Build conditions array for WHERE clause
    const conditions: SQL[] = [eq(videos.workspaceId, this.workspaceId)];

    if (options?.videoId) {
      conditions.push(eq(documents.videoId, options.videoId));
    }

    if (options?.type) {
      conditions.push(eq(documents.type, options.type));
    }

    // Documents are workspace-scoped through their videos
    // We need to join with videos to ensure workspace isolation
    return this.db
      .select({
        id: documents.id,
        videoId: documents.videoId,
        type: documents.type,
        content: documents.content,
        version: documents.version,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        updatedBy: documents.updatedBy,
      })
      .from(documents)
      .innerJoin(videos, eq(documents.videoId, videos.id))
      .where(and(...conditions))
      .limit(limit);
  }

  /**
   * Get a single document by ID
   * Returns null if document doesn't exist or belongs to a different workspace's video
   */
  async getDocument(id: string): Promise<Document | null> {
    const result = await this.db
      .select({
        id: documents.id,
        videoId: documents.videoId,
        type: documents.type,
        content: documents.content,
        version: documents.version,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        updatedBy: documents.updatedBy,
      })
      .from(documents)
      .innerJoin(videos, eq(documents.videoId, videos.id))
      .where(
        and(eq(documents.id, id), eq(videos.workspaceId, this.workspaceId))
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Get documents for a specific video
   */
  async getDocumentsByVideo(videoId: string): Promise<Document[]> {
    // First verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      return [];
    }

    return this.db
      .select()
      .from(documents)
      .where(eq(documents.videoId, videoId));
  }

  /**
   * Get a specific document type for a video
   */
  async getDocumentByVideoAndType(
    videoId: string,
    type: DocumentType
  ): Promise<Document | null> {
    // First verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      return null;
    }

    const result = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.videoId, videoId), eq(documents.type, type)))
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Create a document for a video
   * Throws if video doesn't exist or belongs to a different workspace
   */
  async createDocument(
    data: Omit<NewDocument, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Document> {
    // Verify the video belongs to this workspace
    const video = await this.getVideo(data.videoId);
    if (!video) {
      throw new Error('Video not found or access denied');
    }

    const result = await this.db.insert(documents).values(data).returning();

    const document = result[0];
    if (!document) {
      throw new Error('Failed to create document');
    }
    return document;
  }

  /**
   * Update a document by ID
   * Returns null if document doesn't exist or belongs to a different workspace's video
   */
  async updateDocument(
    id: string,
    data: Partial<Omit<NewDocument, 'id' | 'videoId' | 'createdAt'>>
  ): Promise<Document | null> {
    // First verify the document belongs to a video in this workspace
    const existingDoc = await this.getDocument(id);
    if (!existingDoc) {
      return null;
    }

    const result = await this.db
      .update(documents)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, id))
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete a document by ID
   * Returns true if deleted, false if not found or wrong workspace
   */
  async deleteDocument(id: string): Promise<boolean> {
    // First verify the document belongs to a video in this workspace
    const existingDoc = await this.getDocument(id);
    if (!existingDoc) {
      return false;
    }

    const result = await this.db
      .delete(documents)
      .where(eq(documents.id, id))
      .returning({ id: documents.id });

    return result.length > 0;
  }

  // ===========================================================================
  // CATEGORIES
  // ===========================================================================

  /**
   * Get all categories in the workspace
   */
  async getCategories(options?: CategoryListOptions): Promise<Category[]> {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    let orderColumn: typeof categories.name | typeof categories.createdAt;
    switch (options?.orderBy) {
      case 'name':
        orderColumn = categories.name;
        break;
      default:
        orderColumn = categories.createdAt;
    }

    const orderFn = options?.orderDir === 'asc' ? asc : desc;

    return this.db
      .select()
      .from(categories)
      .where(eq(categories.workspaceId, this.workspaceId))
      .orderBy(orderFn(orderColumn))
      .limit(limit);
  }

  /**
   * Get a single category by ID
   * Returns null if category doesn't exist or belongs to a different workspace
   */
  async getCategory(id: string): Promise<Category | null> {
    const result = await this.db
      .select()
      .from(categories)
      .where(
        and(eq(categories.id, id), eq(categories.workspaceId, this.workspaceId))
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Create a new category in the workspace
   */
  async createCategory(
    data: Omit<NewCategory, 'id' | 'workspaceId' | 'createdAt' | 'updatedAt'>
  ): Promise<Category> {
    const result = await this.db
      .insert(categories)
      .values({
        ...data,
        workspaceId: this.workspaceId,
      })
      .returning();

    const category = result[0];
    if (!category) {
      throw new Error('Failed to create category');
    }
    return category;
  }

  /**
   * Update a category by ID
   * Returns null if category doesn't exist or belongs to a different workspace
   */
  async updateCategory(
    id: string,
    data: Partial<Omit<NewCategory, 'id' | 'workspaceId' | 'createdAt'>>
  ): Promise<Category | null> {
    const result = await this.db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(eq(categories.id, id), eq(categories.workspaceId, this.workspaceId))
      )
      .returning();

    return result[0] ?? null;
  }

  /**
   * Delete a category by ID
   * Returns true if deleted, false if not found or wrong workspace
   */
  async deleteCategory(id: string): Promise<boolean> {
    const result = await this.db
      .delete(categories)
      .where(
        and(eq(categories.id, id), eq(categories.workspaceId, this.workspaceId))
      )
      .returning({ id: categories.id });

    return result.length > 0;
  }

  // ===========================================================================
  // VIDEO CATEGORIES (MANY-TO-MANY)
  // ===========================================================================

  /**
   * Get categories for a video
   */
  async getVideoCategoryIds(videoId: string): Promise<string[]> {
    // First verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      return [];
    }

    const result = await this.db
      .select({ categoryId: videoCategories.categoryId })
      .from(videoCategories)
      .where(eq(videoCategories.videoId, videoId));

    return result.map((r) => r.categoryId);
  }

  /**
   * Set categories for a video (replaces existing)
   */
  async setVideoCategories(
    videoId: string,
    categoryIds: string[]
  ): Promise<void> {
    // Verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      throw new Error('Video not found or access denied');
    }

    // Verify all categories belong to this workspace
    for (const categoryId of categoryIds) {
      const category = await this.getCategory(categoryId);
      if (!category) {
        throw new Error(`Category ${categoryId} not found or access denied`);
      }
    }

    // Use a transaction to replace categories atomically
    await this.db.transaction(async (tx) => {
      // Delete existing
      await tx
        .delete(videoCategories)
        .where(eq(videoCategories.videoId, videoId));

      // Insert new
      if (categoryIds.length > 0) {
        await tx.insert(videoCategories).values(
          categoryIds.map((categoryId) => ({
            videoId,
            categoryId,
          }))
        );
      }
    });
  }

  /**
   * Add a category to a video
   */
  async addVideoCategory(videoId: string, categoryId: string): Promise<void> {
    // Verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      throw new Error('Video not found or access denied');
    }

    // Verify the category belongs to this workspace
    const category = await this.getCategory(categoryId);
    if (!category) {
      throw new Error('Category not found or access denied');
    }

    await this.db
      .insert(videoCategories)
      .values({ videoId, categoryId })
      .onConflictDoNothing();
  }

  /**
   * Remove a category from a video
   */
  async removeVideoCategory(
    videoId: string,
    categoryId: string
  ): Promise<void> {
    // Verify the video belongs to this workspace
    const video = await this.getVideo(videoId);
    if (!video) {
      throw new Error('Video not found or access denied');
    }

    await this.db
      .delete(videoCategories)
      .where(
        and(
          eq(videoCategories.videoId, videoId),
          eq(videoCategories.categoryId, categoryId)
        )
      );
  }

  // ===========================================================================
  // AUDIT LOG
  // ===========================================================================

  /**
   * Create an audit log entry
   * Always scoped to this workspace
   */
  async createAuditLog(
    data: Omit<NewAuditLogEntry, 'id' | 'workspaceId' | 'createdAt'>
  ): Promise<AuditLogEntry> {
    const result = await this.db
      .insert(auditLog)
      .values({
        ...data,
        workspaceId: this.workspaceId,
      })
      .returning();

    const entry = result[0];
    if (!entry) {
      throw new Error('Failed to create audit log entry');
    }
    return entry;
  }

  /**
   * Get audit log entries for this workspace
   */
  async getAuditLog(options?: PaginationOptions): Promise<AuditLogEntry[]> {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    return this.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.workspaceId, this.workspaceId))
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  /**
   * Get audit log entries for a specific entity
   */
  async getAuditLogForEntity(
    entityType: string,
    entityId: string,
    options?: PaginationOptions
  ): Promise<AuditLogEntry[]> {
    const limit = Math.min(options?.limit ?? DEFAULT_LIMIT, MAX_LIMIT);

    return this.db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.workspaceId, this.workspaceId),
          eq(auditLog.entityType, entityType),
          eq(auditLog.entityId, entityId)
        )
      )
      .orderBy(desc(auditLog.createdAt))
      .limit(limit);
  }

  // ===========================================================================
  // DOCUMENT REVISIONS
  // ===========================================================================

  /**
   * Update document with optimistic locking and revision creation
   * Uses SELECT FOR UPDATE to prevent race conditions
   *
   * @param id - Document ID
   * @param content - New content
   * @param expectedVersion - Expected current version
   * @param userId - User making the update
   * @returns Updated document or null if version mismatch
   * @throws Error if document not found or belongs to different workspace
   * @see ADR-009: Versioning and Audit Approach
   */
  async updateDocumentWithRevision(
    id: string,
    content: string,
    expectedVersion: number,
    userId: string
  ): Promise<{ document: Document; versionMatch: boolean }> {
    // First verify the document belongs to a video in this workspace
    const existingDoc = await this.getDocument(id);
    if (!existingDoc) {
      throw new Error('Document not found or access denied');
    }

    // Use a transaction with SELECT FOR UPDATE
    return await this.db.transaction(async (tx) => {
      // Lock the row and get current state
      const [current] = await tx
        .select()
        .from(documents)
        .where(eq(documents.id, id))
        .for('update');

      if (!current) {
        throw new Error('Document not found');
      }

      // Check version for optimistic concurrency control
      if (current.version !== expectedVersion) {
        // Return current document without updating
        return {
          document: current,
          versionMatch: false,
        };
      }

      // Create revision of current content (before update)
      await tx.insert(documentRevisions).values({
        documentId: id,
        content: current.content,
        version: current.version,
        createdBy: current.updatedBy ?? userId,
      });

      // Update document with new content and incremented version
      const [updated] = await tx
        .update(documents)
        .set({
          content,
          version: current.version + 1,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, id))
        .returning();

      if (!updated) {
        throw new Error('Failed to update document');
      }

      return {
        document: updated,
        versionMatch: true,
      };
    });
  }

  /**
   * Get revisions for a document
   * Returns revisions ordered by version descending (newest first)
   *
   * @param documentId - Document ID
   * @param options - Pagination options
   */
  async getDocumentRevisions(
    documentId: string,
    options?: PaginationOptions
  ): Promise<DocumentRevision[]> {
    // First verify the document belongs to a video in this workspace
    const document = await this.getDocument(documentId);
    if (!document) {
      return [];
    }

    const limit = Math.min(options?.limit ?? 100, 100); // Max 100 revisions per page

    return this.db
      .select()
      .from(documentRevisions)
      .where(eq(documentRevisions.documentId, documentId))
      .orderBy(desc(documentRevisions.createdAt))
      .limit(limit);
  }

  /**
   * Get a single revision by ID
   *
   * @param revisionId - Revision ID
   */
  async getDocumentRevision(
    revisionId: string
  ): Promise<DocumentRevision | null> {
    const result = await this.db
      .select({
        id: documentRevisions.id,
        documentId: documentRevisions.documentId,
        content: documentRevisions.content,
        version: documentRevisions.version,
        createdAt: documentRevisions.createdAt,
        createdBy: documentRevisions.createdBy,
      })
      .from(documentRevisions)
      .innerJoin(documents, eq(documentRevisions.documentId, documents.id))
      .innerJoin(videos, eq(documents.videoId, videos.id))
      .where(
        and(
          eq(documentRevisions.id, revisionId),
          eq(videos.workspaceId, this.workspaceId)
        )
      )
      .limit(1);

    return result[0] ?? null;
  }

  /**
   * Restore a revision (creates a new version with old content)
   * Does not rewrite history - appends to version history
   *
   * @param documentId - Document ID
   * @param revisionId - Revision ID to restore
   * @param userId - User performing the restore
   * @returns Updated document with restored content as new version
   * @see ADR-009: Versioning and Audit Approach
   */
  async restoreDocumentRevision(
    documentId: string,
    revisionId: string,
    userId: string
  ): Promise<Document> {
    // Verify the document belongs to this workspace
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('Document not found or access denied');
    }

    // Get the revision
    const revision = await this.getDocumentRevision(revisionId);
    if (!revision) {
      throw new Error('Revision not found or access denied');
    }

    // Verify the revision belongs to this document
    if (revision.documentId !== documentId) {
      throw new Error('Revision does not belong to this document');
    }

    // Use a transaction to create revision of current state and update
    return await this.db.transaction(async (tx) => {
      // Get current document state
      const [current] = await tx
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .for('update');

      if (!current) {
        throw new Error('Document not found');
      }

      // Create revision of current content
      await tx.insert(documentRevisions).values({
        documentId,
        content: current.content,
        version: current.version,
        createdBy: current.updatedBy ?? userId,
      });

      // Update document with restored content as new version
      const [restored] = await tx
        .update(documents)
        .set({
          content: revision.content,
          version: current.version + 1,
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(documents.id, documentId))
        .returning();

      if (!restored) {
        throw new Error('Failed to restore document');
      }

      return restored;
    });
  }
}

/**
 * Create a WorkspaceRepository instance
 *
 * @param db - Drizzle database instance
 * @param workspaceId - The workspace ID to scope all queries to
 */
export function createWorkspaceRepository(
  db: NodePgDatabase<typeof schema>,
  workspaceId: string
): WorkspaceRepository {
  return new WorkspaceRepository(db, workspaceId);
}
