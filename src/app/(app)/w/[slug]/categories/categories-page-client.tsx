'use client';

import { useState, useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { ColorPicker, PRESET_COLORS } from '@/components/category/color-picker';
import { EmptyState } from '@/components/ui/empty-state';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  trapFocus,
  saveFocus,
  restoreFocus,
} from '@/lib/accessibility/focus-trap';
import { announce } from '@/lib/accessibility/aria';
import type { Category } from '@/server/db/schema';
import styles from './categories-page.module.scss';

/**
 * Categories Page Client Component
 *
 * Manages category CRUD operations with color picker.
 * Allows users to create, update, and delete categories.
 */
export function CategoriesPageClient({
  workspaceSlug,
}: {
  workspaceSlug: string;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(PRESET_COLORS[0]);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // Focus trap refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Queries
  const { data: categories, isLoading } = trpc.category.list.useQuery({
    orderBy: 'name',
    orderDir: 'asc',
  });

  // Mutations
  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      setNewName('');
      setNewColor(PRESET_COLORS[0]);
    },
  });

  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      setDeletingId(null);
    },
  });

  /**
   * Announce loading state changes to screen readers
   */
  useEffect(() => {
    if (isLoading) {
      announce('Loading categories...');
    } else if (categories && categories.length > 0) {
      announce(
        `Loaded ${categories.length} ${categories.length === 1 ? 'category' : 'categories'}`
      );
    } else {
      announce('No categories found');
    }
  }, [isLoading, categories?.length]);

  /**
   * Focus trap for delete dialog
   */
  useEffect(() => {
    if (!deletingId || !dialogRef.current) return;

    // Save the currently focused element
    previousFocusRef.current = saveFocus();

    // Set up focus trap
    const cleanup = trapFocus(dialogRef.current);

    // Handle Escape key to close dialog
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeletingId(null);
      }
    };

    document.addEventListener('keydown', handleEscape);

    // Cleanup on unmount or when dialog closes
    return () => {
      cleanup();
      document.removeEventListener('keydown', handleEscape);
      // Restore focus to the element that was focused before the dialog opened
      restoreFocus(previousFocusRef.current);
    };
  }, [deletingId]);

  /**
   * Handle create category
   */
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    createMutation.mutate({
      name: newName.trim(),
      color: newColor,
    });
  };

  /**
   * Handle start editing
   */
  const handleStartEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
  };

  /**
   * Handle save edit
   */
  const handleSaveEdit = () => {
    if (!editingId || !editName.trim()) return;

    updateMutation.mutate({
      id: editingId,
      name: editName.trim(),
      color: editColor,
    });
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  /**
   * Handle delete category
   */
  const handleDelete = () => {
    if (!deletingId) return;

    deleteMutation.mutate({ id: deletingId });
  };

  const breadcrumbItems = [
    { label: 'Workspace', href: `/w/${workspaceSlug}` },
    { label: 'Categories' },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumb items={breadcrumbItems} className={styles.breadcrumb} />

      <header className={styles.header}>
        <h1 className={styles.title}>Categories</h1>
        <p className={styles.subtitle}>
          Organize your videos with custom categories and colors.
        </p>
      </header>

      {/* Create category form */}
      <section
        className={styles.createSection}
        aria-labelledby="create-heading"
      >
        <h2 id="create-heading" className={styles.sectionTitle}>
          Create Category
        </h2>
        <form onSubmit={handleCreate} className={styles.createForm}>
          <div className={styles.formRow}>
            <div className={styles.inputGroup}>
              <label htmlFor="category-name" className={styles.label}>
                Name
              </label>
              <input
                id="category-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter category name"
                className={styles.input}
                maxLength={100}
                aria-required="true"
              />
            </div>

            <div className={styles.inputGroup}>
              <ColorPicker
                value={newColor}
                onChange={setNewColor}
                label="Color"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!newName.trim() || createMutation.isPending}
            isLoading={createMutation.isPending}
          >
            Create Category
          </Button>
        </form>
      </section>

      {/* Categories list */}
      <section className={styles.listSection} aria-labelledby="list-heading">
        <h2 id="list-heading" className={styles.sectionTitle}>
          All Categories
        </h2>

        {isLoading && (
          <div
            className={styles.loadingMessage}
            role="status"
            aria-live="polite"
          >
            Loading categories...
          </div>
        )}

        {!isLoading && categories && categories.length === 0 && (
          <EmptyState
            title="No categories yet"
            description="Create your first category to organize your videos."
          />
        )}

        {!isLoading && categories && categories.length > 0 && (
          <div className={styles.categoryList}>
            {categories.map((category) => {
              const isEditing = editingId === category.id;

              return (
                <div
                  key={category.id}
                  className={styles.categoryCard}
                  role="article"
                  aria-label={`Category: ${category.name}`}
                >
                  {isEditing ? (
                    // Edit mode
                    <div className={styles.editMode}>
                      <div className={styles.editRow}>
                        <div className={styles.inputGroup}>
                          <label
                            htmlFor={`edit-name-${category.id}`}
                            className={styles.label}
                          >
                            Name
                          </label>
                          <input
                            id={`edit-name-${category.id}`}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className={styles.input}
                            maxLength={100}
                            aria-required="true"
                          />
                        </div>

                        <div className={styles.inputGroup}>
                          <ColorPicker
                            value={editColor}
                            onChange={setEditColor}
                            label="Color"
                          />
                        </div>
                      </div>

                      <div className={styles.editActions}>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={
                            !editName.trim() || updateMutation.isPending
                          }
                          isLoading={updateMutation.isPending}
                        >
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={updateMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className={styles.categoryInfo}>
                        <div
                          className={styles.colorSwatch}
                          style={{ backgroundColor: category.color }}
                          aria-label={`Color: ${category.color}`}
                        />
                        <span className={styles.categoryName}>
                          {category.name}
                        </span>
                      </div>

                      <div className={styles.categoryActions}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(category)}
                          aria-label={`Edit ${category.name}`}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeletingId(category.id)}
                          aria-label={`Delete ${category.name}`}
                        >
                          Delete
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Delete confirmation dialog */}
      {deletingId && (
        <div
          className={styles.modal}
          role="alertdialog"
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
          aria-modal="true"
        >
          <div
            className={styles.modalOverlay}
            onClick={() => setDeletingId(null)}
          />
          <div className={styles.modalContent} ref={dialogRef}>
            <h3 id="delete-dialog-title" className={styles.modalTitle}>
              Delete Category
            </h3>
            <p
              id="delete-dialog-description"
              className={styles.modalDescription}
            >
              Are you sure you want to delete this category? This will unlink it
              from all videos, but videos will not be deleted.
            </p>
            <div className={styles.modalActions}>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                isLoading={deleteMutation.isPending}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeletingId(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

CategoriesPageClient.displayName = 'CategoriesPageClient';
