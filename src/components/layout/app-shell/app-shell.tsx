'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Tag,
  Users,
  Settings,
  LogOut,
  Building2,
  ClipboardList,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { SkipLink } from '@/components/ui/skip-link';
import { ChannelSwitcher } from '@/components/channel/channel-switcher';
import { CreateChannelModal } from '@/components/channel/create-channel-modal';
import { useTeamspace } from '@/lib/teamspace';
import { useChannel } from '@/lib/channel';
import { useCanManageTeamspace } from '@/lib/permissions';
import { isMultiTenant } from '@/lib/constants';
import styles from './app-shell.module.scss';

/**
 * App Shell Component
 *
 * Main application layout with sidebar navigation.
 * Provides teamspace/channel-scoped navigation and responsive behavior.
 *
 * Adapts to single-tenant vs multi-tenant deployment modes:
 * - Single-tenant: Shows only channel-level navigation
 * - Multi-tenant: Shows full teamspace/channel hierarchy
 */

export interface AppShellProps {
  /** Channel slug for navigation links */
  channelSlug: string;
  /** Page content */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Optional teamspace slug (only for multi-tenant mode) */
  teamspaceSlug?: string;
}

/**
 * Navigation items for the sidebar
 * Note: Some items are channel-scoped, others are teamspace-scoped
 */
const navigationItems = [
  {
    name: 'Content Plan',
    href: '/content-plan',
    icon: 'clipboard-list',
    ariaLabel: 'Navigate to content plan page',
    requiresPermission: null,
    scope: 'channel', // Channel-scoped
  },
  {
    name: 'Categories',
    href: '/categories',
    icon: 'tag',
    ariaLabel: 'Navigate to categories page',
    requiresPermission: null,
    scope: 'channel', // Channel-scoped
  },
  {
    name: 'Team',
    href: '/team',
    icon: 'team',
    ariaLabel: 'Navigate to team page',
    requiresPermission: null,
    scope: 'channel', // Channel-scoped
  },
  {
    name: 'Channel Settings',
    href: '/settings',
    icon: 'settings',
    ariaLabel: 'Navigate to channel settings page',
    requiresPermission: 'admin',
    scope: 'channel', // Channel-scoped
  },
  {
    name: 'Account',
    href: '/settings',
    icon: 'settings',
    ariaLabel: 'Navigate to account settings page',
    requiresPermission: null,
    scope: 'teamspace', // Teamspace-scoped (user account)
  },
] as const;

/**
 * App Shell Component
 */
export function AppShell({
  channelSlug,
  children,
  className,
  teamspaceSlug,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Get context data
  const { teamspace } = useTeamspace();
  const { channel, role: channelRole } = useChannel();
  const canManageTeamspace = useCanManageTeamspace();
  const multiTenantMode = isMultiTenant();

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
   * @param href - The relative path for the navigation item
   * @param scope - Whether the item is 'channel' or 'teamspace' scoped
   */
  const isActive = (href: string, scope: 'channel' | 'teamspace'): boolean => {
    const fullPath = buildLink(href, scope);
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  /**
   * Build full navigation link with teamspace and channel slug
   * Uses unified routing structure for both single-tenant and multi-tenant modes
   * @param href - The relative path for the navigation item
   * @param scope - Whether the item is 'channel' or 'teamspace' scoped
   */
  const buildLink = (href: string, scope: 'channel' | 'teamspace'): string => {
    // Always use unified routing - use "workspace" as fallback for single-tenant
    const effectiveTeamspace = teamspaceSlug ?? 'workspace';

    if (scope === 'teamspace') {
      // Teamspace-scoped items (like account settings)
      return `/t/${effectiveTeamspace}${href}`;
    } else {
      // Channel-scoped items (like content plan, categories, etc.)
      return `/t/${effectiveTeamspace}/${channelSlug}${href}`;
    }
  };

  /**
   * Check if user can see a navigation item based on permissions
   */
  const canSeeNavItem = (requiredPermission: 'admin' | null): boolean => {
    if (!requiredPermission) return true;
    if (requiredPermission === 'admin') {
      return channelRole === 'owner';
    }
    return true;
  };

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {/* Skip to main content link for accessibility */}
      <SkipLink targetId="main-content" />

      {/* Sidebar */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <Link href={buildLink('/content-plan', 'channel')}>
              <Image
                src="/streamline-studio-logo.png"
                alt="Streamline Studio"
                width={200}
                height={50}
                priority
              />
            </Link>
          </h1>

          {/* Teamspace info (multi-tenant only) */}
          {multiTenantMode && teamspace && (
            <div className={styles.teamspaceInfo}>
              <div className={styles.teamspaceLabel}>
                <Building2
                  className={styles.teamspaceIcon}
                  aria-hidden="true"
                />
                <span className={styles.teamspaceName}>{teamspace.name}</span>
              </div>
              {canManageTeamspace && (
                <Link
                  href={`/t/${teamspaceSlug}/settings`}
                  className={styles.teamspaceSettingsLink}
                  aria-label="Teamspace settings"
                >
                  <Settings className={styles.icon} aria-hidden="true" />
                </Link>
              )}
            </div>
          )}

          {/* Channel switcher */}
          <div className={styles.channelSwitcherContainer}>
            <ChannelSwitcher
              channelSlug={channelSlug}
              channelName={channel?.name}
              onCreateChannel={() => setIsCreateModalOpen(true)}
              teamspaceSlug={teamspaceSlug}
            />
          </div>

          {/* Channel role badge */}
          {channelRole && (
            <div
              className={styles.roleBadge}
              aria-label={`Your role: ${channelRole}`}
            >
              {channelRole}
            </div>
          )}
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          <ul className={styles.navList}>
            {navigationItems
              .filter((item) => canSeeNavItem(item.requiresPermission))
              .map((item) => (
                <li key={`${item.scope}-${item.href}`}>
                  <Link
                    href={buildLink(item.href, item.scope)}
                    className={`${styles.navLink} ${isActive(item.href, item.scope) ? styles.navLinkActive : ''}`}
                    aria-label={item.ariaLabel}
                    aria-current={
                      isActive(item.href, item.scope) ? 'page' : undefined
                    }
                  >
                    <span className={styles.navIcon} aria-hidden="true">
                      {item.icon === 'clipboard-list' && (
                        <ClipboardList className={styles.icon} />
                      )}
                      {item.icon === 'tag' && <Tag className={styles.icon} />}
                      {item.icon === 'team' && (
                        <Users className={styles.icon} />
                      )}
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

      {/* Create Channel Modal */}
      <CreateChannelModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

AppShell.displayName = 'AppShell';
