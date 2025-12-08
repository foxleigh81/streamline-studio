# QA Risk Assessment: Streamline Studio

**Assessment Date**: 2025-12-08
**Assessor**: QA Architect (Risk and Quality Assurance)
**Scope**: Security, Data Integrity, Accessibility, Testing, Deployment
**Status**: COMPLETE

---

## Executive Summary

This risk assessment stress-tests the Streamline Studio architecture documented in ADRs 001-012, the strategic assessment, and the lead developer technical review. The assessment identifies failure modes, edge cases, and gaps that could compromise security, data integrity, accessibility, or user experience.

**Overall Risk Level**: MEDIUM-HIGH (Manageable with documented mitigations)

The architecture is fundamentally sound, but several risks require explicit mitigation before and during implementation. The most critical areas are:

1. **Multi-tenancy data isolation** - Application-level scoping without database-level enforcement creates a single point of failure
2. **Optimistic locking failure modes** - Race conditions and edge cases in concurrent editing
3. **Self-hosting attack surface** - Setup wizard security and container configuration
4. **Testing coverage gaps** - Critical paths not explicitly covered in test strategy

---

## Section 1: Security Risk Matrix

### 1.1 Critical Security Risks (Severity: HIGH)

| Risk ID | Risk                                              | Likelihood | Impact   | Current Mitigation                             | Gap                                                     | Recommended Action                                                                |
| ------- | ------------------------------------------------- | ---------- | -------- | ---------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| SEC-001 | **Cross-tenant data leakage via application bug** | Medium     | Critical | WorkspaceRepository pattern, type-safe scoping | Single point of failure - no database-level enforcement | Add RLS policies as defense-in-depth in Phase 5+, comprehensive integration tests |
| SEC-002 | **Setup wizard hijack after database wipe**       | Medium     | Critical | Persistent completion flag (file-based)        | Not implemented yet                                     | Verify implementation checks both database AND file flag                          |
| SEC-003 | **Session fixation/hijacking**                    | Low        | High     | HTTP-only, Secure, SameSite=Lax cookies        | No session binding to user context                      | Consider optional IP/User-Agent binding with UX tradeoff documented               |
| SEC-004 | **CSRF bypass via malformed requests**            | Low        | High     | Double-submit cookie, Content-Type validation  | Implementation details not specified                    | Document exact implementation pattern with test cases                             |
| SEC-005 | **Rate limiting bypass via distributed attack**   | Medium     | Medium   | Per-IP rate limiting                           | No per-account limiting                                 | Add per-email rate limiting (3 attempts/hour) alongside per-IP                    |

### 1.2 High Security Risks (Severity: MEDIUM-HIGH)

| Risk ID | Risk                                               | Likelihood | Impact | Current Mitigation               | Gap                                          | Recommended Action                                                              |
| ------- | -------------------------------------------------- | ---------- | ------ | -------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| SEC-006 | **Rate limiting ineffective behind reverse proxy** | High       | Medium | TRUSTED_PROXY env var documented | No validation that proxy is actually present | Add health check warning when TRUSTED_PROXY=true but no X-Forwarded-For headers |
| SEC-007 | **Invitation token brute force**                   | Low        | Medium | 256-bit tokens, 24hr expiry      | No attempt limiting                          | Add 3-attempt limit per token, log failed attempts                              |
| SEC-008 | **Account enumeration via registration**           | Medium     | Low    | Not addressed                    | Email existence revealed                     | Consider "check your email" response for all cases                              |
| SEC-009 | **Password policy weakness**                       | Low        | Medium | Argon2id hashing                 | No password requirements specified           | Minimum 8 chars, check against top 10,000 common passwords                      |
| SEC-010 | **Session not invalidated on password change**     | Low        | Medium | Not specified                    | Attacker with stolen session persists        | Invalidate all sessions except current on password change                       |

### 1.3 Moderate Security Risks (Severity: MEDIUM)

| Risk ID | Risk                                          | Likelihood | Impact   | Current Mitigation                  | Gap                          | Recommended Action                                      |
| ------- | --------------------------------------------- | ---------- | -------- | ----------------------------------- | ---------------------------- | ------------------------------------------------------- |
| SEC-011 | **XSS via markdown preview**                  | Low        | Medium   | DOMPurify mentioned                 | Implementation not specified | Enforce DOMPurify with restrictive config, CSP headers  |
| SEC-012 | **Sensitive data in logs**                    | Low        | Medium   | "No secrets in logs" checklist item | No specific guidance         | Add log sanitization utility, document sensitive fields |
| SEC-013 | **Container escape via kernel vulnerability** | Very Low   | Critical | Alpine images, minimal deps         | No specific kernel hardening | Document minimum host kernel versions, update cadence   |
| SEC-014 | **Database credential exposure**              | Low        | High     | Environment variables               | No rotation guidance         | Document credential rotation procedure                  |

