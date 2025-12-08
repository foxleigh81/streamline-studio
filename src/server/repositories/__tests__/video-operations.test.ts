/**
 * Workspace Repository - Video Operations Tests
 *
 * Tests for video CRUD operations in the WorkspaceRepository.
 * Verifies workspace isolation, pagination, and filtering.
 *
 * @see /docs/adrs/005-testing-strategy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getTestDatabase,
  resetTestDatabase,
  createTestWorkspace,
} from '@/test/helpers/database';
import { WorkspaceRepository } from '../workspace-repository';

describe('WorkspaceRepository - Video Operations', () => {
  let workspace1Id: string;
  let workspace2Id: string;
  let repo1: WorkspaceRepository;
  let repo2: WorkspaceRepository;

  beforeEach(async () => {
    await resetTestDatabase();
    const db = await getTestDatabase();

    // Create two workspaces for isolation testing
    const workspace1 = await createTestWorkspace({ name: 'Workspace 1' });
    const workspace2 = await createTestWorkspace({ name: 'Workspace 2' });

    workspace1Id = workspace1.id;
    workspace2Id = workspace2.id;

    repo1 = new WorkspaceRepository(db, workspace1Id);
    repo2 = new WorkspaceRepository(db, workspace2Id);
  });

  afterEach(async () => {
    await resetTestDatabase();
  });

  describe('createVideo', () => {
    it('creates video in correct workspace', async () => {
      const video = await repo1.createVideo({
        title: 'Test Video',
        description: 'Test description',
        status: 'idea',
      });

      expect(video.title).toBe('Test Video');
      expect(video.description).toBe('Test description');
      expect(video.status).toBe('idea');
      expect(video.workspaceId).toBe(workspace1Id);
    });

    it('sets default status to idea', async () => {
      const video = await repo1.createVideo({
        title: 'Default Status Video',
      });

      expect(video.status).toBe('idea');
    });

    it('generates UUID for video', async () => {
      const video = await repo1.createVideo({
        title: 'UUID Video',
      });

      expect(video.id).toBeTruthy();
      expect(video.id.length).toBe(36); // UUID format
    });

    it('sets createdAt and updatedAt timestamps', async () => {
      const before = new Date();
      const video = await repo1.createVideo({
        title: 'Timestamp Video',
      });
      const after = new Date();

      expect(video.createdAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
      expect(video.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(video.updatedAt.getTime()).toBeGreaterThanOrEqual(
        before.getTime()
      );
    });
  });

  describe('getVideo', () => {
    it('returns video from same workspace', async () => {
      const created = await repo1.createVideo({
        title: 'Video 1',
        status: 'scripting',
      });

      const retrieved = await repo1.getVideo(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Video 1');
    });

    it('returns null for video from different workspace', async () => {
      const video = await repo1.createVideo({
        title: 'Workspace 1 Video',
      });

      const retrieved = await repo2.getVideo(video.id);

      expect(retrieved).toBeNull();
    });

    it('returns null for non-existent video', async () => {
      const retrieved = await repo1.getVideo(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(retrieved).toBeNull();
    });
  });

  describe('getVideos', () => {
    beforeEach(async () => {
      // Create test videos
      await repo1.createVideo({ title: 'Video 1', status: 'idea' });
      await repo1.createVideo({ title: 'Video 2', status: 'scripting' });
      await repo1.createVideo({ title: 'Video 3', status: 'idea' });
      await repo2.createVideo({ title: 'Other Workspace Video' });
    });

    it('returns only videos from same workspace', async () => {
      const videos = await repo1.getVideos();

      expect(videos).toHaveLength(3);
      expect(videos.every((v) => v.workspaceId === workspace1Id)).toBe(true);
    });

    it('filters by status', async () => {
      const videos = await repo1.getVideos({ status: 'scripting' });

      expect(videos).toHaveLength(1);
      expect(videos[0]?.title).toBe('Video 2');
    });

    it('respects pagination limit', async () => {
      const videos = await repo1.getVideos({ limit: 2 });

      expect(videos).toHaveLength(2);
    });

    it('orders by createdAt desc by default', async () => {
      const videos = await repo1.getVideos();

      // Most recently created should be first
      expect(videos[0]?.title).toBe('Video 3');
    });

    it('supports ascending order', async () => {
      const videos = await repo1.getVideos({ orderDir: 'asc' });

      // Oldest first
      expect(videos[0]?.title).toBe('Video 1');
    });

    it('orders by title', async () => {
      const videos = await repo1.getVideos({
        orderBy: 'title',
        orderDir: 'asc',
      });

      expect(videos[0]?.title).toBe('Video 1');
      expect(videos[1]?.title).toBe('Video 2');
      expect(videos[2]?.title).toBe('Video 3');
    });

    it('returns empty array when no videos exist', async () => {
      const emptyWorkspace = await createTestWorkspace({ name: 'Empty' });
      const db = await getTestDatabase();
      const emptyRepo = new WorkspaceRepository(db, emptyWorkspace.id);

      const videos = await emptyRepo.getVideos();

      expect(videos).toHaveLength(0);
    });
  });

  describe('updateVideo', () => {
    it('updates video in same workspace', async () => {
      const video = await repo1.createVideo({
        title: 'Original Title',
        status: 'idea',
      });

      const updated = await repo1.updateVideo(video.id, {
        title: 'Updated Title',
        status: 'filming',
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.status).toBe('filming');
    });

    it('returns null when updating video from different workspace', async () => {
      const video = await repo1.createVideo({
        title: 'Video 1',
      });

      const updated = await repo2.updateVideo(video.id, {
        title: 'Should Not Update',
      });

      expect(updated).toBeNull();
    });

    it('updates updatedAt timestamp', async () => {
      const video = await repo1.createVideo({ title: 'Test' });

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await repo1.updateVideo(video.id, {
        title: 'Updated',
      });

      expect(updated?.updatedAt.getTime()).toBeGreaterThan(
        video.updatedAt.getTime()
      );
    });

    it('only updates specified fields', async () => {
      const video = await repo1.createVideo({
        title: 'Original',
        description: 'Original description',
        status: 'idea',
      });

      const updated = await repo1.updateVideo(video.id, {
        title: 'Updated Title',
      });

      expect(updated?.title).toBe('Updated Title');
      expect(updated?.description).toBe('Original description');
      expect(updated?.status).toBe('idea');
    });

    it('returns null for non-existent video', async () => {
      const updated = await repo1.updateVideo(
        '00000000-0000-0000-0000-000000000000',
        {
          title: 'Test',
        }
      );

      expect(updated).toBeNull();
    });
  });

  describe('deleteVideo', () => {
    it('deletes video from same workspace', async () => {
      const video = await repo1.createVideo({ title: 'To Delete' });

      const deleted = await repo1.deleteVideo(video.id);

      expect(deleted).toBe(true);

      const retrieved = await repo1.getVideo(video.id);
      expect(retrieved).toBeNull();
    });

    it('returns false when deleting from different workspace', async () => {
      const video = await repo1.createVideo({ title: 'Video 1' });

      const deleted = await repo2.deleteVideo(video.id);

      expect(deleted).toBe(false);

      // Video should still exist
      const retrieved = await repo1.getVideo(video.id);
      expect(retrieved).not.toBeNull();
    });

    it('returns false for non-existent video', async () => {
      const deleted = await repo1.deleteVideo(
        '00000000-0000-0000-0000-000000000000'
      );

      expect(deleted).toBe(false);
    });
  });

  describe('Workspace Isolation', () => {
    it('completely isolates data between workspaces', async () => {
      // Create videos in both workspaces
      const video1 = await repo1.createVideo({ title: 'Workspace 1 Video' });
      const video2 = await repo2.createVideo({ title: 'Workspace 2 Video' });

      // Verify isolation
      const repo1Videos = await repo1.getVideos();
      const repo2Videos = await repo2.getVideos();

      expect(repo1Videos).toHaveLength(1);
      expect(repo1Videos[0]?.title).toBe('Workspace 1 Video');

      expect(repo2Videos).toHaveLength(1);
      expect(repo2Videos[0]?.title).toBe('Workspace 2 Video');

      // Cross-workspace access should fail
      expect(await repo1.getVideo(video2.id)).toBeNull();
      expect(await repo2.getVideo(video1.id)).toBeNull();

      expect(
        await repo1.updateVideo(video2.id, { title: 'Hacked' })
      ).toBeNull();
      expect(
        await repo2.updateVideo(video1.id, { title: 'Hacked' })
      ).toBeNull();

      expect(await repo1.deleteVideo(video2.id)).toBe(false);
      expect(await repo2.deleteVideo(video1.id)).toBe(false);
    });
  });

  describe('Video Status Workflow', () => {
    it('supports all video statuses', async () => {
      const statuses = [
        'idea',
        'scripting',
        'filming',
        'editing',
        'review',
        'scheduled',
        'published',
        'archived',
      ] as const;

      for (const status of statuses) {
        const video = await repo1.createVideo({
          title: `Video in ${status}`,
          status,
        });

        expect(video.status).toBe(status);
      }
    });

    it('can transition between statuses', async () => {
      const video = await repo1.createVideo({
        title: 'Workflow Video',
        status: 'idea',
      });

      // Progress through workflow
      let updated = await repo1.updateVideo(video.id, { status: 'scripting' });
      expect(updated?.status).toBe('scripting');

      updated = await repo1.updateVideo(video.id, { status: 'filming' });
      expect(updated?.status).toBe('filming');

      updated = await repo1.updateVideo(video.id, { status: 'editing' });
      expect(updated?.status).toBe('editing');

      updated = await repo1.updateVideo(video.id, { status: 'published' });
      expect(updated?.status).toBe('published');
    });
  });
});
