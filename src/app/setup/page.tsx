'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from './setup.module.scss';

/**
 * Project name suggestions for auto-generation
 */
const PROJECT_NAME_SUGGESTIONS = [
  'My YouTube Channel',
  'Content Studio',
  'Video Projects',
  'Creative Hub',
  'Production HQ',
  'Media Workshop',
  'Script Central',
  'Creator Space',
  'Video Vault',
  'Content Lab',
];

/**
 * Generate a random project name
 */
function generateProjectName(): string {
  const index = Math.floor(Math.random() * PROJECT_NAME_SUGGESTIONS.length);
  return PROJECT_NAME_SUGGESTIONS[index] ?? 'My Project';
}

/**
 * Initial Setup Wizard Page
 *
 * Multi-step setup wizard for creating the initial admin user and project.
 * Step 1: Create admin account
 * Step 2: Set up first project
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
  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state persisted across steps
  const [accountData, setAccountData] = useState({
    email: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const [projectName, setProjectName] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
    projectName?: string;
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
      router.push('/');
      router.refresh();
    },
    onError: (error) => {
      setFormError(error.message);
    },
  });

  const handleGenerateProjectName = useCallback(() => {
    setProjectName(generateProjectName());
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
      setCurrentStep(2);
    }
  };

  const handleStep2Submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    setupMutation.mutate({
      email: accountData.email,
      password: accountData.password,
      name: accountData.name || undefined,
      projectName: projectName || undefined,
    });
  };

  const handleBack = () => {
    setCurrentStep(1);
    setFormError(null);
  };

  // Show loading state while checking setup status
  if (isCheckingSetup) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.loading}>
            <div className={styles.spinner} aria-hidden="true" />
            <span>Checking setup status...</span>
          </div>
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
          <div className={styles.logoContainer}>
            <Image
              src="/streamline-studio-logo.png"
              alt="Streamline Studio"
              width={200}
              height={50}
              className={styles.logo}
              priority
            />
          </div>
          <h1 className={styles.title}>Set Up Your Studio</h1>
          <p className={styles.subtitle}>
            {currentStep === 1
              ? 'Create your admin account to get started.'
              : 'Set up your first project to organize your video scripts.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div
          className={styles.stepIndicator}
          role="navigation"
          aria-label="Setup progress"
        >
          <div
            className={`${styles.step} ${currentStep >= 1 ? styles.stepActive : ''}`}
          >
            <div className={styles.stepNumber}>1</div>
            <span className={styles.stepLabel}>Account</span>
          </div>
          <div className={styles.stepConnector} aria-hidden="true" />
          <div
            className={`${styles.step} ${currentStep >= 2 ? styles.stepActive : ''}`}
          >
            <div className={styles.stepNumber}>2</div>
            <span className={styles.stepLabel}>Project</span>
          </div>
        </div>

        {formError && (
          <div className={`${styles.alert} ${styles.alertError}`} role="alert">
            {formError}
          </div>
        )}

        {/* Step 1: Account Creation */}
        {currentStep === 1 && (
          <form onSubmit={handleStep1Submit} className={styles.form} noValidate>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>
                <span className={styles.legendContent}>
                  <span className={styles.legendIcon}>👤</span>
                  Admin Account
                </span>
              </legend>
              <p className={styles.fieldsetDescription}>
                Create your administrator account. You&apos;ll use this to log
                in and manage your studio.
              </p>

              <div className={styles.fieldGroupGrid}>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@example.com"
                  value={accountData.email}
                  onChange={(e) =>
                    setAccountData((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  error={fieldErrors.email}
                  required
                />

                <Input
                  label="Name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="Your name (optional)"
                  value={accountData.name}
                  onChange={(e) =>
                    setAccountData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  error={fieldErrors.name}
                />

                <div>
                  <Input
                    label="Password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={accountData.password}
                    onChange={(e) =>
                      setAccountData((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    error={fieldErrors.password}
                    required
                    aria-describedby="password-requirements"
                  />
                  <p id="password-requirements" className={styles.fieldHint}>
                    Password must be at least 8 characters long
                  </p>
                </div>

                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={accountData.confirmPassword}
                  onChange={(e) =>
                    setAccountData((prev) => ({
                      ...prev,
                      confirmPassword: e.target.value,
                    }))
                  }
                  required
                />
              </div>
            </fieldset>

            <Button type="submit" variant="primary" fullWidth>
              Continue to Project Setup
            </Button>
          </form>
        )}

        {/* Step 2: Project Setup */}
        {currentStep === 2 && (
          <form onSubmit={handleStep2Submit} className={styles.form} noValidate>
            <fieldset className={styles.fieldset}>
              <legend className={styles.legend}>
                <span className={styles.legendContent}>
                  <span className={styles.legendIcon}>📁</span>
                  Your First Project
                </span>
              </legend>
              <p className={styles.fieldsetDescription}>
                Projects are where you organize and manage your video scripts.
                You can create more projects later.
              </p>

              <div className={styles.fieldGroup}>
                <div className={styles.projectNameField}>
                  <Input
                    label="Project Name"
                    name="projectName"
                    type="text"
                    placeholder="My YouTube Channel"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    error={fieldErrors.projectName}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleGenerateProjectName}
                    className={styles.generateButton}
                    aria-label="Generate a random project name"
                  >
                    🎲 Surprise me
                  </Button>
                </div>
                <p className={styles.fieldHint}>
                  💡 Don&apos;t worry, you can change this later in project
                  settings.
                </p>
              </div>
            </fieldset>

            <div className={styles.buttonGroup}>
              <Button
                type="button"
                variant="secondary"
                onClick={handleBack}
                disabled={setupMutation.isPending}
              >
                ← Back
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={setupMutation.isPending}
              >
                {setupMutation.isPending
                  ? 'Setting up...'
                  : 'Launch Your Studio 🚀'}
              </Button>
            </div>
          </form>
        )}

        <div className={styles.footer}>
          <p className={styles.footerText}>
            This setup wizard can only be run once. After completion,
            you&apos;ll be able to invite additional team members.
          </p>
          <div className={styles.footerBranding}>
            <span>Powered by</span>
            <strong>Streamline Studio</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
