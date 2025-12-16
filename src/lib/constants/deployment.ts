/**
 * Deployment Mode Constants
 *
 * Utilities for detecting and working with single-tenant vs multi-tenant deployments.
 * Used throughout the app to conditionally show/hide teamspace-level features.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

/**
 * Deployment mode type
 */
export type DeploymentMode = 'single-tenant' | 'multi-tenant';

/**
 * Get the current deployment mode from environment variable
 *
 * @returns 'single-tenant' or 'multi-tenant' (defaults to 'single-tenant')
 */
export function getDeploymentMode(): DeploymentMode {
  const mode =
    process.env.NEXT_PUBLIC_MODE ?? process.env.MODE ?? 'single-tenant';
  return mode === 'multi-tenant' ? 'multi-tenant' : 'single-tenant';
}

/**
 * Check if app is running in multi-tenant mode
 *
 * @returns true if multi-tenant mode is enabled
 */
export function isMultiTenant(): boolean {
  return getDeploymentMode() === 'multi-tenant';
}

/**
 * Check if app is running in single-tenant mode
 *
 * @returns true if single-tenant mode is enabled
 */
export function isSingleTenant(): boolean {
  return getDeploymentMode() === 'single-tenant';
}
