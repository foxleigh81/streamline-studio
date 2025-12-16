'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import styles from './project-switcher.module.scss';

/**
 * Project Switcher Component
 *
 * Displays the current project and allows switching between projects.
 * Shows a dropdown with all available projects and a create option.
 *
 * Adapts to single-tenant vs multi-tenant deployment modes:
 * - Single-tenant: Lists all projects at /t/[project]
 * - Multi-tenant: Lists projects within teamspace at /t/[teamspace]/[project]
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

export interface ProjectSwitcherProps {
  /** Current project slug */
  projectSlug: string;
  /** Current project name */
  projectName?: string;
  /** Callback when create project is clicked */
  onCreateProject?: () => void;
  /** Optional teamspace slug (only for multi-tenant mode) */
  teamspaceSlug?: string;
}

/**
 * Project Switcher Component
 */
export function ProjectSwitcher({
  projectSlug,
  projectName,
  onCreateProject,
  teamspaceSlug,
}: ProjectSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Always use unified routing - default to "workspace" if no teamspace provided
  const effectiveTeamspaceSlug = teamspaceSlug ?? 'workspace';

  // Fetch all projects the user has access to
  const { data: projects = [], isLoading } = trpc.project.list.useQuery();

  // Get current project details if not provided
  const currentProject = projects.find((p) => p.slug === projectSlug);
  const displayName = projectName ?? currentProject?.name ?? projectSlug;

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

    // Total number of menu items (projects + View All + Create New if available)
    const totalItems = projects.length + 1 + (onCreateProject ? 1 : 0);

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
        if (activeIndex >= 0 && activeIndex < projects.length) {
          // Project item
          const selectedProject = projects[activeIndex];
          if (selectedProject) {
            handleProjectSelect(selectedProject.slug);
          }
        } else if (activeIndex === projects.length) {
          // View All Projects - navigate to teamspace page
          router.push(`/t/${effectiveTeamspaceSlug}`);
          setIsOpen(false);
        } else if (activeIndex === projects.length + 1 && onCreateProject) {
          // Create New Project
          setIsOpen(false);
          onCreateProject();
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
   * Handle project selection
   */
  const handleProjectSelect = (slug: string) => {
    setIsOpen(false);
    if (slug !== projectSlug) {
      // Always use unified routing structure
      router.push(`/t/${effectiveTeamspaceSlug}/${slug}/content-plan`);
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
        <span className={styles.projectName}>{displayName}</span>
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
            activeIndex >= 0 ? `project-item-${activeIndex}` : undefined
          }
        >
          {isLoading ? (
            <div className={styles.loading}>Loading projects...</div>
          ) : (
            <>
              <div className={styles.dropdownSection}>
                <div className={styles.dropdownLabel}>Your Projects</div>
                {projects.map((project, index) => (
                  <button
                    key={project.id}
                    id={`project-item-${index}`}
                    className={`${styles.dropdownItem} ${
                      project.slug === projectSlug
                        ? styles.dropdownItemActive
                        : ''
                    } ${activeIndex === index ? styles.dropdownItemFocused : ''}`}
                    onClick={() => handleProjectSelect(project.slug)}
                    role="menuitem"
                    tabIndex={-1}
                  >
                    <span className={styles.projectItemName}>
                      {project.name}
                    </span>
                    <span className={styles.projectRole}>{project.role}</span>
                  </button>
                ))}
              </div>

              <div className={styles.dropdownDivider} />

              <div className={styles.dropdownSection}>
                <Link
                  id={`project-item-${projects.length}`}
                  href={`/t/${effectiveTeamspaceSlug}`}
                  className={`${styles.dropdownItem} ${
                    activeIndex === projects.length
                      ? styles.dropdownItemFocused
                      : ''
                  }`}
                  onClick={() => setIsOpen(false)}
                  role="menuitem"
                  tabIndex={-1}
                >
                  View All Projects
                </Link>

                {onCreateProject && (
                  <button
                    id={`project-item-${projects.length + 1}`}
                    className={`${styles.dropdownItem} ${
                      activeIndex === projects.length + 1
                        ? styles.dropdownItemFocused
                        : ''
                    }`}
                    onClick={() => {
                      setIsOpen(false);
                      onCreateProject();
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

ProjectSwitcher.displayName = 'ProjectSwitcher';
