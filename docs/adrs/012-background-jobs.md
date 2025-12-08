# ADR-012: Background Jobs Strategy

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Background jobs may be needed for:

- **Phase 5**: Invitation emails (async delivery)
- **Phase 5**: Email verification (async delivery)
- **Phase 6**: YouTube API sync (scheduled, potentially high volume)
- **Future**: Document revision cleanup
- **Future**: Scheduled publishing reminders

The question is: when to introduce job infrastructure and what technology to use.

## Decision

### MVP (Phases 1-4): No Background Jobs

All operations are synchronous. No job queue infrastructure.

### Phase 5: Graphile Worker (PostgreSQL-based)

Introduce Graphile Worker for invitation and verification emails. Uses PostgreSQL as the queue, no additional infrastructure.

### Phase 6 Evaluation: BullMQ + Redis

If YouTube sync requires high-throughput job processing, evaluate adding Redis and BullMQ. Decision deferred until Phase 6 design.

## Consequences

### Positive

- **Simpler MVP**: No job infrastructure to deploy or maintain
- **No Redis for Phase 5**: Graphile Worker uses existing PostgreSQL
- **Transactional jobs**: Create invitation and job in same transaction
- **Easy self-hosting**: No additional services for basic features

### Negative

- **Synchronous operations until Phase 5**: Some UX impact (waiting for operations)
- **PostgreSQL as queue**: Not optimised for high-throughput job processing
- **Potential migration**: If Phase 6 requires Redis, some job migration needed

## Alternatives Considered

### BullMQ + Redis from Day 1

**Pros:**

- Production-grade job processing
- Scalable to high volumes
- Rich feature set (retries, priorities, delays)

**Cons:**

- Additional infrastructure (Redis)
- Overkill for MVP volume
- More complexity for self-hosters

### In-Process Queue (Quirrel, etc.)

**Pros:**

- No external dependencies
- Simple deployment

**Cons:**

- Jobs lost on process restart
- No horizontal scaling
- Not reliable enough for email delivery

### No Jobs, Everything Synchronous

**Pros:**

- Simplest possible architecture

**Cons:**

- Email sending blocks HTTP response
- Poor UX for invitation flow
- Doesn't scale for YouTube sync

## Discussion

### Strategic Project Planner

"Let me map out when we actually need background jobs:

**Phase 1-4 (MVP):**

- No async requirements
- Auth is synchronous
- Document saves are synchronous
- Version history is inline

**Phase 5:**

- Invitation emails must not block the HTTP response
- Verification emails (if we add them) same story
- Volume: Maybe 10-100 emails/day for active SaaS

**Phase 6:**

- YouTube sync could be hundreds of videos
- Rate limiting requires scheduled retries
- Volume: Potentially 1000+ jobs/day

My recommendation: defer until Phase 5, then use the simplest solution that works."

### Lead Developer

"For Phase 5 volume (10-100 jobs/day), we don't need Redis. Graphile Worker is perfect:

1. **Uses PostgreSQL**: No new infrastructure
2. **Transactional**: Create invitation + job in same transaction
3. **Reliable**: Jobs survive restarts
4. **Simple**: Easy to understand and debug

```typescript
// Creating an invitation with job
await db.transaction(async (tx) => {
  const invitation = await tx.insert(invitations).values({
    workspaceId,
    email,
    token: generateToken(),
    expiresAt: addHours(new Date(), 24),
  });

  await quickAddJob('sendInvitationEmail', {
    invitationId: invitation.id,
    email: invitation.email,
    workspaceName: workspace.name,
  });
});
```

If the transaction fails, neither the invitation nor the job is created. Perfect consistency."

### QA Architect

"What happens in Phase 5 before Graphile Worker is fully implemented? The plan says invitation emails need to work."

### Lead Developer (Response)

"Implementation order for Phase 5:

1. Set up SMTP configuration
2. Implement Graphile Worker
3. Create email templates
4. Wire up invitation flow

We don't ship Phase 5 until async email works. Synchronous email for invitations is unacceptable UX - the HTTP request would hang for seconds."

### Strategic Project Planner

