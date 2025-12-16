# Project → Channel Rename Task

## Overview
Complete the systematic rename of "project" terminology to "channel" throughout the codebase. The database schema and repositories have been updated, but ~50 TypeScript errors remain.

## Current Status
- Database schema: COMPLETE (channels, channelUsers, ChannelRole)
- Repositories: COMPLETE (TeamspaceRepository uses channel methods)
- TypeScript errors: ~50 remaining

## Required Changes

### 1. Rename Library Directories
- `/src/lib/project/` → `/src/lib/channel/`
  - Update context.tsx (ProjectContext → ChannelContext)
  - Update provider.tsx (ProjectProvider → ChannelProvider)
  - Update index.ts exports

### 2. Rename Component Directories
- `/src/components/project/` → `/src/components/channel/`
  - Update all component files inside
  - Update folder structure

### 3. Fix All Imports
- Update every file importing from old paths
- Search for: `from '@/lib/project'`, `from '@/components/project'`
- Replace with: `from '@/lib/channel'`, `from '@/components/channel'`

### 4. Rename Route Folders
- `/src/app/(app)/t/[teamspace]/[project]/` → `[channel]/`
- Update all nested routes

### 5. Update tRPC Routers
- `/src/server/trpc/routers/project.ts` → `channel.ts`
- Update router name: projectRouter → channelRouter
- Update root router imports

### 6. Fix Middleware
- `/src/server/trpc/middleware/project.ts` → `channel.ts`
- Update imports and types
- Update auth/validate.ts and auth/workspace.ts

### 7. Update Schema Imports
Fix all files importing old schema names:
- `projects` → `channels`
- `projectUsers` → `channelUsers`
- `Project` → `Channel`
- `ProjectUser` → `ChannelUser`
- `ProjectRole` → `ChannelRole`

### 8. Update UI Text
Change user-facing terminology:
- "Project" → "Channel"
- "project" → "channel"
- "projects" → "channels"

### 9. Update Tests
- Fix test files importing old types
- Update test data (projectId → channelId)

## Success Criteria
- `npm run type-check` shows 0 errors
- All tests pass
- No "project" terminology remains (except in comments explaining migration)
- All imports resolve correctly
- Application builds successfully

## Verification Commands
```bash
npm run type-check    # Must show 0 errors
npm run lint          # Must pass
npm test              # Unit tests must pass
npm run build         # Production build must succeed
```

## Notes
- Pre-release status: No backwards compatibility required
- Breaking changes are acceptable
- Focus on completeness and consistency
