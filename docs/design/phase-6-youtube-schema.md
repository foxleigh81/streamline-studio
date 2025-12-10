# Phase 6: YouTube Integration Schema Design

**Status**: Design Complete - Ready for Implementation
**Date**: 2025-12-10
**Reference**: ADR-016

This document contains the database schema designs for Phase 6 YouTube integration. When implementing, these should be converted to Drizzle ORM schema definitions in `/src/server/db/schema.ts`.

## Schema Overview

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────────┐
│   workspaces    │     │  youtube_channels   │     │  youtube_video_cache │
│─────────────────│     │─────────────────────│     │──────────────────────│
│ id (PK)         │◄────│ workspace_id (FK)   │◄────│ youtube_channel_id   │
│ name            │     │ id (PK)             │     │ id (PK)              │
│ slug            │     │ channel_id          │     │ youtube_video_id     │
└─────────────────┘     │ channel_title       │     │ title                │
                        │ access_token_enc    │     │ description          │
                        │ refresh_token_enc   │     │ thumbnail_url        │
                        │ token_expires_at    │     │ published_at         │
                        │ is_valid            │     │ privacy_status       │
                        │ last_synced_at      │     │ view_count           │
                        └─────────────────────┘     │ like_count           │
                                                    │ synced_at            │
                                                    └──────────────────────┘

┌─────────────────┐     ┌─────────────────────┐
│     videos      │     │ video_youtube_links │
│─────────────────│     │─────────────────────│
│ id (PK)         │◄────│ video_id (FK)       │
│ workspace_id    │     │ id (PK)             │
│ title           │     │ workspace_id (FK)   │
│ youtube_video_id│     │ youtube_video_id    │
└─────────────────┘     │ linked_at           │
                        │ linked_by           │
                        └─────────────────────┘