"What about the YouTube integration in Phase 6? Could Graphile Worker handle it?"

### Lead Developer (Response)

"Possibly. Graphile Worker can handle thousands of jobs/day. But YouTube sync has specific requirements:

1. **Rate limiting**: YouTube API has quotas (10,000 units/day default)
2. **Retries with backoff**: Failed requests need smart retry
3. **Scheduled runs**: Sync every N hours
4. **Multiple channels**: Different sync schedules per workspace

BullMQ has better primitives for this:

- Native rate limiting
- Configurable backoff strategies
- Scheduled/repeating jobs
- Job dependencies

My recommendation: start Phase 6 design with a spike to evaluate if Graphile Worker is sufficient. If not, add Redis + BullMQ specifically for YouTube sync jobs. Keep Graphile Worker for email."

### QA Architect

"If we have two job systems, isn't that complexity?"

### Lead Developer (Response)

"It's pragmatic complexity:

- Graphile Worker: Simple async tasks (email), no new infrastructure
- BullMQ: High-throughput, rate-limited tasks (YouTube sync), requires Redis

For self-hosters who don't use YouTube sync, they never need Redis. Only SaaS or users connecting YouTube accounts need the Redis infrastructure.

We can structure docker-compose with Redis commented out by default:

````yaml
# Uncomment for YouTube integration
# redis:
#   image: redis:7-alpine
#   volumes:
#     - redisdata:/data
```"

### Strategic Project Planner (Final)

"Decision summary:

1. **Phase 1-4**: No jobs. Everything synchronous.
2. **Phase 5**: Add Graphile Worker for emails. No new infrastructure.
3. **Phase 6**: Evaluate BullMQ + Redis for YouTube sync. Make decision based on spike.

This gives us the simplest MVP while having a clear path to scale."

### QA Architect (Final Concern)

"One more thing: job failure handling. What happens when email fails to send?"

### Lead Developer (Response)

"Graphile Worker has built-in retry with backoff:

```typescript
// Job definition with retry config
{
  task: 'sendInvitationEmail',
  handler: async (payload) => {
    await sendEmail(payload);
  },
  retryConfig: {
    maxAttempts: 3,
    retryBackoff: (attempt) => attempt * 60 * 1000, // 1m, 2m, 3m
  },
}
````

After 3 failures:

- Job marked as failed in database
- Log error for monitoring
- User sees invitation as 'pending' (we can add 'failed' state)
- Admin can retry manually or user can resend

For MVP, we don't need a fancy dead-letter queue. Log it, investigate, fix."

## Implementation Notes

### Graphile Worker Setup (Phase 5)

```typescript
// lib/jobs/worker.ts
import { run, quickAddJob } from 'graphile-worker';

const taskList = {
  sendInvitationEmail: async (payload, helpers) => {
    const { invitationId, email, workspaceName, inviteUrl } = payload;

    await sendEmail({
      to: email,
      subject: `You've been invited to ${workspaceName}`,
      html: renderInviteTemplate({ workspaceName, inviteUrl }),
    });

    helpers.logger.info(`Invitation email sent to ${email}`);
  },

  sendVerificationEmail: async (payload, helpers) => {
    // Similar structure
  },
};

export async function startWorker() {
  await run({
    connectionString: process.env.DATABASE_URL,
    taskList,
    concurrency: 5,
  });
}
```

### Docker Compose (Phase 5)

```yaml
services:
  app:
    # ... existing config
    command: npm run start:with-worker
```

### Docker Compose (Phase 6 with Redis)

```yaml
services:
  app:
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  redisdata:
```

### Email Sending Interface

```typescript
// Abstract interface - same for sync or async
interface EmailService {
  send(options: EmailOptions): Promise<void>;
}

// Phase 1-4: Sync (no-op or console log in dev)
class SyncEmailService implements EmailService {
  async send(options: EmailOptions) {
    // Direct SMTP send
  }
}

// Phase 5: Async via job queue
class AsyncEmailService implements EmailService {
  async send(options: EmailOptions) {
    await quickAddJob('sendEmail', options);
  }
}
```