### 1.4 Docker/Self-Hosting Security Risks

| Risk ID | Risk                               | Likelihood | Impact   | Mitigation Required                                                              |
| ------- | ---------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------- |
| SEC-015 | **Container runs as root**         | High       | Medium   | Ensure Dockerfile uses non-root user, document USER instruction                  |
| SEC-016 | **Exposed Docker socket**          | Low        | Critical | Never mount Docker socket, document this anti-pattern                            |
| SEC-017 | **Default PostgreSQL credentials** | High       | High     | Generate random password in docker-compose, never use `postgres:postgres`        |
| SEC-018 | **Unencrypted database traffic**   | Medium     | Medium   | Document SSL configuration for production, provide secure docker-compose variant |
| SEC-019 | **Image supply chain attack**      | Low        | Critical | Use verified base images, implement image signing in CI/CD                       |

---

## Section 2: Data Integrity Risks

### 2.1 Versioning and Optimistic Locking Failure Modes

#### Failure Mode: Optimistic Lock Race Condition

**Scenario**: Two concurrent saves with the same expected version arrive simultaneously.

```
Time    Tab A                      Tab B                      Server State
----    -----                      -----                      ------------
T0      Loads document (v1)        Loads document (v1)        v1
T1      Types "Hello"              Types "World"              v1
T2      Saves (expects v1)         Saves (expects v1)         Processing...
T3      SELECT FOR UPDATE          BLOCKED (waiting)          v1 locked
T4      Version match, UPDATE      Still blocked              v2
T5      COMMIT, returns v2         UNBLOCKED, reads v2        v2
T6      Success (v2)               Version mismatch!          v2
T7      -                          Conflict modal shown       v2
```

**Assessment**: The `SELECT FOR UPDATE` pattern correctly serializes concurrent updates. This is properly handled.

**Risk**: LOW - Database-level locking prevents silent overwrites.

#### Failure Mode: Network Timeout During Save

**Scenario**: Save request times out, but server may or may not have processed it.

```
Time    Client                     Server                     Database
----    ------                     ------                     --------
T0      POST /save (v1)            Receives request           v1
T1      Waiting...                 Processing transaction     Locked
T2      Waiting...                 UPDATE complete            v2
T3      TIMEOUT (30s)              Sending response...        v2
T4      "Save failed" shown        Response lost              v2
T5      User retries (v1)          Version mismatch!          v2
T6      Conflict modal             -                          v2
```

**Assessment**: Client believes save failed, but it succeeded. On retry, conflict modal shows, preventing data loss.

**Risk**: LOW - User experience is degraded but data is safe.

**Recommendation**: Consider idempotency key pattern for saves to handle this more gracefully.

#### Failure Mode: Rapid Save Queue Overflow

**Scenario**: User types very fast, save requests queue up faster than they complete.

**Current Handling**: 2-second debounce prevents most cases.

**Edge Case**: Slow network (3-5s latency) with fast typing.

```
Time    User Action                Save Queue                 Server
----    -----------                ----------                 ------
T0      Types rapidly              -                          v1
T2      (debounce)                 [Save v1 -> v2]            Processing
T4      Types more                 [Save v1 -> v2, Save v2 -> v3 pending]
T5      Types more                 [Save v1 -> v2, Save v2 -> v3 pending]
T7      Server responds            Save v2 -> v3 now sending  v2
T10     -                          Version conflict!          v2
```

**Assessment**: Lead developer specified "queue saves, process sequentially, use version for ordering." This should work IF implemented correctly.

**Risk**: MEDIUM - Requires careful implementation.

**Recommendation**: Add explicit test case for slow network scenario. Consider "latest wins" in queue (discard pending if new content arrives).

#### Failure Mode: Browser Crash During Edit

**Scenario**: Browser crashes with unsaved content.

**Current Handling**: Local storage backup (Phase 2 task 2.3.6).

**Risk**: LOW if implemented - Content recoverable on reload.

**Recommendation**: Test specifically:

- IndexedDB vs localStorage (IndexedDB more reliable for large content)
- Quota exceeded scenarios (mobile browsers have small quotas)
- Private browsing mode (localStorage may not persist)

