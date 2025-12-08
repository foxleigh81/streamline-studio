/**
 * Focus Trap Utilities
 *
 * Utilities for managing focus within modals and dialogs.
 * Ensures keyboard users stay within the modal when it's open.
 */

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll(focusableSelectors));
}

/**
 * Trap focus within a container
 * Returns a cleanup function to remove event listeners
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusableElements = getFocusableElements(container);
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  // Focus first element
  firstElement?.focus();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    // Shift + Tab (backward)
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      }
    }
    // Tab (forward)
    else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  };

  container.addEventListener('keydown', handleKeyDown);

  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleKeyDown);
  };
}

/**
 * Store the element that had focus before opening a modal
 */
export function saveFocus(): HTMLElement | null {
  return document.activeElement as HTMLElement;
}

/**
 * Restore focus to the previously focused element
 */
export function restoreFocus(element: HTMLElement | null): void {
  if (element && typeof element.focus === 'function') {
    element.focus();
  }
}