┌─────────────────────┐
│ youtube_quota_usage │
│─────────────────────│
│ id (PK)             │
│ workspace_id (FK)   │
│ date                │
│ units_used          │
└─────────────────────┘
```

## Table Definitions

### 1. youtube_channels

Stores OAuth credentials for connected YouTube channels.

```typescript
// Drizzle ORM Definition
export const youtubeChannels = pgTable(
  'youtube_channels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),

    // YouTube channel identification
    channelId: text('channel_id').notNull(), // YouTube channel ID (UC...)
    channelTitle: text('channel_title').notNull(), // Channel display name
    channelThumbnailUrl: text('channel_thumbnail_url'), // Profile image

    // OAuth tokens (encrypted with AES-256-GCM)
    accessTokenEncrypted: text('access_token_encrypted').notNull(),
    refreshTokenEncrypted: text('refresh_token_encrypted').notNull(),
    tokenExpiresAt: timestamp('token_expires_at', {
      withTimezone: true,
    }).notNull(),
    scopes: text('scopes').array().notNull(), // Granted OAuth scopes

    // Status
    isValid: boolean('is_valid').default(true), // False if refresh fails
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    createdBy: uuid('created_by').references(() => users.id),
  },
  (table) => ({
    // Unique constraint: one connection per channel per workspace
    uniqueWorkspaceChannel: unique().on(table.workspaceId, table.channelId),
    // Index for workspace lookups
    workspaceIdx: index('idx_youtube_channels_workspace').on(table.workspaceId),
    // Index for valid channels per workspace
    validIdx: index('idx_youtube_channels_valid').on(
      table.workspaceId,
      table.isValid
    ),
  })
);
```

**Column Notes**:

- `channelId`: YouTube's unique channel identifier (format: UC + 22 characters)
- `accessTokenEncrypted`: Short-lived token (~1 hour), encrypted at rest
- `refreshTokenEncrypted`: Long-lived token, encrypted at rest
- `isValid`: Set to false when refresh fails, requires re-authentication
- `scopes`: Array of granted OAuth scopes for validation

### 2. youtube_video_cache

Caches YouTube video metadata to reduce API calls.

```typescript
export const youtubeVideoCache = pgTable(
  'youtube_video_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    youtubeChannelId: uuid('youtube_channel_id')
      .notNull()
      .references(() => youtubeChannels.id, { onDelete: 'cascade' }),

    // YouTube video identification
    youtubeVideoId: text('youtube_video_id').notNull(), // Video ID (11 characters)

    // Video metadata (from YouTube API)
    title: text('title').notNull(),
    description: text('description'),
    thumbnailUrl: text('thumbnail_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    privacyStatus: text('privacy_status'), // public, unlisted, private
    durationSeconds: integer('duration_seconds'),

    // Statistics (from YouTube API)
    viewCount: bigint('view_count', { mode: 'number' }),
    likeCount: bigint('like_count', { mode: 'number' }),
    commentCount: bigint('comment_count', { mode: 'number' }),

    // Additional metadata
    tags: text('tags').array(),
    categoryId: text('category_id'), // YouTube category ID

    // Sync tracking
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull(),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // Unique constraint: one cache entry per video per workspace
    uniqueWorkspaceVideo: unique().on(table.workspaceId, table.youtubeVideoId),
    // Index for workspace lookups
    workspaceIdx: index('idx_youtube_video_cache_workspace').on(
      table.workspaceId
    ),
    // Index for channel lookups
    channelIdx: index('idx_youtube_video_cache_channel').on(
      table.youtubeChannelId
    ),
    // Index for published date sorting
    publishedIdx: index('idx_youtube_video_cache_published').on(
      table.workspaceId,
      table.publishedAt
    ),
  })
);
```

**Column Notes**:

- `youtubeVideoId`: YouTube's unique video identifier (11 characters)
- `viewCount`, `likeCount`, `commentCount`: Use bigint for large channels
- `syncedAt`: When this cached data was last refreshed from YouTube
- Cache TTL: 6 hours (configurable via `YOUTUBE_SYNC_INTERVAL_HOURS`)

### 3. video_youtube_links

Links local video projects to published YouTube videos.

```typescript
export const videoYoutubeLinks = pgTable(
  'video_youtube_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    videoId: uuid('video_id')
      .notNull()
      .references(() => videos.id, { onDelete: 'cascade' }),

    // YouTube video reference
    youtubeVideoId: text('youtube_video_id').notNull(),

    // Audit
    linkedAt: timestamp('linked_at', { withTimezone: true }).defaultNow(),
    linkedBy: uuid('linked_by').references(() => users.id),
  },
  (table) => ({
    // One-to-one: each local video can only link to one YouTube video
    uniqueVideo: unique().on(table.videoId),
    // One-to-one: each YouTube video can only link to one local video per workspace
    uniqueWorkspaceYoutube: unique().on(
      table.workspaceId,
      table.youtubeVideoId
    ),
    // Index for workspace lookups
    workspaceIdx: index('idx_video_youtube_links_workspace').on(
      table.workspaceId
    ),
    // Index for YouTube video lookups
    youtubeIdx: index('idx_video_youtube_links_youtube').on(
      table.youtubeVideoId
    ),
  })
);
```

**Column Notes**:

- `videoId`: References the local `videos` table (Streamline Studio project)
- `youtubeVideoId`: YouTube video ID (for joining with cache)
- One-to-one relationship enforced in both directions

### 4. youtube_quota_usage

Tracks YouTube API quota usage per workspace per day.

```typescript
export const youtubeQuotaUsage = pgTable(
  'youtube_quota_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),

    // Quota tracking
    date: date('date').notNull(), // YYYY-MM-DD
    unitsUsed: integer('units_used').notNull().default(0),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    // One entry per workspace per day
    uniqueWorkspaceDate: unique().on(table.workspaceId, table.date),
    // Index for date-based lookups
    workspaceDateIdx: index('idx_youtube_quota_workspace_date').on(
      table.workspaceId,
      table.date
    ),
  })
);
```

**Column Notes**:

- `date`: Date in Pacific Time (YouTube quota resets at midnight PT)
- `unitsUsed`: Cumulative quota units consumed that day
- Default limit: 10,000 units/day (configurable)

## Relations Definition

```typescript
// Add to schema/relations.ts

export const youtubeChannelsRelations = relations(
  youtubeChannels,
  ({ one, many }) => ({
    workspace: one(workspaces, {
      fields: [youtubeChannels.workspaceId],
      references: [workspaces.id],
    }),
    createdByUser: one(users, {
      fields: [youtubeChannels.createdBy],
      references: [users.id],
    }),
    videoCache: many(youtubeVideoCache),
  })
);

export const youtubeVideoCacheRelations = relations(
  youtubeVideoCache,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [youtubeVideoCache.workspaceId],
      references: [workspaces.id],
    }),
    channel: one(youtubeChannels, {
      fields: [youtubeVideoCache.youtubeChannelId],
      references: [youtubeChannels.id],
    }),
  })
);

export const videoYoutubeLinksRelations = relations(
  videoYoutubeLinks,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [videoYoutubeLinks.workspaceId],
      references: [workspaces.id],
    }),
    video: one(videos, {
      fields: [videoYoutubeLinks.videoId],
      references: [videos.id],
    }),
    linkedByUser: one(users, {
      fields: [videoYoutubeLinks.linkedBy],
      references: [users.id],
    }),
  })
);

