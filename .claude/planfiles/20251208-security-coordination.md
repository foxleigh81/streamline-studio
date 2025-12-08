# Security Coordination: Streamline Studio

**Date**: 2025-12-08
**Author**: Strategic Project Planner (Security Coordination)
**Status**: PENDING SECURITY ARCHITECT REVIEW
**Purpose**: Consolidate security recommendations from QA Risk Assessment and determine ADR strategy

---

## Executive Summary

The QA Architect identified 26 mitigations in their risk assessment, with 8 critical security items requiring formal documentation. This document analyzes whether the existing ADRs adequately cover security concerns or whether a new Security ADR is needed.

**Recommendation**: Create **ADR-014: Comprehensive Security Architecture** to consolidate security decisions currently scattered across multiple ADRs (007, 008, 011) and fill documentation gaps.

---

## Section 1: Analysis of Critical Security Items

### 1.1 Cross-Tenant Data Isolation (SEC-001)

**Current Coverage**:

- ADR-008 defines WorkspaceRepository pattern with type-safe scoping
- QA Risk Assessment flags this as "single point of failure"
- Plan includes integration tests in Phase 1

**Gaps Identified**:

1. No formal threat model for multi-tenancy
2. RLS evaluation deferred to Phase 5+ without clear decision criteria
3. No documented penetration testing requirements
4. ESLint rule to prevent direct `db.select()` not specified

**Required Documentation**:

- Threat model for cross-tenant access vectors
- Decision criteria for RLS adoption
- ESLint configuration for repository enforcement
- Penetration test scope and acceptance criteria

**ADR Status**: PARTIAL - Needs consolidation in Security ADR

---

### 1.2 CSRF Implementation Pattern (SEC-004)

**Current Coverage**:

- ADR-007 mentions "double-submit cookie pattern"
- ADR-007 mentions "Verify Content-Type: application/json"
- No implementation code or test cases

**Gaps Identified**:

1. No explicit implementation pattern documented
2. No specification of cookie name, path, domain, expiry
3. No test case examples for CSRF bypass attempts
4. No guidance on framework integration (tRPC middleware vs Next.js middleware)

**Required Documentation**:

```typescript
// CSRF Implementation Pattern (to be documented)
interface CSRFConfig {
  cookieName: string; // e.g., 'csrf_token'
  headerName: string; // e.g., 'X-CSRF-Token'
  cookieOptions: {
    httpOnly: boolean; // true
    secure: boolean; // NODE_ENV === 'production'
    sameSite: 'strict' | 'lax'; // 'strict' for mutations
    path: string; // '/'
  };
  tokenLength: number; // 32 bytes minimum
  verifyContentType: boolean; // true
}
```

**ADR Status**: INSUFFICIENT - Needs complete implementation spec

---

### 1.3 Rate Limiting (SEC-005)

**Current Coverage**:

- ADR-007 v2.0 includes rate limiting table with specific limits
- ADR-007 includes implementation code examples
- ADR-007 includes TRUSTED_PROXY validation warning

**Gaps Identified**:

1. No specification of storage mechanism (memory vs Redis)
2. No distributed rate limiting strategy for multi-instance deployments
3. No rate limit response headers documented
4. No guidance on rate limit bypass for admin/testing

**Required Documentation**:

```typescript
// Rate Limiting Storage Strategy (to be documented)
interface RateLimitConfig {
  // Single instance (Phase 4)
  storage: 'memory';

  // Multi-instance (Phase 5+)
  // storage: 'redis' when REDIS_URL is set

  // Response headers
  headers: {
    'X-RateLimit-Limit': number;
    'X-RateLimit-Remaining': number;
    'X-RateLimit-Reset': number; // Unix timestamp
  };
}
```

**ADR Status**: ADEQUATE - Minor additions needed in Security ADR

---

### 1.4 Setup Wizard Security (SEC-002)

**Current Coverage**:

- ADR-011 mentions file-based setup flag (`/data/.setup-complete`)
- QA Risk Assessment flags potential hijack scenario

**Gaps Identified**:

1. No specification of flag file format or contents
2. No verification that flag prevents ALL admin creation, not just wizard access
3. No documented recovery procedure if flag is lost
4. No monitoring for unauthorized wizard access attempts

**Required Documentation**:

```typescript
// Setup Wizard Security Pattern (to be documented)
interface SetupWizardConfig {
  flagPath: '/data/.setup-complete';
  flagContents: {
    completedAt: ISO8601;
    initialUserId: string;
    initialWorkspaceId: string;
  };

  securityBehavior: {
    flagMissing_DBEmpty: 'show_wizard';
    flagMissing_DBHasUsers: 'redirect_to_error_page';
    flagPresent_DBEmpty: 'redirect_to_error_page';
    flagPresent_DBHasUsers: 'redirect_to_login';
  };

  // Error page shows: "Database inconsistency detected. Please restore from backup."
}
```

**ADR Status**: INSUFFICIENT - Needs complete security behavior specification

---

### 1.5 Docker Security (SEC-015, SEC-017)

**Current Coverage**:

- ADR-011 mentions multi-stage Dockerfile
- ADR-011 docker-compose uses default postgres:postgres credentials (INSECURE)
- No mention of non-root user in Dockerfile

**Gaps Identified**:

1. **CRITICAL**: docker-compose.yml uses hardcoded default credentials
2. No USER instruction in Dockerfile
3. No guidance on secrets management
4. No image signing or verification process

**Required Documentation**:

```dockerfile
# Non-root user pattern (to be documented)
FROM node:20-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

USER nextjs

EXPOSE 3000
```

```yaml
# Secure docker-compose pattern (to be documented)
services:
  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=streamline
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}
      - POSTGRES_DB=streamline
```

**ADR Status**: NEEDS UPDATE - ADR-011 must be amended

---

### 1.6 Session Management (SEC-010)

**Current Coverage**:

- ADR-007 recently updated with session invalidation on password change
- ADR-007 includes code example

**Gaps Identified**:

1. No specification of session lifetime and renewal policy
2. No concurrent session limit policy
3. No session binding options (IP, User-Agent)

**Required Documentation**:

```typescript
// Session Management Policy (to be documented)
interface SessionPolicy {
  lifetime: {
    maxAge: '30d'; // Maximum session age
    renewalThreshold: '7d'; // Renew if older than this
    idleTimeout: '24h'; // Expire if no activity (optional)
  };

  security: {
    invalidateOnPasswordChange: true;
    invalidateOnEmailChange: true;
    concurrentSessionLimit: null; // null = unlimited

    // Optional hardening (document tradeoffs)
    bindToIp: false; // Breaks mobile users
    bindToUserAgent: false; // Breaks browser updates
  };
}
```

**ADR Status**: PARTIAL - Needs policy documentation

---

### 1.7 TRUSTED_PROXY Validation (SEC-006)

**Current Coverage**:

- ADR-007 includes validation warning code

**Gaps Identified**:

1. Warning only - no action taken
2. No guidance on what operator should do
3. No health check integration

**Required Documentation**:

```typescript
// TRUSTED_PROXY validation behavior (to be documented)
interface TrustedProxyConfig {
  // Startup behavior
  onStartup: {
    action: 'warn';
    // If TRUSTED_PROXY=true but no proxy headers after N requests:
    // - Log warning every 100 requests
    // - Include in /api/health response (status: 'degraded')
  };

  // Documentation for operators
  guidance: `
    If TRUSTED_PROXY=true but you see warnings about missing X-Forwarded-For:
    1. Verify your reverse proxy is configured to send X-Forwarded-For
    2. Check your proxy passes the header to the app container
    3. If not using a proxy, set TRUSTED_PROXY=false

    Risk: Rate limiting will not work correctly without proper proxy headers.
  `;
}
```

**ADR Status**: ADEQUATE - Minor health check integration needed

---

### 1.8 Password Policy (SEC-009)

**Current Coverage**:

- QA Risk Assessment mentions "8+ chars, common password check"
- Not documented in any ADR

**Gaps Identified**:

1. **MISSING**: No password policy documented anywhere
2. No specification of common password list source
3. No guidance on password complexity messaging to users

**Required Documentation**:

```typescript
// Password Policy (to be documented)
interface PasswordPolicy {
  minLength: 8;
  maxLength: 128;

  // Common password check
  blocklist: {
    source: 'top-10000-common-passwords.txt';
    // Or use have-i-been-pwned API in Phase 5+
  };

  // Complexity: NOT enforced (research shows length > complexity)
  requireUppercase: false;
  requireNumber: false;
  requireSpecial: false;

  // User messaging
  feedback: {
    tooShort: 'Password must be at least 8 characters';
    tooCommon: 'This password is too common. Please choose a different password.';
    breached: 'This password has appeared in data breaches. Please choose a different password.'; // Phase 5+
  };
}
```

**ADR Status**: MISSING - Must be documented

---

## Section 2: ADR Strategy Recommendation

### Option A: Update Existing ADRs

**Approach**: Add security details to ADR-007, ADR-008, and ADR-011.

**Pros**:

- Security context stays with related technical decisions
- No new document to maintain

**Cons**:

- Security requirements scattered across 3 ADRs
- Difficult to audit security coverage
- No single reference for security reviews
- ADR-007 already has 280+ lines, would become unwieldy

**Assessment**: NOT RECOMMENDED

---

### Option B: Create ADR-014: Comprehensive Security Architecture

**Approach**: Create a new ADR that consolidates all security decisions and references other ADRs.

**Pros**:

- Single source of truth for security requirements
- Easy to audit and review
- Clear reference for penetration testing scope
- Can be updated independently as security landscape changes
- Enables security certification preparation (SOC 2, etc.)

**Cons**:

- Potential duplication with other ADRs
- Another document to maintain

**Assessment**: RECOMMENDED

---

### Recommended ADR-014 Structure

```markdown
# ADR-014: Comprehensive Security Architecture

## 1. Threat Model

- Cross-tenant data access (CRITICAL)
- Session hijacking (HIGH)
- Setup wizard takeover (HIGH)
- Brute force attacks (MEDIUM)
- XSS via markdown (MEDIUM)

## 2. Authentication Security

- Password policy (8+ chars, common password check)
- Session management (lifetime, renewal, invalidation)
- CSRF protection (double-submit cookie pattern - full specification)

## 3. Authorization Security

- Workspace isolation (WorkspaceRepository pattern)
- Role-based access control (Phase 5)
- RLS evaluation criteria

## 4. Rate Limiting

- Endpoint-specific limits
- Storage strategy (memory vs Redis)
- Bypass for testing

## 5. Infrastructure Security

- Docker hardening (non-root, no default credentials)
- Setup wizard security (persistent flag behavior)
- TRUSTED_PROXY configuration
- Health endpoint security

## 6. Security Testing Requirements

- Integration test requirements
- Penetration test scope
- Security audit checklist

## 7. Incident Response

- Cross-tenant access detection
- Setup wizard access monitoring
- Rate limit breach alerts
```

---

## Section 3: Security Task Organization by Phase

### Phase 1: Foundation Security (CRITICAL)

| Task ID   | Task                                                        | Priority | Owner   | ADR Reference    |
| --------- | ----------------------------------------------------------- | -------- | ------- | ---------------- |
| SEC-P1-01 | Implement password policy (8+ chars, common password check) | Critical | Backend | ADR-014          |
| SEC-P1-02 | Implement CSRF double-submit cookie pattern                 | Critical | Backend | ADR-007, ADR-014 |
| SEC-P1-03 | Implement session invalidation on password change           | Critical | Backend | ADR-007          |
| SEC-P1-04 | Add ESLint rule to flag direct db.select() calls            | High     | DevOps  | ADR-014          |
| SEC-P1-05 | Write cross-tenant isolation integration tests              | Critical | QA      | ADR-008, ADR-014 |
| SEC-P1-06 | Add npm audit to CI pipeline                                | High     | DevOps  | ADR-014          |
| SEC-P1-07 | Implement TRUSTED_PROXY validation warning                  | High     | Backend | ADR-007, ADR-014 |

