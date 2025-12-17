# Registration Flow Investigation

**Date**: 2025-12-17
**Status**: Investigation Complete - Awaiting User Clarification
**Priority**: CRITICAL

## Executive Summary

Investigation into reported "broken registration flow" has been completed. The findings show that there are TWO distinct registration flows in the system, each serving different purposes. However, terminology inconsistencies and unclear expectations have created confusion.

## Investigation Findings

### Flow 1: Initial Setup Wizard (`/setup`)

**Location**: `/src/app/setup/page.tsx`
**Purpose**: First-time system setup (admin account + first channel)
**Status**: WORKING AS DESIGNED

This is a **two-step flow**:

1. **Step 1 - Admin Account Creation**:
   - Email
   - Name (optional)
   - Password
   - Confirm Password

2. **Step 2 - Channel Creation**:
   - Channel Name (user-provided or auto-generated)
   - Uses correct "CHANNEL" terminology
   - Has fun "Surprise me" feature for name generation

**Backend**: `/src/server/trpc/routers/setup.ts`
**Key Features**:
- Only runs once (locked after completion via `.setup-complete` flag)
- Creates user, teamspace, AND channel atomically
- User gets to name their channel
- Correct terminology throughout

### Flow 2: Regular Registration (`/register`)

**Location**: `/src/app/(auth)/register/page.tsx`
**Purpose**: Subsequent user registration after initial setup
**Status**: SINGLE-STEP, NO CHANNEL CREATION UI

This is a **single-step flow**:

1. Name (optional)
2. Email
3. Password
4. Confirm Password

**Backend**: `/src/server/trpc/routers/auth.ts` (lines 108-336)
**Current Behavior**:
- Accepts optional `workspaceName` parameter in schema
- Frontend does NOT collect this parameter
- Auto-creates channels with default names
- In single-tenant mode: adds users to existing workspace/channel

## Issues Identified

### Issue 1: Terminology Inconsistency

**Location**: `/src/server/trpc/routers/auth.ts`

The auth router uses "workspace" terminology:
- Line 72: `workspaceName: z.string()...`
- Line 74: `.min(1, 'Workspace name is required')`
- Line 75: `.max(100, 'Workspace name too long')`
- Line 137: `message: 'Workspace name is required in multi-tenant mode'`
- Line 250: `message: 'Workspace name "..." is already taken...'`
- Line 258: `name: workspaceName ?? 'My Workspace'`

**Should be**: `channelName` to match the rest of the codebase (as seen in setup.ts).

### Issue 2: Disconnected Schema and UI

**Problem**:
- Backend schema accepts `workspaceName`/`channelName` parameter
- Frontend register page doesn't provide this field
- Results in auto-created channels with default names

**Question**: Is this by design or is this the bug?

### Issue 3: Unclear Single-Tenant vs Multi-Tenant Behavior

**Current Auth Router Logic** (lines 161-310):

In **single-tenant mode**:
1. First user: Creates default teamspace + channel, becomes owner
2. Subsequent users: Joins existing channel as editor
3. Channel gets default name unless `workspaceName` param provided

In **multi-tenant mode**:
1. Every user: Creates their own channel
2. `workspaceName` parameter is REQUIRED
3. But register UI doesn't collect it!

## Critical Questions Requiring User Input

### Question 1: What Was Actually Broken?

The user reported: "We broke a working multi-step registration flow."

**Need clarification**:
- Which flow was broken? `/setup` or `/register`?
- What specific behavior changed?
- What was working before that isn't working now?

### Question 2: What Should `/register` Do?

**Option A**: Users create their own channel during registration
- Add Step 2 to `/register` for channel creation (like `/setup`)
- Use the `workspaceName`/`channelName` parameter
- Each user gets their own channel

**Option B**: Users join existing workspace/channel
- Keep single-step registration
- Auto-assign to existing channel(s)
- Channel creation happens separately after login

**Current Implementation**: Hybrid that doesn't match either pattern clearly

### Question 3: What's the Expected Multi-Tenant Behavior?

In multi-tenant mode, the schema requires `workspaceName`, but the UI doesn't collect it.

**Possible interpretations**:
1. Bug: Should have multi-step registration in multi-tenant mode
2. By design: Multi-tenant registration happens differently (invite-only?)
3. Incomplete: Multi-tenant registration not fully implemented yet

## Observations from Git History

### Recent Renames (Commit `ac28e84` - Dec 16, 2025)

