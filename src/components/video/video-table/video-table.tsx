'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { VideoStatus } from '@/server/db/schema';
import {
  STATUS_COLORS,
  STATUS_TEXT_COLORS,
  STATUS_LABELS,
} from '@/lib/constants/status';
import { formatDueDateCompact } from '@/lib/utils/date';
import { announce } from '@/lib/accessibility/aria';
import styles from './video-table.module.scss';

/**
 * Sort direction
 */
type SortDirection = 'asc' | 'desc';

/**
 * Sortable column keys
 */
type SortableColumn = 'title' | 'status' | 'dueDate' | 'categories';

/**
 * Video data structure for table
 */
export interface VideoTableData {
  /** Video ID */
  id: string;
  /** Video title */
  title: string;
  /** Video status */
  status: VideoStatus;
  /** Due date (ISO string or null) */
  dueDate: string | null;
  /** Category names joined by comma */
  categories: string;
}

/**
 * VideoTable component props
 */
export interface VideoTableProps {
  /** Array of video data */
  videos: VideoTableData[];
  /** Channel slug for navigation */
  channelSlug: string;
  /** Optional teamspace slug (for multi-tenant mode) */
  teamspaceSlug?: string;
  /** Optional className for custom styling */
  className?: string;
  /** Optional click handler (overrides navigation) */
  onRowClick?: (id: string) => void;
}

/**
 * VideoTable Component
 *
 * Sortable table displaying videos with columns for Title, Status, Due Date, and Categories.
 * Clicking a row navigates to the video detail page. Column headers are clickable to sort.
 */
export function VideoTable({
  videos,
  channelSlug,
  teamspaceSlug,
  className,
  onRowClick,
}: VideoTableProps) {
  const [sortColumn, setSortColumn] = useState<SortableColumn>('title');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  /**
   * Sort videos based on current sort column and direction
   */
  const sortedVideos = useMemo(() => {
    const sorted = [...videos].sort((a, b) => {
      let compareResult = 0;

      switch (sortColumn) {
        case 'title':
          compareResult = a.title.localeCompare(b.title);
          break;
        case 'status':
          compareResult = STATUS_LABELS[a.status].localeCompare(
            STATUS_LABELS[b.status]
          );
          break;
        case 'dueDate': {
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          compareResult = dateA - dateB;
          break;
        }
        case 'categories':
          compareResult = a.categories.localeCompare(b.categories);
          break;
      }

      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return sorted;
  }, [videos, sortColumn, sortDirection]);

  /**
   * Handle column header click (toggle sort)
   */
  const handleColumnClick = (column: SortableColumn) => {
    let newDirection: SortDirection;
    if (sortColumn === column) {
      // Toggle direction if same column
      newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      setSortDirection(newDirection);
    } else {
      // Set new column with ascending direction
      newDirection = 'asc';
      setSortColumn(column);
      setSortDirection(newDirection);
    }

    // Announce sort change to screen readers
    const columnLabels: Record<SortableColumn, string> = {
      title: 'title',
      status: 'status',
      dueDate: 'due date',
      categories: 'categories',
    };
    const directionLabel = newDirection === 'asc' ? 'ascending' : 'descending';
    announce(
      `Table sorted by ${columnLabels[column]}, ${directionLabel} order`
    );
  };

  /**
   * Render sort indicator icon
   */
  const renderSortIcon = (column: SortableColumn) => {
    if (sortColumn !== column) return null;

    const Icon = sortDirection === 'asc' ? ChevronUp : ChevronDown;
    return <Icon size={16} className={styles.sortIcon} aria-hidden="true" />;
  };

  const tableClasses = [styles.tableContainer, className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={tableClasses}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th
              aria-sort={
                sortColumn === 'title'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.columnHeader}
                onClick={() => handleColumnClick('title')}
                aria-label={`Sort by title ${sortColumn === 'title' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
              >
                <span>Title</span>
                {renderSortIcon('title')}
              </button>
            </th>
            <th
              aria-sort={
                sortColumn === 'status'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.columnHeader}
                onClick={() => handleColumnClick('status')}
                aria-label={`Sort by status ${sortColumn === 'status' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
              >
                <span>Status</span>
                {renderSortIcon('status')}
              </button>
            </th>
            <th
              aria-sort={
                sortColumn === 'dueDate'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.columnHeader}
                onClick={() => handleColumnClick('dueDate')}
                aria-label={`Sort by due date ${sortColumn === 'dueDate' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
              >
                <span>Due Date</span>
                {renderSortIcon('dueDate')}
              </button>
            </th>
            <th
              aria-sort={
                sortColumn === 'categories'
                  ? sortDirection === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none'
              }
            >
              <button
                type="button"
                className={styles.columnHeader}
                onClick={() => handleColumnClick('categories')}
                aria-label={`Sort by categories ${sortColumn === 'categories' ? (sortDirection === 'asc' ? 'descending' : 'ascending') : 'ascending'}`}
              >
                <span>Categories</span>
                {renderSortIcon('categories')}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedVideos.map((video) => (
            <tr key={video.id} className={styles.row}>
              <td className={styles.titleCell}>
                <Link
                  href={`/t/${teamspaceSlug ?? 'workspace'}/${channelSlug}/content-plan/${video.id}`}
                  className={styles.titleLink}
                  onClick={(e) => {
                    if (onRowClick) {
                      e.preventDefault();
                      onRowClick(video.id);
                    }
                  }}
                >
                  {video.title}
                </Link>
              </td>
              <td className={styles.statusCell}>
                <span
                  className={styles.statusBadge}
                  style={{
                    backgroundColor: STATUS_COLORS[video.status],
                    color: STATUS_TEXT_COLORS[video.status],
                  }}
                >
                  {STATUS_LABELS[video.status]}
                </span>
              </td>
              <td className={styles.dueDateCell}>
                {formatDueDateCompact(video.dueDate)}
              </td>
              <td className={styles.categoriesCell}>
                {video.categories || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sortedVideos.length === 0 && (
        <div className={styles.emptyState}>
          <p>No videos to display</p>
        </div>
      )}
    </div>
  );
}

VideoTable.displayName = 'VideoTable';
