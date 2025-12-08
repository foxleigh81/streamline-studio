# ADR-009: Versioning and Audit Approach

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

The application requires:

1. **Document version control**: Users can view history and restore previous versions
2. **Optimistic locking**: Prevent silent overwrites when concurrent edits occur
3. **Audit logging**: Track metadata changes (status, dates) for accountability

These requirements are critical for a content planning tool where users invest significant time in writing scripts and descriptions.

## Decision

### Document Versioning

- Store current document content in `documents` table with a `version` integer
- Store historical versions in `document_revisions` table
- On each save, insert previous content into revisions, then update document
- Restoring creates a new version (append-only history)

### Optimistic Locking

- Client sends expected `version` with save requests
- Server checks version in transaction with `SELECT ... FOR UPDATE`
- Mismatch returns `ConflictError` with current server version
- Client UI presents options: reload or force save

### Audit Log

- Separate `audit_log` table for metadata changes
- Captures entity type, entity ID, action, changes (JSONB), actor, timestamp
- Append-only (no updates or deletes)

## Consequences

### Positive

- **No data loss**: All previous versions preserved
- **Clear conflict handling**: Users understand when edits conflict
- **Accountability**: Audit log provides change history
- **Simple restore UX**: Restore is just "create new version with old content"
- **Database-level consistency**: Transactions ensure atomicity

### Negative

- **Storage growth**: Revision table grows with each save
- **Complexity**: Requires careful transaction handling
- **No real-time collaboration**: Conflicts are detected at save time, not during editing

## Alternatives Considered

### Event Sourcing

**Pros:**

- Complete history of all changes
- Can reconstruct any point in time

**Cons:**

- Massive complexity for MVP
- Requires read model rebuilding
- Overkill for document versioning

### Last-Write-Wins

**Pros:**

- Simple implementation
- No conflict UI needed

**Cons:**

- Data loss when concurrent edits occur
- Users lose trust in the system
- Unacceptable for content planning tool

### Real-time Collaboration (OT/CRDT)

**Pros:**

- No conflicts (changes merge automatically)
- Excellent UX for multi-user editing

**Cons:**

- Significant implementation complexity
- Requires WebSocket infrastructure
- Out of scope for MVP

## Discussion

### Strategic Project Planner

"The versioning requirements are clear:

1. Each document has revision history
2. Users can view and restore old versions
3. Optimistic locking prevents silent overwrites

The question is: how granular should versioning be? Every keystroke? Every auto-save? Every explicit save?"

"I propose: create a revision on every successful save (auto-save or manual). This means at most one revision per 2-second auto-save window. Frequent but not excessive."

### Lead Developer

"Agreed on save-level granularity. Here's the implementation:

```typescript
// Document save with optimistic locking
async saveDocument(
  documentId: string,
  content: string,
  expectedVersion: number,
  userId: string
) {
  return db.transaction(async (tx) => {
    // Lock the row and get current state
    const [current] = await tx.select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .for('update');

    // Version check
    if (current.version !== expectedVersion) {
      throw new ConflictError({
        currentVersion: current.version,
        expectedVersion,
      });
    }

    // Create revision of current content
    await tx.insert(documentRevisions).values({
      documentId,
      content: current.content,
      version: current.version,
      createdBy: current.updatedBy,
      createdAt: current.updatedAt,
    });

    // Update document with new content
    await tx.update(documents)
      .set({
        content,
        version: current.version + 1,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return { version: current.version + 1 };
  });
}
```

The `FOR UPDATE` ensures no other transaction can modify the row until we commit. Race conditions are handled at the database level."

### QA Architect

"Several edge cases need explicit handling:

1. **Rapid saves**: User types fast, auto-save triggers multiple times. With 2-second debounce on the client, this should be manageable, but what if network is slow and saves overlap?

2. **Very large documents**: 50KB+ markdown files. Should we limit document size?

3. **Revision table growth**: Frequently edited documents could have thousands of revisions.

4. **Restore creates new version**: When user restores v5 from v10, the restored content becomes v11. This needs clear UX explanation."

### Lead Developer (Response)

"For rapid saves:

- Client debounces for 2 seconds
- If a save is in progress when another is triggered, queue it
- Version number in response updates client's expected version
- Sequential saves, no parallelism at the API level

For large documents:

- Add 500KB limit on document content
- Display character count with warning at 80% of limit
- Enforce at API level, return validation error if exceeded

For revision growth:

- MVP: no automatic pruning
- Add max_revisions config in future (e.g., keep 100 most recent)
- When pruning, always keep first and last N revisions

For restore UX:

- Button says 'Restore as Current Version'
- Confirmation: 'This will create a new version with the content from version X. Your current content will be preserved in the version history.'
- After restore, user sees version N+1 with old content"

### QA Architect (On Audit Log)

"For the audit log, what exactly gets logged?"

### Strategic Project Planner

"Initially:

- Video status changes (Idea -> Scripting, etc.)
- Video due date changes
- Video publish date changes
- Category create/update/delete

Document content changes are tracked via revisions, not audit log. Audit log is for metadata.

Structure:

````typescript
{
  id: uuid,
  workspaceId: uuid,
  entityType: 'video' | 'category',
  entityId: uuid,
  action: 'create' | 'update' | 'delete',
  changes: {
    status: { from: 'idea', to: 'scripting' },
    dueDate: { from: '2025-01-01', to: '2025-01-15' },
  },
  actorId: uuid,
  createdAt: timestamp,
}
```"

### QA Architect (Final Concerns)

"Two more things:

1. **Before Phase 3 (Phase 2)**: The plan calls for basic version check in Phase 2 before full optimistic locking in Phase 3. This is critical - we can't ship document editing without any conflict protection.

2. **Local storage backup**: If auto-save fails (network down), we should backup to localStorage. On page load, check if localStorage has newer content than server and offer recovery."

### Lead Developer (Response)

"Both addressed in the plan:

1. Phase 2 includes task 2.3.7: 'Add basic version check on save (pre-Phase 3)'. This shows a warning if server version changed, not full resolution UI.

2. Phase 2 includes task 2.3.6: 'Implement local storage backup for unsaved changes'. On load, compare localStorage timestamp with server updatedAt, offer recovery if local is newer."

## Implementation Notes

### Schema

```sql
-- documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  video_id UUID REFERENCES videos(id),
  type VARCHAR(50) NOT NULL, -- 'script', 'description', 'notes'
  content TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- document_revisions table
CREATE TABLE document_revisions (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL
);

-- audit_log table
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(20) NOT NULL,
  changes JSONB,
  actor_id UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_revisions_document ON document_revisions(document_id);
CREATE INDEX idx_audit_workspace ON audit_log(workspace_id);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
````

### Conflict Resolution UI States

1. **Conflict Detected**: "This document was modified since you opened it"
2. **Option A**: "Discard my changes and reload" -> Fetches current version
3. **Option B**: "Save anyway as new version" -> Force save (server version becomes N+1)
4. **View Difference**: Future enhancement (not MVP)
