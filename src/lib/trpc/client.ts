import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/trpc/router';

/**
 * tRPC React Client
 *
 * Creates the tRPC hooks for use in React components.
 *
 * @example
 * ```tsx
 * import { trpc } from '@/lib/trpc/client';
 *
 * function MyComponent() {
 *   const { data } = trpc.hello.useQuery({ name: 'World' });
 *   return <div>{data?.greeting}</div>;
 * }
 * ```
 *
 * @see /docs/adrs/007-api-and-auth.md
 */
export const trpc = createTRPCReact<AppRouter>();
