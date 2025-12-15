'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Video, Tag, Users, Settings, LogOut, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { SkipLink } from '@/components/ui/skip-link';
import { WorkspaceSwitcher } from '@/components/workspace/workspace-switcher';
import { CreateWorkspaceModal } from '@/components/workspace/create-workspace-modal';
import { useTeamspace } from '@/lib/teamspace';
import { useProject } from '@/lib/project';
import { useCanManageTeamspace } from '@/lib/permissions';
import { isMultiTenant } from '@/lib/constants';
import styles from './app-shell.module.scss';

/**
 * App Shell Component
 *
 * Main application layout with sidebar navigation.
 * Provides teamspace/project-scoped navigation and responsive behavior.
 *
 * Adapts to single-tenant vs multi-tenant deployment modes:
 * - Single-tenant: Shows only project-level navigation
 * - Multi-tenant: Shows full teamspace/project hierarchy
 */

export interface AppShellProps {
  /** Workspace slug for navigation links (maps to project slug in new structure) */
  workspaceSlug: string;
  /** Page content */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
  /** Optional teamspace slug (defaults to 'default' during migration) */
  teamspaceSlug?: string;
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
    requiresPermission: null,
  },
  {
    name: 'Categories',
    href: '/categories',
    icon: 'tag',
    ariaLabel: 'Navigate to categories page',
    requiresPermission: null,
  },
  {
    name: 'Team',
    href: '/team',
    icon: 'team',
    ariaLabel: 'Navigate to team page',
    requiresPermission: null,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: 'settings',
    ariaLabel: 'Navigate to settings page',
    requiresPermission: 'admin',
  },
] as const;

/**
 * App Shell Component
 */
export function AppShell({
  workspaceSlug,
  children,
  className,
  teamspaceSlug = 'default',
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Get context data
  const { teamspace } = useTeamspace();
  const { project, role: projectRole } = useProject();
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
   */
  const isActive = (href: string): boolean => {
    const fullPath = `/t/${teamspaceSlug}/${workspaceSlug}${href}`;
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  /**
   * Build full navigation link with teamspace and project (workspace) slug
   */
  const buildLink = (href: string): string => {
    return `/t/${teamspaceSlug}/${workspaceSlug}${href}`;
  };

  /**
   * Check if user can see a navigation item based on permissions
   */
  const canSeeNavItem = (requiredPermission: 'admin' | null): boolean => {
    if (!requiredPermission) return true;
    if (requiredPermission === 'admin') {
      return projectRole === 'owner';
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

          {/* Project switcher */}
          <div className={styles.workspaceSwitcherContainer}>
            <WorkspaceSwitcher
              workspaceSlug={workspaceSlug}
              workspaceName={project?.name}
              onCreateWorkspace={() => setIsCreateModalOpen(true)}
              teamspaceSlug={teamspaceSlug}
            />
          </div>

          {/* Project role badge */}
          {projectRole && (
            <div
              className={styles.roleBadge}
              aria-label={`Your role: ${projectRole}`}
            >
              {projectRole}
            </div>
          )}
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          <ul className={styles.navList}>
            {navigationItems
              .filter((item) => canSeeNavItem(item.requiresPermission))
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={buildLink(item.href)}
                    className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ''}`}
                    aria-label={item.ariaLabel}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    <span className={styles.navIcon} aria-hidden="true">
                      {item.icon === 'video' && (
                        <Video className={styles.icon} />
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

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

AppShell.displayName = 'AppShell';