### 2.2 Multi-Tenancy Data Isolation Risks

#### Risk: Direct Database Query Bypasses Repository

**Scenario**: Developer writes `db.select().from(videos)` without workspace filter.

**Current Mitigation**: Code review, repository pattern.

**Gap**: No automated enforcement.

**Recommended Actions**:

1. Add ESLint rule to flag direct `db.select()` calls outside repository files
2. Integration test that attempts raw queries and verifies failure
3. Consider RLS policies as defense-in-depth for Phase 5+

#### Risk: User Removed from Workspace Mid-Session

**Scenario**: Admin removes user while user has document open.

```
Time    User                       Admin                      Server
----    ----                       -----                      ------
T0      Opens document             -                          Access granted
T1      Editing...                 Removes user from ws       User no longer member
T2      Types content              -                          -
T5      Auto-save triggers         -                          Access check...
T6      ?                          -                          FORBIDDEN
```

**Assessment**: Not explicitly addressed in ADRs.

**Recommended Implementation**:

- On save, verify user still has workspace access
- Return 403 FORBIDDEN with clear message
- Frontend redirects to workspace selector with message: "You no longer have access to this workspace"

#### Risk: Workspace Switch Mid-Edit

**Scenario**: User has two workspaces, switches while editing.

**Current Handling**: Workspace derived from URL (/w/[slug]/...).

**Risk**: LOW - URL change triggers navigation, should prompt about unsaved changes.

**Recommendation**: Verify `beforeunload` handler warns about unsaved changes.

### 2.3 Document Revision Table Growth

**Current Handling**: "MVP: no automatic pruning."

**Risk Assessment**:

- Average document: 20KB
- Saves per day (active document): 100
- Days active: 30
- Revisions per document: 3000
- Storage per document: 60MB

For a workspace with 500 videos (3 docs each = 1500 documents), potential storage: 90GB of revision history.

**Recommendation**:

1. Add `max_revisions` configuration (default: 100)
2. Implement soft pruning: keep first, last N, and any with explicit "snapshot" flag
3. Monitor revision table size in production metrics
4. Document that self-hosters may need larger disks

---

## Section 3: Accessibility Audit Recommendations

### 3.1 WCAG 2.2 Compliance Gaps

The ADRs target WCAG 2.1 AA. WCAG 2.2 (published October 2023, ISO standard 2025) adds requirements that should be considered:

| WCAG 2.2 Criterion                      | Level | Application Impact                    | Recommendation                                                           |
| --------------------------------------- | ----- | ------------------------------------- | ------------------------------------------------------------------------ |
| **2.4.11 Focus Not Obscured (Minimum)** | AA    | Modals, dropdowns could obscure focus | Ensure conflict modal, category picker don't cover focused element       |
| **2.4.13 Focus Appearance**             | AA    | Custom focus indicators               | Define focus indicator: minimum 2px solid, 3:1 contrast ratio            |
| **2.5.8 Target Size (Minimum)**         | AA    | Touch targets                         | All interactive elements minimum 24x24px (44x44px recommended for touch) |
| **3.2.6 Consistent Help**               | A     | Help/support access                   | Ensure help documentation accessible from every page                     |
| **3.3.7 Redundant Entry**               | A     | Multi-step forms                      | Don't require re-entering data in video creation flow                    |
| **3.3.8 Accessible Authentication**     | AA    | Login form                            | Support password managers, don't disable paste                           |

### 3.2 CodeMirror 6 Accessibility Concerns

**Known Issues**:

1. Virtual scrolling can confuse screen readers
2. Custom keyboard shortcuts may conflict with assistive technology
3. Line numbers may not be announced correctly

**Required Testing**:

- [ ] VoiceOver (macOS) full editing session
- [ ] NVDA (Windows) full editing session
- [ ] TalkBack (Android) basic navigation
- [ ] VoiceOver iOS basic navigation

**Required Implementation**:

- Enable `accessibilityAnnouncements` extension
- Ensure keyboard shortcut reference accessible (? key)
- Add `aria-live="polite"` region for save status
- Test that preview panel has appropriate `role` and `aria-label`

### 3.3 Missing Accessibility Requirements

