# Workspace Identification Architecture Decision

**Date:** 2025-12-15
**Status:** Consensus Reached
**Participants:** Project Orchestrator, Senior Developer, Security Architect, TRON (User Advocate), QA Architect

## Summary

The team has reached consensus on how to handle workspace identification in URLs, addressing the user's concern that globally unique slugs create unnecessary friction when workspaces aren't shared publicly.

## Decision

**Keep globally unique slugs, but auto-generate them from workspace names with intelligent collision handling.**

## Implementation

### Current State

- Schema: `workspaces` table with `slug TEXT NOT NULL UNIQUE`
- URLs: `/w/[slug]` (e.g., `/w/my-workspace`)
- User Experience: Manual slug entry required during workspace creation

### Proposed Changes

1. **Auto-Generation**
   - Generate slug from workspace name using `slugify(name)`
   - Remove manual slug input from workspace creation form
   - Example: "My Videos" → `my-videos`

2. **Collision Handling**
   - Check slug uniqueness before creation
   - If collision detected, append 4-character random suffix
   - Use `nanoid` or similar for suffix generation
   - Example: `my-videos` → `my-videos-k7x9`

3. **Schema Changes**
   - None required (existing structure supports this)

4. **Migration Path**
   - Existing workspaces: Keep current slugs (no data migration)
   - New workspaces: Use auto-generation
   - URL resolution: No changes (existing middleware continues to work)

5. **Future Enhancement**
   - Optional: Add slug customization in workspace settings (advanced users only)

## Rationale

### Why This Approach?

| Benefit                       | Explanation                                      |
| ----------------------------- | ------------------------------------------------ |
| **Addresses User Pain Point** | Eliminates manual slug selection frustration     |
| **Maintains Usability**       | URLs remain human-readable for bookmarks/history |
| **Simple Implementation**     | No schema changes, minimal code changes          |
| **Security Conscious**        | Random suffixes add entropy, prevent enumeration |
| **Easy Testing**              | Straightforward test cases, no complex state     |
| **Zero Migration Risk**       | Existing workspaces unaffected                   |

### Options Considered and Rejected

#### Option A: UUID-based URLs (`/w/[uuid]`)

- ❌ Poor UX: Unmemorable URLs (`/w/a3f2c891-4b5e-...`)
- ✅ Security: No enumeration risk
- **Verdict:** Rejected by TRON due to usability concerns

#### Option B: User-scoped Slugs

- Add `ownerId` to workspaces, composite unique `(ownerId, slug)`
- ❌ Problem: Doesn't solve disambiguation for invited users
- ❌ If user is in multiple workspaces with same slug, still need picker
- **Verdict:** Rejected by Senior Developer

#### Option C: Non-unique Slugs

- Remove uniqueness constraint entirely
- Resolve by checking user membership
- ❌ Complex disambiguation UI required
- ❌ Testing nightmare (many edge cases)
- ❌ Risk of accidental access if picker logic fails
- **Verdict:** Rejected by QA and Security

#### Option D/E: Hybrid Approaches

- Various slug + UUID combinations
- ❌ Over-engineering the problem
- **Verdict:** Rejected in favor of simpler solution

## Technical Details

### Code Changes Required

1. **Workspace Creation Service**

   ```typescript
   async function createWorkspace(name: string, userId: string) {
     let slug = slugify(name);

     // Check for collision
     const exists = await db
       .select()
       .from(workspaces)
       .where(eq(workspaces.slug, slug))
       .limit(1);

     // Append random suffix if collision
     if (exists.length > 0) {
       const suffix = nanoid(4); // 4-char alphanumeric
       slug = `${slug}-${suffix}`;
     }

     return db.insert(workspaces).values({
       name,
       slug,
       // ... other fields
     });
   }
   ```

2. **UI Changes**
   - Remove slug input field from workspace creation form
   - Show generated slug in workspace settings (read-only initially)
   - Future: Add "customize slug" option for advanced users

3. **Tests**
   - Auto-generation from workspace name
   - Collision detection and suffix generation
   - Slug uniqueness validation
   - Edge cases: empty names, special characters, very long names

### Security Considerations

- **Enumeration Mitigation:** Random suffixes make enumeration impractical
- **Access Control:** Existing middleware validates workspace membership (unchanged)
- **Data Isolation:** WorkspaceRepository pattern ensures proper scoping (unchanged)

## Consensus Timeline

1. **14:32** - Orchestrator frames the problem
2. **14:34** - Senior Dev outlines technical options
3. **14:37** - TRON challenges assumption about URL importance
4. **14:39** - Security raises enumeration concerns
5. **14:42** - QA proposes auto-generation with global uniqueness
6. **14:55** - Team converges on pragmatic solution
7. **14:59** - Security suggests random suffixes (accepted)
8. **15:05** - Full consensus reached

## Next Steps

1. Implement slug auto-generation utility
2. Update workspace creation endpoint
3. Remove slug input from UI
4. Add tests for generation and collision handling
5. Document behavior in user-facing docs (if needed)
6. Monitor for issues post-deployment

## References

- Schema: `/src/server/db/schema.ts` (lines 83-94)
- Workspace Layout: `/src/app/(app)/w/[slug]/layout.tsx`
- ADR-008: Multi-Tenancy Strategy
- Discussion: `/project-management/discussions/workspace-chat.html`
