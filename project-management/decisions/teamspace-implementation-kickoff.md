# Teamspace Hierarchy Implementation - Kickoff

**Date**: 2025-12-15
**Status**: In Progress
**Lead**: Project Orchestrator

## Overview

Implementation of ADR-017 (Teamspace Hierarchy) and ADR-018 (Data Portability Strategy) has been approved and is now underway.

## Key Architectural Changes

### Database Schema

- **New Tables**: `teamspaces`, `teamspace_users`
- **Renamed Tables**: `workspaces` → `projects`, `workspace_users` → `project_users`
- **New Fields**: `projects.teamspace_id`, `project_users.role_override`, `teamspaces.external_id`
- **Permission Model**: Slack-style with teamspace roles + project overrides

### URL Structure

- **Current**: `/w/[workspace-slug]`
- **New**: `/t/[teamspace-slug]/[project-slug]`

### Mode Support

- **Single-Tenant**: Auto-create default teamspace, hide teamspace UI
- **Multi-Tenant**: Full teamspace management with billing fields

## Phase 1: Database Schema Changes (CURRENT)

### Status: In Progress

Starting with Phase 1.1 - creating new tables for the teamspace hierarchy.

### Tasks Assigned

#### Phase 1.1: Create New Tables

- **Assignee**: senior-nextjs-developer
- **Status**: In Progress
- **Deliverables**:
  - New `teamspaces` table with proper fields and indexes
  - New `teamspace_users` join table
  - Proper foreign key constraints
  - Initial unit tests

#### Phase 1.2: Rename and Modify Existing Tables

- **Assignee**: senior-nextjs-developer
- **Status**: Pending (blocked by 1.1)
- **Deliverables**:
  - Rename `workspaces` → `projects`
  - Rename `workspace_users` → `project_users`
  - Add `teamspace_id` foreign key to projects
  - Add `role_override` field to project_users
  - Update unique constraints

#### Phase 1.3: Update Drizzle Schema

- **Assignee**: senior-nextjs-developer
- **Status**: Pending (blocked by 1.2)
- **Deliverables**:
  - Updated `/src/server/db/schema.ts`
  - Type exports for new entities
  - Relations properly defined
  - Type-check passes

#### Phase 1.4: Generate and Test Migration

- **Assignee**: senior-nextjs-developer
- **Status**: Pending (blocked by 1.3)
- **Deliverables**:
  - Migration files generated
  - Migration tested on fresh database
  - Rollback procedure documented
  - All constraints verified

## Agent Coordination

### Active Agents

- **senior-nextjs-developer**: Database schema implementation (Phase 1.1-1.4)

### Queued for Future Phases

- **nextjs-security-architect**: Permission model and authorization middleware (Phase 3)
- **code-quality-enforcer**: Code review after each major phase
- **qa-architect**: Testing strategy and verification (Phase 8)

## Critical Implementation Notes

1. **Pre-Launch Status**: No data migration needed - we're building fresh
2. **Follow Existing Patterns**: Check CLAUDE.md for Drizzle ORM patterns
3. **Type Safety**: All schema changes must pass TypeScript strict mode
4. **Testing**: Unit tests for table creation and constraint validation
5. **Rollback**: Document rollback procedure for each migration step

## Next Steps

1. Complete Phase 1.1 (new tables creation)
2. Run type-check and lint after schema changes
3. Review with code-quality-enforcer before proceeding to Phase 1.2
4. Continue sequential implementation of Phase 1 tasks

## Communication Protocol

- Senior developer will escalate any uncertainty to Project Orchestrator
- All schema changes will be reviewed before migration generation
- Security Architect will review permission model before Phase 3
- QA Architect will be consulted before Phase 8 begins

## References

- Implementation Plan: `/Users/foxleigh81/dev/internal/streamline-studio/project-management/tasks/teamspace-hierarchy-implementation-plan.md`
- ADR-017: `/Users/foxleigh81/dev/internal/streamline-studio/docs/adrs/017-teamspace-hierarchy.md`
- ADR-018: `/Users/foxleigh81/dev/internal/streamline-studio/docs/adrs/018-data-portability-strategy.md`
- Current Schema: `/Users/foxleigh81/dev/internal/streamline-studio/src/server/db/schema.ts`

---

**Document Owner**: Project Orchestrator
**Last Updated**: 2025-12-15
