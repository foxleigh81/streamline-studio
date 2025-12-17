import { redirect } from 'next/navigation';
import { validateRequest } from '@/lib/auth/workspace';

/**
 * Settings Layout Component
 *
 * Minimal layout for settings pages. Authentication is validated here.
 * AppShell is provided by the parent teamspace layout for consistency.
 *
 * Route: /t/[teamspace]/settings/*
 */

interface SettingsLayoutProps {
  children: React.ReactNode;
  params: Promise<{ teamspace: string }>;
}

export default async function SettingsLayout({
  children,
}: SettingsLayoutProps) {
  // Validate authentication
  const { user } = await validateRequest();
  if (!user) {
    redirect('/login');
  }

  // AppShell is provided by parent teamspace layout
  return <>{children}</>;
}
