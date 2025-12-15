'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { PASSWORD_POLICY } from '@/lib/constants/password';
import { COMMON_PASSWORDS } from '@/lib/auth/common-passwords';
import styles from './page.module.scss';

/**
 * Account Settings Page
 *
 * Allows users to manage their account profile and security settings.
 * Features:
 * - Display name editing
 * - Password change with current password verification
 * - User avatar display
 */
export default function AccountSettingsPage() {
  const utils = trpc.useUtils();

  // Fetch current user data
  const { data: user, isLoading: isLoadingUser } = trpc.user.me.useQuery();

  // Profile update state
  const [profileName, setProfileName] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Initialize profile name when user data loads
  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user?.name]);

  // Update profile mutation
  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      setProfileError('');
      setProfileSuccess('Profile updated successfully!');
      // Invalidate user query to refresh data
      void utils.user.me.invalidate();
      // Clear success message after 3 seconds
      setTimeout(() => setProfileSuccess(''), 3000);
    },
    onError: (error) => {
      setProfileSuccess('');
      setProfileError(error.message);
    },
  });

  // Change password mutation
  const changePasswordMutation = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      setPasswordError('');
      setPasswordSuccess('Password changed successfully!');
      // Clear password fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000);
    },
    onError: (error) => {
      setPasswordSuccess('');
      setPasswordError(error.message);
    },
  });

  /**
   * Handle profile form submission
   */
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!profileName.trim()) {
      setProfileError('Name cannot be empty');
      return;
    }

    updateProfileMutation.mutate({ name: profileName });
  };

  /**
   * Handle password change form submission
   */
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }

    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }

    if (newPassword.length < PASSWORD_POLICY.minLength) {
      setPasswordError(
        `New password must be at least ${PASSWORD_POLICY.minLength} characters`
      );
      return;
    }

    if (newPassword.length > PASSWORD_POLICY.maxLength) {
      setPasswordError(
        `New password must be less than ${PASSWORD_POLICY.maxLength} characters`
      );
      return;
    }

    if (COMMON_PASSWORDS.has(newPassword.toLowerCase())) {
      setPasswordError(
        'This password is too common. Please choose a different password.'
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
    });
  };

  if (isLoadingUser) {
    return (
      <div className={styles.container}>
        <div className={styles.loading} role="status" aria-live="polite">
          Loading account settings...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Account Settings</h1>
        <p className={styles.description}>
          Manage your profile and security settings
        </p>
      </div>

      {/* User Profile Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Profile</h2>
        </div>

        <div className={styles.profileInfo}>
          <Avatar
            name={user?.name ?? undefined}
            email={user?.email}
            size="lg"
          />
          <div className={styles.userDetails}>
            <p className={styles.userName}>{user?.name ?? 'No name set'}</p>
            <p className={styles.userEmail}>{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleProfileSubmit} className={styles.form}>
          <Input
            label="Display Name"
            type="text"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            placeholder="Enter your display name"
            error={profileError}
          />

          {profileSuccess && (
            <div
              className={styles.successMessage}
              role="status"
              aria-live="polite"
            >
              {profileSuccess}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={updateProfileMutation.isPending}
          >
            Save Changes
          </Button>
        </form>
      </section>

      {/* Security Section */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Security</h2>
        </div>

        <form onSubmit={handlePasswordSubmit} className={styles.form}>
          {passwordError && (
            <div className={styles.errorMessage} role="alert">
              {passwordError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            autoComplete="current-password"
          />

          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 8 characters)"
            helperText={`${PASSWORD_POLICY.minLength}-${PASSWORD_POLICY.maxLength} characters, avoid common passwords`}
            autoComplete="new-password"
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
          />

          {passwordSuccess && (
            <div
              className={styles.successMessage}
              role="status"
              aria-live="polite"
            >
              {passwordSuccess}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            isLoading={changePasswordMutation.isPending}
          >
            Change Password
          </Button>
        </form>
      </section>
    </div>
  );
}
