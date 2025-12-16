'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc/client';
import { useTeamspaceSlug } from '@/lib/teamspace';
import {
  trapFocus,
  saveFocus,
  restoreFocus,
} from '@/lib/accessibility/focus-trap';
import styles from './create-project-modal.module.scss';

/**
 * Create project modal props
 */
export interface CreateProjectModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
}

/**
 * Create Project Modal Component
 *
 * Modal for creating a new project in multi-tenant mode.
 * Generates a slug from the project name and redirects to the new project.
 */
export function CreateProjectModal({
  isOpen,
  onClose,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const router = useRouter();
  const teamspaceSlug = useTeamspaceSlug();

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const utils = trpc.useUtils();

  // Create project mutation
  const createMutation = trpc.project.create.useMutation({
    onSuccess: (data) => {
      // Invalidate project list
      utils.project.list.invalidate();
      // Redirect to new project using unified routing
      const effectiveTeamspace = teamspaceSlug ?? 'workspace';
      router.push(`/t/${effectiveTeamspace}/${data.slug}/content-plan`);
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
   * Validate project name
   */
  const validateName = (value: string): boolean => {
    if (!value.trim()) {
      setNameError('Project name is required');
      return false;
    }
    if (value.length > 100) {
      setNameError('Project name must be 100 characters or less');
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
      aria-labelledby="create-project-title"
    >
      <div ref={modalRef} className={styles.modal}>
        <div className={styles.header}>
          <h2 id="create-project-title" className={styles.title}>
            Create New Project
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
            label="Project Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name && validateName(name)}
            error={nameError}
            placeholder="My Awesome Project"
            disabled={createMutation.isPending}
            autoFocus
            required
          />

          <p className={styles.helperText}>
            A unique URL slug will be automatically generated from your project
            name.
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
              Create Project
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

CreateProjectModal.displayName = 'CreateProjectModal';
