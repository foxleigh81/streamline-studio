# Phase 1: Unified Registration Flow - Implementation Plan

**Status:** In Progress
**Started:** 2025-12-18
**Assigned To:** Project Orchestrator coordinating multiple agents

## Overview

Remove the "subsequent user" registration flow. All new registrations will create their own workspace (teamspace + channel). Team member invitations will be implemented as a future feature (Phase 2).

## Approved By

- Senior Next.js Developer
- Security Architect
- TRON (UX Advocate)
- QA Architect
- Project Orchestrator

See: `/project-management/discussions/unified-registration-proposal.html`

## Benefits

- Industry-standard pattern (Slack, Notion, Linear)
- Significantly improved security (no auto-join to workspaces)
- Clearer UX mental model (create vs join)
- ~30-40% less registration code
- Near-zero E2E test flakiness
- Pre-1.0 status allows clean break

## Implementation Tasks

### 1. Frontend Changes (`src/app/(auth)/register/page.tsx`)

**Current Issues:**
- Lines 50, 78-79: `isFirstUser` state using flawed `auth.me === null` check
- Lines 126-136: Conditional logic branches based on `isFirstUser`
- Lines 161-168: Different page headings and subtitles
- Lines 157-254: Step 1 shows different button text
- Lines 257-317: Step 2 (channel setup) only for first users

**Required Changes:**
- Remove `isFirstUser` state entirely
- Remove `auth.me` query (lines 69-71, 78-79)
- Always show 2-step flow (Account → Channel)
- Make `channelName` required (always captured)
- Update copy: "Create your workspace"
- Add help text: "Looking to join an existing workspace? Ask for an invite."

**Agent:** senior-nextjs-developer
**Estimated Complexity:** Medium

---

### 2. Backend Changes (`src/server/trpc/routers/auth.ts`)

**Current Issues:**
- Lines 139-144: Multi-tenant mode requires channelName (good, keep this)
- Lines 167-181: Single-tenant mode checks if teamspace exists to determine first-user
- Lines 183-316: Complex transaction with conditional logic for channel creation
- Lines 292-314: "Subsequent user" path auto-joins existing channel as editor

**Required Changes:**
- **Multi-tenant mode:** No changes needed (already always creates channel)
- **Single-tenant mode:** Always create teamspace + channel on registration
  - Remove first-user detection (lines 173-181)
  - Remove subsequent-user auto-join logic (lines 292-314)
  - Always create new channel with unique slug
  - User becomes owner of their channel
- Simplify transaction logic (should reduce by ~30% LOC)
- Ensure `channelName` validation is consistent

**Agent:** senior-nextjs-developer + nextjs-security-architect (review)
**Estimated Complexity:** High (involves transaction logic)

---

### 3. E2E Test Helpers (`e2e/helpers/auth.ts`)

**Current Issues:**
- Lines 98-101: Comment describes two flows
- Lines 128-158: Conditional flow detection based on button text
- Lines 136-143: Waits for auth.me to determine flow
- Lines 146-158: Different paths for first-user vs subsequent-user

**Required Changes:**
- Remove conditional flow detection (lines 128-158)
- Always fill channel name (no branching)
- Always expect 2-step flow
- Simplify to ~50% of current lines (from ~60 to ~30)
- Update comments to reflect single flow

**Agent:** qa-architect
**Estimated Complexity:** Low

---

### 4. Global Setup Changes (`e2e/global-setup.ts`)

**Current Issues:**
- Lines 93-136: Seeds default teamspace to avoid first-user flow issues
- This seeding is the source of E2E test race conditions

**Required Changes:**
- Remove teamspace seeding logic (lines 100-136)
- Keep environment validation (lines 22-90)
- Keep mode detection and summary (lines 139-173)
- Update comment on line 95 to reflect removal

**Agent:** qa-architect
**Estimated Complexity:** Low

---

### 5. UX Copy Updates

**Files to Update:**
- `src/app/(auth)/register/page.tsx`
- Potentially: `src/app/setup/page.tsx` (if it still exists - need to verify)

**New Copy:**
```tsx
// Registration page
"Create your workspace"
"Get started with Streamline Studio - your personal video planning hub"

// Help text below form
"Looking to join an existing workspace? Ask your team admin to send you an invite."

// Step 2: Channel setup
"Set up your first channel"
"Channels help you organize video scripts by topic, series, or platform."
```

**Agent:** tron-user-advocate + senior-nextjs-developer
**Estimated Complexity:** Low

---

### 6. Testing & Validation

**E2E Tests to Run:**
- `e2e/auth/login.spec.ts`
- `e2e/auth/register.spec.ts`
- `e2e/preferences.spec.ts` (currently failing due to this issue)
- All workspace-related tests

**Expected Outcomes:**
- All tests pass consistently
- No teamspace slug collisions
- Each test creates isolated workspace
- Near-zero flakiness in CI

**Agent:** qa-architect
**Estimated Complexity:** Medium

---

### 7. Documentation Updates

**Files to Update:**
- `README.md` (if registration flow is described)
- `CONTRIBUTING.md` (if E2E test setup mentions seeding)
- `docs/getting-started.md` (if first-user flow is documented)
- Add entry to `docs/adrs/` if needed (or update ADR-007)

**Agent:** lead-developer-reviewer (review/approve)
**Estimated Complexity:** Low

---

## Success Criteria

- All registrations create new workspace (no auto-join)
- E2E tests pass consistently without teamspace seeding
- Clear UX messaging about creating vs joining
- No regression in existing functionality
- CI tests no longer flaky due to registration race conditions
- Code reduction: ~30-40% less registration code

## Expected Impact

- **Code Reduction:** ~30-40% less registration code
- **Test Reliability:** Near-zero flakiness from registration tests
- **Security:** No unauthorized auto-join to workspaces
- **UX:** Clear, consistent user expectations

## Rollback Plan

Since this is pre-1.0, no rollback plan needed. If critical issues arise, can temporarily revert commits.

## Phase 2 (Future)

Invite flow implementation:
- Magic link invitation system
- Secure tokens (256-bit, 48hr expiry, single-use)
- Invited users skip workspace creation
- Permission management for invites
- Dual-path: new users create account, existing users add workspace

---

**Last Updated:** 2025-12-18
**Next Update:** After Task 1 completion
