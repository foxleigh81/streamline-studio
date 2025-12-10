# ADR-016: YouTube Integration Architecture

**Status**: Accepted
**Date**: 2025-12-10
**Deciders**: Strategic Project Planner, Security Architect

## Context

Phase 6 introduces YouTube integration to allow users to connect their YouTube channels, sync video metadata, and view analytics within Streamline Studio. This integration must work seamlessly in both single-tenant (self-hosted) and multi-tenant (SaaS) deployment modes.

### Requirements

1. **Channel Connection**: Users can connect one or more YouTube channels per workspace
2. **Video Sync**: Sync YouTube video metadata (title, description, thumbnail, status, publish date)
3. **Analytics**: Display view counts, likes, comments, and watch time
4. **Scheduling**: Support for scheduled video publishing (future enhancement)
5. **Multi-Tenancy**: Each workspace manages its own YouTube connections independently

### Constraints

- YouTube Data API v3 has a default quota of 10,000 units/day
- OAuth 2.0 is required (no service account support for YouTube)
- Self-hosters must register their own Google Cloud OAuth app
- Tokens must be stored securely with encryption

## Decision

### 1. OAuth Authentication Flow

**Approach**: Server-side OAuth 2.0 Authorization Code flow with PKCE

```
┌──────────┐     ┌──────────────┐     ┌─────────────┐
│  User    │     │ Streamline   │     │  Google     │
│  Browser │     │ Studio API   │     │  OAuth      │
└────┬─────┘     └──────┬───────┘     └──────┬──────┘
     │                  │                    │
     │  1. Click        │                    │
     │  "Connect YouTube│                    │
     │─────────────────>│                    │
     │                  │                    │
     │  2. Generate     │                    │
     │  state + PKCE    │                    │
     │                  │                    │
     │  3. Redirect to  │                    │
     │<─────────────────│                    │
     │  Google OAuth    │                    │
     │                  │                    │
     │  4. User grants  │                    │
     │  permission      │                    │
     │─────────────────────────────────────>│
     │                  │                    │
     │  5. Redirect     │                    │
     │  with auth code  │                    │
     │<─────────────────────────────────────│
     │                  │                    │
     │  6. Send code    │                    │
     │─────────────────>│                    │
     │                  │                    │
     │                  │  7. Exchange code  │
     │                  │  for tokens        │
     │                  │───────────────────>│
     │                  │                    │
     │                  │  8. Access +       │
     │                  │  Refresh tokens    │
     │                  │<───────────────────│
     │                  │                    │
     │  9. Success      │                    │
     │<─────────────────│                    │
     │                  │                    │
```

**Required OAuth Scopes**:

- `https://www.googleapis.com/auth/youtube.readonly` - Read channel and video data
- `https://www.googleapis.com/auth/yt-analytics.readonly` - Read analytics data

**Future Scopes** (for video management):

- `https://www.googleapis.com/auth/youtube.upload` - Upload videos
- `https://www.googleapis.com/auth/youtube.force-ssl` - Update video metadata

### 2. Token Storage Strategy

**Encryption**: AES-256-GCM for refresh tokens at rest

```typescript
// Token storage pattern
interface YouTubeCredential {
  workspaceId: string; // Workspace isolation
  channelId: string; // YouTube channel ID
  channelTitle: string; // Human-readable name
  accessToken: string; // Short-lived (encrypted)
  refreshToken: string; // Long-lived (encrypted)
  tokenExpiresAt: Date; // For proactive refresh
  scopes: string[]; // Granted OAuth scopes
  createdAt: Date;
  updatedAt: Date;
}
```

**Token Refresh Strategy**:

- Proactively refresh when `tokenExpiresAt - 5 minutes < now`
- On 401 response, refresh immediately and retry once
- On refresh failure, mark credential as invalid and notify user

### 3. API Architecture

**tRPC Router Structure**:

```typescript
youtubeRouter = router({
  // Channel management
  channels: {
    list: workspaceProcedure, // List connected channels
    getAuthUrl: workspaceProcedure, // Get OAuth authorization URL
    connect: workspaceProcedure, // Exchange code for tokens
    disconnect: ownerProcedure, // Remove channel connection
    refresh: workspaceProcedure, // Manual token refresh
  },

  // Video sync
  sync: {
    triggerSync: editorProcedure, // Manual sync trigger
    getSyncStatus: workspaceProcedure, // Check sync job status
    getLastSync: workspaceProcedure, // Last sync timestamp
  },

  // Video data
  videos: {
    list: workspaceProcedure, // List synced videos
    link: editorProcedure, // Link YouTube video to local video
    unlink: editorProcedure, // Unlink YouTube video
  },

  // Analytics
  analytics: {
    getVideoStats: workspaceProcedure, // Stats for single video
    getChannelStats: workspaceProcedure, // Aggregate channel stats
    getDateRange: workspaceProcedure, // Time-series analytics
  },
});
```

