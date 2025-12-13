/**
 * E2E Tests - Document Conflict Resolution
 *
 * Tests for the document version conflict resolution flow.
 * Verifies that concurrent edits are detected and properly handled.
 *
 * @see /docs/adrs/009-versioning-and-audit.md
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { testData } from '../helpers/fixtures';

/**
 * Helper to create a test video and navigate to its document editor
 */
async function createTestVideoAndNavigate(page: Page): Promise<string> {
  // Navigate to dashboard (assumes user is logged in)
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Create a new video
  const videoTitle = testData.videoTitle();
  const createButton = page.getByRole('button', {
    name: /create video|new video/i,
  });

  if (await createButton.isVisible()) {
    await createButton.waitFor({ state: 'visible' });
    await createButton.click();
    await page.getByLabel(/title/i).fill(videoTitle);
    const saveButton = page.getByRole('button', { name: /create|save/i });
    await saveButton.waitFor({ state: 'visible' });
    await saveButton.click();
  }

  // Wait for video to be created and navigate to script editor
  await page.waitForURL(/\/videos\/.+/);
  const url = page.url();
  const videoId = url.match(/\/videos\/([^/?]+)/)?.[1];

  if (!videoId) {
    throw new Error('Failed to extract video ID from URL');
  }

  // Navigate to script editor
  await page.goto(`/videos/${videoId}/script`);
  await page.waitForLoadState('networkidle');

  return videoId;
}

/**
 * Helper to get the current version number from the editor
 */
async function getCurrentVersion(page: Page): Promise<number> {
  const versionText = await page
    .locator('[class*="statLabel"]:has-text("Version")')
    .locator('..')
    .locator('[class*="statValue"]')
    .textContent();

  const version = parseInt(versionText?.trim() || '1', 10);
  return version;
}

/**
 * Helper to edit document content
 */
async function editDocumentContent(page: Page, content: string): Promise<void> {
  // Find the CodeMirror editor
  const editor = page.locator('.cm-content[contenteditable="true"]');
  await editor.waitFor({ state: 'visible' });
  await editor.click();
  await editor.fill(content);
}

/**
 * Helper to wait for save to complete
 */
async function waitForSave(page: Page): Promise<void> {
  // Wait for "Saved" indicator to appear
  await page.getByText(/saved/i).waitFor({ timeout: 5000 });
}

