# ADR-018: Data Portability Strategy

**Status**: Accepted
**Date**: 2025-12-15
**Deciders**: Project Orchestrator, Senior Developer, Security Architect, TRON, QA Architect

**Related**: ADR-017 (Teamspace Hierarchy Architecture), ADR-008 (Multi-Tenancy Strategy)

## Context

The application supports two deployment models:

1. **Self-Hosted Single-Tenant**: Users run their own instance with full control
2. **Multi-Tenant SaaS**: Managed hosting with multiple teamspaces

Users need the ability to migrate their data between these deployments, specifically:

- **Self-Hosted → SaaS**: User starts self-hosted but later wants managed hosting, multiple teamspaces, or team collaboration features
- **SaaS → Self-Hosted**: User wants to take back full control of their data
- **SaaS → SaaS**: User wants to move to a different SaaS provider instance
- **Self-Hosted → Self-Hosted**: Backup/restore, disaster recovery, or moving to new infrastructure

### Business Requirements

1. **No Vendor Lock-In**: Users must own their data and be able to migrate freely
2. **Trust Building**: Data portability demonstrates commitment to user ownership
3. **Compliance**: Some users may have regulatory requirements for data export
4. **Backup/Recovery**: Export serves as comprehensive backup mechanism

### Technical Requirements

1. **Complete Data Export**: All user content, settings, and permissions
2. **Human-Readable Format**: Users should be able to inspect their data
3. **Version Compatibility**: Handle schema changes across versions
4. **Security**: Sensitive data must be handled appropriately (no password exports)
5. **Validation**: Import must validate and sanitize data
6. **Conflict Resolution**: Handle slug collisions and user mapping
7. **Rollback**: Failed imports must not leave partial/corrupted data

### Why Not Build in v1?

- **No Immediate Need**: Pre-launch application has no existing users to migrate
- **Complexity**: Proper implementation requires 2-3 weeks of development + QA
- **Quality Bar**: Export/import must be bulletproof (data loss unacceptable)
- **Schema Stability**: Better to implement after schema stabilizes post-launch

However, we must **design for it now** to avoid future refactoring. The teamspace hierarchy (ADR-017) already provides clean data scoping that makes export/import straightforward.

## Decision

**Design and document the data portability specification now. Implement the feature post-v1 when users actually need it.**

### Export Format: Structured JSON

Use JSON as the export format with schema versioning.

**Why JSON?**

- Human-readable (users can inspect their data)
- Platform-agnostic (works across database versions)
- Flexible (can add fields without breaking old exports)
- Validatable (JSON Schema for strict validation)
- Streamable (handle large exports efficiently)

### Export Schema Specification

```json
{
  "version": "1.0",
  "exported_at": "2025-12-15T17:10:00Z",
  "source": {
    "instance_type": "self-hosted" | "saas",
    "instance_id": "uuid-or-domain",
    "app_version": "1.2.3"
  },
  "teamspace": {
    "id": "original-uuid",
    "name": "My Company",
    "slug": "my-company",
    "created_at": "2025-01-01T00:00:00Z",
    "settings": {
      // Teamspace-specific settings
    }
  },
  "users": [
    {
      "id": "original-uuid",
      "email": "alice@example.com",
      "name": "Alice Smith",
      "teamspace_role": "admin",
      "joined_at": "2025-01-01T00:00:00Z"
    }
  ],
  "projects": [
    {
      "id": "original-uuid",
      "name": "Video Production",
      "slug": "video-production",
      "created_at": "2025-01-05T00:00:00Z",
      "settings": {},
      "user_permissions": [
        {
          "user_id": "original-uuid",
          "role_override": "editor" | null
        }
      ],
      "videos": [
        {
          "id": "original-uuid",
          "title": "My First Video",
          "status": "scripting",
          "created_at": "2025-01-10T00:00:00Z",
          "documents": [
            {
              "id": "original-uuid",
              "content": "# Script content here",
              "version": 1,
              "created_at": "2025-01-10T00:00:00Z"
            }
          ]
        }
      ]
    }
  ],
  "audit_logs": [
    // Optional: may be large, user can choose to include
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "user_id": "original-uuid",
      "action": "project.created",
      "details": {}
    }
  ]
}
```

### What to Include in Export

**Always Included:**