### Phase 2: Application Security

| Task ID   | Task                                        | Priority | Owner    | ADR Reference    |
| --------- | ------------------------------------------- | -------- | -------- | ---------------- |
| SEC-P2-01 | Implement DOMPurify with restrictive config | High     | Frontend | ADR-013, ADR-014 |
| SEC-P2-02 | Add CSP headers                             | Medium   | Backend  | ADR-014          |
| SEC-P2-03 | Implement document size limit validation    | High     | Backend  | ADR-014          |

### Phase 4: Deployment Security (CRITICAL)

| Task ID   | Task                                                               | Priority | Owner    | ADR Reference    |
| --------- | ------------------------------------------------------------------ | -------- | -------- | ---------------- |
| SEC-P4-01 | Update Dockerfile with non-root USER                               | Critical | DevOps   | ADR-011, ADR-014 |
| SEC-P4-02 | Update docker-compose.yml - require POSTGRES_PASSWORD              | Critical | DevOps   | ADR-011, ADR-014 |
| SEC-P4-03 | Implement setup wizard persistent flag with full security behavior | Critical | Backend  | ADR-011, ADR-014 |
| SEC-P4-04 | Document SSL/HTTPS configuration for reverse proxies               | High     | Docs     | ADR-011          |
| SEC-P4-05 | Conduct security audit / penetration test                          | High     | External | ADR-014          |
| SEC-P4-06 | Verify health endpoint does not leak sensitive info                | High     | QA       | ADR-014          |

### Phase 5: Multi-Tenant Security

| Task ID   | Task                                                | Priority | Owner    | ADR Reference    |
| --------- | --------------------------------------------------- | -------- | -------- | ---------------- |
| SEC-P5-01 | Conduct cross-tenant penetration test               | Critical | External | ADR-014          |
| SEC-P5-02 | Implement invitation token attempt limiting (3 max) | High     | Backend  | ADR-007          |
| SEC-P5-03 | Implement email header injection prevention         | High     | Backend  | ADR-014          |
| SEC-P5-04 | Evaluate and potentially implement RLS policies     | Medium   | Backend  | ADR-008, ADR-014 |
| SEC-P5-05 | Implement distributed rate limiting (Redis)         | Medium   | Backend  | ADR-014          |

---

## Section 4: Gaps in Current Security Coverage

### 4.1 Missing from All ADRs

| Gap                      | Severity | Recommendation |
| ------------------------ | -------- | -------------- |
| Password policy          | HIGH     | Add to ADR-014 |
| CSP headers              | MEDIUM   | Add to ADR-014 |
| Log sanitization utility | MEDIUM   | Add to ADR-014 |
| Secrets detection in CI  | MEDIUM   | Add to ADR-014 |
| SAST (Static Analysis)   | MEDIUM   | Add to ADR-014 |

### 4.2 Inadequately Specified

| Gap                            | Current ADR | Severity | Recommendation           |
| ------------------------------ | ----------- | -------- | ------------------------ |
| CSRF implementation details    | ADR-007     | HIGH     | Full spec in ADR-014     |
| Setup wizard security behavior | ADR-011     | HIGH     | Full spec in ADR-014     |
| Docker non-root user           | ADR-011     | HIGH     | Update ADR-011 + ADR-014 |
| Default credentials            | ADR-011     | CRITICAL | Update ADR-011           |
| Session lifetime policy        | ADR-007     | MEDIUM   | Add to ADR-014           |

### 4.3 Well Covered (No Changes Needed)

| Topic                       | Current ADR | Assessment |
| --------------------------- | ----------- | ---------- |
| Rate limiting limits        | ADR-007     | Adequate   |
| WorkspaceRepository pattern | ADR-008     | Adequate   |
| Password hashing (Argon2id) | ADR-007     | Adequate   |
| Cookie security flags       | ADR-007     | Adequate   |

---

## Section 5: Recommended Actions

### Immediate (Before Phase 1 Development)

