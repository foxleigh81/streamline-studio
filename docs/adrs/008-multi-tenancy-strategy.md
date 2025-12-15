# ADR-008: Multi-Tenancy Strategy

**Status**: Superseded by ADR-017
**Date**: 2025-12-08
**Superseded By**: ADR-017 (Teamspace Hierarchy Architecture) - 2025-12-15
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

> **Note**: This ADR established the foundational multi-tenancy approach with workspace-level scoping and the WorkspaceRepository pattern. ADR-017 extends this with a two-tier hierarchy (Teamspace → Project) to support SaaS billing and team-level permissions while maintaining the same core scoping principles.

## Context

The application must support two deployment modes from a single codebase:

1. **Single-tenant mode**: Self-hosted instance for one user or small team
2. **Multi-tenant mode**: SaaS deployment with multiple isolated workspaces

Requirements:

- Complete data isolation between workspaces
- Mode switchable via `MODE` environment variable
- Single-tenant should feel simple (minimal workspace management overhead)
- Multi-tenant must scale without architectural changes
- Same PostgreSQL database technology in both modes

## Decision

Use **application-level multi-tenancy with workspace_id scoping** in a single PostgreSQL database.

### Implementation Approach

1. All tenant-scoped tables include a `workspace_id` column
2. A typed `WorkspaceRepository<T>` enforces scoping at the type level
3. tRPC middleware injects workspace context from session
4. No queries execute without workspace context (except auth endpoints)

### Mode Differences

| Aspect        | Single-Tenant                          | Multi-Tenant                          |
| ------------- | -------------------------------------- | ------------------------------------- |
| Registration  | First user gets auto-created workspace | Public registration creates workspace |
| Workspace UI  | Hidden                                 | Visible (switcher, settings)          |
| URL structure | `/videos`                              | `/w/[slug]/videos`                    |
| Setup wizard  | Shown on first run                     | Disabled                              |

## Consequences

### Positive

- **Simple infrastructure**: Single database, standard backup/restore
- **Consistent code paths**: Same scoping logic regardless of mode
- **Easy query patterns**: Every query adds `WHERE workspace_id = ?`
- **Flexible scaling**: Can shard by workspace_id later if needed
- **Straightforward testing**: Same logic tested in both modes

### Negative

- **Noisy neighbor risk**: One workspace's heavy usage affects others
- **No physical isolation**: All data in same tables
- **Query discipline required**: Every query must include workspace_id
- **Potential data leak**: Bug in scoping could expose cross-tenant data

## Alternatives Considered

### PostgreSQL Row-Level Security (RLS)

**Pros:**

- Database-enforced isolation (defense in depth)
- Impossible to accidentally query wrong tenant
- Cleaner query code (no explicit filters)

**Cons:**

- Complex setup (policy per table)
- Session variable management on every request
- Connection pooling complications
- Drizzle ORM support is limited
- Debugging is difficult (queries silently return nothing)

### Schema-per-Tenant

**Pros:**

- Complete isolation
- Easy per-tenant backup/restore

**Cons:**

- Migration complexity (run on every schema)
- Schema proliferation
- Overkill for target market

### Database-per-Tenant

**Pros:**

- Maximum isolation
- Independent scaling per tenant

**Cons:**

- Significant operational overhead
- Complex connection management
- Massive overkill for MVP

## Discussion

### Strategic Project Planner

"Let me enumerate the approaches:

1. **Shared tables, application scoping**: All workspaces in same tables, app adds workspace_id filter
2. **Shared tables, RLS**: PostgreSQL enforces via policies
3. **Schema per tenant**: Each workspace gets its own PostgreSQL schema
4. **Database per tenant**: Fully separate databases

For our target users - individual creators and small teams - options 3 and 4 are massive overkill. We're not building for enterprises with compliance requirements demanding physical isolation."

"Between options 1 and 2, RLS is appealing for defense-in-depth, but adds complexity. If we screw up RLS policies, debugging is much harder than debugging application code."

### Lead Developer

"I've implemented both approaches in production. RLS sounds great in theory but has practical friction:

