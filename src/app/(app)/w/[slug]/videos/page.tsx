'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { VideoCard } from '@/components/video/video-card';
import { VideoFormModal } from '@/components/video/video-form-modal';
import type { VideoFormData } from '@/components/video/video-form-modal';
import { Button } from '@/components/ui/button';
import { useParams } from 'next/navigation';
import styles from './videos-page.module.scss';

/**
 * Videos Page
 *
 * Displays a grid of video cards with ability to create new videos.
 * Uses tRPC for data fetching and mutations.
 */
export default function VideosPage() {
  const params = useParams<{ slug: string }>();
  const workspaceSlug = params.slug;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  /**
   * Get category details for a video
   */
  const getCategoriesForVideo = (categoryIds: string[]) => {
    return categories.filter((cat) => categoryIds.includes(cat.id));
  };

  const videos = videosData?.videos ?? [];
  const hasVideos = videos.length > 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Videos</h1>
          <p className={styles.subtitle}>
            Manage your video projects and content pipeline
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>+ New Video</Button>
      </div>

      {/* Loading State */}
      {isLoadingVideos && (
        <div className={styles.loading}>
          <div className={styles.spinner} aria-label="Loading videos" />
          <p>Loading videos...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingVideos && !hasVideos && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">
            🎬
          </div>
          <h2 className={styles.emptyTitle}>No videos yet</h2>
          <p className={styles.emptyDescription}>
            Get started by creating your first video project
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            Create Your First Video
          </Button>
        </div>
      )}

      {/* Video Grid */}
      {!isLoadingVideos && hasVideos && (
        <div className={styles.grid}>
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              workspaceSlug={workspaceSlug}
              title={video.title}
              status={video.status}
              dueDate={video.dueDate}
              description={video.description}
              categories={getCategoriesForVideo(video.categoryIds ?? [])}
            />
          ))}
        </div>
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
