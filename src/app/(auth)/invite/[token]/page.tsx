'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import styles from './invite-page.module.scss';

/**
 * Invitation Accept Page
 *
 * Validates invitation token and allows user to accept the invitation.
 * Handles three scenarios:
 * 1. New user: Shows registration form
 * 2. Existing user (logged in): Shows join workspace button
 * 3. Existing user (not logged in): Shows login prompt
 */
export default function InvitePage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const token = params.token;

  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Validate invitation token
  const {
    data: invitation,
    isLoading: isValidating,
    error: validationError,
  } = trpc.invitation.validate.useQuery(
    { token },
    {
      retry: false,
    }
  );

  // Accept invitation mutation
  const acceptMutation = trpc.invitation.accept.useMutation({
    onSuccess: (data) => {
      // Set the session cookie
      if (data.sessionToken) {
        document.cookie = `session=${data.sessionToken}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax${process.env.NODE_ENV === 'production' ? '; secure' : ''}`;
      }

      // Redirect to workspace after successful acceptance
      if (invitation?.workspaceSlug) {
        router.push(`/w/${invitation.workspaceSlug}/videos`);
      } else {
        router.push('/workspaces');
      }
    },
    onError: (error) => {
      setErrorMessage(error.message);
      setIsSubmitting(false);
    },
  });

  /**
   * Validate password
   */
  const validatePassword = (value: string): boolean => {
    if (value.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return false;
    }
    setPasswordError('');
    return true;
  };

  /**
   * Handle form submission for new users
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validatePassword(password)) return;

    setIsSubmitting(true);
    await acceptMutation.mutateAsync({
      token,
      password,
      name: name || undefined,
    });
  };

  /**
   * Show loading state
   */
  if (isValidating) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <div
              className={styles.spinner}
              aria-label="Validating invitation"
            />
            <p>Validating your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Show error state
   */
  if (validationError || !invitation) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorState}>
            <div className={styles.errorIcon} aria-hidden="true">
              ⚠️
            </div>
            <h1 className={styles.errorTitle}>Invalid Invitation</h1>
            <p className={styles.errorMessage}>
              {validationError?.message ||
                'This invitation link is invalid, expired, or has already been used.'}
            </p>
            <Button onClick={() => router.push('/login')}>Go to Login</Button>
          </div>
        </div>
      </div>
    );
  }

  /**
   * Show invitation details and registration form
   */
  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Accept Invitation</h1>
          <p className={styles.subtitle}>
            You&apos;ve been invited to join{' '}
            <strong>{invitation.workspaceName}</strong>
          </p>
        </div>

        <div className={styles.invitationDetails}>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Email:</span>
            <span className={styles.detailValue}>{invitation.email}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.detailLabel}>Role:</span>
            <span className={styles.roleBadge}>{invitation.role}</span>
          </div>
        </div>

        {errorMessage && (
          <div className={styles.errorBanner} role="alert">
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <Input
            type="text"
            label="Your Name (Optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            disabled={isSubmitting}
          />

          <Input
            type="password"
            label="Create Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => password && validatePassword(password)}
            error={passwordError}
            placeholder="At least 8 characters"
            disabled={isSubmitting}
            required
          />

          <Button
            type="submit"
            fullWidth
            disabled={isSubmitting || !password}
            isLoading={isSubmitting}
          >
            Accept Invitation & Create Account
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            By accepting this invitation, you&apos;ll create an account and gain
            access to the workspace.
          </p>
          <p className={styles.footerText}>
            Already have an account?{' '}
            <a href="/login" className={styles.link}>
              Log in first
            </a>
            , then use this invitation link again.
          </p>
        </div>
      </div>
    </div>
  );
}
