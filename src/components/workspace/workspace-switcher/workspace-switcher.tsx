'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import styles from './workspace-switcher.module.scss';

/**
 * Workspace Switcher Component (Project Switcher)
 *
 * Displays the current project and allows switching between projects.
 * Shows a dropdown with all available projects and a create option.
 *
 * Note: This component is named "WorkspaceSwitcher" for backward compatibility,
 * but it now switches between projects (formerly called workspaces).
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

export interface WorkspaceSwitcherProps {
  /** Current workspace slug (maps to project in new structure) */
  workspaceSlug: string;
  /** Current workspace name */
  workspaceName?: string;
  /** Callback when create workspace is clicked */
  onCreateWorkspace?: () => void;
  /** Optional teamspace slug (defaults to 'default' during migration) */
  teamspaceSlug?: string;
}

/**
 * Workspace Switcher Component
 */
export function WorkspaceSwitcher({
  workspaceSlug,
  workspaceName,
  onCreateWorkspace,
  teamspaceSlug = 'default',
}: WorkspaceSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch all workspaces the user has access to
  const { data: workspaces = [], isLoading } = trpc.workspace.list.useQuery();

  // Get current workspace details if not provided
  const currentWorkspace = workspaces.find((w) => w.slug === workspaceSlug);
  const displayName = workspaceName ?? currentWorkspace?.name ?? workspaceSlug;

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }

    return undefined;
  }, [isOpen]);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    // Total number of menu items (workspaces + View All + Create New if available)
    const totalItems = workspaces.length + 1 + (onCreateWorkspace ? 1 : 0);

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;

      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((prevIndex) => {
          const nextIndex = prevIndex + 1;
          return nextIndex >= totalItems ? 0 : nextIndex;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((prevIndex) => {
          const nextIndex = prevIndex - 1;
          return nextIndex < 0 ? totalItems - 1 : nextIndex;
        });
        break;

      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;

      case 'End':
        event.preventDefault();
        setActiveIndex(totalItems - 1);
        break;

      case 'Enter':
        event.preventDefault();
        if (activeIndex >= 0 && activeIndex < workspaces.length) {
          // Workspace item
          const selectedWorkspace = workspaces[activeIndex];
          if (selectedWorkspace) {
            handleWorkspaceSelect(selectedWorkspace.slug);
          }
        } else if (activeIndex === workspaces.length) {
          // View All Workspaces
          router.push('/workspaces');
          setIsOpen(false);
        } else if (activeIndex === workspaces.length + 1 && onCreateWorkspace) {
          // Create New Workspace
          setIsOpen(false);
          onCreateWorkspace();
        }
        break;
    }
  };

  /**
   * Reset active index when dropdown closes
   */
  useEffect(() => {
    if (!isOpen) {
      setActiveIndex(-1);
    }
  }, [isOpen]);

  /**
   * Handle workspace selection
   */
  const handleWorkspaceSelect = (slug: string) => {
    setIsOpen(false);
    if (slug !== workspaceSlug) {
      router.push(`/t/${teamspaceSlug}/${slug}/videos`);
    }
  };

  return (
    <div
      className={styles.container}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Switch project"
      >
        <span className={styles.workspaceName}>{displayName}</span>
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          role="menu"
          aria-activedescendant={
            activeIndex >= 0 ? `workspace-item-${activeIndex}` : undefined
          }
        >
          {isLoading ? (
            <div className={styles.loading}>Loading projects...</div>
          ) : (
            <>
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>Your Projects</div>
                {workspaces.map((workspace, index) => (
                  <button
                    key={workspace.id}
                    id={`workspace-item-${index}`}
                    className={`${styles.dropdownItem} ${
                      workspace.slug === workspaceSlug
                        ? styles.dropdownItemActive
                        : ''
                    } ${activeIndex === index ? styles.dropdownItemFocused : ''}`}
                    onClick={() => handleWorkspaceSelect(workspace.slug)}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    <span className={styles.workspaceItemName}>
                      {workspace.name}
                    </span>
                    <span className={styles.workspaceRole}>
                      {workspace.role}
                    </span>
                  </button>
                ))}
              </div>

              <div className={styles.dropdownDivider} />

              <div className={styles.dropdownSection}>
                <Link
                  id={`workspace-item-${workspaces.length}`}
                  href="/workspaces"
                  className={`${styles.dropdownItem} ${
                    activeIndex === workspaces.length
                      ? styles.dropdownItemFocused
                      : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  tabIndex={-1}
                >
                  View All Projects
                </Link>

                {onCreateWorkspace && (
                  <button
                    id={`workspace-item-${workspaces.length + 1}`}
                    className={`${styles.dropdownItem} ${
                      activeIndex === workspaces.length + 1
                        ? styles.dropdownItemFocused
                        : ''
                    }`}
                    onClick={() => {
                      setIsOpen(false);
                      onCreateWorkspace();
                    }}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    + Create New Project
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

WorkspaceSwitcher.displayName = 'WorkspaceSwitcher';