| Requirement                | WCAG Criterion | Current Status             | Action                                                                |
| -------------------------- | -------------- | -------------------------- | --------------------------------------------------------------------- |
| Autocomplete on login form | 1.3.5          | Not specified              | Add `autocomplete="email"`, `autocomplete="current-password"`         |
| Error identification       | 3.3.1          | Not specified              | Errors must identify specific field, not just "validation failed"     |
| Status messages            | 4.1.3          | Mentioned but not detailed | Auto-save, form submission must use `aria-live` regions               |
| Reduced motion             | 2.3.3          | Not specified              | Respect `prefers-reduced-motion` for all animations                   |
| Text spacing               | 1.4.12         | Not specified              | UI must remain functional with 200% letter spacing                    |
| Reflow                     | 1.4.10         | Not specified              | UI must work at 320px width without horizontal scroll (except editor) |

### 3.4 Accessibility Testing Checklist by Phase

**Phase 1**:

- [ ] Login/registration forms have correct autocomplete attributes
- [ ] Error messages identify specific fields
- [ ] Focus visible on all interactive elements
- [ ] `lang` attribute on `<html>` element

**Phase 2**:

- [ ] Skip links present on all pages
- [ ] Keyboard navigation works for entire video CRUD flow
- [ ] CodeMirror tested with VoiceOver and NVDA
- [ ] Save status announced to screen readers
- [ ] Modal focus management (trap focus, return focus on close)
- [ ] Color contrast minimum 4.5:1 for all text
- [ ] Touch targets minimum 24x24px (44x44px for primary actions)

**Phase 3**:

- [ ] Conflict resolution modal accessible via keyboard
- [ ] Revision history navigable by screen reader
- [ ] Restore confirmation announced appropriately

**Phase 4**:

- [ ] Setup wizard fully keyboard accessible
- [ ] Error messages during setup are clear and actionable
- [ ] Documentation accessible (proper heading structure, alt text)

**Phase 5**:

- [ ] Workspace switcher keyboard accessible
- [ ] Invitation flow accessible
- [ ] Role changes announced appropriately

---

## Section 4: Testing Coverage Gaps

### 4.1 Critical Test Scenarios Not in ADR-005

| Scenario                                 | Risk Level | Test Type   | Gap                                                      |
| ---------------------------------------- | ---------- | ----------- | -------------------------------------------------------- |
| **Cross-tenant API access attempt**      | Critical   | Integration | Mentioned in QA review, but not in ADR-005 test examples |
| **Optimistic lock with network latency** | High       | Integration | No test for slow network scenario                        |
| **Session expiry during active edit**    | High       | E2E         | Not specified                                            |
| **Database unavailable during save**     | High       | Integration | Only health check tested, not save flow                  |
| **Local storage recovery flow**          | High       | E2E         | Not specified                                            |
| **Migration on database with data**      | Critical   | Integration | Only fresh database mentioned                            |
| **Upgrade migration path (v1 to v2)**    | Critical   | Integration | Not specified                                            |
| **Docker container restart persistence** | High       | E2E         | Mentioned but not in test matrix                         |
| **Rate limiting with distributed IPs**   | Medium     | Integration | Only single-IP tested                                    |
| **Concurrent workspace access**          | High       | Integration | User switching workspaces while saving                   |

### 4.2 Test Infrastructure Gaps

| Gap                                  | Impact                            | Recommendation                                                         |
| ------------------------------------ | --------------------------------- | ---------------------------------------------------------------------- |
| **No network simulation in E2E**     | Can't test offline/slow scenarios | Add Playwright network throttling tests                                |
| **No multi-browser mobile testing**  | Mobile issues missed              | Add real device testing (BrowserStack/Sauce Labs) or local device farm |
| **No visual regression baseline**    | UI changes undetected             | Implement Chromatic or Percy before Phase 2                            |
| **No database upgrade path testing** | Migration bugs in production      | Add upgrade test: seed v1 data, run v2 migrations, verify              |
| **No chaos engineering**             | Unknown failure modes             | Consider adding chaos tests for database disconnect scenarios          |

### 4.3 Security Testing Gaps

| Gap                                           | Recommendation                                 |
| --------------------------------------------- | ---------------------------------------------- |
| No penetration testing planned                | Schedule security audit before Phase 4 release |
| No dependency vulnerability scanning          | Add `npm audit` and Snyk/Dependabot to CI      |
| No SAST (Static Application Security Testing) | Add Semgrep or CodeQL to CI pipeline           |
| No secrets detection                          | Add gitleaks or truffleHog to pre-commit hooks |

### 4.4 Recommended Test Additions

#### Integration Test: Cross-Tenant Isolation (CRITICAL)

