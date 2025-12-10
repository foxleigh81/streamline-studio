'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { MemberList } from '@/components/team/member-list';
import { InviteForm } from '@/components/team/invite-form';
import { LiveRegion } from '@/components/ui/live-region';
import styles from './team-page.module.scss';

/**
 * Team Management Page
 *
 * Allows workspace owners to manage team members:
 * - View all members
 * - Change member roles
 * - Remove members
 * - Invite new members
 * - Revoke pending invitations
 */
export default function TeamPage() {
  const params = useParams<{ slug: string }>();
  const workspaceSlug = params.slug;

  const utils = trpc.useUtils();
  const [errorMessage, setErrorMessage] = React.useState('');
  const [successMessage, setSuccessMessage] = React.useState('');
  const [announcement, setAnnouncement] = React.useState('');

  // Get current user
  const { data: currentUser } = trpc.auth.whoami.useQuery();

  // Get current workspace to check user role
  const { data: workspace } = trpc.workspace.getBySlug.useQuery({
    slug: workspaceSlug,
  });

  // Fetch team members
  const { data: members = [], isLoading: isLoadingMembers } =
    trpc.team.list.useQuery(undefined, {
      enabled: !!workspace,
    });

  // Fetch pending invitations (only for owners)
  const { data: pendingInvitations = [], isLoading: isLoadingInvitations } =
    trpc.invitation.list.useQuery(undefined, {
      enabled: workspace?.role === 'owner',
    });

  // Update role mutation
  const updateRoleMutation = trpc.team.updateRole.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setErrorMessage('');
      setSuccessMessage('Member role updated successfully');
      setAnnouncement('Member role updated successfully');
    },
    onError: (error) => {
      setErrorMessage(`Failed to update role: ${error.message}`);
      setSuccessMessage('');
      setAnnouncement(`Failed to update role: ${error.message}`);
    },
  });

  // Remove member mutation
  const removeMemberMutation = trpc.team.remove.useMutation({
    onSuccess: () => {
      utils.team.list.invalidate();
      setErrorMessage('');
      setSuccessMessage('Member removed successfully');
      setAnnouncement('Member removed successfully');
    },
    onError: (error) => {
      setErrorMessage(`Failed to remove member: ${error.message}`);
      setSuccessMessage('');
      setAnnouncement(`Failed to remove member: ${error.message}`);
    },
  });

  // Create invitation mutation
  const createInvitationMutation = trpc.invitation.create.useMutation({
    onSuccess: () => {
      utils.invitation.list.invalidate();
      setErrorMessage('');
      setSuccessMessage('Invitation sent successfully');
      setAnnouncement('Invitation sent successfully');
    },
    onError: (error) => {
      setErrorMessage(`Failed to send invitation: ${error.message}`);
      setSuccessMessage('');
      setAnnouncement(`Failed to send invitation: ${error.message}`);
    },
  });

  // Revoke invitation mutation
  const revokeInvitationMutation = trpc.invitation.revoke.useMutation({
    onSuccess: () => {
      utils.invitation.list.invalidate();
      setErrorMessage('');
      setSuccessMessage('Invitation revoked successfully');
      setAnnouncement('Invitation revoked successfully');
    },
    onError: (error) => {
      setErrorMessage(`Failed to revoke invitation: ${error.message}`);
      setSuccessMessage('');
      setAnnouncement(`Failed to revoke invitation: ${error.message}`);
    },
  });

  /**
   * Handle role update
   */
  const handleRoleUpdate = async (
    userId: string,
    newRole: 'owner' | 'editor' | 'viewer'
  ) => {
    await updateRoleMutation.mutateAsync({ userId, role: newRole });
  };

  /**
   * Handle member removal
   */
  const handleRemove = async (userId: string) => {
    await removeMemberMutation.mutateAsync({ userId });
  };

  /**
   * Handle invitation
   */
  const handleInvite = async (
    email: string,
    role: 'owner' | 'editor' | 'viewer'
  ) => {
    await createInvitationMutation.mutateAsync({ email, role });
  };

  /**
   * Handle invitation revocation
   */
  const handleRevoke = async (invitationId: string) => {
    await revokeInvitationMutation.mutateAsync({ id: invitationId });
  };

  const isOwner = workspace?.role === 'owner';
  const isLoading = isLoadingMembers || !workspace;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Team Management</h1>
          <p className={styles.subtitle}>
            Manage team members and their access to this workspace
          </p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-label="Loading team" />
          <p>Loading team members...</p>
        </div>
      )}

      {/* Content */}
      {!isLoading && (
        <div className={styles.content}>
          {/* Live Region for Screen Reader Announcements */}
          <LiveRegion
            message={announcement}
            onClear={() => setAnnouncement('')}
          />

          {/* Success Message */}
          {successMessage && (
            <div className={styles.successBanner} role="status">
              <p>{successMessage}</p>
              <button
                onClick={() => setSuccessMessage('')}
                className={styles.dismissButton}
                aria-label="Dismiss success message"
              >
                ×
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className={styles.errorBanner} role="alert">
              <p>{errorMessage}</p>
              <button
                onClick={() => setErrorMessage('')}
                className={styles.dismissButton}
                aria-label="Dismiss error"
              >
                ×
              </button>
            </div>
          )}

          {/* Team Members List */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Team Members</h2>
            <MemberList
              members={members.map((m) => ({
                userId: m.userId,
                name: m.name,
                email: m.email,
                role: m.role,
                joinedAt: m.joinedAt,
              }))}
              currentUserRole={workspace.role}
              currentUserId={currentUser?.id ?? ''}
              onRoleUpdate={handleRoleUpdate}
              onRemove={handleRemove}
              isLoading={
                updateRoleMutation.isPending || removeMemberMutation.isPending
              }
            />
          </section>

          {/* Invite Form (Owner only) */}
          {isOwner && (
            <section className={styles.section}>
              <InviteForm
                onInvite={handleInvite}
                onRevoke={handleRevoke}
                pendingInvitations={pendingInvitations.map((inv) => ({
                  id: inv.id,
                  email: inv.email,
                  role: inv.role,
                  expiresAt: inv.expiresAt,
                  createdAt: inv.createdAt,
                }))}
                isLoading={
                  createInvitationMutation.isPending ||
                  revokeInvitationMutation.isPending ||
                  isLoadingInvitations
                }
              />
            </section>
          )}

          {/* Information for Non-Owners */}
          {!isOwner && (
            <section className={styles.section}>
              <div className={styles.infoMessage}>
                <p>Team management is available to workspace owners.</p>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