- Teamspace metadata (name, slug, settings)
- All projects with metadata and settings
- All videos with metadata (title, status, etc.)
- All documents/scripts with full content
- User list (email, name, display name)
- Permission mappings (teamspace roles, project overrides)

**Optional (User Choice):**

- Audit logs (can be very large)
- Deleted/archived content (if we implement soft deletes)

**Never Included:**

- Password hashes (users re-authenticate in target environment)
- Session tokens (invalid after migration)
- Billing information (SaaS creates new subscription)
- System-generated IDs will be replaced during import
- API keys or secrets
- Rate limiting state

### What to Add to Schema Now

Add `external_id` field to `teamspaces` table to track migration source:

```sql
ALTER TABLE teamspaces
ADD COLUMN external_id TEXT UNIQUE NULL;
```

**Purpose:**

- Track original teamspace ID from source system
- Debug migration issues
- Enable potential re-import/sync scenarios (advanced use case)
- Provide audit trail of data origin

**Example:**

- User exports from self-hosted (teamspace ID = `uuid-123`)
- Imports to SaaS (new ID = `uuid-789`, `external_id = "uuid-123"`)

### Import Process

**Step 1: Pre-Validation**

- Validate JSON schema version compatibility
- Check file size limits (e.g., max 500MB)
- Verify user has admin rights in target environment
- Check if enough storage/seats available (SaaS plans)

**Step 2: Conflict Detection**

- Check if teamspace slug already exists in target
- Check if user emails conflict with existing accounts
- Validate project slugs (only within imported teamspace)

**Step 3: Conflict Resolution**

- **Teamspace slug collision**: Prompt user to rename (e.g., `my-company` → `my-company-imported`)
- **User email exists**: Send invitation to existing user (requires consent)
- **User email new**: Send invitation to create account
- **Project slug collision**: Auto-rename with suffix or prompt user

**Step 4: Data Import (Transactional)**

- Begin database transaction
- Create new teamspace with new UUIDs
- Import projects (maintain hierarchical relationships)
- Import videos and documents (preserve content, update foreign keys)
- Map user permissions
- Commit transaction (all-or-nothing)

**Step 5: User Notifications**

- Send invitation emails to all users in the export
- Provide import summary to admin (success/failure status)
- Log import action in audit trail

**Step 6: Rollback on Failure**

- If import fails at any step, rollback entire transaction
- Clean up any partial data
- Provide detailed error message to user
- Log failure for debugging

### User Identity Mapping

This is the most security-critical aspect.

**Scenario 1: User Email Exists in Target**

- Import creates pending invitation
- Existing user receives email: "Alice has migrated 'Acme Corp' teamspace and invited you to join as Editor. Accept to access."
- User must explicitly accept invitation
- Upon acceptance, user is added with specified role
- **Critical**: No automatic addition without consent

**Scenario 2: User Email Does Not Exist**

- Import creates pending invitation
- User receives email: "Alice has migrated 'Acme Corp' teamspace and invited you to join as Editor. Create your account to accept."
- User registers and automatically joins teamspace
- User sees welcome flow

**Scenario 3: Multiple Projects with Same User**

- User invitation is sent once at teamspace level
- Upon acceptance, user gains access to all projects they were invited to
- Permissions set as specified in import (teamspace role + project overrides)

### Security Requirements

**Export Security:**

1. **Access Control**: Only teamspace admins can export
2. **Audit Logging**: Log who exported, when, from what IP
3. **Data Sanitization**: Strip password hashes, sessions, secrets
4. **Secure Download**: Short-lived signed URLs (1-hour expiry), HTTPS only
5. **Rate Limiting**: Max 1 export per teamspace per hour (prevent abuse)

**Import Security:**

1. **Schema Validation**: Strict JSON Schema validation (reject malformed data)
2. **Content Sanitization**: XSS prevention on all text fields (use DOMPurify)
3. **Size Limits**: Enforce max file size, max projects, max videos
4. **Authorization**: Only teamspace admins can import
5. **Audit Logging**: Log who imported, when, from what IP, what data
6. **User Consent**: Never auto-add users without explicit invitation acceptance
7. **Conflict Prevention**: Validate slugs don't conflict before starting import

**Data Privacy:**

1. **GDPR Compliance**: Export includes all user data (right to data portability)
2. **User Notification**: All exported users should be notified (optional, configurable)
3. **Retention**: Exported files deleted from server after 24 hours
4. **Encryption**: Exports stored encrypted at rest (if stored server-side)

