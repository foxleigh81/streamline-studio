# Clarification 001: Avatar Storage Strategy

**Status:** Pending User Response
**Created:** 2025-12-13
**Priority:** High - Blocks Implementation

## Question

The current database schema does not include an `avatar` or `avatarUrl` field in the `users` table. We need clarification on the preferred avatar storage strategy before proceeding with implementation.

## Options

### Option 1: Database Schema + Local File Storage (Recommended for MVP)

**Approach:**

- Add `avatarUrl` field to `users` table (nullable text)
- Store uploaded images in `/public/avatars/` directory
- Filename: `{userId}.{extension}` (e.g., `123e4567-e89b-12d3-a456-426614174000.jpg`)
- Serve via Next.js static file serving

**Pros:**

- Simple implementation
- No external dependencies
- Works immediately
- Good for self-hosted deployment

**Cons:**

- Not suitable for multi-instance deployments (load balancing)
- No CDN without additional setup
- Manual backup considerations

### Option 2: Cloud Storage (S3/Cloudinary)

**Approach:**

- Add `avatarUrl` field to `users` table
- Upload to S3/Cloudinary
- Store full URL in database
- Requires AWS SDK or Cloudinary integration

**Pros:**

- Scalable for multi-instance deployments
- CDN included
- Professional solution
- Automatic backups

**Cons:**

- Requires cloud provider setup
- Additional complexity
- External dependency
- May conflict with self-hosted philosophy

### Option 3: Base64 Encoding in Database

**Approach:**

- Add `avatarData` text field to `users` table
- Store base64-encoded image directly in database
- No file system or cloud storage needed

**Pros:**

- Simple database-only solution
- No file management
- Works in any deployment scenario

**Cons:**

- Increases database size significantly
- Poor performance for large images
- Not recommended for production

### Option 4: Defer Avatar Upload to Later Phase

**Approach:**

- Implement password change and name editing now
- Leave avatar upload for future implementation
- Add placeholder for avatar in UI

**Pros:**

- Faster initial implementation
- Can decide on storage later with more context
- Still delivers core account management

**Cons:**

- Incomplete feature set
- May require UI rework later

## Recommendation

**Option 1** (Local File Storage) is recommended for this phase because:

1. Aligns with self-hosted deployment model
2. Simple to implement and test
3. Can be migrated to cloud storage later if needed
4. No external dependencies or API keys required
5. Suitable for single-tenant and multi-tenant modes

If the application needs to scale to multiple instances in the future, migration to S3/Cloudinary is straightforward (just update upload logic, keep database schema).

## Required User Decision

Please choose one of the options above, or provide an alternative approach. This decision blocks the implementation task.

## Impact on Timeline

- Option 1: No additional delay
- Option 2: +1-2 hours for cloud provider setup and integration
- Option 3: No additional delay (but not recommended)
- Option 4: Reduces implementation scope, faster delivery

## Database Migration Required

For Options 1, 2, or 3, we need to add a field to the `users` table:

```typescript
// Add to users table in schema.ts
avatarUrl: text('avatar_url'),  // For Options 1 & 2
// OR
avatarData: text('avatar_data'), // For Option 3
```

This requires generating and running a database migration.
