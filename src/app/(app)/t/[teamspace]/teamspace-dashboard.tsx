'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChannelCard } from '@/components/channel/channel-card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { CreateChannelModal } from '@/components/channel/create-channel-modal';
import styles from './teamspace-dashboard.module.scss';

/**
 * Teamspace Dashboard Component
 *
 * Client-side component for displaying channels within a teamspace.
 * Shows channel cards in a responsive grid layout.
 */

export interface TeamspaceDashboardProps {
  /** Teamspace slug for navigation */
  teamspaceSlug: string;
  /** Teamspace name */
  teamspaceName?: string;
  /** List of channels user has access to */
  channels: Array<{
    id: string;
    name: string;
    slug: string;
    role: 'owner' | 'editor' | 'viewer';
    updatedAt: Date;
  }>;
  /** Whether user can create channels */
  canCreateChannel: boolean;
}

export function TeamspaceDashboard({
  teamspaceSlug,
  teamspaceName,
  channels,
  canCreateChannel,
}: TeamspaceDashboardProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Empty state: no channels
  if (channels.length === 0) {
    return (
      <>
        <div className={styles.container}>
          <EmptyState
            title="No channels yet"
            description={
              canCreateChannel
                ? "You don't have any channels in this teamspace yet. Create your first channel to get started!"
                : "You don't have access to any channels in this teamspace. Ask a teamspace administrator to add you to a channel."
            }
            actionLabel={canCreateChannel ? 'Create New Channel' : undefined}
            onAction={
              canCreateChannel ? () => setIsCreateModalOpen(true) : undefined
            }
          />
        </div>

        {canCreateChannel && (
          <CreateChannelModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
          />
        )}
      </>
    );
  }

  // Channels list
  return (
    <>
      <div className={styles.container}>
        {/* Branding header */}
        <div className={styles.branding}>
          <Image
            src="/streamline-studio-logo.png"
            alt="Streamline Studio"
            width={180}
            height={40}
            className={styles.logo}
            priority
          />
        </div>

        {/* Welcome banner */}
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>
            Welcome to the {teamspaceName ?? 'Workspace'} dashboard
          </h1>
          <p className={styles.welcomeSubtitle}>
            Manage your video channels and content pipeline
          </p>
        </div>

        {/* Channels section */}
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Your Channels</h2>
            <p className={styles.description}>
              {channels.length === 1
                ? '1 channel'
                : `${channels.length} channels`}
            </p>
          </div>
          {canCreateChannel && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create New Channel
            </Button>
          )}
        </header>

        <div className={styles.grid}>
          {channels.map((channel) => (
            <ChannelCard
              key={channel.id}
              name={channel.name}
              slug={channel.slug}
              role={channel.role}
              updatedAt={channel.updatedAt}
              teamspaceSlug={teamspaceSlug}
            />
          ))}
        </div>
      </div>

      {canCreateChannel && (
        <CreateChannelModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </>
  );
}

TeamspaceDashboard.displayName = 'TeamspaceDashboard';
