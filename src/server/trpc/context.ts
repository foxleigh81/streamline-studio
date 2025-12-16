import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@/server/db';
import type {
  User,
  Session,
  Channel,
  ChannelUser,
  ChannelRole,
  Teamspace,
  TeamspaceUser,
  TeamspaceRole,
} from '@/server/db/schema';
import { validateSessionToken, parseSessionToken } from '@/lib/auth/session';
import type {
  ChannelRepository,
  TeamspaceRepository,
} from '@/server/repositories';

/**
 * tRPC Context
 *
 * The context is available in all tRPC procedures.
 * It contains the database connection, user session, and request info.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */

/**
 * Context shape for all procedures
 *
 * Note: Context is extended by middleware:
 * - teamspaceMiddleware adds: teamspace, teamspaceUser, teamspaceRole, teamspaceRepository
 * - channelMiddleware adds: channel, channelUser, channelRole, channelRepository
 */
export interface Context {
  db: typeof db;
  session: Session | null;
  user: User | null;
  // Teamspace context (added by teamspaceMiddleware)
  teamspace: Teamspace | null;
  teamspaceUser: TeamspaceUser | null;
  teamspaceRole: TeamspaceRole | null;
  teamspaceRepository: TeamspaceRepository | null;
  // Channel context (added by channelMiddleware)
  channel: Channel | null;
  channelUser: ChannelUser | null;
  channelRole: ChannelRole | null;
  channelRepository: ChannelRepository | null;
  // Request context
  req: Request;
  headers: Headers;
}

/**
 * Inner context creation - doesn't depend on request
 * Useful for testing
 */
export function createInnerContext(opts?: {
  session?: Session | null;
  user?: User | null;
  teamspace?: Teamspace | null;
  teamspaceUser?: TeamspaceUser | null;
  teamspaceRole?: TeamspaceRole | null;
  teamspaceRepository?: TeamspaceRepository | null;
  channel?: Channel | null;
  channelUser?: ChannelUser | null;
  channelRole?: ChannelRole | null;
  channelRepository?: ChannelRepository | null;
}): Omit<Context, 'req' | 'headers'> {
  return {
    db,
    session: opts?.session ?? null,
    user: opts?.user ?? null,
    teamspace: opts?.teamspace ?? null,
    teamspaceUser: opts?.teamspaceUser ?? null,
    teamspaceRole: opts?.teamspaceRole ?? null,
    teamspaceRepository: opts?.teamspaceRepository ?? null,
    channel: opts?.channel ?? null,
    channelUser: opts?.channelUser ?? null,
    channelRole: opts?.channelRole ?? null,
    channelRepository: opts?.channelRepository ?? null,
  };
}

/**
 * Create context from request
 * Called for every tRPC request
 *
 * Validates session token from cookies and populates user context.
 * Teamspace and channel context are populated by middleware for scoped procedures.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 * @see /docs/adrs/017-teamspace-hierarchy.md
 */
export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const { req } = opts;
  // Create a new Headers object for response manipulation
  const headers = new Headers();

  // Extract and validate session from cookies
  const cookieHeader = req.headers.get('cookie');
  const sessionToken = parseSessionToken(cookieHeader);

  let session: Session | null = null;
  let user: User | null = null;

  if (sessionToken) {
    const validationResult = await validateSessionToken(sessionToken);
    session = validationResult.session;
    user = validationResult.user;
  }

  // Teamspace and channel context are NOT populated here.
  // They are populated by teamspaceMiddleware and channelMiddleware.
  // This ensures access is always explicitly required via appropriate procedures.
  return {
    ...createInnerContext({ session, user }),
    req,
    headers,
  };
}

/**
 * Type for the full context
 */
export type ContextType = Awaited<ReturnType<typeof createContext>>;
