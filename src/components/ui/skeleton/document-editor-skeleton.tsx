import { Skeleton } from './skeleton';
import styles from './document-editor-skeleton.module.scss';

/**
 * DocumentEditorSkeleton Component
 *
 * Loading placeholder for the document editor.
 * Shows toolbar and content area placeholders.
 */
export function DocumentEditorSkeleton() {
  return (
    <div
      className={styles.container}
      aria-busy="true"
      aria-label="Loading document editor"
    >
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Skeleton width="6rem" height="2rem" variant="rectangular" />
        <div className={styles.toolbarButtons}>
          <Skeleton width="2rem" height="2rem" variant="rectangular" />
          <Skeleton width="2rem" height="2rem" variant="rectangular" />
          <Skeleton width="2rem" height="2rem" variant="rectangular" />
        </div>
      </div>

      {/* Editor content */}
      <div className={styles.content}>
        <Skeleton width="90%" height="1rem" variant="text" />
        <Skeleton width="100%" height="1rem" variant="text" />
        <Skeleton width="80%" height="1rem" variant="text" />
        <div style={{ height: '1rem' }} />
        <Skeleton width="100%" height="1rem" variant="text" />
        <Skeleton width="95%" height="1rem" variant="text" />
        <Skeleton width="85%" height="1rem" variant="text" />
        <div style={{ height: '1rem' }} />
        <Skeleton width="70%" height="1rem" variant="text" />
      </div>
    </div>
  );
}

DocumentEditorSkeleton.displayName = 'DocumentEditorSkeleton';