```typescript
// This test MUST exist and run on every CI build
describe('Cross-Tenant Isolation', () => {
  it('prevents access to another workspace video via API', async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    const videoInA = await createVideo({ workspaceId: workspaceA.id });

    const callerInB = createCaller({ workspace: workspaceB });

    // Must return NOT_FOUND, not the video
    await expect(callerInB.video.get({ id: videoInA.id })).rejects.toThrow(
      'NOT_FOUND'
    );
  });

  it('prevents listing videos from another workspace', async () => {
    const workspaceA = await createWorkspace();
    const workspaceB = await createWorkspace();
    await createVideo({ workspaceId: workspaceA.id, title: 'Secret Video' });

    const callerInB = createCaller({ workspace: workspaceB });
    const videos = await callerInB.video.list({});

    expect(videos.find((v) => v.title === 'Secret Video')).toBeUndefined();
  });

  it('prevents direct database query without workspace filter', async () => {
    // This should be blocked by linting, but verify at runtime
    const workspaceA = await createWorkspace();
    const videoInA = await createVideo({ workspaceId: workspaceA.id });

    // If someone bypasses repository:
    const directQuery = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoInA.id));

    // This SHOULD return data - the test documents that direct queries are dangerous
    // The mitigation is ESLint rules and code review, not runtime blocking
    expect(directQuery).toHaveLength(1);

    // Log warning for monitoring
    console.warn('Direct database query bypassed workspace scoping');
  });
});
```

#### E2E Test: Document Conflict Flow (CRITICAL)

```typescript
// This test MUST pass before Phase 3 is complete
test('two-tab conflict shows resolution modal', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();
  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Both tabs open same document
  await page1.goto('/w/test/videos/1/edit');
  await page2.goto('/w/test/videos/1/edit');

  // Tab 1 edits and saves
  await page1.fill('.cm-content', 'Content from Tab 1');
  await page1.waitForSelector('text=Saved');

  // Tab 2 edits (still has old version) and saves
  await page2.fill('.cm-content', 'Content from Tab 2');

  // Should show conflict modal
  await expect(page2.locator('.conflict-modal')).toBeVisible({ timeout: 5000 });
  await expect(page2.locator('text=modified since you opened')).toBeVisible();
});
```

---

## Section 5: Deployment Risks

### 5.1 Docker Image Risks

| Risk                             | Likelihood | Impact | Mitigation                                    |
| -------------------------------- | ---------- | ------ | --------------------------------------------- |
| **Alpine + native deps failure** | Medium     | High   | Test @node-rs/argon2 on arm64 specifically    |
| **Image size bloat**             | Medium     | Medium | Enforce size budget: < 200MB compressed       |
| **Non-root user breaks**         | Low        | Medium | Test all file operations as non-root          |
| **Multi-arch build fails in CI** | Medium     | Medium | Use buildx with QEMU, test both architectures |
| **Layer caching invalidation**   | Low        | Low    | Order Dockerfile for optimal caching          |

### 5.2 Docker Compose Risks

| Risk                                       | Likelihood | Impact | Mitigation                                              |
| ------------------------------------------ | ---------- | ------ | ------------------------------------------------------- |
| **PostgreSQL not ready on first start**    | High       | High   | Use healthcheck + depends_on with condition             |
| **Named volume permission issues**         | Medium     | High   | Document volume ownership, use init container if needed |
| **Memory exhaustion**                      | Medium     | Medium | Document minimum requirements (2GB RAM)                 |
| **Port conflicts**                         | Medium     | Low    | Document port configuration, provide alternate ports    |
| **docker-compose version incompatibility** | Low        | Medium | Specify minimum docker-compose version                  |

### 5.3 Migration Risks

| Risk                                 | Scenario                            | Impact                         | Mitigation                                                       |
| ------------------------------------ | ----------------------------------- | ------------------------------ | ---------------------------------------------------------------- |
| **Migration fails mid-way**          | Power loss during migration         | Database in inconsistent state | Migrations must be idempotent; document recovery procedure       |
| **Migration incompatible with data** | Column type change on existing data | Data loss or corruption        | Test all migrations against production-like data                 |
| **Rollback needed but impossible**   | Breaking migration applied          | Can't downgrade                | Document that some migrations are one-way; backup before upgrade |
| **Migration timeout**                | Large table ALTER                   | Application fails to start     | Set appropriate statement timeout; document expected duration    |

### 5.4 Self-Hosting Documentation Risks

