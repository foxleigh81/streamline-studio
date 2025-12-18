# Project Discussions

This directory contains in-depth multi-agent discussions and analyses for complex project issues.

## Active Discussions

### Unified Registration Flow Proposal

**Files:**
- `unified-registration-proposal.html` - Original proposal (December 17, 2025)
- `unified-registration-account-portability.html` - Follow-up on account portability (December 18, 2025)

**Status:** APPROVED - PENDING IMPLEMENTATION

**Summary:**
The team discussed simplifying the registration architecture by removing the "subsequent user" flow entirely. Key recommendations:

- **Registration always creates a new workspace** (teamspace + channel)
- **Team members join via invitation only** (magic link - future feature)
- This aligns with industry standards (Slack, Notion, Linear)
- Dramatically simplifies testing and eliminates CI flakiness
- Improves security by preventing unauthorized auto-join

**Implementation Phases:**
1. **Phase 1 (Immediate):** Remove subsequent-user flow, always create workspace on registration
2. **Phase 2 (Future):** Implement magic link invitation system
   - Dual-path: invite link allows register OR login (existing users get teamspace added)
   - Single-tenant messaging: clear notice that accounts are local-only, not connected to cloud

**Account Portability (Follow-up Discussion):**
Addressed concern about single-tenant → multi-tenant migration. Options analyzed:
- ~~Option 1A: Central cloud database~~ - Rejected (premature microservices, defeats self-hosting)
- ~~Option 1B: Federated OAuth~~ - Rejected (too complex, requires connectivity)
- ~~Option 2A: Single user only~~ - Rejected (limits self-hosted value)
- **Option 2C: Email-based identity** - APPROVED (with security revision below)

**Security Review (Critical):**
User identified attack vector: attacker modifies local DB email to impersonate victim, then imports.

**Revised Approach - Zero Trust for Imports:**
- Imports **never** auto-link to cloud accounts
- All imported user references marked "(imported, unverified)"
- Content owned by importer, not claimed users
- Future: Opt-in claim process where verified users can claim their history
- Attack vector: **FULLY MITIGATED**

**Key Principle:** Self-hosted data is untrusted. Security > convenience for identity operations.

**Benefits:**
- Industry-standard pattern
- ~30-40% less registration code
- Near-zero E2E test flakiness
- Clear UX mental model (create vs join)
- Improved security (explicit authorization)

---

### CI Test Reliability Investigation

**Files:**
- `ci-test-reliability.html` - Original investigation (December 2025)
- `ci-test-reliability-follow-up.html` - Follow-up assessment of implemented fixes

**Status:** SUBSTANTIALLY IMPROVED

**Summary:**
The team identified 7 root causes for CI/local test parity issues and implemented comprehensive fixes. As of the follow-up assessment:

- **5 of 7 root causes:** RESOLVED
- **2 of 7 root causes:** PARTIALLY RESOLVED
- **CI/Local Parity:** 85-95% (when using CI mode)

**Key Deliverables:**
1. `TestDatabase` class for database cleanup (`e2e/helpers/test-database.ts`)
2. Environment validator (`scripts/validate-ci-env.ts`)
3. CI mode script for local testing (`scripts/run-e2e-ci-mode.sh`)
4. Comprehensive environment documentation (`.env.ci.example`)
5. Global setup validation (`e2e/global-setup.ts`)

**Verdict:**
YES, we can now rely on CI tests if developers use `npm run test:e2e:ci-mode` before pushing. The fixes represent a substantial improvement in test reliability and debuggability.

**Remaining Work (Phase 2):**
- Add firstUserPage/subsequentUserPage fixtures for explicit flow testing
- Improve unique ID generation (replace Date.now() with UUID)
- Investigate and fix 90-second timeout in registration
- Add CI workflow validation job

**Recommendation:**
Accept these fixes, update CONTRIBUTING.md to require CI mode testing, and monitor CI pass rates over the next 2-4 weeks before planning Phase 2.

---

## How to Use These Discussions

These HTML discussions are formatted as chat-style conversations between specialized AI agents (QA Architect, Senior Developer, Lead Developer, Project Orchestrator). They provide:

1. **Deep Analysis:** Multi-perspective examination of complex issues
2. **Decision Rationale:** Why specific approaches were chosen
3. **Implementation Guidance:** Detailed technical recommendations
4. **Progress Tracking:** Follow-up assessments of implemented solutions

Open the HTML files in a browser for the best reading experience.
