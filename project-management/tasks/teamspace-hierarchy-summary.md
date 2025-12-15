# Teamspace Hierarchy: Architecture Decision Summary

**Date**: 2025-12-15
**Decision Status**: Approved
**Implementation Status**: Ready to Begin

## Executive Summary

The team has completed a comprehensive architectural discussion and reached consensus on introducing a two-tier **Teamspace Hierarchy** to replace the current flat workspace structure. This decision was driven by concrete SaaS requirements, particularly teamspace-level billing, and enables future data portability between self-hosted and SaaS deployments.

## What Changed

### Current Architecture (Flat)

```
Workspace (top-level, globally unique slug)
├── Videos
├── Documents
└── Members with roles
```

**URL**: `/w/[workspace-slug]/videos/[id]`

### New Architecture (Two-Tier)

```
Teamspace (top-level, globally unique slug, billing entity)
├── Members with default roles (admin, editor, viewer)
└── Project 1 (unique within teamspace)
    ├── Members (inherit teamspace role or override)
    ├── Videos
    └── Documents
└── Project 2
    └── ...
```

**URL**: `/t/[teamspace-slug]/[project-slug]/videos/[id]`

## Key Decisions

### 1. Teamspace Hierarchy (ADR-017)

**Implemented Now**: Two-tier hierarchy with Slack-style permissions

**Rationale**:

- SaaS billing must occur at team level (non-negotiable requirement)
- Pre-launch status means no migration burden (building fresh)
- Slack-style permission model provides clear UX value
- Clean hierarchy enables future data portability

**Architecture**:

- **Teamspace**: Top-level entity with globally unique slug, billing, team membership
- **Project**: Under teamspace, unique slug within teamspace only
- **Permissions**: Teamspace roles are defaults, project-level overrides possible
- **URL**: `/t/[teamspace-slug]/[project-slug]/...`

**Trade-offs**:

- ✅ Natural billing boundary for SaaS
- ✅ Scalable permission model (team defaults reduce repetition)
- ✅ Clear mental model (mirrors Slack, GitHub, Notion)
- ✅ Future-proof for organization features
- ❌ Increased complexity vs flat structure
- ❌ More database queries (4 per request for auth)
- ❌ Larger test surface

### 2. Data Portability Strategy (ADR-018)

**Designed Now, Implemented Later**

**Rationale**:

- No immediate need (pre-launch, no users to migrate)
- Complex feature requiring 2-3 weeks proper implementation
- Better to design architecture now to avoid future refactoring

**Approach**:

- Export format: Structured JSON with schema versioning
- Full teamspace export (projects, videos, documents, users, permissions)
- Import with user consent (invitation-based, not automatic)
- Security: Strict validation, sanitization, admin-only access

**Immediate Actions**:

- Add `teamspaces.external_id` field (for future migration tracking)
- Document export JSON schema spec
- Add "Data portability coming soon" to roadmap

**Future Implementation**: Post-v1 when users actually need it

## Permission Model (Slack-Style)

### Teamspace Membership

- User joins teamspace with role (admin, editor, viewer)
- Teamspace membership alone does NOT grant project access
- Users only see projects they're invited to

### Project Invitation

- User invited to specific project within teamspace
- **Default permission = their teamspace role**
- Example: Alice is "editor" in teamspace → invited to Project A → automatically "editor"

### Project-Level Override

- Project admin can override permissions for specific users
- Example: Make Alice "viewer" on Project B despite being "editor" in teamspace
- Or elevate Bob to "admin" on Project C despite being "viewer"

### Teamspace Admin Override

- Teamspace admins always have full access to all projects
- Prevents lockout scenarios (if project admin leaves)

## Single-Tenant vs Multi-Tenant Mode

### Single-Tenant (Self-Hosted)

- Setup wizard creates default teamspace (auto-named or user-chosen)
- Teamspace concept hidden from UI ("My Projects" not "Teamspaces")
- URLs still use `/t/[slug]/[project]` but UI simplifies navigation
- Billing fields ignored
- Streamlined project-focused interface

### Multi-Tenant (SaaS)

- Users can create multiple teamspaces
- Full teamspace management UI visible
- Billing attached at teamspace level (Stripe integration)
- Two-tier navigation: "Acme Corp > Video Production"
- Invitation flows for both teamspace and project

**Same codebase, conditional UI based on `MODE` environment variable**

## Schema Changes

