'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { trpc } from '@/lib/trpc/client';
import styles from './modal.module.scss';

/**
 * Account settings form validation schema
 */
const accountFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name is too long'),
});

/**
 * Account settings form data type
 */
export type AccountFormData = z.infer<typeof accountFormSchema>;

/**
 * AccountSettingsModal component props
 */
export interface AccountSettingsModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** User's ID */
  userId: string;
  /** User's current name */
  userName: string | null;
  /** User's email (read-only) */
  userEmail: string;
}

/**
 * Account Settings Modal Component
 *
 * Modal dialog for viewing and editing user account information.
 * Currently supports editing name only. Email and password changes
 * will be added in future phases.
 *
 * Uses react-hook-form with Zod validation and Radix UI Dialog.
 */
export function AccountSettingsModal({
  isOpen,
  onClose,
  userId,
  userName,
  userEmail,
}: AccountSettingsModalProps) {
  const [hasChanges, setHasChanges] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: userName ?? '',
    },
  });

  // Update account mutation
  const updateMutation = trpc.user.updateAccount.useMutation({
    onSuccess: () => {
      setHasChanges(false);
      // Note: The parent component should refetch user data or update context
      // For now, just show success state
    },
  });

  /**
   * Reset form when modal opens or userName changes
   */
  useEffect(() => {
    if (isOpen) {
      reset({
        name: userName ?? '',
      });
      setHasChanges(false);
    }
  }, [isOpen, userName, reset]);

  /**
   * Track if form has changes
   */
  useEffect(() => {
    setHasChanges(isDirty);
  }, [isDirty]);

  /**
   * Warn user about unsaved changes when navigating away
   */
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  /**
   * Handle form submission
   */
  const handleFormSubmit = async (data: AccountFormData) => {
    await updateMutation.mutateAsync({
      name: data.name,
    });
  };

  /**
   * Handle modal close - prevent if there are unsaved changes
   */
  const handleClose = () => {
    if (hasChanges && !updateMutation.isSuccess) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    reset({
      name: userName ?? '',
    });
    setHasChanges(false);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="account-settings-description"
          onPointerDownOutside={(e) => {
            if (updateMutation.isPending) {
              e.preventDefault();
            }
          }}
        >
          <Dialog.Title className={styles.title}>Account Settings</Dialog.Title>

          <Dialog.Description
            id="account-settings-description"
            className={styles.description}
          >
            Manage your account information and security settings
          </Dialog.Description>

          <form
            onSubmit={handleSubmit(handleFormSubmit)}
            className={styles.form}
          >
            {/* Profile Information Section */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeading}>Profile Information</h3>

              {/* Name */}
              <Input
                label="Name *"
                {...register('name')}
                error={errors.name?.message}
                placeholder="Enter your name"
                disabled={updateMutation.isPending}
              />

              {/* Email (read-only for now) */}
              <Input
                label="Email"
                value={userEmail}
                disabled
                helperText="Email changes will be available in a future update"
              />

              {/* User ID (read-only, for reference) */}
              <Input
                label="User ID"
                value={userId}
                disabled
                helperText="Your unique user identifier"
              />
            </div>

            {/* Coming Soon Sections */}
            <div className={styles.section}>
              <h3 className={styles.sectionHeading}>Authentication</h3>
              <div className={styles.comingSoon}>
                <p className={styles.comingSoonText}>
                  Password change and authentication management features coming
                  soon.
                </p>
                <ul className={styles.featureList}>
                  <li>Change password</li>
                  <li>Two-factor authentication</li>
                  <li>Active sessions management</li>
                </ul>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionHeading}>Security</h3>
              <div className={styles.comingSoon}>
                <p className={styles.comingSoonText}>
                  Advanced security settings and audit logs coming soon.
                </p>
                <ul className={styles.featureList}>
                  <li>Login history</li>
                  <li>Security notifications</li>
                  <li>API tokens management</li>
                </ul>
              </div>
            </div>

            {/* Success/Error Messages */}
            {updateMutation.isSuccess && (
              <div className={styles.success} role="status">
                Account updated successfully!
              </div>
            )}

            {updateMutation.isError && (
              <div className={styles.error} role="alert">
                Failed to update account: {updateMutation.error.message}
              </div>
            )}

            {/* Form Actions */}
            <div className={styles.actions}>
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges || updateMutation.isPending}
              >
                Reset
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={updateMutation.isPending}
                disabled={!hasChanges || updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>

          <Dialog.Close asChild>
            <button
              className={styles.closeButton}
              aria-label="Close"
              disabled={updateMutation.isPending}
              type="button"
              onClick={handleClose}
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

AccountSettingsModal.displayName = 'AccountSettingsModal';
