'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/components/category/category-selector';
import type { Category } from '@/components/category/category-selector';
import type { VideoStatus } from '@/server/db/schema';
import styles from './video-form-modal.module.scss';

/**
 * Video status options for validation
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
 * Video form validation schema
 */
const videoFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title is too long'),
  description: z.string().optional(),
  status: z.enum(videoStatusValues as [VideoStatus, ...VideoStatus[]]),
  dueDate: z.string().optional(),
  categoryIds: z.array(z.string()),
});

/**
 * Video form data type
 */
export type VideoFormData = z.infer<typeof videoFormSchema>;

/**
 * VideoFormModal component props
 */
export interface VideoFormModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Callback when form is submitted */
  onSubmit: (data: VideoFormData) => void | Promise<void>;
  /** Available categories */
  categories: Category[];
  /** Initial form values (for editing) */
  initialValues?: Partial<VideoFormData>;
  /** Whether the form is submitting */
  isSubmitting?: boolean;
  /** Modal title */
  title?: string;
  /** Submit button text */
  submitButtonText?: string;
}

/**
 * VideoFormModal Component
 *
 * Modal dialog containing a form for creating or editing videos.
 * Uses react-hook-form with Zod validation and Radix UI Dialog.
 */
export function VideoFormModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
  initialValues,
  isSubmitting = false,
  title = 'Create Video',
  submitButtonText = 'Create',
}: VideoFormModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<VideoFormData>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      description: initialValues?.description ?? '',
      status: initialValues?.status ?? 'idea',
      dueDate: initialValues?.dueDate ?? '',
      categoryIds: initialValues?.categoryIds ?? [],
    },
  });

  // Watch category IDs for the CategorySelector
  const categoryIds = watch('categoryIds');

  /**
   * Reset form when modal closes or initialValues change
   */
  useEffect(() => {
    if (isOpen) {
      reset({
        title: initialValues?.title ?? '',
        description: initialValues?.description ?? '',
        status: initialValues?.status ?? 'idea',
        dueDate: initialValues?.dueDate ?? '',
        categoryIds: initialValues?.categoryIds ?? [],
      });
    }
  }, [isOpen, initialValues, reset]);

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: VideoFormData) => {
    await onSubmit(data);
  };

  /**
   * Handle category selection change
   */
  const handleCategoryChange = (newCategoryIds: string[]) => {
    setValue('categoryIds', newCategoryIds, { shouldValidate: true });
  };

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => !open && !isSubmitting && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="form-description"
          onPointerDownOutside={(e) => {
            if (isSubmitting) {
              e.preventDefault();
            }
          }}
        >
          <Dialog.Title className={styles.title}>{title}</Dialog.Title>

          <Dialog.Description id="form-description" className={styles.srOnly}>
            Fill out the form to {title.toLowerCase()}
          </Dialog.Description>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className={styles.form}
          >
            {/* Title */}
            <Input
              label="Title *"
              {...register('title')}
              error={errors.title?.message}
              placeholder="Enter video title"
              disabled={isSubmitting}
            />

            {/* Description */}
            <div className={styles.field}>
              <label htmlFor="description" className={styles.label}>
                Description
              </label>
              <textarea
                id="description"
                {...register('description')}
                className={styles.textarea}
                placeholder="Enter video description (optional)"
                rows={3}
                disabled={isSubmitting}
              />
              {errors.description && (
                <span className={styles.error} role="alert">
                  {errors.description.message}
                </span>
              )}
            </div>

            {/* Status */}
            <div className={styles.field}>
              <label htmlFor="status" className={styles.label}>
                Status *
              </label>
              <select
                id="status"
                {...register('status')}
                className={styles.select}
                disabled={isSubmitting}
              >
                <option value="idea">Idea</option>
                <option value="scripting">Scripting</option>
                <option value="filming">Filming</option>
                <option value="editing">Editing</option>
                <option value="review">Review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
              {errors.status && (
                <span className={styles.error} role="alert">
                  {errors.status.message}
                </span>
              )}
            </div>

            {/* Due Date */}
            <Input
              label="Due Date"
              type="date"
              {...register('dueDate')}
              error={errors.dueDate?.message}
              disabled={isSubmitting}
            />

            {/* Categories */}
            <CategorySelector
              label="Categories"
              categories={categories}
              selectedIds={categoryIds}
              onChange={handleCategoryChange}
              error={errors.categoryIds?.message}
              disabled={isSubmitting}
            />

            {/* Actions */}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : submitButtonText}
              </Button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className={styles.closeButton}
              aria-label="Close"
              disabled={isSubmitting}
              type="button"
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

VideoFormModal.displayName = 'VideoFormModal';
