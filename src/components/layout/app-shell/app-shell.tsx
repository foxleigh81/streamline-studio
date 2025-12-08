'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SkipLink } from '@/components/ui/skip-link';
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
            <Link href={buildLink('/videos')}>Streamline Studio</Link>
          </h1>
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
                    {item.icon === 'video' && '🎥'}
                    {item.icon === 'tag' && '🏷️'}
                    {item.icon === 'settings' && '⚙️'}
                  </span>
                  <span className={styles.navText}>{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className={styles.logoutButton}>
              <span aria-hidden="true">👋</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}

AppShell.displayName = 'AppShell';