The project recently underwent a massive terminology shift:
- "projects" → "channels"
- 113 files changed
- 2,480 insertions, 2,192 deletions

**Potential Impact**:
- Some files may have been missed in the rename
- The auth router still has "workspace" terminology
- May have introduced inconsistencies

### Account Management Branch (Current)

**Commit `3dadc14`** (Dec 14, 2025) started implementing account management:
- Added user profile functionality
- Added avatar system
- Did NOT modify registration flow

**No changes to auth.ts on this branch** relative to main.

## Technical Analysis

### Setup Flow (WORKING) ✅

```typescript
// /src/server/trpc/routers/setup.ts
const setupInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().optional(),
  channelName: z.string().optional(), // ✅ Correct terminology
});
```

Frontend collects all these fields in two steps. Backend creates everything atomically.

### Auth Flow (INCONSISTENT) ⚠️

```typescript
// /src/server/trpc/routers/auth.ts
const registerInputSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().optional(),
  workspaceName: z.string().optional(), // ❌ Wrong terminology
});
```

Frontend only collects email, password, name. `workspaceName` is never provided.

## Recommendations

### Immediate Actions Required

1. **User Clarification**:
   - Understand what the expected registration behavior should be
   - Determine if `/register` should be multi-step or single-step
   - Clarify multi-tenant vs single-tenant expectations

2. **Terminology Fix** (Low Risk):
   - Rename `workspaceName` → `channelName` in auth.ts
   - Update all related error messages
   - Align with setup.ts and rest of codebase

### Proposed Solutions (Pending Clarification)

#### Solution A: Multi-Step Registration (Like Setup)

Make `/register` work like `/setup`:
- Step 1: Account credentials
- Step 2: Channel creation
- Let users name their channel
- Consistent with setup wizard

**Pros**:
- Consistent user experience
- Users control their channel names
- Matches user's description of "working flow"

**Cons**:
- More complex registration
- May not be appropriate for single-tenant mode

#### Solution B: Simplified Registration (Keep Current Structure)

Keep single-step registration, fix terminology:
- Just collect credentials
- Auto-create channels with better default names
- Separate "create channel" feature post-registration

**Pros**:
- Simpler registration
- Faster onboarding
- Channel creation can be more sophisticated later

**Cons**:
- Doesn't match multi-step description
- Users can't name their channel immediately

## Files Requiring Changes

Based on findings, these files need attention:

### 1. Terminology Fixes (Certain)

- `/src/server/trpc/routers/auth.ts` - Lines 72-76, 137, 250, 258
  - Replace `workspaceName` with `channelName`
  - Update error messages

### 2. Registration UI (Depends on Solution)

- `/src/app/(auth)/register/page.tsx`
  - Add channel name field OR
  - Keep as-is and clarify intent

### 3. Related Components (If Multi-Step)

- May need to create `/register/step-2` or similar
- Reuse channel creation UI from setup wizard

## Prevention Measures

### Process Improvements

1. **Clearer Requirements Documentation**:
   - Document expected behavior for each registration flow
   - Define single-tenant vs multi-tenant user flows
   - Create user journey diagrams

2. **Terminology Standards**:
   - Maintain terminology glossary
   - Automated checks for inconsistent terms
   - Careful review during large renames

3. **Integration Testing**:
   - E2E tests for complete registration flows
   - Test both setup wizard and regular registration
   - Cover single-tenant and multi-tenant modes

4. **Change Impact Analysis**:
   - Before large refactors, document expected behavior
   - Review related flows for consistency
   - Test all user paths after terminology changes

## Next Steps

1. **BLOCKER**: Await user clarification on:
   - What was working before?
   - What is broken now?
   - What should the expected behavior be?

2. **After Clarification**:
   - Create detailed fix plan
   - Implement agreed-upon solution
   - Add comprehensive tests
   - Update documentation

3. **Update This Document**:
   - Record user's responses
   - Document final solution
   - Close with lessons learned

## Status

**INVESTIGATION COMPLETE**
**AWAITING USER INPUT**

The code investigation is complete. Both flows (`/setup` and `/register`) are functioning, but there are terminology inconsistencies and unclear expectations. Cannot proceed with fixes until user clarifies what the actual problem is and what the expected behavior should be.

---

**Investigator**: Claude (Project Orchestrator)
**Date**: 2025-12-17
**Next Review**: After user clarification
