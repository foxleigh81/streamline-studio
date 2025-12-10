# ADR-015: Row-Level Security Evaluation

**Status**: Evaluated - Deferred
**Date**: 2025-12-10
**Deciders**: Strategic Project Planner, Security Architect

## Context

Phase 5 (Multi-Tenant SaaS Mode) introduced the need to evaluate PostgreSQL Row-Level Security (RLS) as a defense-in-depth measure for cross-tenant data isolation.

Currently, workspace isolation is enforced at the application layer through:

1. `WorkspaceRepository` pattern - all queries are workspace-scoped
2. tRPC middleware - validates user's workspace membership
3. Foreign key constraints - ensure referential integrity

## Evaluation

### Current Application-Level Isolation

**Strengths:**

- Single point of enforcement in `WorkspaceRepository`
- TypeScript ensures compile-time type safety
- Integration tests verify isolation
- Easy to audit and understand
- No database-specific dependencies

**Weaknesses:**

- Relies on developers always using repository methods
- Direct database access bypasses protection
- No defense against SQL injection if it occurs

### PostgreSQL Row-Level Security

**What RLS Would Add:**

- Database-level enforcement as secondary layer
- Protection against SQL injection attacks
- Protection against direct database access
- Immutable audit trail of access patterns

**Challenges with RLS:**

1. **Connection Pooling**: RLS policies use `current_setting()` which requires per-session configuration. With connection pooling (used by Next.js), we'd need to set the workspace context on every query.

2. **Performance Overhead**: Each query incurs policy evaluation cost. For high-traffic SaaS, this could impact response times.

3. **Complexity**: Two layers of access control increases cognitive load and potential for subtle bugs where app and DB disagree.

4. **Migration Path**: Adding RLS to existing tables requires careful migration to avoid breaking changes.

5. **Drizzle ORM Compatibility**: While Drizzle supports raw SQL, RLS policies aren't first-class citizens, making maintenance harder.

### Example RLS Implementation (if implemented)

```sql
-- Enable RLS on videos table
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- Create policy for workspace isolation
CREATE POLICY workspace_isolation_videos ON videos
  USING (workspace_id = current_setting('app.workspace_id')::uuid);

-- App would need to set context before each query
SET LOCAL app.workspace_id = '<workspace-uuid>';
```

### Risk Assessment

| Risk                                         | Without RLS | With RLS   |
| -------------------------------------------- | ----------- | ---------- |
| SQL Injection leading to cross-tenant access | Medium      | Low        |
| Developer bypassing repository pattern       | Low         | Very Low   |
| Direct database access by malicious admin    | Medium      | Low        |
| Performance degradation                      | N/A         | Low-Medium |
| Implementation bugs                          | Low         | Medium     |

## Decision

**Defer RLS implementation** for the following reasons:

1. **Current Protection is Adequate**: The `WorkspaceRepository` pattern combined with comprehensive integration tests provides strong isolation. No incidents have been reported.

2. **Complexity vs. Benefit**: The added complexity of maintaining RLS policies alongside application-level checks doesn't justify the marginal security improvement for this application's threat model.

3. **Connection Pooling Challenges**: Next.js's connection pooling would require significant architectural changes to properly support session-level RLS context.

4. **Performance Considerations**: For a self-hosted application, the simpler approach is preferable. RLS would add latency to every query.

5. **Audit and Monitoring**: We recommend implementing query-level audit logging as an alternative defense-in-depth measure.

## Recommendations

Instead of RLS, we recommend:

1. **Strengthen Integration Tests**: Add more comprehensive cross-tenant isolation tests
2. **Query Audit Logging**: Log all database queries with workspace context for forensic analysis
3. **Repository Pattern Enforcement**: Add linting rules to prevent direct table access outside repositories
4. **Security Reviews**: Regular code reviews focusing on data access patterns

## Consequences

### Positive

- Simpler architecture
- Better performance
- Easier debugging
- No database-specific dependencies

### Negative

- Single layer of protection (application level only)
- Requires discipline to use repository pattern consistently
- Direct database access is not protected

## Future Considerations

If the following conditions change, RLS should be reconsidered:

1. Multi-tenant deployment at scale with high-security requirements
2. Compliance requirements mandating database-level isolation (e.g., SOC 2)
3. Incidents indicating application-level isolation is insufficient
4. Adoption of a connection manager that supports session-level configuration

## References

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [ADR-008: Multi-Tenancy Strategy](./008-multitenancy-strategy.md)
- [ADR-014: Security Architecture](./014-security-architecture.md)