### Validation Rules

**Export Validation:**

- Teamspace must exist and user must be admin
- All referenced entities must exist (no broken foreign keys)
- Content must be valid UTF-8
- File size must be under limit

**Import Validation:**

- JSON must be valid and parseable
- Schema version must be compatible (same major version)
- All required fields must be present
- Email addresses must be valid format
- Slugs must match allowed pattern (`^[a-z0-9-]+$`)
- Dates must be valid ISO 8601 format
- Content must not contain malicious scripts (XSS)

### Error Handling

**Export Errors:**

- Database unavailable → Retry with exponential backoff
- Timeout (large dataset) → Background job with email notification when ready
- Disk space full → Inform user, suggest archiving old content

**Import Errors:**

- Invalid JSON → Clear error: "Export file is corrupted or invalid format"
- Version mismatch → "This export was created with version X.Y, but version Z.W is required"
- Slug collision → "Teamspace 'acme-corp' already exists. Choose a different name:"
- Partial failure → Rollback + detailed error report
- Transaction failure → Rollback + retry option

### Performance Considerations

**Large Exports:**

- Stream JSON generation (don't load entire dataset into memory)
- Background job for exports >100MB
- Compression (gzip) for large files
- Progress indicator in UI

**Large Imports:**

- Batch processing (import projects in chunks)
- Progress indicator with steps: "Creating projects... 5/10"
- Timeout handling (use background job for large imports)
- Resumable imports (if interrupted, can resume from checkpoint)

## Consequences

### Positive

1. **User Trust**: Demonstrates commitment to data ownership and no lock-in
2. **Flexibility**: Users can freely move between deployment types
3. **Backup Strategy**: Export serves as comprehensive backup mechanism
4. **Compliance**: Satisfies regulatory requirements for data portability
5. **Clean Architecture**: Teamspace hierarchy makes export/import straightforward
6. **Future-Proof**: Schema versioning handles future changes

### Negative

1. **Complexity**: Export/import is high-complexity feature (2-3 weeks work)
2. **Testing Burden**: Requires extensive edge case testing and rollback scenarios
3. **Maintenance**: Must update export schema when data model changes
4. **Security Risk**: Import is attack surface if validation insufficient
5. **User Confusion**: Complex conflict resolution may confuse users

### Mitigation Strategies

- **Complexity**: Defer implementation until post-v1, but design now
- **Testing**: Comprehensive test plan (see Implementation Notes)
- **Maintenance**: Automated tests that break when schema changes
- **Security**: Strict validation, sanitization, and security review
- **UX**: Clear UI with step-by-step guidance and helpful error messages

## Alternatives Considered

### Option A: Database Dump (pg_dump)

**Pros:**

- Complete data export, no schema mapping needed
- Fast and reliable
- Works with existing PostgreSQL tools

**Cons:**

- Not portable across database versions
- Not human-readable
- Cannot merge into existing deployment (all-or-nothing)
- Includes sensitive data (passwords, sessions)
- Not user-friendly

**Rejected because:** Too technical, not user-facing feature.

### Option B: SQLite Export

**Pros:**

- Self-contained file format
- Queryable by users
- Fast import/export

**Cons:**

- Not human-readable
- Requires SQLite knowledge to inspect
- Harder to sanitize sensitive data
- Schema version compatibility issues

**Rejected because:** Not transparent enough for users.

### Option C: CSV per Table

**Pros:**

- Simple format
- Easy to inspect
- Widely supported

**Cons:**

- Loses relationships (foreign keys)
- Multiple files to manage
- No standard for nested data (videos → documents)
- Hard to validate

**Rejected because:** Too fragmented, loses data structure.

### Option D: Custom Binary Format

**Pros:**

- Compact file size
- Fast processing
- Can include checksums

**Cons:**

- Not human-readable (major con for trust)
- Requires custom tooling to inspect
- Version compatibility nightmare

**Rejected because:** Antithetical to transparency goal.

## Implementation Timeline

**Phase 1 (v1.0): Preparation**

- Add `teamspaces.external_id` field to schema
- Document export JSON schema specification (this ADR)
- Document import validation rules
- Write conflict resolution strategy guide
- Add "Data portability coming soon" to docs and marketing

**Phase 2 (v1.x): Export Implementation**

- Build export functionality
- Background job for large exports
- Audit logging
- Security review
- E2E testing (export various teamspace sizes)

**Phase 3 (v1.x): Import Implementation**

- Build import validation
- User identity mapping and invitation flow
- Conflict resolution UI
- Rollback on failure
- Comprehensive testing (round-trip, edge cases)

**Phase 4 (v1.x): Polish & Documentation**

- Import progress UI
- Clear error messages
- User documentation with examples
- Video walkthrough of migration process

## Testing Strategy

**Export Testing:**

- Data completeness (all entities included)
- Data integrity (relationships preserved)
- Data exclusion (passwords/sessions NOT in export)
- Large datasets (100+ projects, 1000+ videos)
- Character encoding (Unicode, emojis, special characters)
- File size handling (500MB+ exports)

**Import Testing:**

- Schema validation (reject malformed JSON, old versions)
- Conflict scenarios (slug collisions, user email conflicts)
- Partial import handling (failure mid-import)
- Rollback strategy (failed import leaves no orphaned data)
- User mapping (existing users, new users, permissions)
- Data integrity post-import (all content accessible, permissions enforced)

**Round-Trip Testing:**

- Export from environment A → Import to environment B → Verify identical functionality
- Export → modify → import (test schema tolerance)
- Multiple imports to same environment (conflict handling)

**Edge Cases:**

- Empty teamspace (no projects)
- Teamspace with 100+ projects
- Very old export format (compatibility)
- Concurrent imports (prevent race conditions)
- Network interruption during import
- Disk space exhaustion

**Security Testing:**

- Validate sanitization (XSS, SQL injection attempts in content)
- Validate size limits (prevent DoS via large imports)
- Validate authorization (non-admin cannot import)
- Validate user consent flow (users must explicitly accept invitation)

## Documentation Requirements

**User Documentation:**

- "Exporting Your Teamspace Data" guide with screenshots
- "Importing to SaaS" walkthrough
- "Migrating from Self-Hosted to SaaS" tutorial
- FAQ: "What data is included in export?"
- FAQ: "Can I edit the export file?" (answer: not recommended, breaks validation)

**Developer Documentation:**

- Export JSON schema (JSON Schema format)
- Import validation rules
- Conflict resolution strategies
- Error codes and troubleshooting

**Marketing/Trust:**

- "Your data is yours" messaging
- "No vendor lock-in" in feature list
- "Data portability" in compliance/security page

## Related Decisions

- **ADR-017**: Teamspace Hierarchy Architecture - clean hierarchy makes export/import straightforward
- **ADR-008**: Multi-Tenancy Strategy - extends with data portability between deployment types
- **ADR-014**: Security Architecture - security requirements for export/import

## Reconsideration Triggers

Consider revisiting this decision if:

1. **User Demand**: If many users request this feature pre-v1, consider expediting
2. **Regulatory**: If GDPR or similar requires immediate data export capability
3. **Format Change**: If JSON proves too large or slow for big teamspaces (consider compression or alternative format)
4. **Sync Feature**: If users request continuous sync between self-hosted and SaaS (much more complex than one-time migration)

## Discussion Summary

The team initially debated building export/import immediately vs. later. Consensus formed around:

**Build Later Because:**

- Pre-launch app has no users to migrate yet
- Complex feature requiring 2-3 weeks proper implementation + testing
- Better to implement after schema stabilizes

**Design Now Because:**

- Teamspace hierarchy (ADR-017) already provides clean structure
- Adding `external_id` field now is trivial, painful to add later
- Documenting requirements ensures security isn't an afterthought
- Signals commitment to data ownership even if feature not live

Key insight from Senior Developer: "The teamspace architecture we just designed makes this much easier than it would have been with a flat workspace model. Since everything is scoped to a teamspace, we can export a complete 'teamspace bundle' that's self-contained."

Key insight from Security Architect: "User identity mapping is the BIG one. Users must explicitly accept invitation to join imported teamspace. We cannot auto-add people without consent. This is both a security requirement and a privacy requirement."

Key insight from TRON: "Even if we don't build it for v1, we should mention it in documentation and marketing: 'Data portability coming soon.' This builds trust with self-hosted users who might worry about lock-in."

Key insight from QA: "Round-trip testing is the gold standard: Export from environment A → Import to environment B → Verify everything works identically. This is complex testing that requires proper time."

The decision was unanimous: Design and document now, implement post-v1.