// Skip: This test suite requires video creation UI which is not yet implemented.
// The homepage is currently a placeholder (Phase 1.1).
// Re-enable when video management features are added in Phase 2+.
test.describe.skip('Document Conflict Resolution', () => {
  test.describe.configure({ mode: 'serial' });

  test('detects conflict when document is edited in two tabs', async ({
    browser,
  }) => {
    // Create two browser contexts to simulate two tabs
    const context1: BrowserContext = await browser.newContext();
    const context2: BrowserContext = await browser.newContext();

    const page1: Page = await context1.newPage();
    const page2: Page = await context2.newPage();

    try {
      // Register and login in context 1
      const uniqueEmail = testData.uniqueEmail();
      await page1.goto('/register');
      await page1.waitForLoadState('networkidle');
      await page1.getByLabel(/email/i).first().fill(uniqueEmail);
      await page1.getByLabel(/^password$/i).fill('testpassword123');
      await page1.getByLabel(/confirm password/i).fill('testpassword123');
      const regBtn1 = page1.getByRole('button', { name: /create account/i });
      await regBtn1.waitFor({ state: 'visible' });
      await regBtn1.click();
      await page1.waitForURL('/');

      // Create a test video and navigate to script editor
      const videoId = await createTestVideoAndNavigate(page1);

      // Share session to context 2 by copying cookies
      const cookies = await context1.cookies();
      await context2.addCookies(cookies);

      // Open the same document in context 2
      await page2.goto(`/videos/${videoId}/script`);
      await page2.waitForLoadState('networkidle');

      // Verify both pages show the same initial content
      const initialVersion = await getCurrentVersion(page1);
      expect(initialVersion).toBe(1);

      // Edit and save in context 1
      await editDocumentContent(
        page1,
        '# First Edit\n\nThis is the first edit.'
      );
      await waitForSave(page1);

      // Verify version incremented in context 1
      const version1 = await getCurrentVersion(page1);
      expect(version1).toBe(2);

      // Edit in context 2 (still on version 1)
      await editDocumentContent(
        page2,
        '# Second Edit\n\nThis is the second edit from another tab.'
      );

      // Wait for auto-save to trigger in context 2
      await page2.waitForTimeout(3000);

      // Conflict modal should appear in context 2
      const conflictModal = page2.getByRole('dialog', {
        name: /conflict/i,
      });
      await expect(conflictModal).toBeVisible({ timeout: 10000 });

      // Verify conflict message
      await expect(
        conflictModal.getByText(/modified by another user/i)
      ).toBeVisible();
      await expect(conflictModal.getByText(/v1/i)).toBeVisible(); // Expected version
      await expect(conflictModal.getByText(/v2/i)).toBeVisible(); // Current version

      // Verify both action buttons are present
      const reloadButton = conflictModal.getByRole('button', {
        name: /reload|discard/i,
      });
      const forceSaveButton = conflictModal.getByRole('button', {
        name: /keep my changes/i,
      });

      await expect(reloadButton).toBeVisible();
      await expect(forceSaveButton).toBeVisible();
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('reload option discards local changes and fetches server version', async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup: Register and create video
      const uniqueEmail = testData.uniqueEmail();
      await page1.goto('/register');
      await page1.waitForLoadState('networkidle');
      await page1.getByLabel(/email/i).first().fill(uniqueEmail);
      await page1.getByLabel(/^password$/i).fill('testpassword123');
      await page1.getByLabel(/confirm password/i).fill('testpassword123');
      const regBtn2 = page1.getByRole('button', { name: /create account/i });
      await regBtn2.waitFor({ state: 'visible' });
      await regBtn2.click();
      await page1.waitForURL('/');

      const videoId = await createTestVideoAndNavigate(page1);

      // Share session
      const cookies = await context1.cookies();
      await context2.addCookies(cookies);
      await page2.goto(`/videos/${videoId}/script`);
      await page2.waitForLoadState('networkidle');

      // Edit and save in context 1
      const serverContent = '# Server Version\n\nThis is the server content.';
      await editDocumentContent(page1, serverContent);
      await waitForSave(page1);

      // Edit in context 2 (this will conflict)
      await editDocumentContent(
        page2,
        '# Local Version\n\nThis will be discarded.'
      );
      await page2.waitForTimeout(3000);

      // Conflict modal should appear
      const conflictModal = page2.getByRole('dialog', { name: /conflict/i });
      await expect(conflictModal).toBeVisible({ timeout: 10000 });

      // Click reload button
      const reloadButton = conflictModal.getByRole('button', {
        name: /reload|discard/i,
      });
      await reloadButton.waitFor({ state: 'visible' });
      await reloadButton.click();

      // Modal should close
      await expect(conflictModal).not.toBeVisible();

      // Editor should show server content
      const editor = page2.locator('.cm-content');
      await expect(editor).toContainText('Server Version');

      // Version should be updated
      const version = await getCurrentVersion(page2);
      expect(version).toBe(2);
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('force save option preserves local changes as new version', async ({
    browser,
  }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup: Register and create video
      const uniqueEmail = testData.uniqueEmail();
      await page1.goto('/register');
      await page1.waitForLoadState('networkidle');
      await page1.getByLabel(/email/i).first().fill(uniqueEmail);
      await page1.getByLabel(/^password$/i).fill('testpassword123');
      await page1.getByLabel(/confirm password/i).fill('testpassword123');
      const regBtn3 = page1.getByRole('button', { name: /create account/i });
      await regBtn3.waitFor({ state: 'visible' });
      await regBtn3.click();
      await page1.waitForURL('/');

      const videoId = await createTestVideoAndNavigate(page1);

      // Share session
      const cookies = await context1.cookies();
      await context2.addCookies(cookies);
      await page2.goto(`/videos/${videoId}/script`);
      await page2.waitForLoadState('networkidle');

      // Edit and save in context 1
      await editDocumentContent(page1, '# First Edit\n\nServer content.');
      await waitForSave(page1);

      // Edit in context 2 (this will conflict)
      const localContent = '# My Important Edit\n\nI want to keep this.';
      await editDocumentContent(page2, localContent);
      await page2.waitForTimeout(3000);

      // Conflict modal should appear
      const conflictModal = page2.getByRole('dialog', { name: /conflict/i });
      await expect(conflictModal).toBeVisible({ timeout: 10000 });

      // Click force save button
      const forceSaveButton = conflictModal.getByRole('button', {
        name: /keep my changes/i,
      });
      await forceSaveButton.waitFor({ state: 'visible' });
      await forceSaveButton.click();

      // Modal should close
      await expect(conflictModal).not.toBeVisible();

      // Editor should still show local content
      const editor = page2.locator('.cm-content');
      await expect(editor).toContainText('My Important Edit');

      // Version should be incremented to 3 (v2 from context1, v3 from force save)
      const version = await getCurrentVersion(page2);
      expect(version).toBe(3);

      // Verify context 1 can reload and see the forced save
      await page1.reload();
      await page1.waitForLoadState('networkidle');
      const editor1 = page1.locator('.cm-content');
      await expect(editor1).toContainText('My Important Edit');
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });

  test('conflict modal is accessible via keyboard', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // Setup: Register and create video
      const uniqueEmail = testData.uniqueEmail();
      await page1.goto('/register');
      await page1.waitForLoadState('networkidle');
      await page1.getByLabel(/email/i).first().fill(uniqueEmail);
      await page1.getByLabel(/^password$/i).fill('testpassword123');
      await page1.getByLabel(/confirm password/i).fill('testpassword123');
      const regBtn4 = page1.getByRole('button', { name: /create account/i });
      await regBtn4.waitFor({ state: 'visible' });
      await regBtn4.click();
      await page1.waitForURL('/');

      const videoId = await createTestVideoAndNavigate(page1);

      // Share session
      const cookies = await context1.cookies();
      await context2.addCookies(cookies);
      await page2.goto(`/videos/${videoId}/script`);
      await page2.waitForLoadState('networkidle');

      // Trigger conflict
      await editDocumentContent(page1, '# Edit 1');
      await waitForSave(page1);
      await editDocumentContent(page2, '# Edit 2');
      await page2.waitForTimeout(3000);

      // Wait for conflict modal
      const conflictModal = page2.getByRole('dialog', { name: /conflict/i });
      await expect(conflictModal).toBeVisible({ timeout: 10000 });

      // Test keyboard navigation
      await page2.keyboard.press('Tab');
      await page2.keyboard.press('Tab');

      // One of the buttons should be focused
      const reloadButton = conflictModal.getByRole('button', {
        name: /reload|discard/i,
      });
      const forceSaveButton = conflictModal.getByRole('button', {
        name: /keep my changes/i,
      });

      const isReloadFocused = await reloadButton.evaluate(
        (el) => document.activeElement === el
      );
      const isForceSaveFocused = await forceSaveButton.evaluate(
        (el) => document.activeElement === el
      );

      expect(isReloadFocused || isForceSaveFocused).toBeTruthy();

      // Test Escape key closes modal
      await page2.keyboard.press('Escape');
      await expect(conflictModal).not.toBeVisible();
    } finally {
      await page1.close();
      await page2.close();
      await context1.close();
      await context2.close();
    }
  });
});
