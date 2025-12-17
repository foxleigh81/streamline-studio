'use client';

import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from './stat-card.module.scss';

/**
 * StatCard Component
 *
 * Displays a single statistic with an optional icon and trend indicator.
 * Used in dashboard views to show key metrics.
 */

export interface StatCardProps {
  /** Label for the statistic */
  label: string;
  /** Value to display (can be string or number) */
  value: string | number;
  /** Optional icon to display */
  icon?: ReactNode;
  /** Optional trend direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Optional trend value (e.g., percentage change) */
  trendValue?: number;
}

/**
 * Get trend icon based on direction
 */
function getTrendIcon(trend: StatCardProps['trend']): ReactNode {
  switch (trend) {
    case 'up':
      return <TrendingUp className={styles.trendIcon} aria-hidden="true" />;
    case 'down':
      return <TrendingDown className={styles.trendIcon} aria-hidden="true" />;
    case 'neutral':
      return <Minus className={styles.trendIcon} aria-hidden="true" />;
    default:
      return null;
  }
}

/**
 * StatCard Component
 */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendValue,
}: StatCardProps) {
  const trendClassName = trend
    ? `${styles.trend} ${styles[`trend${trend.charAt(0).toUpperCase() + trend.slice(1)}`]}`
    : styles.trend;

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        {icon && <div className={styles.iconWrapper}>{icon}</div>}
        <p className={styles.label}>{label}</p>
      </div>
      <div className={styles.content}>
        <p className={styles.value}>{value}</p>
        {trend && (
          <div className={trendClassName}>
            {getTrendIcon(trend)}
            {trendValue !== undefined && (
              <span className={styles.trendValue}>
                {trendValue > 0 ? '+' : ''}
                {trendValue}%
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

StatCard.displayName = 'StatCard';
