'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from '../auth.module.scss';

/**
 * Registration Page
 *
 * Allows new users to create an account.
 * Implements security measures from ADR-014.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */
export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    name?: string;
  }>({});

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    const name = formData.get('name') as string;

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

    registerMutation.mutate({
      email,
      password,
      name: name || undefined,
    });
  };

  return (
    <>
      <h2>Create Account</h2>

      {formError && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Name (optional)"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Enter your name"
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
          disabled={registerMutation.isPending}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={registerMutation.isPending}
          className={styles.submitButton}
        >
          Create Account
        </Button>
      </form>

      <div className={styles.links}>
        Already have an account? <Link href="/login">Sign in</Link>
      </div>
    </>
  );
}
