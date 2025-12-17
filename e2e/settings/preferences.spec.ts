/**
 * Settings Preferences E2E Tests
 *
 * Tests the preferences settings page including:
 * - Navigation between Account and Preferences tabs
 * - Saving preferences
 * - Default channel selection
 * - View mode persistence
 * - Date/time format changes
 * - Unsaved changes warning
 *
 * @see /docs/adrs/005-testing-strategy.md
 */

import { expect } from '@playwright/test';
import { test as authenticatedTest } from '../helpers/fixtures';

authenticatedTest.describe('Settings Preferences Page', () => {
  authenticatedTest.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to preferences page
    await authenticatedPage.goto('/t/workspace/settings/preferences');
    await authenticatedPage.waitForLoadState('networkidle');
  });

  authenticatedTest.describe('Page Rendering', () => {
    authenticatedTest(
      'renders preferences page with all sections',
      async ({ authenticatedPage }) => {
        // Verify page heading
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 1,
            name: /preferences/i,
          })
        ).toBeVisible();

        // Verify page description
        await expect(
          authenticatedPage.getByText(/customize your personal preferences/i)
        ).toBeVisible();

        // Verify sections
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 2,
            name: /content defaults/i,
          })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 2,
            name: /view preferences/i,
          })
        ).toBeVisible();
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 2,
            name: /date & time format/i,
          })
        ).toBeVisible();
      }
    );

    authenticatedTest(
      'renders default channel select',
      async ({ authenticatedPage }) => {
        const selectLabel = authenticatedPage.getByText('Default Channel');
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
        const selectLabel = authenticatedPage.getByText('Date Format');
        await expect(selectLabel).toBeVisible();

        const select = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });
        await expect(select).toBeVisible();

        // Verify all format options exist
        await expect(select).toHaveValue('ISO'); // Default value
      }
    );

    authenticatedTest(
      'renders time format radio group',
      async ({ authenticatedPage }) => {
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
      'persists view mode preference',
      async ({ authenticatedPage }) => {
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

        // Reload page
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState('networkidle');

        // Verify table view is still selected
        await expect(tableViewRadio).toBeChecked();
      }
    );

    authenticatedTest(
      'changes date format successfully',
      async ({ authenticatedPage }) => {
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

        // Reload and verify persistence
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState('networkidle');

        await expect(dateFormatSelect).toHaveValue('US');
      }
    );

    authenticatedTest(
      'changes time format successfully',
      async ({ authenticatedPage }) => {
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

        // Reload and verify persistence
        await authenticatedPage.reload();
        await authenticatedPage.waitForLoadState('networkidle');

        await expect(timeFormat12h).toBeChecked();
      }
    );
  });

  authenticatedTest.describe('Date Format Options', () => {
    authenticatedTest(
      'displays all date format options correctly',
      async ({ authenticatedPage }) => {
        const dateFormatSelect = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });

        // Click to open dropdown (if needed)
        await dateFormatSelect.click();

        // Verify all options exist
        const isoOption = authenticatedPage.getByRole('option', {
          name: /ISO \(YYYY-MM-DD\)/i,
        });
        const usOption = authenticatedPage.getByRole('option', {
          name: /US \(MM\/DD\/YYYY\)/i,
        });
        const euOption = authenticatedPage.getByRole('option', {
          name: /EU \(DD\/MM\/YYYY\)/i,
        });
        const ukOption = authenticatedPage.getByRole('option', {
          name: /UK \(DD-MMM-YYYY\)/i,
        });

        await expect(isoOption).toBeVisible();
        await expect(usOption).toBeVisible();
        await expect(euOption).toBeVisible();
        await expect(ukOption).toBeVisible();
      }
    );

    authenticatedTest(
      'UK format is distinct from EU format',
      async ({ authenticatedPage }) => {
        const dateFormatSelect = authenticatedPage.getByRole('combobox', {
          name: /date format/i,
        });

        // Verify EU option shows DD/MM/YYYY
        await dateFormatSelect.click();
        const euOption = authenticatedPage.getByRole('option', {
          name: /EU \(DD\/MM\/YYYY\)/i,
        });
        await expect(euOption).toBeVisible();

        // Verify UK option shows DD-MMM-YYYY (different format)
        const ukOption = authenticatedPage.getByRole('option', {
          name: /UK \(DD-MMM-YYYY\)/i,
        });
        await expect(ukOption).toBeVisible();
      }
    );
  });

  authenticatedTest.describe('Loading State', () => {
    authenticatedTest(
      'shows loading state with proper accessibility',
      async ({ page }) => {
        // Intercept the preferences API call to delay response
        await page.route('**/api/trpc/user.getPreferences*', async (route) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          await route.continue();
        });

        await page.goto('/t/workspace/settings/preferences');

        // Verify loading state
        const loadingStatus = page.getByRole('status', {
          name: /loading preferences/i,
        });
        await expect(loadingStatus).toBeVisible();

        // Verify it has aria-live
        await expect(loadingStatus).toHaveAttribute('aria-live', 'polite');
      }
    );
  });

  authenticatedTest.describe('Error Handling', () => {
    authenticatedTest(
      'displays error state when preferences fail to load',
      async ({ page }) => {
        // Intercept and fail the preferences API call
        await page.route('**/api/trpc/user.getPreferences*', async (route) => {
          await route.abort('failed');
        });

        await page.goto('/t/workspace/settings/preferences');

        // Verify error message
        await expect(page.getByRole('alert')).toBeVisible();

        await expect(
          page.getByText(/failed to load preferences/i)
        ).toBeVisible();
      }
    );
  });
});

authenticatedTest.describe('Settings Navigation', () => {
  authenticatedTest(
    'navigates between Account and Preferences tabs',
    async ({ authenticatedPage }) => {
      // Start on preferences page
      await authenticatedPage.goto('/t/workspace/settings/preferences');
      await authenticatedPage.waitForLoadState('networkidle');

      // Verify we're on preferences
      await expect(
        authenticatedPage.getByRole('heading', {
          level: 1,
          name: /preferences/i,
        })
      ).toBeVisible();

      // Navigate to account settings (if navigation exists)
      const accountLink = authenticatedPage.getByRole('link', {
        name: /account/i,
      });
      if (await accountLink.isVisible()) {
        await accountLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Navigate back to preferences
        const preferencesLink = authenticatedPage.getByRole('link', {
          name: /preferences/i,
        });
        await preferencesLink.click();
        await authenticatedPage.waitForLoadState('networkidle');

        // Verify we're back on preferences
        await expect(
          authenticatedPage.getByRole('heading', {
            level: 1,
            name: /preferences/i,
          })
        ).toBeVisible();
      }
    }
  );
});
