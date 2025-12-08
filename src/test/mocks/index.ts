/**
 * MSW Mocks Index
 *
 * Re-exports all MSW mock utilities.
 *
 * @example
 * ```typescript
 * import { server, handlers } from '@/test/mocks';
 * ```
 */

export { server, mswSetup } from './server';
export {
  handlers,
  authHandlers,
  healthHandlers,
  videoHandlers,
  createAuthenticatedHandlers,
  createUnauthenticatedHandlers,
  createErrorHandlers,
} from './handlers';