| Gap                              | Impact                               | Recommendation                                     |
| -------------------------------- | ------------------------------------ | -------------------------------------------------- |
| No minimum hardware requirements | Users deploy on underpowered systems | Document: 2GB RAM, 10GB disk, 2 vCPU minimum       |
| No SSL/HTTPS guidance            | Data transmitted in clear            | Provide Caddy example (automatic HTTPS)            |
| No monitoring guidance           | Issues undetected                    | Document health check integration, log aggregation |
| No disaster recovery procedure   | Data loss after failure              | Step-by-step backup/restore with verification      |
| No performance tuning            | Poor experience at scale             | Document PostgreSQL tuning for 500+ videos         |

### 5.5 Production Deployment Checklist

**Before First Production Deployment**:

- [ ] Change PostgreSQL password from default
- [ ] Set SESSION_SECRET to cryptographically random 32+ chars
- [ ] Configure HTTPS (via reverse proxy)
- [ ] Set TRUSTED_PROXY=true if behind proxy
- [ ] Configure backup schedule (daily pg_dump minimum)
- [ ] Set up monitoring (health check endpoint)
- [ ] Test restore procedure
- [ ] Document upgrade procedure

---

## Section 6: Edge Cases Not Covered in ADRs

### 6.1 User Experience Edge Cases

| Edge Case                          | Current Handling | Risk   | Recommendation                                          |
| ---------------------------------- | ---------------- | ------ | ------------------------------------------------------- |
| User hits back button while saving | Not specified    | Medium | Warn about unsaved changes, complete save in background |
| Tab closed during save             | Not specified    | High   | Queue save in service worker for persistence            |
| Very long video title (1000 chars) | Not specified    | Low    | Add max length validation (200 chars reasonable)        |
| Unicode edge cases in titles       | Not specified    | Low    | Test emoji, RTL text, combining characters              |
| Empty document save                | Not specified    | Low    | Allow empty saves (user may want to clear)              |
| Rapid status changes               | Not specified    | Low    | Debounce status updates to prevent audit log spam       |

### 6.2 Infrastructure Edge Cases

| Edge Case                           | Current Handling | Risk   | Recommendation                                         |
| ----------------------------------- | ---------------- | ------ | ------------------------------------------------------ |
| Database connection pool exhausted  | Not specified    | High   | Add pool timeout with user-friendly error              |
| Disk full during save               | Not specified    | High   | Check disk space in health endpoint, graceful error    |
| Clock skew between app and database | Not specified    | Low    | Use database timestamps, not application timestamps    |
| IPv6-only deployment                | Not specified    | Low    | Ensure PostgreSQL and app support IPv6                 |
| Docker DNS resolution failure       | Not specified    | Medium | Use container names, not IPs; document troubleshooting |

### 6.3 Authentication Edge Cases

| Edge Case                              | Current Handling | Risk   | Recommendation                                                |
| -------------------------------------- | ---------------- | ------ | ------------------------------------------------------------- |
| Multiple login tabs simultaneously     | Not specified    | Low    | Latest session wins, others become invalid                    |
| Password reset during active session   | Not specified    | Medium | Invalidate session on password change                         |
| Account deletion during active session | Not specified    | Medium | Soft-delete with 30-day grace period                          |
| Email address change                   | Not specified    | Medium | Require password confirmation, send notification to old email |
| Case sensitivity in email              | Not specified    | Low    | Normalize to lowercase, but preserve display                  |

---

## Section 7: Recommended Mitigations Summary

### 7.1 Immediate (Before Phase 1 Development)

| ID      | Action                                                   | Owner    | Priority |
| ------- | -------------------------------------------------------- | -------- | -------- |
| MIT-001 | Add cross-tenant isolation integration tests to Phase 1  | QA       | Critical |
| MIT-002 | Define exact CSRF implementation pattern                 | Lead Dev | Critical |
| MIT-003 | Add per-email rate limiting alongside per-IP             | Lead Dev | High     |
| MIT-004 | Define password policy (8+ chars, common password check) | Lead Dev | High     |
| MIT-005 | Add `npm audit` to CI pipeline                           | DevOps   | High     |

### 7.2 Phase 1 Mitigations

| ID      | Action                                                  | Owner    | Priority |
| ------- | ------------------------------------------------------- | -------- | -------- |
| MIT-006 | Verify TRUSTED_PROXY implementation includes validation | Lead Dev | High     |
| MIT-007 | Add session invalidation on password change             | Lead Dev | Medium   |
| MIT-008 | Document credential rotation procedure                  | Docs     | Medium   |
| MIT-009 | Test Argon2 on arm64 architecture                       | Lead Dev | High     |

### 7.3 Phase 2 Mitigations

