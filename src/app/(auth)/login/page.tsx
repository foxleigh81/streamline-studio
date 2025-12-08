'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import styles from '../auth.module.scss';

/**
 * Login Page
 *
 * Allows existing users to sign in.
 * Implements security measures from ADR-014.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/014-security-architecture.md
 */
export default function LoginPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      // Redirect to dashboard on successful login
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

    // Client-side validation
    const errors: typeof fieldErrors = {};

    if (!email) {
      errors.email = 'Email is required';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    loginMutation.mutate({ email, password });
  };

  return (
    <>
      <h2 className="sr-only">Sign In</h2>

      {formError && (
        <div className={`${styles.alert} ${styles.alertError}`} role="alert">
          {formError}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          required
          error={fieldErrors.email}
          disabled={loginMutation.isPending}
        />

        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
          error={fieldErrors.password}
          disabled={loginMutation.isPending}
        />

        <Button
          type="submit"
          variant="primary"
          fullWidth
          isLoading={loginMutation.isPending}
          className={styles.submitButton}
        >
          Sign In
        </Button>
      </form>

      <div className={styles.links}>
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </div>
    </>
  );
}
