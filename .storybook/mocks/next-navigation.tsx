/**
 * Mock for next/navigation in Storybook
 *
 * Provides stub implementations for Next.js navigation hooks
 * since Storybook uses @storybook/react-vite instead of @storybook/nextjs.
 */

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    prefetch: () => {},
    back: () => {},
    forward: () => {},
    refresh: () => {},
  };
}

export function usePathname() {
  return '/';
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function useSelectedLayoutSegment() {
  return null;
}

export function useSelectedLayoutSegments() {
  return [];
}

export function redirect() {
  throw new Error('redirect() called in Storybook');
}

export function notFound() {
  throw new Error('notFound() called in Storybook');
}
