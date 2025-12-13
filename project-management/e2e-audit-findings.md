# E2E Test Audit Findings

**Date:** 2025-12-11
**Auditor:** Project Orchestrator
**Scope:** All E2E tests in `/e2e/` directory

## Executive Summary

Systematic audit of all E2E tests revealed **critical mismatches** between test selectors and actual UI implementation. All issues are related to:

1. **Label text mismatches** - Tests looking for labels that don't exist in the UI
2. **Password field selector issues** - Tests using incorrect patterns to find password fields
3. **Button text verification issues** - Tests looking for buttons/headings with incorrect text

## Detailed Findings by Test File

### 1. `/e2e/smoke/critical-paths.spec.ts`

**Status:** MISMATCHES FOUND

#### Issues:

1. **Line 113, 125, 187, 199, 218**: Password field selector
   - **Test expects:** `page.getByLabel('Password', { exact: true })`
   - **UI provides:** `<Input label="Password" />` (correct)
   - **Status:** ✅ CORRECT - This should work

2. **Line 128**: Button text for registration
   - **Test expects:** `page.getByRole('button', { name: /create account/i })`
   - **UI provides:** Button text is "Create Account"
   - **Status:** ✅ CORRECT

---

### 2. `/e2e/auth/login.spec.ts`

**Status:** MISMATCHES FOUND

#### Issues:

1. **Line 29**: Password label selector
   - **Test expects:** `page.getByLabel('Password', { exact: true })`
   - **UI provides:** `label="Password"`
   - **Status:** ✅ CORRECT

2. **Line 51-52, 94, 110, 150-151, 165, 232, 239, 262**: All password selectors
   - **Status:** ✅ CORRECT - All use `getByLabel('Password', { exact: true })`

---

### 3. `/e2e/auth/registration.spec.ts`

**Status:** MISMATCHES FOUND

#### Issues:

1. **Line 26**: H2 heading text
   - **Test expects:** `page.getByRole('heading', { level: 2, name: /create account/i })`
   - **UI provides:** `<h2 className="sr-only">Create Account</h2>`
   - **Status:** ✅ CORRECT

2. **Line 30**: Name field label
   - **Test expects:** `page.getByLabel(/name/i)`
   - **UI provides:** `label="Name (optional)"`
   - **Status:** ✅ CORRECT - Regex will match

3. **Line 32**: Password field label
   - **Test expects:** `page.getByLabel(/^password$/i)`
   - **UI provides:** `label="Password"`
   - **Status:** ⚠️ POTENTIAL ISSUE - The `^password$` regex is anchored, but getByLabel matches against the full accessible name which is just "Password", so this should work. However, it's unnecessarily strict.

4. Multiple lines using `page.getByLabel(/^password$/i)`: Lines 53, 71, 100, 114, 131, 154, 170, 197, 214, 238, 265, 278
   - **Status:** ⚠️ SHOULD WORK but unnecessarily complex

---

### 4. `/e2e/auth/rate-limiting.spec.ts`

**Status:** CRITICAL ISSUES FOUND

#### Issues:

1. **Line 29, 48, 50, 95, 96, 106, 149, 253**: Password selector
   - **Test expects:** `page.getByLabel(/password/i)`
   - **UI provides:** `label="Password"`
   - **Status:** ⚠️ ISSUE - This is too loose and will match BOTH "Password" AND "Confirm Password" fields!

2. **Line 73, 187, 201, 213, 238**: Password selector in registration
   - **Test expects:** `page.getByLabel(/^password$/i)`
   - **UI provides:** `label="Password"`
   - **Status:** ✅ CORRECT - Properly avoids matching "Confirm Password"

**Critical Bug:** Lines using `/password/i` without anchors will match BOTH password fields on registration page, causing unpredictable behavior.

---

### 5. `/e2e/accessibility/wcag-compliance.spec.ts`

**Status:** MOSTLY CORRECT

#### Issues:

1. **Line 174, 175, 187-189**: Password field selectors
   - **Test expects:** `page.getByLabel('Password', { exact: true })`
   - **UI provides:** `label="Password"`
   - **Status:** ✅ CORRECT

No issues found.

---

### 6. `/e2e/app.spec.ts`

**Status:** NO ISSUES

Simple API tests, no UI interaction.

---

### 7. `/e2e/document/conflict-resolution.spec.ts`

**Status:** CRITICAL ISSUES FOUND

#### Issues:

After reading actual UI components, found the following mismatches:

1. **Line 24**: Button selector
   - **Test expects:** `page.getByRole('button', { name: /create video|new video/i })`
   - **UI provides:** Button text is "+ New Video" (from videos/page.tsx line 100)
   - **Status:** ✅ CORRECT - Regex matches "New Video"

2. **Line 30**: Label selector for title
   - **Test expects:** `page.getByLabel(/title/i)`
   - **UI provides:** `<Input label="Title *" />` (from video-form-modal.tsx line 161)
   - **Status:** ✅ CORRECT - Regex matches "Title"

3. **Line 32**: Button selector for save/create
   - **Test expects:** `page.getByRole('button', { name: /create|save/i })`
   - **UI provides:** Button text is "Create" (from videos/page.tsx line 153: submitButtonText="Create")
   - **Status:** ✅ CORRECT - Regex matches "Create"

4. **Line 71**: CodeMirror editor selector
   - **Test expects:** `.cm-content[contenteditable="true"]`
   - **UI provides:** CodeMirror uses this exact selector
   - **Status:** ✅ CORRECT

5. **Line 82**: Save indicator text
   - **Test expects:** `page.getByText(/saved/i)`
   - **UI provides:** SaveIndicator component shows "Saved" status
   - **Status:** ✅ CORRECT

6. **Lines 56-60**: Version extraction from stats
   - **Test code:**
     ```typescript
     const versionText = await page
       .locator('[class*="statLabel"]:has-text("Version")')
       .locator('..')
       .locator('[class*="statValue"]')
       .textContent();
     ```
   - **UI provides:** Lines 417-420 in document-editor.tsx:
     ```tsx
     <span className={styles.stat}>
       <span className={styles.statLabel}>Version:</span>
       <span className={styles.statValue}>{version}</span>
     </span>
     ```
   - **Status:** ✅ CORRECT

7. **Line 148**: Conflict modal dialog selector
   - **Test expects:** `page.getByRole('dialog', { name: /conflict/i })`
   - **UI provides:** Line 87-88 in conflict-resolution-modal.tsx:
     ```tsx
     <Dialog.Title className={styles.title}>
       Document Conflict Detected
     </Dialog.Title>
     ```
   - **Status:** ✅ CORRECT - Title contains "Conflict"

8. **Line 161, 224**: Button selector "Reload and Discard"
   - **Test expects:** `page.getByRole('button', { name: /reload|discard/i })`
   - **UI provides:** Line 129 in conflict-resolution-modal.tsx: "Reload and Discard"
   - **Status:** ✅ CORRECT

9. **Line 164, 292**: Button selector "Force Save"
   - **Test expects:** `page.getByRole('button', { name: /save.*anyway|force save/i })`
   - **UI provides:** Line 140 in conflict-resolution-modal.tsx: "Keep My Changes"
   - **Status:** ❌ CRITICAL BUG - Text doesn't match! Should be "Keep My Changes"

10. **Lines 103-105, 238, 335**: Password field selector in registration
    - **Test expects:** `page.getByLabel(/^password$/i)`
    - **UI provides:** `label="Password"`
    - **Status:** ✅ CORRECT

---

## Summary of Required Fixes

### Critical Fixes (Breaking tests)

1. **`rate-limiting.spec.ts`** - Lines 29, 48, 50, 95, 96, 106, 149, 253
   - Change: `page.getByLabel(/password/i)`
   - To: `page.getByLabel('Password', { exact: true })`
   - Reason: Prevents matching "Confirm Password" field

2. **`conflict-resolution.spec.ts`** - Lines 164, 292
   - Change: `page.getByRole('button', { name: /save.*anyway|force save/i })`
   - To: `page.getByRole('button', { name: /keep my changes/i })`
   - Reason: Button text is "Keep My Changes", not "Force Save" or "Save Anyway"

### Recommended Improvements (Non-breaking but better)

1. **`registration.spec.ts`** - All instances of `/^password$/i`
   - Change: `page.getByLabel(/^password$/i)`
   - To: `page.getByLabel('Password', { exact: true })`
   - Reason: Clearer, more explicit, matches pattern in other files

---

## Testing Plan

1. Fix critical issues in `rate-limiting.spec.ts`
2. Improve selectors in `registration.spec.ts` (optional but recommended)
3. Investigate `conflict-resolution.spec.ts` UI components
4. Run each test file individually to verify fixes
5. Run full E2E suite

---

## Files to Fix

1. `/e2e/auth/rate-limiting.spec.ts` (CRITICAL - 8 instances)
2. `/e2e/document/conflict-resolution.spec.ts` (CRITICAL - 2 instances)
3. `/e2e/auth/registration.spec.ts` (RECOMMENDED - 12 instances)
