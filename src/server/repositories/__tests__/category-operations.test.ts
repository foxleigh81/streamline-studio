/**
 * Workspace Repository - Category Operations Tests
 *
 * Tests for category CRUD operations and video-category relationships.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll } from 'vitest';
import {
  getTestDatabase,
  resetTestDatabase,
  createTestWorkspace,
  createTestVideo,
  isDatabaseAvailable,
} from '@/test/helpers/database';
import { ProjectRepository } from '../project-repository';

// Check database availability before running tests
let dbAvailable = false;

beforeAll(async () => {
  dbAvailable = await isDatabaseAvailable();
});

describe('ProjectRepository - Category Operations', () => {
  let workspace1Id: string;
  let workspace2Id: string;
  let repo1: ProjectRepository;
  let repo2: ProjectRepository;

  beforeEach(async (ctx) => {
    if (!dbAvailable) {
      ctx.skip();
      return;
    }
    await resetTestDatabase();
    const db = await getTestDatabase();

    const workspace1 = await createTestWorkspace({ name: 'Workspace 1' });
    const workspace2 = await createTestWorkspace({ name: 'Workspace 2' });

    workspace1Id = workspace1.id;
    workspace2Id = workspace2.id;

    repo1 = new ProjectRepository(db, workspace1Id);
    repo2 = new ProjectRepository(db, workspace2Id);
  });

  afterEach(async () => {
    if (!dbAvailable) return;
    await resetTestDatabase();
  });

  describe('createCategory', () => {
    it('creates category in correct workspace', async () => {
      const category = await repo1.createCategory({
        name: 'Tutorials',
        color: '#3498DB',
      });

      expect(category.name).toBe('Tutorials');
      expect(category.color).toBe('#3498DB');
      expect(category.workspaceId).toBe(workspace1Id);
    });

    it('uses default color if not provided', async () => {
      const category = await repo1.createCategory({
        name: 'No Color',
      });

      expect(category.color).toBe('#6B7280'); // Default gray
    });
  });

  describe('getCategory', () => {
    it('returns category from same workspace', async () => {
      const created = await repo1.createCategory({ name: 'Test' });

      const retrieved = await repo1.getCategory(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.name).toBe('Test');
    });

    it('returns null for category in different workspace', async () => {
      const created = await repo1.createCategory({ name: 'Test' });

      const retrieved = await repo2.getCategory(created.id);

      expect(retrieved).toBeNull();
    });
  });

  describe('getCategories', () => {
    beforeEach(async () => {
      await repo1.createCategory({ name: 'Category A' });
      await repo1.createCategory({ name: 'Category B' });
      await repo1.createCategory({ name: 'Category C' });
      await repo2.createCategory({ name: 'Other Workspace Category' });
    });

    it('returns only categories from same workspace', async () => {
      const categories = await repo1.getCategories();

      expect(categories).toHaveLength(3);
      expect(categories.every((c) => c.workspaceId === workspace1Id)).toBe(
        true
      );
    });

    it('orders by name ascending', async () => {
      const categories = await repo1.getCategories({
        orderBy: 'name',
        orderDir: 'asc',
      });

      expect(categories[0]?.name).toBe('Category A');
      expect(categories[1]?.name).toBe('Category B');
      expect(categories[2]?.name).toBe('Category C');
    });

    it('respects limit', async () => {
      const categories = await repo1.getCategories({ limit: 2 });

      expect(categories).toHaveLength(2);
    });
  });

  describe('updateCategory', () => {
    it('updates category in same workspace', async () => {
      const category = await repo1.createCategory({
        name: 'Original',
        color: '#000000',
      });

      const updated = await repo1.updateCategory(category.id, {
        name: 'Updated',
        color: '#FFFFFF',
      });

      expect(updated?.name).toBe('Updated');
      expect(updated?.color).toBe('#FFFFFF');
    });

    it('returns null for category in different workspace', async () => {
      const category = await repo1.createCategory({ name: 'Test' });

      const updated = await repo2.updateCategory(category.id, {
        name: 'Hacked',
      });

      expect(updated).toBeNull();
    });
  });

  describe('deleteCategory', () => {
    it('deletes category from same workspace', async () => {
      const category = await repo1.createCategory({ name: 'To Delete' });

      const deleted = await repo1.deleteCategory(category.id);

      expect(deleted).toBe(true);

      const retrieved = await repo1.getCategory(category.id);
      expect(retrieved).toBeNull();
    });

    it('returns false for category in different workspace', async () => {
      const category = await repo1.createCategory({ name: 'Test' });

      const deleted = await repo2.deleteCategory(category.id);

      expect(deleted).toBe(false);
    });
  });

  describe('Video-Category Relationships', () => {
    let videoId: string;
    let category1Id: string;
    let category2Id: string;

    beforeEach(async () => {
      const video = await createTestVideo(workspace1Id, {
        title: 'Test Video',
      });
      const category1 = await repo1.createCategory({ name: 'Category 1' });
      const category2 = await repo1.createCategory({ name: 'Category 2' });

      videoId = video.id;
      category1Id = category1.id;
      category2Id = category2.id;
    });

    describe('addVideoCategory', () => {
      it('adds category to video', async () => {
        await repo1.addVideoCategory(videoId, category1Id);

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).toContain(category1Id);
      });

      it('throws error for video in different workspace', async () => {
        const otherVideo = await createTestVideo(workspace2Id, {
          title: 'Other',
        });

        await expect(
          repo1.addVideoCategory(otherVideo.id, category1Id)
        ).rejects.toThrow('Video not found or access denied');
      });

      it('throws error for category in different workspace', async () => {
        const otherCategory = await repo2.createCategory({ name: 'Other' });

        await expect(
          repo1.addVideoCategory(videoId, otherCategory.id)
        ).rejects.toThrow('Category not found or access denied');
      });

      it('handles duplicate additions gracefully', async () => {
        await repo1.addVideoCategory(videoId, category1Id);
        await repo1.addVideoCategory(videoId, category1Id); // Should not throw

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).toHaveLength(1);
      });
    });

    describe('removeVideoCategory', () => {
      it('removes category from video', async () => {
        await repo1.addVideoCategory(videoId, category1Id);
        await repo1.removeVideoCategory(videoId, category1Id);

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).not.toContain(category1Id);
      });

      it('throws error for video in different workspace', async () => {
        const otherVideo = await createTestVideo(workspace2Id, {
          title: 'Other',
        });

        await expect(
          repo1.removeVideoCategory(otherVideo.id, category1Id)
        ).rejects.toThrow('Video not found or access denied');
      });
    });

    describe('setVideoCategories', () => {
      it('sets categories for video (replaces existing)', async () => {
        await repo1.addVideoCategory(videoId, category1Id);

        await repo1.setVideoCategories(videoId, [category2Id]);

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).not.toContain(category1Id);
        expect(categoryIds).toContain(category2Id);
      });

      it('clears categories when passed empty array', async () => {
        await repo1.addVideoCategory(videoId, category1Id);
        await repo1.addVideoCategory(videoId, category2Id);

        await repo1.setVideoCategories(videoId, []);

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).toHaveLength(0);
      });

      it('throws error for category in different workspace', async () => {
        const otherCategory = await repo2.createCategory({ name: 'Other' });

        await expect(
          repo1.setVideoCategories(videoId, [otherCategory.id])
        ).rejects.toThrow('Categories not found or access denied');
      });
    });

    describe('getVideoCategoryIds', () => {
      it('returns all category IDs for video', async () => {
        await repo1.addVideoCategory(videoId, category1Id);
        await repo1.addVideoCategory(videoId, category2Id);

        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).toHaveLength(2);
        expect(categoryIds).toContain(category1Id);
        expect(categoryIds).toContain(category2Id);
      });

      it('returns empty array for video in different workspace', async () => {
        const otherVideo = await createTestVideo(workspace2Id, {
          title: 'Other',
        });

        const categoryIds = await repo1.getVideoCategoryIds(otherVideo.id);

        expect(categoryIds).toHaveLength(0);
      });

      it('returns empty array for video with no categories', async () => {
        const categoryIds = await repo1.getVideoCategoryIds(videoId);

        expect(categoryIds).toHaveLength(0);
      });
    });
  });
});
