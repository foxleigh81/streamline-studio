/**
 * Slug Generation Utilities
 *
 * Shared utilities for generating URL-safe slugs from user input.
 * Used for projects, teamspaces, and other user-created resources.
 *
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

/**
 * Generate a URL-safe slug from a name
 *
 * Converts a human-readable name into a URL-safe slug:
 * - Converts to lowercase
 * - Replaces non-alphanumeric characters with hyphens
 * - Removes leading/trailing hyphens
 * - Collapses multiple consecutive hyphens
 *
 * @param name - The human-readable name to convert
 * @param fallback - Fallback slug if name is empty (default: 'my-project')
 * @returns URL-safe slug
 *
 * @example
 * generateSlug('My YouTube Channel') // 'my-youtube-channel'
 * generateSlug('What the heck!?') // 'what-the-heck'
 * generateSlug('Project!!!') // 'project'
 * generateSlug('   Spaces   ') // 'spaces'
 * generateSlug('123 Numbers') // '123-numbers'
 * generateSlug('') // 'my-project' (fallback)
 */
export function generateSlug(name: string, fallback = 'my-project'): string {
  // Trim whitespace and convert to lowercase
  const trimmed = name.trim().toLowerCase();

  // If empty after trimming, use fallback
  if (!trimmed) {
    return fallback;
  }

  // Replace non-alphanumeric characters with hyphens
  // Keep numbers and letters, replace everything else with hyphen
  let slug = trimmed.replace(/[^a-z0-9]+/g, '-');

  // Remove leading and trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '');

  // If we end up with an empty slug after cleanup, use fallback
  if (!slug) {
    return fallback;
  }

  return slug;
}

/**
 * Generate a unique slug by appending a random suffix
 *
 * Used when a slug collision is detected. Appends a random
 * alphanumeric suffix to make the slug unique.
 *
 * @param baseSlug - The base slug to make unique
 * @returns Slug with random suffix appended
 *
 * @example
 * generateUniqueSlug('my-project') // 'my-project-a3f8k2'
 */
export function generateUniqueSlug(baseSlug: string): string {
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${baseSlug}-${randomSuffix}`;
}
