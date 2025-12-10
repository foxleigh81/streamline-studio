'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from './setup.module.scss';

/**
 * Initial Setup Wizard Page
 *
 * First-run setup wizard for creating the initial admin user and workspace.
 * This page is locked after the first user is created.
 *
 * Security Requirements (ADR-014):
 * - Must check setup completion status on mount
 * - Must redirect if already complete
 * - Creates setup completion flag after success
 * - Flag persists across database wipes (file-based)
 *
 * @see /docs/adrs/011-self-hosting-strategy.md
 * @see /docs/adrs/014-security-architecture.md
 */
export default function SetupPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    workspaceName?: string;
  }>({});

  // Check if setup is already complete
  const { data: isComplete, isLoading: isCheckingSetup } =
    trpc.setup.isComplete.useQuery(undefined, {
      retry: false,
    });

  // Redirect if setup is already complete
  useEffect(() => {
    if (isComplete === true) {
      router.push('/');
    }
  }, [isComplete, router]);

  const setupMutation = trpc.setup.complete.useMutation({
    onSuccess: () => {
      // Redirect to dashboard on successful setup
      router.push('/');
      router.refresh();
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = (formData.get('email') ?? '') as string;
    const password = (formData.get('password') ?? '') as string;
    const confirmPassword = (formData.get('confirmPassword') ?? '') as string;
    const name = (formData.get('name') ?? '') as string;
    const workspaceName = (formData.get('workspaceName') ?? '') as string;

    // Client-side validation
    const errors: typeof fieldErrors = {};

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (password !== confirmPassword) {
      errors.password = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setupMutation.mutate({
      email,
      password,
      name: name || undefined,
      workspaceName: workspaceName || undefined,
    });
  };

  // Show loading state while checking setup status
  if (isCheckingSetup) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>Checking setup status...</div>
        </div>
      </div>
    );
  }

  // Don't render form if setup is complete (will redirect)
  if (isComplete) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Welcome to Streamline Studio</h1>
          <p className={styles.subtitle}>
            Let&apos;s set up your account and workspace to get started.
          </p>
        </div>

        {formError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Admin Account</h2>
            <p className={styles.sectionDescription}>
              Create your administrator account. You&apos;ll use this to log in.
            </p>

            <Input
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@example.com"
              error={fieldErrors.email}
              disabled={setupMutation.isPending}
              required
            />

            <Input
              label="Name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Your name"
              error={fieldErrors.name}
              disabled={setupMutation.isPending}
            />

            <div>
              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                error={fieldErrors.password}
                disabled={setupMutation.isPending}
                required
                aria-describedby="password-requirements"
              />
              <p
                id="password-requirements"
                className={styles.passwordRequirements}
              >
                Password must be at least 8 characters long
              </p>
            </div>

            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter your password"
              disabled={setupMutation.isPending}
              required
            />
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Workspace</h2>
            <p className={styles.sectionDescription}>
              Your workspace is where you&apos;ll manage your video projects.
            </p>

            <Input
              label="Workspace Name"
              name="workspaceName"
              type="text"
              placeholder="My Workspace"
              error={fieldErrors.workspaceName}
              disabled={setupMutation.isPending}
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={setupMutation.isPending}
          >
            {setupMutation.isPending ? 'Setting up...' : 'Complete Setup'}
          </Button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            This setup wizard can only be run once. After completion,
            you&apos;ll be able to invite additional users.
          </p>
        </div>
      </div>
    </div>
  );
}
