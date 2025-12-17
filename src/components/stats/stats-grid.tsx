import type { ReactNode } from 'react';
import styles from './stats-grid.module.scss';

/**
 * StatsGrid Component
 *
 * A responsive grid container for displaying multiple StatCard components.
 * Automatically adjusts columns based on screen size.
 */

export interface StatsGridProps {
  /** Child components (typically StatCard components) */
  children: ReactNode;
}

/**
 * StatsGrid Component
 */
export function StatsGrid({ children }: StatsGridProps) {
  return <div className={styles.grid}>{children}</div>;
}

StatsGrid.displayName = 'StatsGrid';
