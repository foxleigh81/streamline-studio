'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Video, Tag, Users, Settings, LogOut } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { SkipLink } from '@/components/ui/skip-link';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { CreateWorkspaceModal } from '@/components/workspace/create-workspace-modal';
import styles from './app-shell.module.scss';

/**
 * App Shell Component
 *
 * Main application layout with sidebar navigation.
 * Provides workspace-scoped navigation and responsive behavior.
 */

export interface AppShellProps {
  /** Workspace slug for navigation links */
  workspaceSlug: string;
  /** Page content */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Navigation items for the sidebar
 */
const navigationItems = [
  {
    name: 'Videos',
    href: '/videos',
    icon: 'video',
    ariaLabel: 'Navigate to videos page',
  },
  {
    name: 'Categories',
    href: '/categories',
    icon: 'tag',
    ariaLabel: 'Navigate to categories page',
  },
  {
    name: 'Team',
    href: '/team',
    icon: 'team',
    ariaLabel: 'Navigate to team page',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: 'settings',
    ariaLabel: 'Navigate to settings page',
  },
] as const;

/**
 * App Shell Component
 */
export function AppShell({
  workspaceSlug,
  children,
  className,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Logout mutation
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      // Redirect to login page after successful logout
      router.push('/login');
    },
  });

  /**
   * Handle logout
   */
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  /**
   * Check if a navigation item is active
   */
  const isActive = (href: string): boolean => {
    const fullPath = `/w/${workspaceSlug}${href}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  /**
   * Build full navigation link with workspace slug
   */
  const buildLink = (href: string): string => {
    return `/w/${workspaceSlug}${href}`;
  };

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {/* Skip to main content link for accessibility */}
      <SkipLink targetId="main-content" />

      {/* Sidebar */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <Link href={buildLink('/videos')}>
              <Image
                src="/streamline-studio-logo.png"
                alt="Streamline Studio"
                width={200}
                height={50}
                priority
              />
            </Link>
          </h1>
          <div className={styles.workspaceSwitcherContainer}>
            <WorkspaceSwitcher
              workspaceSlug={workspaceSlug}
              onCreateWorkspace={() => setIsCreateModalOpen(true)}
            />
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          <ul className={styles.navList}>
            {navigationItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={buildLink(item.href)}
                  className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                  aria-label={item.ariaLabel}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon === 'video' && <Video className={styles.icon} />}
                    {item.icon === 'tag' && <Tag className={styles.icon} />}
                    {item.icon === 'team' && <Users className={styles.icon} />}
                    {item.icon === 'settings' && (
                      <Settings className={styles.icon} />
                    )}
                  </span>
                  <span className={styles.navText}>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.logoutButton}
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className={styles.icon} aria-hidden="true" />
            <span>
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

AppShell.displayName = 'AppShell';