export const youtubeQuotaUsageRelations = relations(
  youtubeQuotaUsage,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [youtubeQuotaUsage.workspaceId],
      references: [workspaces.id],
    }),
  })
);
```

## Migration Files

When implementing, create the following migration files:

### Migration 1: youtube_channels

```sql
-- 0001_add_youtube_channels.sql
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,
  channel_title TEXT NOT NULL,
  channel_thumbnail_url TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),

  CONSTRAINT unique_workspace_channel UNIQUE(workspace_id, channel_id)
);

CREATE INDEX idx_youtube_channels_workspace ON youtube_channels(workspace_id);
CREATE INDEX idx_youtube_channels_valid ON youtube_channels(workspace_id, is_valid);
```

### Migration 2: youtube_video_cache

```sql
-- 0002_add_youtube_video_cache.sql
CREATE TABLE youtube_video_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  youtube_channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  privacy_status TEXT,
  duration_seconds INTEGER,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  tags TEXT[],
  category_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_workspace_youtube_video UNIQUE(workspace_id, youtube_video_id)
);

CREATE INDEX idx_youtube_video_cache_workspace ON youtube_video_cache(workspace_id);
CREATE INDEX idx_youtube_video_cache_channel ON youtube_video_cache(youtube_channel_id);
CREATE INDEX idx_youtube_video_cache_published ON youtube_video_cache(workspace_id, published_at DESC);
```

### Migration 3: video_youtube_links

```sql
-- 0003_add_video_youtube_links.sql
CREATE TABLE video_youtube_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by UUID REFERENCES users(id),

  CONSTRAINT unique_video UNIQUE(video_id),
  CONSTRAINT unique_workspace_youtube UNIQUE(workspace_id, youtube_video_id)
);

CREATE INDEX idx_video_youtube_links_workspace ON video_youtube_links(workspace_id);
CREATE INDEX idx_video_youtube_links_youtube ON video_youtube_links(youtube_video_id);
```

### Migration 4: youtube_quota_usage

```sql
-- 0004_add_youtube_quota_usage.sql
CREATE TABLE youtube_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  units_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_workspace_date UNIQUE(workspace_id, date)
);

CREATE INDEX idx_youtube_quota_workspace_date ON youtube_quota_usage(workspace_id, date);
```

## Existing Schema Integration

The `videos` table already has a `youtube_video_id` column that can be used for direct reference:

```typescript
// Existing in /src/server/db/schema.ts
export const videos = pgTable('videos', {
  // ... existing columns ...
  youtubeVideoId: text('youtube_video_id'), // Already exists!
  thumbnailUrl: text('thumbnail_url'), // Already exists!
  // ...
});
```

**Decision**: Use the `video_youtube_links` table for the formal link relationship, but consider using `videos.youtubeVideoId` for quick lookups if performance requires it.

## Query Patterns

### Get all connected channels for a workspace

```typescript
const channels = await ctx.db.query.youtubeChannels.findMany({
  where: eq(youtubeChannels.workspaceId, ctx.workspace.id),
  orderBy: [desc(youtubeChannels.createdAt)],
});
```

### Get linked YouTube video for a local video

```typescript
const link = await ctx.db.query.videoYoutubeLinks.findFirst({
  where: and(
    eq(videoYoutubeLinks.workspaceId, ctx.workspace.id),
    eq(videoYoutubeLinks.videoId, videoId)
  ),
});

if (link) {
  const cached = await ctx.db.query.youtubeVideoCache.findFirst({
    where: and(
      eq(youtubeVideoCache.workspaceId, ctx.workspace.id),
      eq(youtubeVideoCache.youtubeVideoId, link.youtubeVideoId)
    ),
  });
}
```

### Check quota before API call

```typescript
const today = new Date().toISOString().split('T')[0];
const usage = await ctx.db.query.youtubeQuotaUsage.findFirst({
  where: and(
    eq(youtubeQuotaUsage.workspaceId, ctx.workspace.id),
    eq(youtubeQuotaUsage.date, today)
  ),
});

const currentUsage = usage?.unitsUsed ?? 0;
const limit = serverEnv.YOUTUBE_QUOTA_PER_WORKSPACE ?? 1000;

if (currentUsage + requestCost > limit) {
  throw new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: 'YouTube API quota exceeded for today',
  });
}
```

## Security Considerations

1. **Token Encryption**: All OAuth tokens must be encrypted before storage
2. **Workspace Isolation**: All queries must include workspace_id filter
3. **Cascade Deletes**: Workspace deletion removes all YouTube data
4. **No Direct Token Exposure**: Never select raw encrypted tokens in API responses

## Performance Considerations

1. **Cache TTL**: Default 6 hours, configurable via environment
2. **Batch Operations**: Video list API supports up to 50 videos per call
3. **Index Usage**: All foreign key and common query patterns have indexes
4. **Quota Tracking**: Lightweight integer increment, minimal overhead
