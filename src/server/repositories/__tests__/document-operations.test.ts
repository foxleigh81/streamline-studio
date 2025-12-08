/**
 * Workspace Repository - Document Operations Tests
 *
 * Tests for document CRUD operations in the WorkspaceRepository.
 * Documents are scoped through their associated videos.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/009-versioning-and-audit.md
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  getTestDatabase,
  resetTestDatabase,
  createTestWorkspace,
  createTestVideo,
  isDatabaseAvailable,
} from '@/test/helpers/database';
import { WorkspaceRepository } from '../workspace-repository';

// Check database availability before running tests
let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
});

describe('WorkspaceRepository - Document Operations', () => {
  let workspace1Id: string;
  let workspace2Id: string;
  let video1Id: string;
  let video2Id: string;
  let repo1: WorkspaceRepository;
  let repo2: WorkspaceRepository;

  beforeEach(async (ctx) => {
    if (!dbAvailable) {
      ctx.skip();
      return;
    }
    await resetTestDatabase();
    const db = await getTestDatabase();

    // Create workspaces
    const workspace1 = await createTestWorkspace({ name: 'Workspace 1' });
    const workspace2 = await createTestWorkspace({ name: 'Workspace 2' });

    workspace1Id = workspace1.id;
    workspace2Id = workspace2.id;

    repo1 = new WorkspaceRepository(db, workspace1Id);
    repo2 = new WorkspaceRepository(db, workspace2Id);

    // Create videos in each workspace
    const video1 = await createTestVideo(workspace1Id, { title: 'Video 1' });
    const video2 = await createTestVideo(workspace2Id, { title: 'Video 2' });

    video1Id = video1.id;
    video2Id = video2.id;
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await resetTestDatabase();
  });

  describe('createDocument', () => {
    it('creates document for video in same workspace', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: '# Video Script\n\nThis is the script.',
      });

      expect(document.videoId).toBe(video1Id);
      expect(document.type).toBe('script');
      expect(document.content).toBe('# Video Script\n\nThis is the script.');
    });

    it('throws error for video in different workspace', async () => {
      await expect(
        repo1.createDocument({
          videoId: video2Id,
          type: 'script',
          content: 'Should not work',
        })
      ).rejects.toThrow('Video not found or access denied');
    });

    it('sets default version to 1', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'description',
        content: 'Description content',
      });

      expect(document.version).toBe(1);
    });

    it('supports all document types', async () => {
      const types = [
        'script',
        'description',
        'notes',
        'thumbnail_ideas',
      ] as const;

      for (const type of types) {
        const document = await repo1.createDocument({
          videoId: video1Id,
          type,
          content: `Content for ${type}`,
        });

        expect(document.type).toBe(type);
      }
    });
  });

  describe('getDocument', () => {
    it('returns document from same workspace', async () => {
      const created = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Test content',
      });

      const retrieved = await repo1.getDocument(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
    });

    it('returns null for document in different workspace', async () => {
      const created = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Test content',
      });

      const retrieved = await repo2.getDocument(created.id);

      expect(retrieved).toBeNull();
    });

    it('returns null for non-existent document', async () => {
      const retrieved = await repo1.getDocument(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(retrieved).toBeNull();
    });
  });

  describe('getDocumentsByVideo', () => {
    beforeEach(async () => {
      // Create multiple documents for video1
      await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Script content',
      });
      await repo1.createDocument({
        videoId: video1Id,
        type: 'description',
        content: 'Description content',
      });
      await repo1.createDocument({
        videoId: video1Id,
        type: 'notes',
        content: 'Notes content',
      });
    });

    it('returns all documents for video', async () => {
      const documents = await repo1.getDocumentsByVideo(video1Id);

      expect(documents).toHaveLength(3);
    });

    it('returns empty array for video in different workspace', async () => {
      const documents = await repo1.getDocumentsByVideo(video2Id);

      expect(documents).toHaveLength(0);
    });

    it('returns empty array for non-existent video', async () => {
      const documents = await repo1.getDocumentsByVideo(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(documents).toHaveLength(0);
    });
  });

  describe('getDocumentByVideoAndType', () => {
    it('returns specific document type for video', async () => {
      await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Script content',
      });
      await repo1.createDocument({
        videoId: video1Id,
        type: 'description',
        content: 'Description content',
      });

      const script = await repo1.getDocumentByVideoAndType(video1Id, 'script');
      const description = await repo1.getDocumentByVideoAndType(
        video1Id,
        'description'
      );

      expect(script?.type).toBe('script');
      expect(script?.content).toBe('Script content');
      expect(description?.type).toBe('description');
      expect(description?.content).toBe('Description content');
    });

    it('returns null for non-existent type', async () => {
      const document = await repo1.getDocumentByVideoAndType(video1Id, 'notes');

      expect(document).toBeNull();
    });

    it('returns null for video in different workspace', async () => {
      await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Content',
      });

      const document = await repo2.getDocumentByVideoAndType(
        video1Id,
        'script'
      );

      expect(document).toBeNull();
    });
  });

  describe('updateDocument', () => {
    it('updates document content', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Original content',
      });

      const updated = await repo1.updateDocument(document.id, {
        content: 'Updated content',
      });

      expect(updated?.content).toBe('Updated content');
    });

    it('returns null for document in different workspace', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Content',
      });

      const updated = await repo2.updateDocument(document.id, {
        content: 'Hacked content',
      });

      expect(updated).toBeNull();
    });

    it('updates updatedAt timestamp', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Content',
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo1.updateDocument(document.id, {
        content: 'Updated',
      });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        document.updatedAt.getTime()
      );
    });

    it('can update version number', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Version 1',
        version: 1,
      });

      const updated = await repo1.updateDocument(document.id, {
        content: 'Version 2',
        version: 2,
      });

      expect(updated?.version).toBe(2);
    });
  });

  describe('deleteDocument', () => {
    it('deletes document from same workspace', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'To delete',
      });

      const deleted = await repo1.deleteDocument(document.id);

      expect(deleted).toBe(true);

      const retrieved = await repo1.getDocument(document.id);
      expect(retrieved).toBeNull();
    });

    it('returns false for document in different workspace', async () => {
      const document = await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Content',
      });

      const deleted = await repo2.deleteDocument(document.id);

      expect(deleted).toBe(false);
    });

    it('returns false for non-existent document', async () => {
      const deleted = await repo1.deleteDocument(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(deleted).toBe(false);
    });
  });

  describe('Document-Video Cascade', () => {
    it('deleting video deletes associated documents', async () => {
      await repo1.createDocument({
        videoId: video1Id,
        type: 'script',
        content: 'Content',
      });

      // Delete the video
      await repo1.deleteVideo(video1Id);

      // Document should be gone (cascade delete)
      const documents = await repo1.getDocumentsByVideo(video1Id);
      expect(documents).toHaveLength(0);
    });
  });
});