1. **Setup complexity**: Every table needs policies. Miss one, and queries silently return empty.
2. **ORM support**: Drizzle doesn't have first-class RLS support. We'd write raw SQL for policies.
3. **Debugging nightmare**: When a query returns nothing, is it no data or RLS blocking?
4. **Performance**: Policies execute on every query. For frequent document saves, this adds up.

Application-level scoping in middleware is easier to implement, test, and debug. The key is making scoping type-safe so forgetting it is a compile error, not a runtime bug."

### QA Architect

"My primary concern: what happens when a developer writes a query and forgets the workspace filter? In application-level scoping, that's a data leak."

"I want safeguards:

1. No raw Drizzle `db.select()` calls - everything through repository layer
2. Repository pattern makes workspace_id mandatory at type level
3. Integration tests that verify cross-tenant queries fail
4. Code review checklist including workspace scoping verification"

### Lead Developer (Response)

"Here's the repository pattern I'm proposing:

```typescript
class WorkspaceRepository<T extends WorkspaceScopedTable> {
  constructor(
    private db: DrizzleDb,
    private table: T,
    private workspaceId: string
  ) {}

  async findMany(where?: WhereCondition<T>) {
    return this.db
      .select()
      .from(this.table)
      .where(and(eq(this.table.workspaceId, this.workspaceId), where));
  }

  async findById(id: string) {
    const [result] = await this.db
      .select()
      .from(this.table)
      .where(
        and(eq(this.table.id, id), eq(this.table.workspaceId, this.workspaceId))
      );
    return result;
  }
}
```

The workspace scoping is built into every method. You literally cannot query without it.

In tRPC procedures:

````typescript
export const videoRouter = router({
  list: workspaceProcedure.query(async ({ ctx }) => {
    // ctx.repos.video already scoped to ctx.workspace.id
    return ctx.repos.video.findMany();
  }),
});
```"

### QA Architect (Response)

"That's better. I also want integration tests like:

```typescript
it('user cannot access videos from another workspace', async () => {
  const workspaceA = await createWorkspace();
  const workspaceB = await createWorkspace();
  const videoInB = await createVideo({ workspaceId: workspaceB.id });

  const caller = createCaller({ workspace: workspaceA });
  await expect(caller.video.get({ id: videoInB.id }))
    .rejects.toThrow('NOT_FOUND');
});
````

Every entity type needs this test. Run on every CI build."

### Strategic Project Planner (Additional Edge Case)

"One scenario: in single-tenant mode, what if someone creates data, then switches to multi-tenant mode?"

### Lead Developer (Response)

"Behaviour should be:

1. Existing workspace remains accessible
2. In multi-tenant mode, they can now create additional workspaces
3. URL structure changes to include workspace slug
4. Their existing data is unaffected

If they switch back to single-tenant, we pick the most recently accessed workspace as the default. We'll document this and add a test."

### QA Architect (Final Note)

"One more edge case: user removed from workspace while actively editing a document. On next save, we must verify the user still has access. Return appropriate error, frontend redirects to workspace selector."

## Implementation Notes

### Environment Variable

```
MODE=single-tenant  # Default for self-hosted
MODE=multi-tenant   # Set for SaaS deployment
```

### Middleware Flow

```typescript
const workspaceProcedure = authedProcedure.use(async ({ ctx, next }) => {
  const mode = env.MODE;

  let workspace;
  if (mode === 'single-tenant') {
    workspace = await getDefaultWorkspace();
  } else {
    const slug = getWorkspaceSlugFromRequest(ctx.req);
    workspace = await getUserWorkspace(ctx.user.id, slug);
  }

  if (!workspace) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }

  const repos = createWorkspaceRepositories(ctx.db, workspace.id);

  return next({
    ctx: { ...ctx, workspace, repos },
  });
});
```

### URL Structure

| Mode          | Pattern                                     |
| ------------- | ------------------------------------------- |
| Single-tenant | `/videos`, `/videos/[id]`                   |
| Multi-tenant  | `/w/[slug]/videos`, `/w/[slug]/videos/[id]` |

### Reconsideration Triggers

Consider migrating to RLS if:

- Security audit requires database-level isolation
- Pursuing SOC 2 compliance
- A cross-tenant data leak occurs in production
