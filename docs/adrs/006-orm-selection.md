# ADR-006: ORM Selection

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

The application requires an ORM for interacting with PostgreSQL. The primary requirements are:

- Type-safe queries with TypeScript
- Support for complex queries (joins, transactions for optimistic locking)
- Good migration tooling for self-hosted deployments
- Performance for frequent document saves
- Compatibility with multi-tenant patterns (workspace scoping)

The two leading TypeScript ORM options are Prisma and Drizzle.

## Decision

**Use Drizzle ORM** for all database operations.

## Consequences

### Positive

- **SQL-like syntax**: Queries closely mirror SQL, making complex operations intuitive
- **Performance**: Lower overhead than Prisma's query engine, faster for frequent saves
- **Bundle size**: ~15KB vs Prisma's runtime engine
- **No binary dependencies**: Runs as pure TypeScript, simplifying Docker builds
- **Fine-grained control**: Ideal for implementing optimistic locking transactions
- **TypeScript-first**: Excellent type inference without codegen step

### Negative

- **Less mature ecosystem**: Fewer community examples and tutorials than Prisma
- **Migration tooling**: Drizzle Kit is newer, less polished than Prisma Migrate
- **Learning curve**: Developers familiar with Prisma need adjustment
- **Studio tooling**: Drizzle Studio less polished than Prisma Studio

## Alternatives Considered

### Prisma

**Pros:**

- Most popular TypeScript ORM with extensive documentation
- Excellent Prisma Studio for database browsing
- Mature migration system

**Cons:**

- Query engine adds latency
- Binary engine complicates multi-architecture Docker builds
- Less intuitive for complex queries (interactive transactions)
- Larger bundle size

### Raw SQL with pg

**Pros:**

- Maximum performance and control

**Cons:**

- No type safety without significant manual effort
- More boilerplate and maintenance burden

## Discussion

### Strategic Project Planner

"Looking at our requirements, the document versioning system will need transactions that:

1. Check current version
2. Insert a revision record
3. Update the document with incremented version

This is a perfect use case for evaluating ORM capabilities. Prisma can do this with interactive transactions, but the API is more awkward than Drizzle's SQL-like approach."

"I'm also concerned about the self-hosting story. We've seen issues with Prisma's query engine binary on different architectures - arm64 Macs, Raspberry Pi deployments. Drizzle being pure TypeScript avoids this class of problems entirely."

### Lead Developer

"I've used both extensively. For our specific needs, Drizzle is the better choice for several reasons:

First, the optimistic locking implementation is cleaner. Here's what it looks like in Drizzle:

```typescript
await db.transaction(async (tx) => {
  const [current] = await tx.select()
    .from(documents)
    .where(eq(documents.id, id))
    .for('update');

  if (current.version !== expectedVersion) {
    throw new ConflictError();
  }

  await tx.insert(documentRevisions).values({...});
  await tx.update(documents)
    .set({ content, version: current.version + 1 })
    .where(eq(documents.id, id));
});
```

This reads like the SQL we'd write anyway. The equivalent Prisma code requires `$transaction` with explicit isolation levels and is more verbose.

Second, Docker builds are simpler. No platform-specific binaries to manage. Our self-hosters will thank us.

That said, I acknowledge the ecosystem trade-off. Prisma has more Stack Overflow answers, more tutorials. But our team can handle the learning curve, and the benefits outweigh this disadvantage."

### QA Architect

"From a testing perspective, both ORMs work fine with test databases. My concern is migration reliability for self-hosted users who might skip versions during upgrades.

I tested both migration systems:

- Prisma Migrate handles more edge cases automatically
- Drizzle Kit occasionally needs manual intervention for complex schema changes

For our relatively straightforward schema, Drizzle Kit should be adequate. But we must add CI tests that verify migrations work on a fresh database AND on an upgrade from any previous version.

One more thing: verify the optimistic locking pattern works correctly with Drizzle's transaction handling. I'd want to see a spike test with concurrent saves before we commit to Phase 3."

### Lead Developer (Response)

"Agreed on migration testing. I'll set up a CI job that runs migrations against fresh Postgres and also against a database at the previous schema version.

For the optimistic locking spike, I've already prototyped it. The `FOR UPDATE` lock works correctly in Drizzle transactions. Concurrent requests to the same document correctly block until the transaction completes."

### Strategic Project Planner (Conclusion)

"Consensus is Drizzle. The main risks are ecosystem maturity and migration tooling, both of which we can mitigate with good testing practices. The performance and Docker benefits are worth it."

## Implementation Notes

- Use `drizzle-orm` with `pg` driver
- Use `drizzle-kit` for migrations
- Configure connection pooling appropriately for concurrent saves
- All workspace-scoped queries must go through the WorkspaceRepository abstraction