| ID      | Action                                         | Owner    | Priority |
| ------- | ---------------------------------------------- | -------- | -------- |
| MIT-010 | Manual screen reader testing (VoiceOver, NVDA) | QA       | High     |
| MIT-011 | Add slow network E2E test scenarios            | QA       | High     |
| MIT-012 | Verify local storage quota handling            | Lead Dev | Medium   |
| MIT-013 | Add aria-live regions for save status          | Lead Dev | High     |
| MIT-014 | Test IndexedDB vs localStorage for backup      | Lead Dev | Medium   |

### 7.4 Phase 3 Mitigations

| ID      | Action                                  | Owner    | Priority |
| ------- | --------------------------------------- | -------- | -------- |
| MIT-015 | Add idempotency key pattern for saves   | Lead Dev | Medium   |
| MIT-016 | Document revision pruning configuration | Lead Dev | Low      |
| MIT-017 | Test concurrent save queue under load   | QA       | High     |

### 7.5 Phase 4 Mitigations

| ID      | Action                                                | Owner    | Priority |
| ------- | ----------------------------------------------------- | -------- | -------- |
| MIT-018 | Ensure Dockerfile uses non-root user                  | Lead Dev | High     |
| MIT-019 | Generate random PostgreSQL password in docker-compose | Lead Dev | Critical |
| MIT-020 | Document SSL/HTTPS configuration                      | Docs     | High     |
| MIT-021 | Test migration on database with existing data         | QA       | Critical |
| MIT-022 | Document minimum hardware requirements                | Docs     | Medium   |
| MIT-023 | Security audit/penetration test before release        | External | High     |

### 7.6 Phase 5 Mitigations

| ID      | Action                                       | Owner    | Priority |
| ------- | -------------------------------------------- | -------- | -------- |
| MIT-024 | Consider RLS policies as defense-in-depth    | Lead Dev | Medium   |
| MIT-025 | Invitation token attempt limiting            | Lead Dev | High     |
| MIT-026 | Test workspace removal during active session | QA       | High     |

---

## Section 8: Phase-Specific QA Checkpoints

### Phase 1 QA Checkpoint

**Security Gate** (All must pass):

- [ ] Password hashing uses Argon2id (verified in database)
- [ ] Session tokens are 256-bit minimum
- [ ] Cookies are HTTP-only, Secure, SameSite=Lax
- [ ] Rate limiting blocks 6th attempt within 60 seconds
- [ ] CSRF protection blocks cross-origin POST
- [ ] No secrets appear in application logs
- [ ] Environment validation fails on missing required vars

**Data Integrity Gate**:

- [ ] Workspace scoping prevents cross-tenant access (integration test)
- [ ] All tables have workspace_id where required
- [ ] Indexes exist on workspace_id columns

**Testing Gate**:

- [ ] Unit test coverage > 80% for auth module
- [ ] Integration tests for all tRPC procedures
- [ ] CI pipeline runs all tests on every push

### Phase 2 QA Checkpoint

**Security Gate**:

- [ ] DOMPurify sanitizes all markdown preview output
- [ ] Document size limit enforced (500KB)
- [ ] File upload validates content type

**Accessibility Gate**:

- [ ] axe-core reports zero critical/serious violations (documented exclusions only)
- [ ] Keyboard navigation works for all features
- [ ] Screen reader testing completed (VoiceOver + NVDA)
- [ ] Color contrast verified (4.5:1 minimum)
- [ ] Focus indicators visible and compliant

**Data Integrity Gate**:

- [ ] Auto-save indicator accurate within 500ms
- [ ] Local storage backup created on every edit
- [ ] Local storage recovery works after crash
- [ ] Basic version check warns on conflict

**Performance Gate**:

- [ ] Initial page load < 3s on 3G simulation
- [ ] Document save < 500ms P95
- [ ] Video list pagination works with 500+ videos

### Phase 3 QA Checkpoint

**Data Integrity Gate**:

- [ ] Two-tab conflict E2E test passes
- [ ] Concurrent saves never produce duplicate versions
- [ ] Revision history correctly ordered
- [ ] Restore creates new version (doesn't rewrite history)
- [ ] Audit log captures all metadata changes

**UX Gate**:

- [ ] Conflict modal appears within 1s of stale save
- [ ] User can reload or force save from modal
- [ ] Revision viewer is read-only (can't accidentally modify)

### Phase 4 QA Checkpoint

**Security Gate**:

- [ ] Setup wizard inaccessible after first user
- [ ] Setup flag persists across database wipe
- [ ] No default credentials in any configuration
- [ ] Health endpoint doesn't leak sensitive info
- [ ] Docker image runs as non-root

**Deployment Gate**:

- [ ] Clean `docker-compose up` works from scratch
- [ ] Data persists across container restart
- [ ] Migration runs successfully on fresh database
- [ ] Upgrade migration (simulated) works with data
- [ ] Backup/restore procedure verified

**Documentation Gate**:

- [ ] Fresh user completes setup in < 15 minutes
- [ ] All environment variables documented
- [ ] Troubleshooting guide covers common issues
- [ ] Reverse proxy examples work (nginx, Caddy)

### Phase 5 QA Checkpoint

**Security Gate**:

- [ ] Cross-tenant access prevented (penetration test)
- [ ] Invitation tokens are sufficiently random
- [ ] Role enforcement blocks all unauthorized mutations
- [ ] Email header injection prevented

**Multi-Tenancy Gate**:

- [ ] User can't access removed workspace
- [ ] Workspace switch during save handled gracefully
- [ ] Role change takes effect without re-login
- [ ] Multiple workspaces correctly isolated

---

## Section 9: Risk Monitoring Recommendations

### Production Metrics to Monitor

| Metric                                     | Alert Threshold  | Risk Indicated             |
| ------------------------------------------ | ---------------- | -------------------------- |
| Failed login attempts per minute           | > 100            | Brute force attack         |
| Cross-tenant query attempts                | > 0              | Security probe or bug      |
| Save conflict rate                         | > 10%            | UX issue or race condition |
| Local storage recovery triggers            | > 1% of sessions | Save reliability issue     |
| 500 errors on save                         | > 0.1%           | Data integrity risk        |
| Database connection pool exhaustion        | > 0              | Scalability issue          |
| Revision table growth rate                 | > 1GB/day        | Storage planning needed    |
| Setup wizard access attempts (after setup) | > 0              | Security probe             |

### Incident Response Triggers

| Event                                    | Response                                      |
| ---------------------------------------- | --------------------------------------------- |
| Any cross-tenant data access             | Immediate investigation, potential disclosure |
| Setup wizard accessed post-setup         | Investigate, verify no new admin created      |
| Mass login failures from single IP       | Temporary IP block, investigate               |
| Save conflicts > 50% for single document | Investigate for bug or abuse                  |
| Database connection failures             | Check pool config, scale if needed            |

---

## Conclusion

The Streamline Studio architecture is fundamentally sound and demonstrates careful consideration of security, scalability, and user experience. The primary risks center on:

1. **Application-level multi-tenancy** - Single point of failure for data isolation
2. **Self-hosting attack surface** - Setup wizard and default configurations
3. **Testing coverage** - Critical scenarios not explicitly covered

These risks are manageable with the documented mitigations. The project should proceed to implementation with the following conditions:

1. **Phase 1 must include** cross-tenant isolation integration tests before any workspace-scoped code is written
2. **Phase 2 must include** manual accessibility testing with screen readers
3. **Phase 4 must include** a security audit before the first public release
4. **Phase 5 should consider** PostgreSQL RLS as defense-in-depth for multi-tenant mode

The collaborative review process (Strategic Planner, Lead Developer, QA Architect) has produced a thorough design. This risk assessment adds the final layer of stress-testing to ensure the implementation proceeds with full awareness of potential failure modes.

---

## Sources

- [WCAG 2.2 What's New - W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Docker Security Best Practices - OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Docker Security in 2025 - Cloud Native Now](https://cloudnativenow.com/topics/cloudnativedevelopment/docker/docker-security-in-2025-best-practices-to-protect-your-containers-from-cyberthreats/)
- [Multi-tenant Data Isolation with PostgreSQL RLS - AWS](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Mastering PostgreSQL Row-Level Security for Multi-Tenancy](https://ricofritzsche.me/mastering-postgresql-row-level-security-rls-for-rock-solid-multi-tenancy/)
- [Docker Security Best Practices - Spacelift](https://spacelift.io/blog/docker-security)
- [The Complete Guide to WCAG 2.2 Compliance - Accessibility.build](https://accessibility.build/blog/complete-guide-wcag-2-2-compliance-developers-2024)

---

_Risk Assessment completed by QA Architect_
_ADRs analyzed: 12_
_Previous reviews integrated: Strategic Assessment, Lead Developer Technical Review_
_Security risks identified: 19_
_Data integrity failure modes analyzed: 8_
_Accessibility gaps identified: 12_
_Testing gaps identified: 10_
_Mitigations recommended: 26_
