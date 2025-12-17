'use client';

import { useState, useEffect, useCallback } from 'react';
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
 * Unified registration flow that handles both first-user and subsequent-user scenarios.
 * For first user: Shows 2-step flow (Account → Channel creation)
 * For subsequent users: Shows 1-step flow (Account only, auto-joins existing channel)
 *
 * Implements security measures from ADR-014.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */
export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isFirstUser, setIsFirstUser] = useState(false);
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

  // Check if this will be the first user
  const { data: userCheckData } = trpc.auth.me.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    // If no users exist in database, this will be the first user
    // We detect this by attempting to query the current user
    // If there are no users at all, we're in first-user scenario
    // Note: This is a simplified check. The backend will do the authoritative check in a transaction.
    setIsFirstUser(userCheckData === null);
  }, [userCheckData]);

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
      // If this is the first user, proceed to channel setup
      // Otherwise, submit registration directly
      if (isFirstUser) {
        setCurrentStep(2);
      } else {
        registerMutation.mutate({
          email: accountData.email,
          password: accountData.password,
          name: accountData.name || undefined,
        });
      }
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

  // Single-step flow for subsequent users
  if (!isFirstUser || currentStep === 1) {
    return (
      <>
        <h2 className={styles.pageHeading}>
          {isFirstUser ? 'Welcome! Create Your Account' : 'Create Account'}
        </h2>

        {isFirstUser && (
          <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
            You&apos;re the first user! Let&apos;s set up your admin account.
          </p>
        )}

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
            {isFirstUser ? 'Continue to Channel Setup' : 'Create Account'}
          </Button>
        </form>

        <div className={styles.links}>
          Already have an account? <Link href="/login">Sign in</Link>
        </div>
      </>
    );
  }

  // Step 2: Channel setup (first user only)
  return (
    <>
      <h2 className={styles.pageHeading}>Set Up Your Channel</h2>

      <p className={styles.subtitle} style={{ marginBottom: '1rem' }}>
        Channels are where you organize and manage your video scripts. You can
        create more channels later.
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