### New Tables

**teamspaces**:

- Globally unique slug
- Billing information (plan, customer ID)
- Mode ('single-tenant' | 'multi-tenant')
- `external_id` (for future data portability)

**teamspace_users**:

- Join table: teamspace + user + role
- Roles: 'admin' | 'editor' | 'viewer'

### Modified Tables

**workspaces → projects**:

- Add `teamspace_id` foreign key
- Slug constraint: globally unique → unique within teamspace

**workspace_users → project_users**:

- Add `role_override` (nullable)
- Effective role = `role_override ?? teamspace_users.role`

## Authorization Flow

Request: `/t/[teamspaceSlug]/[projectSlug]/videos`

1. **Resolve teamspace** by slug (404 if not found)
2. **Validate teamspace membership** (403 if not member)
3. **Resolve project** by (teamspaceId, slug) (404 if not found)
4. **Validate project access** (403 if not invited, unless teamspace admin)
5. **Calculate effective role**: `project_users.role_override ?? teamspace_users.role`
6. **Attach to context**: teamspace, project, userRole, repos

## Implementation Timeline

**Estimated Duration**: 4-5 weeks (with 2 senior devs + QA)

### Phases

1. **Database Schema** (3-4 days) - Create tables, migrations
2. **Repository Layer** (4-5 days) - TeamspaceRepository, rename WorkspaceRepository
3. **Middleware** (3-4 days) - Two-tier authorization logic
4. **Routing** (3-4 days) - Update URL structure `/w/` → `/t/[teamspace]/[project]/`
5. **Context Providers** (2-3 days) - TeamspaceProvider, ProjectProvider
6. **UI Updates** (4-5 days) - Navigation, teamspace management, conditional rendering
7. **Data Migration** (1 day) - Setup wizard, dev data migration if needed
8. **Testing & QA** (5-7 days) - Unit, integration, E2E, security
9. **Documentation** (2-3 days) - Developer docs, user guides, deployment

**Total**: 27-38 days (calendar time shorter with parallel work)

## Critical Success Factors

1. **No Data Loss**: Comprehensive testing, full backups, rollback plan
2. **Security**: Extensive authorization testing, no access control breaches
3. **Performance**: Database indexing, query optimization (<200ms auth)
4. **Maintainability**: 80%+ test coverage, clear documentation
5. **User Experience**: Single-tenant mode hides complexity for solo users

## Files Created/Updated

### New ADRs

- `/docs/adrs/017-teamspace-hierarchy.md` - Architecture decision
- `/docs/adrs/018-data-portability-strategy.md` - Export/import design

### Updated ADRs

- `/docs/adrs/008-multi-tenancy-strategy.md` - Marked as superseded by ADR-017
- `/docs/adrs/007-api-and-auth.md` - Noted extension by ADR-017

### Implementation Plan

- `/project-management/tasks/teamspace-hierarchy-implementation-plan.md` - Detailed 10-phase plan

## Next Steps

1. **Team Alignment**: Review ADRs and implementation plan with full team
2. **Assign Phases**: Allocate specific phases to developers
3. **Set Up Tracking**: Create GitHub issues for each phase
4. **Staging Environment**: Prepare environment for testing
5. **Begin Phase 1**: Start with database schema changes

## Questions for User/Team

1. What is the target deployment date for this work?
2. Is there existing production data that needs migration?
3. Should any data portability work (Phase 10) be pulled into v1?
4. What is the rollback tolerance (time to rollback if issues found)?
5. Are there upcoming features that should wait until after this refactor?

## Discussion Archive

Full team discussion documented in:

- `/project-management/discussions/workspace-chat.html`

Key participants:

- Project Orchestrator (coordination)
- Senior Developer (technical architecture)
- Security Architect (authorization, security)
- TRON (user experience advocate)
- QA Architect (testing strategy)

## Conclusion

The team unanimously recommends proceeding with the Teamspace Hierarchy architecture. The SaaS billing requirement justifies the added complexity, and the pre-launch status eliminates migration risk. The Slack-style permission model provides tangible UX value by reducing repetitive permission management.

The data portability strategy (ADR-018) ensures we design the architecture correctly from the start, even though implementation is deferred to post-v1.

**Status**: Ready for implementation

---

**Document Owner**: Project Orchestrator
**Last Updated**: 2025-12-15
**Next Review**: After implementation begins (track progress in phases)
