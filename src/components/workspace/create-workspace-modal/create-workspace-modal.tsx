'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import {
  trapFocus,
  saveFocus,
  restoreFocus,
} from '@/lib/accessibility/focus-trap';
import styles from './create-workspace-modal.module.scss';

/**
 * Create workspace modal props
 */
export interface CreateWorkspaceModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Create Workspace Modal Component
 *
 * Modal for creating a new workspace in multi-tenant mode.
 * Generates a slug from the workspace name and redirects to the new workspace.
 */
export function CreateWorkspaceModal({
  isOpen,
  onClose,
}: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const router = useRouter();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const utils = trpc.useUtils();

  // Create workspace mutation
  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: (data) => {
      // Invalidate workspace list
      utils.workspace.list.invalidate();
      // Redirect to new workspace
      router.push(`/w/${data.slug}/videos`);
      // Close modal
      handleClose();
    },
    onError: (error) => {
      setNameError(error.message);
    },
  });

  /**
   * Reset form when modal opens/closes
   */
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = saveFocus();
    } else {
      setName('');
      setNameError('');
      restoreFocus(previousFocusRef.current);
    }
  }, [isOpen]);

  /**
   * Set up focus trap when modal opens
   */
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const cleanup = trapFocus(modalRef.current);
      return cleanup;
    }
    return undefined;
  }, [isOpen]);

  /**
   * Validate workspace name
   */
  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Workspace name is required');
      return false;
    }
    if (value.length > 100) {
      setNameError('Workspace name must be 100 characters or less');
      return false;
    }
    setNameError('');
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateName(name)) return;

    await createMutation.mutateAsync({ name: name.trim() });
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    if (!createMutation.isPending) {
      onClose();
    }
  };

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, createMutation.isPending]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-workspace-title"
    >
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.header}>
          <h2 id="create-workspace-title" className={styles.title}>
            Create New Workspace
          </h2>
          <button
            className={styles.closeButton}
            onClick={handleClose}
            disabled={createMutation.isPending}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            label="Workspace Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name && validateName(name)}
            error={nameError}
            placeholder="My Awesome Workspace"
            disabled={createMutation.isPending}
            autoFocus
            required
          />

          <p className={styles.helperText}>
            A unique URL slug will be automatically generated from your
            workspace name.
          </p>

          <div className={styles.actions}>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !name.trim()}
              isLoading={createMutation.isPending}
            >
              Create Workspace
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateWorkspaceModal.displayName = 'CreateWorkspaceModal';