1. **Create ADR-014: Comprehensive Security Architecture**
   - Owner: Security Architect
   - Priority: Critical
   - Include all items from Section 2 structure

2. **Update ADR-011: Self-Hosting Strategy**
   - Change docker-compose.yml to require POSTGRES_PASSWORD
   - Add Dockerfile USER instruction to example
   - Add setup wizard full security behavior

3. **Update Phase 1 Task List**
   - Add SEC-P1-01 through SEC-P1-07 to Phase 1 tasks
   - Ensure Phase 1 Gate includes all security items

### Security Architect Review Questions

The Next.js Security Architect should provide input on:

1. **CSRF Implementation**: Should we use a library (csrf-csrf, csurf) or implement manually? What are the tRPC-specific considerations?

2. **Password Policy**: Should we use zxcvbn for strength estimation? What common password list is appropriate?

3. **Session Binding**: Is IP/User-Agent binding worth the UX tradeoff for self-hosted deployments?

4. **CSP Headers**: What CSP policy is appropriate given CodeMirror 6 requirements? Any unsafe-eval concerns?

5. **RLS Timing**: Should RLS be implemented in Phase 4 (before first release) or Phase 5 (multi-tenant only)?

6. **Penetration Test Scope**: What should the Phase 4 security audit cover? Should it include source code review or only black-box testing?

---

## Section 6: Summary

### ADR Changes Required

| ADR     | Action                                            | Priority |
| ------- | ------------------------------------------------- | -------- |
| ADR-007 | Minor updates (link to ADR-014)                   | Low      |
| ADR-008 | Minor updates (link to ADR-014, RLS criteria)     | Low      |
| ADR-011 | **Major updates** (docker security, setup wizard) | Critical |
| ADR-014 | **Create new** (comprehensive security)           | Critical |

### Security Coverage After Changes

| Category          | Before       | After    |
| ----------------- | ------------ | -------- |
| Authentication    | Partial      | Complete |
| Authorization     | Partial      | Complete |
| Rate Limiting     | Adequate     | Complete |
| Infrastructure    | Insufficient | Complete |
| Testing           | Partial      | Complete |
| Incident Response | Missing      | Complete |

---

## Appendix: ADR-014 Draft Outline

Below is the proposed structure for ADR-014. The Security Architect should review and expand this:

```markdown
# ADR-014: Comprehensive Security Architecture

**Status**: Proposed
**Date**: 2025-12-08
**Deciders**: Strategic Project Planner, Lead Developer, QA Architect, Security Architect

## Context

Security requirements are currently distributed across ADR-007 (API/Auth),
ADR-008 (Multi-Tenancy), and ADR-011 (Self-Hosting). This ADR consolidates
all security decisions into a single authoritative reference.

## Decision

Implement a defense-in-depth security architecture with the following components:

1. Authentication hardening (password policy, session management)
2. Authorization isolation (workspace scoping, RLS evaluation)
3. Rate limiting with proper proxy support
4. Docker container hardening
5. Setup wizard security
6. Security testing requirements

## Security Requirements

### 1. Password Policy

[Full specification here]

### 2. CSRF Protection

[Full specification here]

### 3. Session Management

[Full specification here]

### 4. Workspace Isolation

[Reference ADR-008, add threat model]

### 5. Rate Limiting

[Reference ADR-007, add storage strategy]

### 6. Docker Hardening

[Reference ADR-011, add mandatory requirements]

### 7. Setup Wizard Security

[Full security state machine]

### 8. Security Testing

[Integration test requirements, penetration test scope]

## Consequences

### Positive

- Single source of truth for security
- Clear audit trail
- Enables security certification

### Negative

- Additional documentation to maintain
- Some duplication with other ADRs

## References

- ADR-007: API Style and Authentication
- ADR-008: Multi-Tenancy Strategy
- ADR-011: Self-Hosting Strategy
- OWASP Web Security Testing Guide
- OWASP Docker Security Cheat Sheet
```

---

_Security Coordination completed by Strategic Project Planner_
_Awaiting review by Next.js Security Architect_
