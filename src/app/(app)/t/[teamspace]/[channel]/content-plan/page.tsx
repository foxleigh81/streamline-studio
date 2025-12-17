'use client';

import { useState, useEffect } from 'react';
import { Video } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { VideoCard } from '@/components/video/video-card';
import { VideoTable } from '@/components/video/video-table';
import type { VideoTableData } from '@/components/video/video-table';
import { VideoFormModal } from '@/components/video/video-form-modal';
import type { VideoFormData } from '@/components/video/video-form-modal';
import { Button } from '@/components/ui/button';
import { ViewToggle, type ViewMode } from '@/components/ui/view-toggle';
import { useParams } from 'next/navigation';
import { announce } from '@/lib/accessibility/aria';
import styles from './content-plan-page.module.scss';

/**
 * Content Plan Page
 *
 * Displays videos in either grid or table view with ability to create new videos.
 * Uses tRPC for data fetching and mutations. View preference is persisted to database
 * via user preferences.
 */
export default function ContentPlanPage() {
  const params = useParams<{ teamspace: string; channel: string }>();
  const channelSlug = params.channel;
  const teamspaceSlug = params.teamspace;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [mounted, setMounted] = useState(false);

  // Fetch user preferences
  const { data: preferences } = trpc.user.getPreferences.useQuery();

  // Update preferences mutation
  const utils = trpc.useUtils();
  const updatePreferencesMutation = trpc.user.updatePreferences.useMutation({
    // Optimistically update the cache immediately
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches to prevent them from overwriting our optimistic update
      await utils.user.getPreferences.cancel();

      // Snapshot the previous value
      const previousPreferences = utils.user.getPreferences.getData();

      // Optimistically update to the new value
      if (previousPreferences) {
        utils.user.getPreferences.setData(undefined, {
          ...previousPreferences,
          ...newPreferences,
        });
      }

      return { previousPreferences };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, _newPreferences, context) => {
      if (context?.previousPreferences) {
        utils.user.getPreferences.setData(
          undefined,
          context.previousPreferences
        );
      }
    },
    // Always refetch after error or success to ensure sync with server
    onSettled: () => {
      utils.user.getPreferences.invalidate();
    },
  });

  // Fetch videos
  const {
    data: videosData,
    isLoading: isLoadingVideos,
    refetch: refetchVideos,
  } = trpc.video.list.useQuery({
    limit: 50,
    orderBy: 'createdAt',
    orderDir: 'desc',
  });

  // Fetch categories
  const { data: categories = [] } = trpc.category.list.useQuery({
    orderBy: 'name',
    orderDir: 'asc',
  });

  // Create video mutation
  const createVideoMutation = trpc.video.create.useMutation({
    onSuccess: () => {
      refetchVideos();
      setIsCreateModalOpen(false);
    },
  });

  /**
   * Handle video creation
   */
  const handleCreateVideo = async (data: VideoFormData) => {
    await createVideoMutation.mutateAsync({
      title: data.title,
      description: data.description ?? undefined,
      status: data.status,
      dueDate: data.dueDate || undefined,
      categoryIds: data.categoryIds,
    });
  };

  const videos = videosData?.videos ?? [];
  const hasVideos = videos.length > 0;

  /**
   * Initialize view mode from user preferences when they load
   */
  useEffect(() => {
    setMounted(true);
    if (preferences?.contentPlanViewMode) {
      setViewMode(preferences.contentPlanViewMode);
    }
  }, [preferences?.contentPlanViewMode]);

  /**
   * Handle view mode change and persist to database
   * Uses optimistic updates for immediate UI feedback
   */
  const handleViewModeChange = (mode: ViewMode) => {
    // Update local state immediately for instant UI feedback
    setViewMode(mode);

    // Persist to database (optimistic update handles cache)
    updatePreferencesMutation.mutate({
      contentPlanViewMode: mode,
    });

    announce(`Switched to ${mode} view`);
  };

  /**
   * Transform videos for table display
   */
  const tableVideos: VideoTableData[] = videos.map((video) => ({
    id: video.id,
    title: video.title,
    status: video.status,
    dueDate: video.dueDate,
    categories: '', // Categories will be populated when that data is available
  }));

  /**
   * Announce loading state changes to screen readers
   */
  useEffect(() => {
    if (isLoadingVideos) {
      announce('Loading content plan...');
    } else if (videos.length > 0) {
      announce(
        `Loaded ${videos.length} video${videos.length === 1 ? '' : 's'}`
      );
    } else {
      announce('No videos found');
    }
  }, [isLoadingVideos, videos.length]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Content Plan</h1>
          <p className={styles.subtitle}>
            Manage your videos and content pipeline
          </p>
        </div>
        <div className={styles.headerActions}>
          {mounted && hasVideos && (
            <ViewToggle value={viewMode} onChange={handleViewModeChange} />
          )}
          <Button onClick={() => setIsCreateModalOpen(true)}>
            + New Video
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoadingVideos && (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-label="Loading content plan" />
          <p>Loading content plan...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingVideos && !hasVideos && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            <Video size={48} strokeWidth={1.5} />
          </div>
          <h2 className={styles.emptyTitle}>No videos yet</h2>
          <p className={styles.emptyDescription}>
            Get started by creating your first video
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Your First Video
          </Button>
        </div>
      )}

      {/* Video Grid */}
      {!isLoadingVideos && hasVideos && viewMode === 'grid' && (
        <div className={styles.grid}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              channelSlug={channelSlug}
              teamspaceSlug={teamspaceSlug}
              title={video.title}
              status={video.status}
              dueDate={video.dueDate}
              description={video.description}
              categories={[]}
            />
          ))}
        </div>
      )}

      {/* Video Table */}
      {!isLoadingVideos && hasVideos && viewMode === 'table' && (
        <VideoTable
          videos={tableVideos}
          channelSlug={channelSlug}
          teamspaceSlug={teamspaceSlug}
        />
      )}

      {/* Create Video Modal */}
      <VideoFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateVideo}
        categories={categories}
        isSubmitting={createVideoMutation.isPending}
        title="Create Video"
        submitButtonText="Create"
      />
    </div>
  );
}
