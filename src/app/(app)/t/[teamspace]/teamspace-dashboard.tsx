'use client';

import { useState } from 'react';
import { ProjectCard } from '@/components/project/project-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateProjectModal } from '@/components/project/create-project-modal';
import styles from './teamspace-dashboard.module.scss';

/**
 * Teamspace Dashboard Component
 *
 * Client-side component for displaying projects within a teamspace.
 * Shows project cards in a responsive grid layout.
 */

export interface TeamspaceDashboardProps {
  /** Teamspace slug for navigation */
  teamspaceSlug: string;
  /** Teamspace name */
  teamspaceName?: string;
  /** List of projects user has access to */
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    role: 'owner' | 'editor' | 'viewer';
    updatedAt: Date;
  }>;
  /** Whether user can create projects */
  canCreateProject: boolean;
}

export function TeamspaceDashboard({
  teamspaceSlug,
  teamspaceName,
  projects,
  canCreateProject,
}: TeamspaceDashboardProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Empty state: no projects
  if (projects.length === 0) {
    return (
      <>
        <div className={styles.container}>
          <EmptyState
            title="No projects yet"
            description={
              canCreateProject
                ? "You don't have any projects in this teamspace yet. Create your first project to get started!"
                : "You don't have access to any projects in this teamspace. Ask a teamspace administrator to add you to a project."
            }
            actionLabel={canCreateProject ? 'Create New Project' : undefined}
            onAction={
              canCreateProject ? () => setIsCreateModalOpen(true) : undefined
            }
          />
        </div>

        {canCreateProject && (
          <CreateProjectModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        )}
      </>
    );
  }

  // Projects list
  return (
    <>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>{teamspaceName ?? 'Projects'}</h1>
            <p className={styles.description}>
              Select a project to view and manage your video scripts
            </p>
          </div>
          {canCreateProject && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create New Project
            </Button>
          )}
        </header>

        <div className={styles.grid}>
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              name={project.name}
              slug={project.slug}
              role={project.role}
              updatedAt={project.updatedAt}
              teamspaceSlug={teamspaceSlug}
            />
          ))}
        </div>
      </div>

      {canCreateProject && (
        <CreateProjectModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </>
  );
}

TeamspaceDashboard.displayName = 'TeamspaceDashboard';
