import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { db } from '@/server/db';
import type {
  User,
  Session,
  Workspace,
  WorkspaceUser,
  WorkspaceRole,
} from '@/server/db/schema';
import { validateSessionToken, parseSessionToken } from '@/lib/auth';
import type { WorkspaceRepository } from '@/server/repositories';

/**
 * tRPC Context
 *
 * The context is available in all tRPC procedures.
 * It contains the database connection, user session, and request info.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
 */

/**
 * Context shape for all procedures
 *
 * Note: workspace, workspaceUser, workspaceRole, and repository are populated
 * by the workspaceMiddleware for workspace-scoped procedures.
 */
export interface Context {
  db: typeof db;
  session: Session | null;
  user: User | null;
  workspace: Workspace | null;
  workspaceUser: WorkspaceUser | null;
  workspaceRole: WorkspaceRole | null;
  repository: WorkspaceRepository | null;
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
  workspace?: Workspace | null;
  workspaceUser?: WorkspaceUser | null;
  workspaceRole?: WorkspaceRole | null;
  repository?: WorkspaceRepository | null;
}): Omit<Context, 'req' | 'headers'> {
  return {
    db,
    session: opts?.session ?? null,
    user: opts?.user ?? null,
    workspace: opts?.workspace ?? null,
    workspaceUser: opts?.workspaceUser ?? null,
    workspaceRole: opts?.workspaceRole ?? null,
    repository: opts?.repository ?? null,
  };
}

/**
 * Create context from request
 * Called for every tRPC request
 *
 * Validates session token from cookies and populates user context.
 * Workspace context is populated by workspaceMiddleware for workspace-scoped procedures.
 *
 * @see /docs/adrs/007-api-and-auth.md
 * @see /docs/adrs/008-multi-tenancy-strategy.md
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

  // Workspace context is NOT populated here.
  // It's populated by workspaceMiddleware for workspace-scoped procedures.
  // This ensures workspace access is always explicitly required via workspaceProcedure.
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
