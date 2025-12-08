# ADR-010: Markdown Import/Export and Data Ownership

**Status**: Accepted
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect

## Context

Users need confidence that their content is not locked into the application. Requirements:

1. Markdown stored in database is the canonical source of truth
2. Users can export documents as `.md` files at any time
3. Users can import `.md` files to update document content
4. Import/export is a round-trip convenience, not the primary storage

This supports the self-hosted ethos: users own their data and can extract it without vendor lock-in.

## Decision

### Storage

- All markdown content stored as `TEXT` columns in PostgreSQL
- Database is the canonical source of truth
- No file system storage for documents

### Export

- Single document export: downloads as `.md` file
- Bulk export (deferred): zip file with all documents for a video
- Filename format: `{video-title}-{document-type}.md` (e.g., `my-first-video-script.md`)

### Import

- Single document import: uploads `.md` file
- Creates new version (preserves history)
- File size limit: 1MB
- Validates UTF-8 encoding

## Consequences

### Positive

- **Data ownership**: Users can always extract their content
- **Portability**: Standard markdown format, no proprietary encoding
- **Simple backup**: pg_dump captures all content
- **Round-trip safe**: Export then import produces identical content

### Negative

- **No sync**: Files on disk are copies, not live connections
- **Manual process**: Import/export is explicit user action
- **Single document only (MVP)**: No batch operations initially

## Alternatives Considered

### File System as Primary Storage

**Pros:**

- Direct file access for power users
- Natural Git integration
- Could edit with external tools

**Cons:**

- Complexity of syncing file changes to database
- File system permissions and path handling
- Doesn't work well for SaaS multi-tenant
- Version history harder to implement

### Git-Based Storage

**Pros:**

- Native versioning
- Familiar to developers
- Branch/merge capabilities

**Cons:**

- Requires Git knowledge
- Not user-friendly for non-developers
- Conflict resolution is complex
- SaaS deployment complications

### External Storage (S3, etc.)

**Pros:**

- Scalable for large content
- CDN distribution possible

**Cons:**

- Additional infrastructure
- Latency for reads
- Overkill for text content

## Discussion

### Strategic Project Planner

"The fundamental question is: where does the content live?

Options:

1. Database only (files are exports)
2. File system only (database is index)
3. Both synced

For a web-first application that supports both self-hosted and SaaS, database-only makes the most sense. File system storage creates complications for multi-tenant SaaS where you can't give users file access."

### Lead Developer

"Agreed. Database storage with export capability gives us:

- Single source of truth
- Works identically in single-tenant and multi-tenant
- Simple backup (pg_dump)
- Version history without Git complexity

For YouTubers who want to edit in their favorite markdown editor:

1. Export the document
2. Edit locally
3. Import back

Yes, it's manual. But it's simple and predictable. We're not trying to compete with Obsidian or Git-based tools."

### QA Architect

"How do we guarantee data ownership? Users need confidence they can always get their content out."

### Lead Developer (Response)

"Several guarantees:

1. **Export is always available**: Export button in the document editor toolbar. No permissions required beyond viewing the document.

2. **Standard format**: Files are plain UTF-8 markdown. No proprietary headers or metadata.

3. **Bulk export (future)**: When implemented, exports all documents for a video as a zip.

4. **Database access for self-hosters**: They can query the database directly if needed:

   ```sql
   SELECT d.content
   FROM documents d
   JOIN videos v ON d.video_id = v.id
   WHERE v.title = 'My Video' AND d.type = 'script';
   ```

5. **API access (potential future)**: REST endpoints could expose content for external tools."

### QA Architect (Edge Cases)

"What about:

1. **Filename conflicts**: Two videos with same title?
2. **Special characters in titles**: `My Video: Part 1`?
3. **Large imports**: What if someone tries to import a 100MB file?
4. **Binary file detection**: What if someone imports a Word doc?"

### Lead Developer (Response)

"1. **Filename conflicts**: Append document ID if needed: `my-video-script-abc123.md`

2. **Special characters**: Sanitize for filesystem safety:

   ```typescript
   const sanitize = (name: string) =>
     name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
   ```

3. **File size limit**: 1MB hard limit. Return validation error with message: 'File too large. Maximum size is 1MB.'

4. **Binary detection**: Check file header. If not valid UTF-8 text, reject with: 'Invalid file format. Please upload a .md text file.'"

### Strategic Project Planner (Scope)

"For MVP, I propose:

**In Scope:**

- Single document export (Phase 3)
- Single document import (Phase 3)
- 1MB file size limit
- UTF-8 validation

**Deferred:**

- Bulk export (zip all documents for a video)
- Bulk import
- Workspace-level export (all videos)"

### QA Architect (Final)

"Agreed on scope. One addition for testability: the export should be byte-for-byte reproducible. Export, import, export again should produce identical files. This proves round-trip safety."

### Lead Developer (Response)

"Good test case. We'll add:

```typescript
it('export-import-export produces identical content', async () => {
  const original = await exportDocument(docId);
  await importDocument(docId, original);
  const afterRoundtrip = await exportDocument(docId);
  expect(afterRoundtrip).toBe(original);
});
```

Note: The import creates a new version, so version numbers change, but content is identical."

## Implementation Notes

### Export Flow

```typescript
// Server endpoint
export async function exportDocument(documentId: string): Promise<{
  filename: string;
  content: string;
}> {
  const doc = await getDocument(documentId);
  const video = await getVideo(doc.videoId);

  const filename = sanitizeFilename(`${video.title}-${doc.type}.md`);

  return { filename, content: doc.content };
}

// Client
const download = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
```

### Import Flow

```typescript
// Validation
const validateImport = (file: File) => {
  if (file.size > 1_000_000) {
    throw new Error('File too large. Maximum size is 1MB.');
  }
  if (
    !file.type.match(/text\/(plain|markdown)/) &&
    !file.name.endsWith('.md')
  ) {
    throw new Error('Invalid file type. Please upload a .md file.');
  }
};

// Read and import
const importDocument = async (documentId: string, file: File) => {
  validateImport(file);
  const content = await file.text();

  // Validate UTF-8 (text() throws if invalid encoding)

  // Import creates new version
  await updateDocument(documentId, content);
};
```

### UI Placement

- Export button: Document editor toolbar (download icon)
- Import button: Document editor toolbar (upload icon)
- Confirmation on import: "This will replace the current content and create a new version. Continue?"
