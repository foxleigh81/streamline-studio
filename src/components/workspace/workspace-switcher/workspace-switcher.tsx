'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import styles from './workspace-switcher.module.scss';

/**
 * Workspace Switcher Component
 *
 * Displays the current workspace and allows switching between workspaces.
 * Shows a dropdown with all available workspaces and a create option (multi-tenant only).
 */

export interface WorkspaceSwitcherProps {
  /** Current workspace slug */
  workspaceSlug: string;
  /** Current workspace name */
  workspaceName?: string;
  /** Callback when create workspace is clicked */
  onCreateWorkspace?: () => void;
}

/**
 * Workspace Switcher Component
 */
export function WorkspaceSwitcher({
  workspaceSlug,
  workspaceName,
  onCreateWorkspace,
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
      router.push(`/w/${slug}/videos`);
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
        aria-label="Switch workspace"
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
            <div className={styles.loading}>Loading workspaces...</div>
          ) : (
            <>
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>Your Workspaces</div>
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
                  View All Workspaces
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
                    + Create New Workspace
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
