/**
 * Settings Preferences E2E Tests
 *
 * Tests the preferences modal including:
 * - Opening the modal via user menu
 * - Saving preferences
 * - Default channel selection
 * - View mode persistence
 * - Date/time format changes
 * - Unsaved changes warning
 *
 * Note: Preferences were moved from a standalone page to a modal
 * accessible from the user menu in the sidebar.
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { expect, type Page } from '@playwright/test';
import { test as authenticatedTest } from '../helpers/fixtures';

/**
 * Helper to open the preferences modal
 */
async function openPreferencesModal(page: Page): Promise<void> {
  // Click the user menu trigger (at bottom of sidebar)
  const userMenuTrigger = page.getByRole('button', { name: /user menu/i });
  await userMenuTrigger.waitFor({ state: 'visible', timeout: 10000 });
  await userMenuTrigger.click();

  // Click the Preferences menu item
  const preferencesMenuItem = page.getByRole('menuitem', {
    name: /preferences/i,
  });
  await preferencesMenuItem.waitFor({ state: 'visible' });
  await preferencesMenuItem.click();

  // Wait for modal to open
  await page.getByRole('dialog', { name: /preferences/i }).waitFor({
    state: 'visible',
    timeout: 10000,
  });
}

authenticatedTest.describe('Settings Preferences Modal', () => {
  authenticatedTest.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to workspace dashboard first (any authenticated page works)
    await authenticatedPage.goto('/t/workspace');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  authenticatedTest.describe('Modal Opening', () => {
    authenticatedTest(
      'opens preferences modal from user menu',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        // Verify modal is open with correct title
        const modal = authenticatedPage.getByRole('dialog', {
          name: /preferences/i,
        });
        await expect(modal).toBeVisible();

        // Verify description
        await expect(
          authenticatedPage.getByText(
            /customize your personal preferences for the application/i
          )
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'modal can be closed with close button',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const modal = authenticatedPage.getByRole('dialog', {
          name: /preferences/i,
        });
        await expect(modal).toBeVisible();

        // Click close button
        const closeButton = authenticatedPage.getByRole('button', {
          name: /close/i,
        });
        await closeButton.click();

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    );

    authenticatedTest(
      'modal can be closed with Escape key',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const modal = authenticatedPage.getByRole('dialog', {
          name: /preferences/i,
        });
        await expect(modal).toBeVisible();

        // Press Escape
        await authenticatedPage.keyboard.press('Escape');

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    );
  });

  authenticatedTest.describe('Form Elements', () => {
    authenticatedTest(
      'renders all preference sections',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        // Verify sections (h3 headings in the modal)
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 3,
            name: /startup behaviour/i,
          })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 3,
            name: /view preferences/i,
          })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 3,
            name: /date & time format/i,
          })
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'renders default channel select',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        // Use exact match for the label text to avoid matching the placeholder
        const selectLabel = authenticatedPage.getByText('Default Channel', {
          exact: true,
        });
        await expect(selectLabel).toBeVisible();

        // Verify select has helper text
        await expect(
          authenticatedPage.getByText(/go directly to this channel on login/i)
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'renders view mode radio group',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        await expect(
          authenticatedPage.getByRole('group', {
            name: /content plan view mode/i,
          })
        ).toBeVisible();

        // Verify both options are present
        await expect(
          authenticatedPage.getByRole('radio', { name: /grid view/i })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('radio', { name: /table view/i })
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'renders date format select',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const selectLabel = authenticatedPage.getByText('Date Format');
        await expect(selectLabel).toBeVisible();

        const select = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });
        await expect(select).toBeVisible();

        // Verify default value
        await expect(select).toHaveValue('ISO');
      }
    );

    authenticatedTest(
      'renders time format radio group',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        await expect(
          authenticatedPage.getByRole('group', { name: /time format/i })
        ).toBeVisible();

        // Verify both options are present
        await expect(
          authenticatedPage.getByRole('radio', { name: /12-hour \(AM\/PM\)/i })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('radio', { name: /24-hour/i })
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'renders form action buttons',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const resetButton = authenticatedPage.getByRole('button', {
          name: /reset/i,
        });
        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });

        await expect(resetButton).toBeVisible();
        await expect(saveButton).toBeVisible();

        // Both buttons should be disabled initially (no changes)
        await expect(resetButton).toBeDisabled();
        await expect(saveButton).toBeDisabled();
      }
    );
  });

  authenticatedTest.describe('Form Interaction', () => {
    authenticatedTest(
      'enables action buttons when changes are made',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const resetButton = authenticatedPage.getByRole('button', {
          name: /reset/i,
        });
        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });

        // Initially disabled
        await expect(resetButton).toBeDisabled();
        await expect(saveButton).toBeDisabled();

        // Make a change
        const gridViewRadio = authenticatedPage.getByRole('radio', {
          name: /grid view/i,
        });
        const tableViewRadio = authenticatedPage.getByRole('radio', {
          name: /table view/i,
        });

        // Check current value and toggle
        const isGridSelected = await gridViewRadio.isChecked();
        if (isGridSelected) {
          await tableViewRadio.click();
        } else {
          await gridViewRadio.click();
        }

        // Buttons should now be enabled
        await expect(resetButton).toBeEnabled();
        await expect(saveButton).toBeEnabled();
      }
    );

    authenticatedTest(
      'resets form to original values on reset',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const resetButton = authenticatedPage.getByRole('button', {
          name: /reset/i,
        });
        const gridViewRadio = authenticatedPage.getByRole('radio', {
          name: /grid view/i,
        });
        const tableViewRadio = authenticatedPage.getByRole('radio', {
          name: /table view/i,
        });

        // Store original value
        const originallyGrid = await gridViewRadio.isChecked();

        // Change value
        if (originallyGrid) {
          await tableViewRadio.click();
        } else {
          await gridViewRadio.click();
        }

        // Verify change
        await expect(resetButton).toBeEnabled();

        // Reset
        await resetButton.click();

        // Verify restored to original value
        if (originallyGrid) {
          await expect(gridViewRadio).toBeChecked();
        } else {
          await expect(tableViewRadio).toBeChecked();
        }

        // Buttons should be disabled again
        await expect(resetButton).toBeDisabled();
      }
    );

    authenticatedTest(
      'saves preferences successfully',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });
        const tableViewRadio = authenticatedPage.getByRole('radio', {
          name: /table view/i,
        });

        // Make a change
        await tableViewRadio.click();

        // Wait for button to be enabled
        await expect(saveButton).toBeEnabled();

        // Save
        await saveButton.click();

        // Verify success message
        await expect(
          authenticatedPage.getByText(/preferences saved successfully/i)
        ).toBeVisible();

        // Buttons should be disabled after successful save
        await expect(saveButton).toBeDisabled();
      }
    );

    authenticatedTest(
      'persists view mode preference after reopening modal',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });
        const tableViewRadio = authenticatedPage.getByRole('radio', {
          name: /table view/i,
        });

        // Set to table view
        await tableViewRadio.click();
        await saveButton.click();

        // Wait for success message
        await expect(
          authenticatedPage.getByText(/preferences saved successfully/i)
        ).toBeVisible();

        // Close modal
        const closeButton = authenticatedPage.getByRole('button', {
          name: /close/i,
        });
        await closeButton.click();

        // Wait for modal to close
        await expect(
          authenticatedPage.getByRole('dialog', { name: /preferences/i })
        ).not.toBeVisible();

        // Reopen modal
        await openPreferencesModal(authenticatedPage);

        // Verify table view is still selected
        await expect(tableViewRadio).toBeChecked();
      }
    );

    authenticatedTest(
      'changes date format successfully',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const dateFormatSelect = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });
        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });

        // Change to US format
        await dateFormatSelect.selectOption('US');

        // Save
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // Wait for success message
        await expect(
          authenticatedPage.getByText(/preferences saved successfully/i)
        ).toBeVisible();

        // Close and reopen modal
        const closeButton = authenticatedPage.getByRole('button', {
          name: /close/i,
        });
        await closeButton.click();
        await openPreferencesModal(authenticatedPage);

        // Verify persistence
        await expect(dateFormatSelect).toHaveValue('US');
      }
    );

    authenticatedTest(
      'changes time format successfully',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const timeFormat12h = authenticatedPage.getByRole('radio', {
          name: /12-hour \(AM\/PM\)/i,
        });
        const saveButton = authenticatedPage.getByRole('button', {
          name: /save preferences/i,
        });

        // Change to 12h format
        await timeFormat12h.click();

        // Save
        await expect(saveButton).toBeEnabled();
        await saveButton.click();

        // Wait for success message
        await expect(
          authenticatedPage.getByText(/preferences saved successfully/i)
        ).toBeVisible();

        // Close and reopen modal
        const closeButton = authenticatedPage.getByRole('button', {
          name: /close/i,
        });
        await closeButton.click();
        await openPreferencesModal(authenticatedPage);

        // Verify persistence
        await expect(timeFormat12h).toBeChecked();
      }
    );
  });

  authenticatedTest.describe('Date Format Options', () => {
    authenticatedTest(
      'all date format options are selectable',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const dateFormatSelect = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });

        // Native HTML selects don't expose options to accessibility tree
        // Verify all options exist by trying to select them
        await dateFormatSelect.selectOption('ISO');
        await expect(dateFormatSelect).toHaveValue('ISO');

        await dateFormatSelect.selectOption('US');
        await expect(dateFormatSelect).toHaveValue('US');

        await dateFormatSelect.selectOption('EU');
        await expect(dateFormatSelect).toHaveValue('EU');

        await dateFormatSelect.selectOption('UK');
        await expect(dateFormatSelect).toHaveValue('UK');
      }
    );

    authenticatedTest(
      'UK format value is distinct from EU format',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        const dateFormatSelect = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });

        // Verify EU option can be selected
        await dateFormatSelect.selectOption('EU');
        await expect(dateFormatSelect).toHaveValue('EU');

        // Verify UK option can be selected and is different from EU
        await dateFormatSelect.selectOption('UK');
        await expect(dateFormatSelect).toHaveValue('UK');

        // Verify they are distinct values
        await dateFormatSelect.selectOption('EU');
        await expect(dateFormatSelect).not.toHaveValue('UK');
      }
    );
  });

  authenticatedTest.describe('Unsaved Changes Warning', () => {
    authenticatedTest(
      'warns when closing modal with unsaved changes',
      async ({ authenticatedPage }) => {
        await openPreferencesModal(authenticatedPage);

        // Make a change
        const tableViewRadio = authenticatedPage.getByRole('radio', {
          name: /table view/i,
        });
        await tableViewRadio.click();

        // Set up dialog handler to accept the confirmation
        authenticatedPage.on('dialog', async (dialog) => {
          expect(dialog.type()).toBe('confirm');
          expect(dialog.message()).toContain('unsaved changes');
          await dialog.accept();
        });

        // Try to close with close button
        const closeButton = authenticatedPage.getByRole('button', {
          name: /close/i,
        });
        await closeButton.click();

        // Modal should close after accepting the confirmation
        await expect(
          authenticatedPage.getByRole('dialog', { name: /preferences/i })
        ).not.toBeVisible();
      }
    );
  });

  authenticatedTest.describe('Loading State', () => {
    authenticatedTest(
      'shows loading state with proper accessibility',
      async ({ authenticatedPage }) => {
        // Intercept the preferences API call to delay response
        await authenticatedPage.route(
          '**/api/trpc/user.getPreferences*',
          async (route) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await route.continue();
          }
        );

        await openPreferencesModal(authenticatedPage);

        // Verify loading state
        const loadingStatus = authenticatedPage.getByRole('status');
        await expect(loadingStatus).toBeVisible();
        await expect(loadingStatus).toContainText(/loading preferences/i);

        // Verify it has aria-live
        await expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      }
    );
  });

  authenticatedTest.describe('Error Handling', () => {
    authenticatedTest(
      'displays error state when preferences fail to load',
      async ({ authenticatedPage }) => {
        // Intercept and fail the preferences API call
        await authenticatedPage.route(
          '**/api/trpc/user.getPreferences*',
          async (route) => {
            await route.abort('failed');
          }
        );

        await openPreferencesModal(authenticatedPage);

        // Verify error message
        await expect(authenticatedPage.getByRole('alert')).toBeVisible();

        await expect(
          authenticatedPage.getByText(/failed to load preferences/i)
        ).toBeVisible();
      }
    );
  });
});

authenticatedTest.describe('Settings Navigation (Deprecated Page)', () => {
  authenticatedTest(
    'old preferences URL redirects to settings-moved page',
    async ({ authenticatedPage }) => {
      // Navigate to the old preferences page URL
      await authenticatedPage.goto('/t/workspace/settings/preferences');
      await authenticatedPage.waitForLoadState('networkidle');

      // Should redirect to settings-moved page
      await expect(authenticatedPage).toHaveURL(/settings-moved/);

      // Should show the "Settings Have Moved" notice
      await expect(
        authenticatedPage.getByRole('heading', {
          level: 1,
          name: /settings have moved/i,
        })
      ).toBeVisible();

      // Should explain how to access preferences
      await expect(
        authenticatedPage.getByText(/user menu at the bottom of the sidebar/i)
      ).toBeVisible();
    }
  );
});