**REST Endpoints** (OAuth callbacks only):

```
POST /api/v1/youtube/callback    - OAuth callback handler
POST /api/v1/youtube/webhook     - (Future) YouTube push notifications
```

### 4. Database Schema

**New Tables**:

```sql
-- YouTube channel connections
CREATE TABLE youtube_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  channel_id TEXT NOT NULL,              -- YouTube channel ID (UC...)
  channel_title TEXT NOT NULL,           -- Channel name
  channel_thumbnail_url TEXT,            -- Channel profile image
  access_token_encrypted TEXT NOT NULL,  -- AES-256-GCM encrypted
  refresh_token_encrypted TEXT NOT NULL, -- AES-256-GCM encrypted
  token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL,
  is_valid BOOLEAN DEFAULT true,         -- False if refresh fails
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),

  UNIQUE(workspace_id, channel_id)
);

CREATE INDEX idx_youtube_channels_workspace ON youtube_channels(workspace_id);
CREATE INDEX idx_youtube_channels_valid ON youtube_channels(workspace_id, is_valid);

-- YouTube video metadata cache
CREATE TABLE youtube_video_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  youtube_channel_id UUID NOT NULL REFERENCES youtube_channels(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,        -- YouTube video ID (dQw4w9...)
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  privacy_status TEXT,                   -- public, unlisted, private
  duration_seconds INTEGER,
  view_count BIGINT,
  like_count BIGINT,
  comment_count BIGINT,
  tags TEXT[],
  category_id TEXT,
  synced_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, youtube_video_id)
);

CREATE INDEX idx_youtube_video_cache_workspace ON youtube_video_cache(workspace_id);
CREATE INDEX idx_youtube_video_cache_channel ON youtube_video_cache(youtube_channel_id);
CREATE INDEX idx_youtube_video_cache_published ON youtube_video_cache(workspace_id, published_at DESC);

-- Link between local videos and YouTube videos
CREATE TABLE video_youtube_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  youtube_video_id TEXT NOT NULL,
  linked_at TIMESTAMPTZ DEFAULT now(),
  linked_by UUID REFERENCES users(id),

  UNIQUE(video_id),                      -- One YouTube video per local video
  UNIQUE(workspace_id, youtube_video_id) -- One local video per YouTube video
);

CREATE INDEX idx_video_youtube_links_workspace ON video_youtube_links(workspace_id);
CREATE INDEX idx_video_youtube_links_youtube ON video_youtube_links(youtube_video_id);

-- Quota tracking per workspace
CREATE TABLE youtube_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  units_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(workspace_id, date)
);

CREATE INDEX idx_youtube_quota_workspace_date ON youtube_quota_usage(workspace_id, date);
```

### 5. Quota Management Strategy

**Default Limits** (YouTube API):

- 10,000 units/day per Google Cloud project
- Key operation costs:
  - `channels.list`: 1 unit
  - `playlistItems.list`: 1 unit per page
  - `videos.list`: 1 unit (up to 50 videos)
  - `search.list`: 100 units (avoid!)
  - `videos.update`: 50 units
  - `videos.insert`: 1,600 units

**Workspace Quota Allocation**:

- In multi-tenant mode: Fair-share per workspace (total / active workspaces)
- Track usage in `youtube_quota_usage` table
- Soft limit warning at 80% usage
- Hard limit at 95% (preserve buffer for critical operations)

**Optimization Strategies**:

1. Cache video metadata in `youtube_video_cache` (refresh every 6 hours)
2. Batch video requests (50 videos per API call)
3. Use `channels.list` + `playlistItems.list` instead of `search.list`
4. Track quota usage per operation type for reporting

### 6. Background Job Architecture

**Job Queue**: Graphile Worker (PostgreSQL-based, already planned for Phase 5)

```typescript
// Job definitions
interface YouTubeSyncJob {
  type: 'youtube:sync_channel';
  payload: {
    workspaceId: string;
    channelId: string;
    fullSync: boolean; // Full vs incremental
  };
}

interface YouTubeRefreshTokenJob {
  type: 'youtube:refresh_token';
  payload: {
    workspaceId: string;
    channelId: string;
  };
}

interface YouTubeAnalyticsSyncJob {
  type: 'youtube:sync_analytics';
  payload: {
    workspaceId: string;
    channelId: string;
    dateRange: { start: string; end: string };
  };
}
```

**Job Scheduling**:

- Token refresh: 5 minutes before expiry (proactive)
- Video metadata sync: Every 6 hours per channel
- Analytics sync: Daily at workspace-preferred time
- Manual sync: On-demand with rate limiting (max 1 per 15 minutes)

**Retry Strategy**:

- Exponential backoff: 1min, 5min, 30min, 2hr, 6hr
- Max retries: 5
- On quota exceeded: Delay until midnight PT (quota reset)
- On auth failure: Mark channel invalid, notify user

### 7. Security Considerations

**OAuth Security**:

- State parameter with CSRF token (stored in session)
- PKCE code verifier/challenge for additional security
- Validate redirect URI matches configured callback
- Short-lived authorization codes (10 minutes max)

**Token Security**:

- AES-256-GCM encryption for refresh tokens
- Encryption key from environment variable (`YOUTUBE_TOKEN_ENCRYPTION_KEY`)
- Access tokens cached in memory only (never persisted unencrypted)
- Token rotation: Generate new encryption key on major version upgrades

**Access Control**:

- Channel connect/disconnect: Owner only
- Sync trigger: Editor or higher
- View data: Any workspace member
- Cross-workspace isolation enforced by WorkspaceRepository

**Audit Logging**:

```typescript
// Audit events for YouTube operations
'youtube.channel_connected'; // Channel OAuth completed
'youtube.channel_disconnected'; // Channel removed
'youtube.sync_started'; // Sync job began
'youtube.sync_completed'; // Sync job finished
'youtube.sync_failed'; // Sync job failed
'youtube.video_linked'; // Local video linked to YouTube
'youtube.video_unlinked'; // Link removed
```

### 8. Environment Configuration

**Required Variables**:

```env
# YouTube OAuth (required for YouTube features)
YOUTUBE_CLIENT_ID=           # Google Cloud OAuth client ID
YOUTUBE_CLIENT_SECRET=       # Google Cloud OAuth client secret
YOUTUBE_REDIRECT_URI=        # OAuth callback URL

# YouTube Security (required)
YOUTUBE_TOKEN_ENCRYPTION_KEY= # 32-byte hex string for AES-256
```

**Optional Variables**:

```env
# YouTube Quota (optional, for multi-tenant)
YOUTUBE_QUOTA_PER_WORKSPACE= # Daily quota per workspace (default: 1000)
YOUTUBE_SYNC_INTERVAL_HOURS= # Hours between syncs (default: 6)
```

### 9. Self-Hosting Requirements

Self-hosters must:

1. **Create Google Cloud Project**:
   - Enable YouTube Data API v3
   - Enable YouTube Analytics API
   - Create OAuth 2.0 credentials (Web application type)

2. **Configure OAuth Consent Screen**:
   - Internal or External (based on user base)
   - Add required scopes
   - Complete verification if external

3. **Set Environment Variables**:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REDIRECT_URI` (must match OAuth credentials)
   - `YOUTUBE_TOKEN_ENCRYPTION_KEY` (generate with `openssl rand -hex 32`)

4. **Quota Considerations**:
   - Default 10,000 units/day is shared across all users
   - Request quota increase if needed

## Consequences

### Positive

- Full workspace isolation for YouTube credentials
- Minimal API quota usage through caching and batching
- Graceful handling of quota limits and auth failures
- Self-hosting friendly with clear setup documentation
- Background jobs prevent blocking user requests

### Negative

- Adds complexity with OAuth flow and token management
- Requires external service dependency (Google APIs)
- Self-hosters must create Google Cloud project
- Quota limits may affect heavy users

### Risks

| Risk                       | Likelihood | Impact | Mitigation                                      |
| -------------------------- | ---------- | ------ | ----------------------------------------------- |
| Google changes API quotas  | Medium     | High   | Monitor announcements, implement quota warnings |
| OAuth token compromise     | Low        | High   | Encryption at rest, short access token lifetime |
| Quota exhaustion           | Medium     | Medium | Per-workspace limits, caching, batch operations |
| Google verification delays | Medium     | Low    | Document process, provide self-hosting guide    |

## Implementation Phases

### Phase 6.1: OAuth & Channel Connection

- OAuth flow implementation
- Token encryption/storage
- Channel management UI
- Environment configuration

### Phase 6.2: Video Sync

- Background job infrastructure
- Video metadata sync
- YouTube video cache
- Link local videos to YouTube

### Phase 6.3: Analytics

- Analytics API integration
- Dashboard widgets
- Time-series data storage
- Quota tracking

### Phase 6.4: Advanced Features (Future)

- Video upload via API
- Scheduled publishing
- Bulk metadata updates
- Real-time webhooks

## References

- [YouTube Data API v3 Documentation](https://developers.google.com/youtube/v3)
- [YouTube Analytics API](https://developers.google.com/youtube/analytics)
- [Google OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [ADR-007: API Design](./007-api-and-auth.md)
- [ADR-008: Multi-Tenancy Strategy](./008-multi-tenancy-strategy.md)
- [ADR-012: Background Jobs](./012-background-jobs.md)
- [ADR-014: Security Architecture](./014-security-architecture.md)
