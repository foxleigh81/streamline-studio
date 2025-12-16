'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { VideoFormModal } from '@/components/video/video-form-modal';
import type { VideoFormData } from '@/components/video/video-form-modal';
import { VideoDeleteDialog } from '@/components/video/video-delete-dialog';
import { DocumentEditor } from '@/components/document/document-editor/document-editor';
import { Button } from '@/components/ui/button';
import { STATUS_COLORS, STATUS_LABELS } from '@/lib/constants/status';
import styles from './video-detail-page.module.scss';

/**
 * Video Detail Page
 *
 * Displays video metadata and provides tabs for documents.
 * Allows editing video metadata and deleting the video.
 */
export default function VideoDetailPage() {
  const params = useParams<{
    teamspace: string;
    project: string;
    id: string;
  }>();
  const router = useRouter();
  const projectSlug = params.project;
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

  // Fetch documents for each type
  const { data: scriptDoc } = trpc.document.getByVideo.useQuery({
    videoId,
    type: 'script',
  });

  const { data: descriptionDoc } = trpc.document.getByVideo.useQuery({
    videoId,
    type: 'description',
  });

  const { data: notesDoc } = trpc.document.getByVideo.useQuery({
    videoId,
    type: 'notes',
  });

  const { data: thumbnailIdeasDoc } = trpc.document.getByVideo.useQuery({
    videoId,
    type: 'thumbnail_ideas',
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
      router.push(`/t/${params.teamspace}/${projectSlug}/videos`);
    },
  });

  // Document update mutation
  const updateDocumentMutation = trpc.document.update.useMutation();

  // tRPC utils for refetching
  const utils = trpc.useUtils();

  /**
   * Handle video update
   */
  const handleUpdateVideo = async (data: VideoFormData) => {
    await updateVideoMutation.mutateAsync({
      id: videoId,
      title: data.title,
      description: data.description ?? undefined,
      status: data.status,
      dueDate: data.dueDate || undefined,
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
   * Handle document save
   */
  const handleDocumentSave = async (
    documentId: string,
    content: string,
    version: number
  ) => {
    const result = await updateDocumentMutation.mutateAsync({
      id: documentId,
      content,
      expectedVersion: version,
    });
    return { version: result.version };
  };

  /**
   * Handle document reload
   */
  const handleDocumentReload = async (
    videoId: string,
    type: 'script' | 'description' | 'notes' | 'thumbnail_ideas'
  ) => {
    const result = await utils.document.getByVideo.fetch({ videoId, type });
    return {
      content: result.content,
      version: result.version,
    };
  };

  /**
   * Format date for display
   */
  const formatDate = (date: string | Date | null): string => {
    if (!date) return 'Not set';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
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
          <Button
            onClick={() =>
              router.push(`/t/${params.teamspace}/${projectSlug}/videos`)
            }
          >
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
            style={{ backgroundColor: STATUS_COLORS[video.status] }}
          >
            {STATUS_LABELS[video.status]}
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
        <div
          className={styles.tabList}
          role="tablist"
          aria-label="Video document tabs"
          onKeyDown={(e) => {
            const tabs = ['script', 'description', 'notes', 'thumbnail_ideas'];
            const currentIndex = tabs.indexOf(activeTab);

            if (e.key === 'ArrowRight') {
              e.preventDefault();
              const nextIndex = (currentIndex + 1) % tabs.length;
              setActiveTab(tabs[nextIndex] as typeof activeTab);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              const prevIndex = (currentIndex - 1 + tabs.length) % tabs.length;
              setActiveTab(tabs[prevIndex] as typeof activeTab);
            } else if (e.key === 'Home') {
              e.preventDefault();
              setActiveTab('script');
            } else if (e.key === 'End') {
              e.preventDefault();
              setActiveTab('thumbnail_ideas');
            }
          }}
        >
          <button
            id="script-tab"
            role="tab"
            aria-selected={activeTab === 'script'}
            aria-controls="script-panel"
            tabIndex={activeTab === 'script' ? 0 : -1}
            className={`${styles.tab} ${activeTab === 'script' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('script')}
          >
            Script
          </button>
          <button
            id="description-tab"
            role="tab"
            aria-selected={activeTab === 'description'}
            aria-controls="description-panel"
            tabIndex={activeTab === 'description' ? 0 : -1}
            className={`${styles.tab} ${activeTab === 'description' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button
            id="notes-tab"
            role="tab"
            aria-selected={activeTab === 'notes'}
            aria-controls="notes-panel"
            tabIndex={activeTab === 'notes' ? 0 : -1}
            className={`${styles.tab} ${activeTab === 'notes' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('notes')}
          >
            Notes
          </button>
          <button
            id="thumbnail-tab"
            role="tab"
            aria-selected={activeTab === 'thumbnail_ideas'}
            aria-controls="thumbnail-panel"
            tabIndex={activeTab === 'thumbnail_ideas' ? 0 : -1}
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
            {scriptDoc ? (
              <DocumentEditor
                documentId={scriptDoc.id}
                initialContent={scriptDoc.content}
                initialVersion={scriptDoc.version}
                onSave={(content, version) =>
                  handleDocumentSave(scriptDoc.id, content, version)
                }
                onReloadDocument={() => handleDocumentReload(videoId, 'script')}
                documentType="Script"
              />
            ) : (
              <p className={styles.placeholder}>Loading script...</p>
            )}
          </div>

          <div
            role="tabpanel"
            id="description-panel"
            aria-labelledby="description-tab"
            hidden={activeTab !== 'description'}
            className={styles.tabPanel}
          >
            {descriptionDoc ? (
              <DocumentEditor
                documentId={descriptionDoc.id}
                initialContent={descriptionDoc.content}
                initialVersion={descriptionDoc.version}
                onSave={(content, version) =>
                  handleDocumentSave(descriptionDoc.id, content, version)
                }
                onReloadDocument={() =>
                  handleDocumentReload(videoId, 'description')
                }
                documentType="Description"
              />
            ) : (
              <p className={styles.placeholder}>Loading description...</p>
            )}
          </div>

          <div
            role="tabpanel"
            id="notes-panel"
            aria-labelledby="notes-tab"
            hidden={activeTab !== 'notes'}
            className={styles.tabPanel}
          >
            {notesDoc ? (
              <DocumentEditor
                documentId={notesDoc.id}
                initialContent={notesDoc.content}
                initialVersion={notesDoc.version}
                onSave={(content, version) =>
                  handleDocumentSave(notesDoc.id, content, version)
                }
                onReloadDocument={() => handleDocumentReload(videoId, 'notes')}
                documentType="Notes"
              />
            ) : (
              <p className={styles.placeholder}>Loading notes...</p>
            )}
          </div>

          <div
            role="tabpanel"
            id="thumbnail-panel"
            aria-labelledby="thumbnail-tab"
            hidden={activeTab !== 'thumbnail_ideas'}
            className={styles.tabPanel}
          >
            {thumbnailIdeasDoc ? (
              <DocumentEditor
                documentId={thumbnailIdeasDoc.id}
                initialContent={thumbnailIdeasDoc.content}
                initialVersion={thumbnailIdeasDoc.version}
                onSave={(content, version) =>
                  handleDocumentSave(thumbnailIdeasDoc.id, content, version)
                }
                onReloadDocument={() =>
                  handleDocumentReload(videoId, 'thumbnail_ideas')
                }
                documentType="Thumbnail Ideas"
              />
            ) : (
              <p className={styles.placeholder}>Loading thumbnail ideas...</p>
            )}
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
