'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { VideoFormModal } from '@/components/video/video-form-modal';
import type { VideoFormData } from '@/components/video/video-form-modal';
import { VideoDeleteDialog } from '@/components/video/video-delete-dialog';
import { Button } from '@/components/ui/button';
import styles from './video-detail-page.module.scss';

/**
 * Status badge color mapping
 */
const statusColors: Record<string, string> = {
  idea: '#6B7280',
  scripting: '#3B82F6',
  filming: '#8B5CF6',
  editing: '#F59E0B',
  review: '#EC4899',
  scheduled: '#14B8A6',
  published: '#22C55E',
  archived: '#6B7280',
};

/**
 * Status display labels
 */
const statusLabels: Record<string, string> = {
  idea: 'Idea',
  scripting: 'Scripting',
  filming: 'Filming',
  editing: 'Editing',
  review: 'Review',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

/**
 * Video Detail Page
 *
 * Displays video metadata and provides tabs for documents.
 * Allows editing video metadata and deleting the video.
 */
export default function VideoDetailPage() {
  const params = useParams<{ slug: string; id: string }>();
  const router = useRouter();
  const workspaceSlug = params.slug;
  const videoId = params.id;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'script' | 'description' | 'notes' | 'thumbnail_ideas'
  >('script');

  // Fetch video
  const {
    data: video,
    isLoading: isLoadingVideo,
    refetch: refetchVideo,
  } = trpc.video.get.useQuery({ id: videoId });

  // Fetch categories
  const { data: categories = [] } = trpc.category.list.useQuery({
    orderBy: 'name',
    orderDir: 'asc',
  });

  // Update video mutation
  const updateVideoMutation = trpc.video.update.useMutation({
    onSuccess: () => {
      refetchVideo();
      setIsEditModalOpen(false);
    },
  });

  // Delete video mutation
  const deleteVideoMutation = trpc.video.delete.useMutation({
    onSuccess: () => {
      router.push(`/w/${workspaceSlug}/videos`);
    },
  });

  /**
   * Handle video update
   */
  const handleUpdateVideo = async (data: VideoFormData) => {
    await updateVideoMutation.mutateAsync({
      id: videoId,
      title: data.title,
      description: data.description ?? null,
      status: data.status,
      dueDate: data.dueDate || null,
      categoryIds: data.categoryIds,
    });
  };

  /**
   * Handle video deletion
   */
  const handleDeleteVideo = async () => {
    await deleteVideoMutation.mutateAsync({ id: videoId });
  };

  /**
   * Format date for display
   */
  const formatDate = (date: string | null): string => {
    if (!date) return 'Not set';
    try {
      const d = new Date(date);
      return d.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Invalid date';
    }
  };

  /**
   * Get category details
   */
  const videoCategories = categories.filter((cat) =>
    video?.categoryIds?.includes(cat.id)
  );

  if (isLoadingVideo) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} aria-label="Loading video" />
          <p>Loading video...</p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Video not found</h2>
          <p>
            The video you&apos;re looking for doesn&apos;t exist or has been
            deleted.
          </p>
          <Button onClick={() => router.push(`/w/${workspaceSlug}/videos`)}>
            Back to Videos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h1 className={styles.title}>{video.title}</h1>
          <span
            className={styles.statusBadge}
            style={{ backgroundColor: statusColors[video.status] }}
          >
            {statusLabels[video.status]}
          </span>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => setIsEditModalOpen(true)}>
            Edit
          </Button>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Metadata */}
      <div className={styles.metadata}>
        {video.description && (
          <p className={styles.description}>{video.description}</p>
        )}

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Due Date:</span>
            <span className={styles.metaValue}>
              {formatDate(video.dueDate)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Publish Date:</span>
            <span className={styles.metaValue}>
              {formatDate(video.publishDate)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Created:</span>
            <span className={styles.metaValue}>
              {formatDate(video.createdAt)}
            </span>
          </div>

          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Updated:</span>
            <span className={styles.metaValue}>
              {formatDate(video.updatedAt)}
            </span>
          </div>
        </div>

        {videoCategories.length > 0 && (
          <div className={styles.categories}>
            <span className={styles.metaLabel}>Categories:</span>
            <div className={styles.categoryTags}>
              {videoCategories.map((category) => (
                <span
                  key={category.id}
                  className={styles.categoryTag}
                  style={{
                    backgroundColor: `${category.color}20`,
                    color: category.color,
                    borderColor: category.color,
                  }}
                >
                  {category.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Document Tabs */}
      <div className={styles.tabs}>
        <div className={styles.tabList} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'script'}
            aria-controls="script-panel"
            className={`${styles.tab} ${activeTab === 'script' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('script')}
          >
            Script
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'description'}
            aria-controls="description-panel"
            className={`${styles.tab} ${activeTab === 'description' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'notes'}
            aria-controls="notes-panel"
            className={`${styles.tab} ${activeTab === 'notes' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'thumbnail_ideas'}
            aria-controls="thumbnail-panel"
            className={`${styles.tab} ${activeTab === 'thumbnail_ideas' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('thumbnail_ideas')}
          >
            Thumbnail Ideas
          </button>
        </div>

        <div className={styles.tabPanels}>
          <div
            role="tabpanel"
            id="script-panel"
            aria-labelledby="script-tab"
            hidden={activeTab !== 'script'}
            className={styles.tabPanel}
          >
            <p className={styles.placeholder}>
              Document editor coming in Phase 2B...
            </p>
          </div>

          <div
            role="tabpanel"
            id="description-panel"
            aria-labelledby="description-tab"
            hidden={activeTab !== 'description'}
            className={styles.tabPanel}
          >
            <p className={styles.placeholder}>
              Document editor coming in Phase 2B...
            </p>
          </div>

          <div
            role="tabpanel"
            id="notes-panel"
            aria-labelledby="notes-tab"
            hidden={activeTab !== 'notes'}
            className={styles.tabPanel}
          >
            <p className={styles.placeholder}>
              Document editor coming in Phase 2B...
            </p>
          </div>

          <div
            role="tabpanel"
            id="thumbnail-panel"
            aria-labelledby="thumbnail-tab"
            hidden={activeTab !== 'thumbnail_ideas'}
            className={styles.tabPanel}
          >
            <p className={styles.placeholder}>
              Document editor coming in Phase 2B...
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <VideoFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateVideo}
        categories={categories}
        initialValues={{
          title: video.title,
          description: video.description ?? undefined,
          status: video.status,
          dueDate: video.dueDate ?? undefined,
          categoryIds: video.categoryIds ?? [],
        }}
        isSubmitting={updateVideoMutation.isPending}
        title="Edit Video"
        submitButtonText="Save Changes"
      />

      {/* Delete Dialog */}
      <VideoDeleteDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteVideo}
        videoTitle={video.title}
        isDeleting={deleteVideoMutation.isPending}
      />
    </div>
  );
}
