/**
 * Category tRPC Router
 *
 * Handles category CRUD operations with workspace scoping.
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
import {
  logCategoryCreated,
  logCategoryUpdated,
  logCategoryDeleted,
} from '@/lib/audit-log';

/**
 * Preset color palette for categories
 * These are hex color codes that can be used for category colors
 */
export const CATEGORY_COLOR_PALETTE = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#EAB308', // Yellow
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
  '#6B7280', // Gray (default)
] as const;

/**
 * Category list input schema
 */
const categoryListInput = z.object({
  orderBy: z.enum(['name', 'createdAt']).default('name'),
  orderDir: z.enum(['asc', 'desc']).default('asc'),
  limit: z.number().min(1).max(100).default(100),
});

/**
 * Category create input schema
 */
const categoryCreateInput = z.object({
  name: z.string().min(1).max(100),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default('#6B7280'),
});

/**
 * Category update input schema
 */
const categoryUpdateInput = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

/**
 * Category router
 */
export const categoryRouter = router({
  /**
   * List all categories in the channel
   */
  list: simpleChannelProcedure
    .input(categoryListInput)
    .query(async ({ ctx, input }) => {
      const categories = await ctx.channelRepository.getCategories({
        orderBy: input.orderBy,
        orderDir: input.orderDir,
        limit: input.limit,
      });

      return categories;
    }),

  /**
   * Get a single category by ID
   */
  get: simpleChannelProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const category = await ctx.channelRepository.getCategory(input.id);

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      return category;
    }),

  /**
   * Create a new category
   */
  create: simpleChannelEditorProcedure
    .input(categoryCreateInput)
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;

      const category = await channelRepository.createCategory(input);

      // Log audit trail with specific service
      await logCategoryCreated(
        channelRepository,
        category.id,
        user.id,
        category.name,
        category.color
      );

      return category;
    }),

  /**
   * Update a category
   */
  update: simpleChannelEditorProcedure
    .input(categoryUpdateInput)
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;
      const { id, ...updateData } = input;

      // Get current category for audit logging
      const currentCategory = await channelRepository.getCategory(id);
      if (!currentCategory) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      const category = await channelRepository.updateCategory(id, updateData);

      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Log audit trail with specific service
      await logCategoryUpdated(
        channelRepository,
        id,
        user.id,
        currentCategory.name,
        updateData.name,
        currentCategory.color,
        updateData.color
      );

      return category;
    }),

  /**
   * Delete a category
   * This will unlink the category from all videos (no cascade deletion)
   * The database schema has onDelete: 'cascade' for videoCategories,
   * so the join table entries will be automatically removed
   */
  delete: simpleChannelEditorProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { channelRepository, user } = ctx;

      // Get category details before deletion for audit log
      const category = await channelRepository.getCategory(input.id);
      if (!category) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Category not found',
        });
      }

      // Delete the category
      // The videoCategories join table entries will be automatically removed
      // due to onDelete: 'cascade' in the schema
      const deleted = await channelRepository.deleteCategory(input.id);

      if (!deleted) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete category',
        });
      }

      // Log audit trail with specific service
      await logCategoryDeleted(
        channelRepository,
        input.id,
        user.id,
        category.name
      );

      return { success: true };
    }),

  /**
   * Get the preset color palette
   */
  getColorPalette: simpleChannelProcedure.query(() => {
    return CATEGORY_COLOR_PALETTE;
  }),
});
