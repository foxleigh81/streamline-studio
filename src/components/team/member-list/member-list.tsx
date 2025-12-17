'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RoleSelect } from '@/components/team/role-select';
import {
  trapFocus,
  saveFocus,
  restoreFocus,
} from '@/lib/accessibility/focus-trap';
import { useDateFormatter } from '@/lib/hooks/use-date-formatter';
import styles from './member-list.module.scss';

/**
 * Team member data
 */
export interface TeamMember {
  userId: string;
  name: string | null;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  joinedAt: Date;
}

/**
 * Member list component props
 */
export interface MemberListProps {
  /** Array of team members */
  members: TeamMember[];
  /** Current user's role */
  currentUserRole: 'owner' | 'editor' | 'viewer';
  /** Current user's ID */
  currentUserId: string;
  /** Callback when role is updated */
  onRoleUpdate: (
    userId: string,
    newRole: 'owner' | 'editor' | 'viewer'
  ) => Promise<void>;
  /** Callback when member is removed */
  onRemove: (userId: string) => Promise<void>;
  /** Whether an operation is in progress */
  isLoading?: boolean;
}

/**
 * Member List Component
 *
 * Displays a table of workspace team members with role management.
 * Only owners can update roles and remove members.
 */
export function MemberList({
  members,
  currentUserRole,
  currentUserId,
  onRoleUpdate,
  onRemove,
  isLoading = false,
}: MemberListProps) {
  const { formatDate } = useDateFormatter();
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{
    userId: string;
    name: string;
  } | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const isOwner = currentUserRole === 'owner';

  /**
   * Handle role change
   */
  const handleRoleChange = async (
    userId: string,
    newRole: 'owner' | 'editor' | 'viewer'
  ) => {
    setUpdatingUserId(userId);
    try {
      await onRoleUpdate(userId, newRole);
    } finally {
      setUpdatingUserId(null);
    }
  };

  /**
   * Show confirmation dialog for removal
   */
  const handleRemoveClick = (userId: string, memberName: string) => {
    previousFocusRef.current = saveFocus();
    setConfirmRemove({ userId, name: memberName });
  };

  /**
   * Handle member removal after confirmation
   */
  const handleConfirmRemove = async () => {
    if (!confirmRemove) return;

    setRemovingUserId(confirmRemove.userId);
    setConfirmRemove(null);
    try {
      await onRemove(confirmRemove.userId);
    } finally {
      setRemovingUserId(null);
      restoreFocus(previousFocusRef.current);
    }
  };

  /**
   * Cancel removal
   */
  const handleCancelRemove = () => {
    setConfirmRemove(null);
    restoreFocus(previousFocusRef.current);
  };

  /**
   * Set up focus trap when dialog opens
   */
  useEffect(() => {
    if (confirmRemove && dialogRef.current) {
      const cleanup = trapFocus(dialogRef.current);
      return cleanup;
    }
    return undefined;
  }, [confirmRemove]);

  if (members.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No team members found.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>
            Workspace team members and their roles
          </caption>
          <thead>
            <tr>
              <th scope="col">Member</th>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Joined</th>
              {isOwner && <th scope="col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const isUpdating = updatingUserId === member.userId;
              const isRemoving = removingUserId === member.userId;

              return (
                <tr key={member.userId} className={styles.row}>
                  <td className={styles.memberName}>
                    {member.name || 'Unknown User'}
                    {isCurrentUser && (
                      <span className={styles.youBadge}>You</span>
                    )}
                  </td>
                  <td className={styles.email}>{member.email}</td>
                  <td className={styles.roleCell}>
                    {isOwner && !isCurrentUser ? (
                      <RoleSelect
                        value={member.role}
                        onChange={(newRole) =>
                          handleRoleChange(member.userId, newRole)
                        }
                        disabled={isUpdating || isLoading}
                        aria-label={`Change role for ${member.name || member.email}`}
                      />
                    ) : (
                      <span className={styles.roleText}>{member.role}</span>
                    )}
                  </td>
                  <td className={styles.date}>
                    {formatDate(member.joinedAt) ?? '—'}
                  </td>
                  {isOwner && (
                    <td className={styles.actions}>
                      {!isCurrentUser && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            handleRemoveClick(
                              member.userId,
                              member.name || member.email
                            )
                          }
                          disabled={isRemoving || isLoading}
                          isLoading={isRemoving}
                          aria-label={`Remove ${member.name || member.email} from workspace`}
                        >
                          Remove
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Confirmation Dialog */}
      {confirmRemove && (
        <div className={styles.dialogOverlay} onClick={handleCancelRemove}>
          <div
            ref={dialogRef}
            className={styles.dialogContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-remove-title"
            aria-describedby="confirm-remove-description"
          >
            <h3 id="confirm-remove-title" className={styles.dialogTitle}>
              Remove Team Member?
            </h3>
            <p
              id="confirm-remove-description"
              className={styles.dialogDescription}
            >
              Are you sure you want to remove{' '}
              <strong>{confirmRemove.name}</strong> from this workspace? This
              action cannot be undone.
            </p>
            <div className={styles.dialogActions}>
              <Button variant="outline" onClick={handleCancelRemove}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRemove}>
                Remove Member
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

MemberList.displayName = 'MemberList';
