/**
 * Channel Module Exports
 *
 * Central export for channel-related functionality.
 *
 * @see /docs/adrs/017-teamspace-hierarchy.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

// Context and hooks
export {
  ChannelContext,
  useChannel,
  useChannelOptional,
  useChannelId,
  useChannelSlug,
  useChannelRole,
  useHasChannelRole,
  useIsChannelOwner,
  useCanEditChannel,
  type ChannelContextValue,
  type ChannelData,
} from './context';

// Provider
export { ChannelProvider } from './provider';
