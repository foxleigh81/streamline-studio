'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from '../auth.module.scss';

/**
 * Channel name suggestions for auto-generation
 */
const CHANNEL_NAME_SUGGESTIONS = [
  'My YouTube Channel',
  'Content Studio',
  'Video Channel',
  'Creative Hub',
  'Production HQ',
  'Media Workshop',
  'Script Central',
  'Creator Space',
  'Video Vault',
  'Content Lab',
];

/**
 * Generate a random channel name
 */
function generateChannelName(): string {
  const index = Math.floor(Math.random() * CHANNEL_NAME_SUGGESTIONS.length);
  return CHANNEL_NAME_SUGGESTIONS[index] ?? 'My Channel';
}

/**
 * Registration Page
 *
 * Unified registration flow that always creates a new workspace.
 * Shows 2-step flow: Account creation → Channel setup
 * Team members join via invitation (future feature).
 *
 * Implements security measures from ADR-014.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */
export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    channelName?: string;
  }>({});

  // Form state persisted across steps
  const [accountData, setAccountData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [channelName, setChannelName] = useState('');

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      // Redirect to dashboard on successful registration
      router.push('/');
      router.refresh();
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const handleGenerateChannelName = useCallback(() => {
    setChannelName(generateChannelName());
  }, []);

  const validateStep1 = (): boolean => {
    const errors: typeof fieldErrors = {};

    if (!accountData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!accountData.password) {
      errors.password = 'Password is required';
    } else if (accountData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (accountData.password !== accountData.confirmPassword) {
      errors.password = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleStep1Submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (validateStep1()) {
      // Proceed to channel setup
      setCurrentStep(2);
    }
  };

  const handleStep2Submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    registerMutation.mutate({
      email: accountData.email,
      password: accountData.password,
      name: accountData.name || undefined,
      channelName: channelName || undefined,
    });
  };

  const handleBack = () => {
    setCurrentStep(1);
    setFormError(null);
  };

  // Step 1: Account creation
  if (currentStep === 1) {
    return (
      <>
        <h2 className={styles.pageHeading}>Create Your Workspace</h2>

        <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
          Get started with Streamline Studio - your personal video planning hub
        </p>

        {formError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleStep1Submit} className={styles.form} noValidate>
          <Input
            label="Name (optional)"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            value={accountData.name}
            onChange={(e) =>
              setAccountData((prev) => ({ ...prev, name: e.target.value }))
            }
            error={fieldErrors.name}
            disabled={registerMutation.isPending}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            required
            value={accountData.email}
            onChange={(e) =>
              setAccountData((prev) => ({ ...prev, email: e.target.value }))
            }
            error={fieldErrors.email}
            disabled={registerMutation.isPending}
          />

          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a password"
            required
            helperText="Must be at least 8 characters"
            value={accountData.password}
            onChange={(e) =>
              setAccountData((prev) => ({ ...prev, password: e.target.value }))
            }
            error={fieldErrors.password}
            disabled={registerMutation.isPending}
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm your password"
            required
            value={accountData.confirmPassword}
            onChange={(e) =>
              setAccountData((prev) => ({
                ...prev,
                confirmPassword: e.target.value,
              }))
            }
            disabled={registerMutation.isPending}
          />

          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={registerMutation.isPending}
            className={styles.submitButton}
          >
            Continue to Channel Setup
          </Button>
        </form>

        <div className={styles.links}>
          Already have an account? <Link href="/login">Sign in</Link>
          <p
            style={{
              marginTop: '1rem',
              fontSize: '0.9rem',
              color: 'var(--text-dim)',
            }}
          >
            Looking to join an existing workspace? Ask your team admin to send
            you an invite.
          </p>
        </div>
      </>
    );
  }

  // Step 2: Channel setup
  return (
    <>
      <h2 className={styles.pageHeading}>Set Up Your First Channel</h2>

      <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
        Channels help you organize video scripts by topic, series, or platform.
        You can create more channels later.
      </p>

      {formError && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleStep2Submit} className={styles.form} noValidate>
        <div>
          <Input
            label="Channel Name"
            name="channelName"
            type="text"
            placeholder="My YouTube Channel"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            error={fieldErrors.channelName}
            helperText="Don't worry, you can change this later in channel settings"
            disabled={registerMutation.isPending}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleGenerateChannelName}
            disabled={registerMutation.isPending}
            style={{ marginTop: '0.5rem' }}
          >
            Surprise me
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            disabled={registerMutation.isPending}
          >
            Back
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            isLoading={registerMutation.isPending}
          >
            {registerMutation.isPending ? 'Creating...' : 'Create My Channel'}
          </Button>
        </div>
      </form>
    </>
  );
}
