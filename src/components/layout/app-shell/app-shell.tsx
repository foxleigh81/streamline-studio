'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  Tag,
  Users,
  Settings,
  Building2,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { SkipLink } from '@/components/ui/skip-link';
import { ChannelSwitcher } from '@/components/channel/channel-switcher';
import { CreateChannelModal } from '@/components/channel/create-channel-modal';
import { UserMenu } from '@/components/user-menu/user-menu';
import { useTeamspace } from '@/lib/teamspace';
import { useChannelOptional } from '@/lib/channel';
import { useCanManageTeamspace } from '@/lib/permissions';
import { isMultiTenant } from '@/lib/constants';
import styles from './app-shell.module.scss';

/**
 * App Shell Component
 *
 * Main application layout with sidebar navigation.
 * Provides teamspace/channel-scoped navigation and responsive behavior.
 *
 * Derives teamspace and channel slugs from the URL pathname automatically.
 * URL structure: /t/[teamspace]/[channel]/[page] or /t/[teamspace]/settings/[page]
 *
 * Adapts to single-tenant vs multi-tenant deployment modes:
 * - Single-tenant: Shows only channel-level navigation
 * - Multi-tenant: Shows full teamspace/channel hierarchy
 */

export interface AppShellProps {
  /** Page content */
  children: ReactNode;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Extract teamspace and channel slugs from pathname
 * URL patterns:
 * - /t/[teamspace]/settings/* -> teamspace only, no channel
 * - /t/[teamspace]/[channel]/* -> both teamspace and channel
 */
function parsePathname(pathname: string): {
  teamspaceSlug: string | undefined;
  channelSlug: string | undefined;
} {
  const segments = pathname.split('/').filter(Boolean);
  // Expected: ['t', teamspace, channel?, page?]

  if (segments[0] !== 't' || !segments[1]) {
    return { teamspaceSlug: undefined, channelSlug: undefined };
  }

  const teamspaceSlug = segments[1];

  // If the third segment is 'settings', there's no channel
  if (segments[2] === 'settings') {
    return { teamspaceSlug, channelSlug: undefined };
  }

  // Otherwise, the third segment is the channel
  const channelSlug = segments[2];

  return { teamspaceSlug, channelSlug };
}

interface NavChild {
  name: string;
  href: string;
  icon: string;
  ariaLabel: string;
}

interface NavItem {
  name: string;
  href: string;
  icon: string;
  ariaLabel: string;
  requiresPermission: 'admin' | null;
  scope: 'channel' | 'teamspace';
  children?: NavChild[];
}

/**
 * Navigation items for the sidebar
 * Note: All items are channel-scoped now that account settings
 * have been moved to the user menu
 */
const navigationItems: NavItem[] = [
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
];

/**
 * App Shell Component
 */
export function AppShell({ children, className }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Derive teamspace and channel from pathname
  const { teamspaceSlug, channelSlug } = parsePathname(pathname);

  // Get context data
  const { teamspace } = useTeamspace();
  const channelCtx = useChannelOptional();
  const channel = channelCtx?.channel ?? null;
  const channelRole = channelCtx?.role ?? null;
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
   * Toggle expanded state for navigation items with children
   */
  const toggleExpanded = (itemKey: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemKey)) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });
  };

  /**
   * Check if a navigation item or its children are active
   * @param href - The relative path for the navigation item
   * @param scope - Whether the item is 'channel' or 'teamspace' scoped
   */
  const isActive = (href: string, scope: 'channel' | 'teamspace'): boolean => {
    const fullPath = buildLink(href, scope);
    return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
  };

  /**
   * Check if any child of a parent nav item is active
   */
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some((child) => isActive(child.href, item.scope));
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
      // Only add channelSlug if we have one (some routes are teamspace-only)
      if (channelSlug) {
        return `/t/${effectiveTeamspace}/${channelSlug}${href}`;
      }
      return `/t/${effectiveTeamspace}${href}`;
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

  /**
   * Render icon for navigation item
   */
  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'clipboard-list':
        return <ClipboardList className={styles.icon} />;
      case 'tag':
        return <Tag className={styles.icon} />;
      case 'team':
        return <Users className={styles.icon} />;
      case 'settings':
        return <Settings className={styles.icon} />;
      default:
        return null;
    }
  };

  // Fetch current user data for UserMenu
  const { data: currentUser } = trpc.user.me.useQuery();

  return (
    <div className={`${styles.container} ${className ?? ''}`}>
      {/* Skip to main content link for accessibility */}
      <SkipLink targetId="main-content" />

      {/* Sidebar */}
      <aside className={styles.sidebar} aria-label="Main navigation">
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <Link
              href={
                channelSlug
                  ? buildLink('/content-plan', 'channel')
                  : buildLink('/settings', 'teamspace')
              }
            >
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

          {/* Channel switcher - only show if we have a channel */}
          {channelSlug && (
            <div className={styles.channelSwitcherContainer}>
              <ChannelSwitcher
                channelSlug={channelSlug}
                channelName={channel?.name}
                onCreateChannel={() => setIsCreateModalOpen(true)}
                teamspaceSlug={teamspaceSlug}
              />
            </div>
          )}

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
              .filter((item) => {
                // Filter out channel-scoped items if we don't have a channel
                if (item.scope === 'channel' && !channelSlug) return false;
                return canSeeNavItem(item.requiresPermission);
              })
              .map((item) => {
                const itemKey = `${item.scope}-${item.href}`;
                const isExpanded =
                  expandedItems.has(itemKey) || hasActiveChild(item);
                const hasChildren = item.children && item.children.length > 0;

                return (
                  <li key={itemKey}>
                    {hasChildren ? (
                      <>
                        {/* Parent item with children - make it a button to expand/collapse */}
                        <button
                          type="button"
                          className={`${styles.navLink} ${hasActiveChild(item) ? styles.navLinkActive : ''}`}
                          onClick={() => toggleExpanded(itemKey)}
                          aria-expanded={isExpanded}
                          aria-label={item.ariaLabel}
                        >
                          <span className={styles.navIcon} aria-hidden="true">
                            {renderIcon(item.icon)}
                          </span>
                          <span className={styles.navText}>{item.name}</span>
                          <span
                            className={styles.navChevron}
                            aria-hidden="true"
                          >
                            {isExpanded ? (
                              <ChevronDown className={styles.iconSmall} />
                            ) : (
                              <ChevronRight className={styles.iconSmall} />
                            )}
                          </span>
                        </button>

                        {/* Child items */}
                        {isExpanded && item.children && (
                          <ul className={styles.navSubList}>
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <Link
                                  href={buildLink(child.href, item.scope)}
                                  className={`${styles.navSubLink} ${isActive(child.href, item.scope) ? styles.navSubLinkActive : ''}`}
                                  aria-label={child.ariaLabel}
                                  aria-current={
                                    isActive(child.href, item.scope)
                                      ? 'page'
                                      : undefined
                                  }
                                >
                                  <span
                                    className={styles.navIcon}
                                    aria-hidden="true"
                                  >
                                    {renderIcon(child.icon)}
                                  </span>
                                  <span className={styles.navText}>
                                    {child.name}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    ) : (
                      /* Regular link item without children */
                      <Link
                        href={buildLink(item.href, item.scope)}
                        className={`${styles.navLink} ${isActive(item.href, item.scope) ? styles.navLinkActive : ''}`}
                        aria-label={item.ariaLabel}
                        aria-current={
                          isActive(item.href, item.scope) ? 'page' : undefined
                        }
                      >
                        <span className={styles.navIcon} aria-hidden="true">
                          {renderIcon(item.icon)}
                        </span>
                        <span className={styles.navText}>{item.name}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
          </ul>
        </nav>

        <div className={styles.sidebarFooter}>
          {currentUser && (
            <UserMenu
              userName={currentUser.name}
              userEmail={currentUser.email}
              userId={currentUser.id}
              onLogout={handleLogout}
              isLoggingOut={logoutMutation.isPending}
            />
          )}
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
