'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { RoleSelect } from '@/components/team/role-select';
import { Button } from '@/components/ui/button';
import {
  trapFocus,
  saveFocus,
  restoreFocus,
} from '@/lib/accessibility/focus-trap';
import styles from './invite-form.module.scss';

/**
 * Pending invitation data
 */
export interface PendingInvitation {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Invite form component props
 */
export interface InviteFormProps {
  /** Callback when invitation is sent */
  onInvite: (
    email: string,
    role: 'owner' | 'editor' | 'viewer'
  ) => Promise<void>;
  /** Callback when invitation is revoked */
  onRevoke: (invitationId: string) => Promise<void>;
  /** List of pending invitations */
  pendingInvitations?: PendingInvitation[];
  /** Whether an operation is in progress */
  isLoading?: boolean;
}

/**
 * Invite Form Component
 *
 * Form for inviting new members to a workspace.
 * Shows pending invitations with revoke option.
 */
export function InviteForm({
  onInvite,
  onRevoke,
  pendingInvitations = [],
  isLoading = false,
}: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'owner' | 'editor' | 'viewer'>('editor');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Validate email format
   */
  const validateEmail = (value: string): boolean => {
    if (!value) {
      setEmailError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) return;

    setIsSubmitting(true);
    try {
      await onInvite(email, role);
      // Reset form on success
      setEmail('');
      setRole('editor');
      setEmailError('');
    } catch (error) {
      // Error handling will be done by parent component
      console.error('Failed to send invitation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Show confirmation dialog for revocation
   */
  const handleRevokeClick = (invitationId: string) => {
    previousFocusRef.current = saveFocus();
    setConfirmRevokeId(invitationId);
  };

  /**
   * Handle invitation revocation after confirmation
   */
  const handleConfirmRevoke = async () => {
    if (!confirmRevokeId) return;

    setRevokingId(confirmRevokeId);
    setConfirmRevokeId(null);
    try {
      await onRevoke(confirmRevokeId);
    } finally {
      setRevokingId(null);
      restoreFocus(previousFocusRef.current);
    }
  };

  /**
   * Cancel revocation
   */
  const handleCancelRevoke = () => {
    setConfirmRevokeId(null);
    restoreFocus(previousFocusRef.current);
  };

  /**
   * Set up focus trap when dialog opens
   */
  useEffect(() => {
    if (confirmRevokeId && dialogRef.current) {
      const cleanup = trapFocus(dialogRef.current);
      return cleanup;
    }
    return undefined;
  }, [confirmRevokeId]);

  /**
   * Format expiry date with precise time remaining
   */
  const formatExpiry = (date: Date) => {
    const now = new Date();
    const expiryDate = new Date(date);
    const diffMs = expiryDate.getTime() - now.getTime();

    // If expired
    if (diffMs <= 0) {
      return 'Expired';
    }

    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      const remainingHours = diffHours % 24;
      if (remainingHours > 0) {
        return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''} ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      }
      return `Expires in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }

    if (diffHours > 0) {
      const remainingMinutes = diffMinutes % 60;
      if (remainingMinutes > 0) {
        return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      }
      return `Expires in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
    }

    if (diffMinutes > 0) {
      return `Expires in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    }

    return 'Expires in less than a minute';
  };

  return (
    <div className={styles.container}>
      {/* Invite Form */}
      <div className={styles.formSection}>
        <h3 className={styles.sectionTitle}>Invite New Member</h3>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.emailField}>
              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => email && validateEmail(email)}
                error={emailError}
                placeholder="colleague@example.com"
                disabled={isSubmitting || isLoading}
                required
              />
            </div>
            <div className={styles.roleField}>
              <RoleSelect
                label="Role"
                value={role}
                onChange={setRole}
                disabled={isSubmitting || isLoading}
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || isLoading || !email}
            isLoading={isSubmitting}
          >
            Send Invitation
          </Button>
        </form>
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className={styles.pendingSection}>
          <h3 className={styles.sectionTitle}>Pending Invitations</h3>
          <div className={styles.invitationList}>
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className={styles.invitationItem}>
                <div className={styles.invitationInfo}>
                  <span className={styles.invitationEmail}>
                    {invitation.email}
                  </span>
                  <div className={styles.invitationMeta}>
                    <span className={styles.invitationRole}>
                      {invitation.role}
                    </span>
                    <span className={styles.invitationExpiry}>
                      {formatExpiry(invitation.expiresAt)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRevokeClick(invitation.id)}
                  disabled={revokingId === invitation.id || isLoading}
                  isLoading={revokingId === invitation.id}
                >
                  Revoke
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmRevokeId && (
        <div className={styles.dialogOverlay} onClick={handleCancelRevoke}>
          <div
            ref={dialogRef}
            className={styles.dialogContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-revoke-title"
            aria-describedby="confirm-revoke-description"
          >
            <h3 id="confirm-revoke-title" className={styles.dialogTitle}>
              Revoke Invitation?
            </h3>
            <p
              id="confirm-revoke-description"
              className={styles.dialogDescription}
            >
              Are you sure you want to revoke this invitation? This action
              cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <Button variant="outline" onClick={handleCancelRevoke}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRevoke}>
                Revoke Invitation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

InviteForm.displayName = 'InviteForm';
