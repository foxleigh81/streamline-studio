/**
 * ARIA Utilities
 *
 * Helper functions for managing ARIA attributes and live regions.
 */

/**
 * Announce a message to screen readers using an ARIA live region
 */
export function announce(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void {
  // Find or create the live region
  let liveRegion = document.getElementById('aria-live-region');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'aria-live-region';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    // Visually hide but keep accessible to screen readers
    liveRegion.style.position = 'absolute';
    liveRegion.style.left = '-10000px';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.overflow = 'hidden';
    document.body.appendChild(liveRegion);
  }

  // Update the priority if needed
  liveRegion.setAttribute('aria-live', priority);

  // Clear and set the message
  liveRegion.textContent = '';

  // Use setTimeout to ensure screen readers pick up the change
  setTimeout(() => {
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }, 100);
}

/**
 * Generate a unique ID for ARIA relationships
 *
 * Uses timestamp + random to ensure uniqueness across SSR and client renders.
 * This avoids hydration mismatches that occur with global counters.
 */
export function generateId(prefix: string = 'aria'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create an ARIA label from text content
 */
export function createLabel(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

/**
 * Check if an element is visible to screen readers
 */
export function isAriaHidden(element: HTMLElement): boolean {
  return element.getAttribute('aria-hidden') === 'true';
}

/**
 * Set aria-hidden on an element
 */
export function hideFromScreenReaders(element: HTMLElement): void {
  element.setAttribute('aria-hidden', 'true');
}

/**
 * Remove aria-hidden from an element
 */
export function showToScreenReaders(element: HTMLElement): void {
  element.removeAttribute('aria-hidden');
}
