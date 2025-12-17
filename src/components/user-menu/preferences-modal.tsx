'use client';

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { RadioGroup } from '@/components/ui/radio-group';
import type { RadioOption } from '@/components/ui/radio-group';
import styles from './modal.module.scss';

/**
 * Preferences Modal Component Props
 */
export interface PreferencesModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
}

/**
 * View mode options
 */
const viewModeOptions: RadioOption[] = [
  { value: 'grid', label: 'Grid View' },
  { value: 'table', label: 'Table View' },
];

/**
 * Date format options
 */
const dateFormatOptions = [
  { value: 'ISO', label: 'ISO (YYYY-MM-DD)' },
  { value: 'US', label: 'US (MM/DD/YYYY)' },
  { value: 'EU', label: 'EU (DD/MM/YYYY)' },
  { value: 'UK', label: 'UK (DD-MMM-YYYY)' },
];

/**
 * Time format options
 */
const timeFormatOptions: RadioOption[] = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' },
];

/**
 * Preferences Modal Component
 *
 * Modal dialog for managing user preferences including:
 * - Default channel (go directly to this channel on login)
 * - Content plan view mode (grid/table)
 * - Date format preference
 * - Time format preference
 *
 * Uses tRPC for fetching and updating preferences.
 * Uses Radix UI Dialog for accessibility.
 */
export function PreferencesModal({ isOpen, onClose }: PreferencesModalProps) {
  // State for form values
  const [defaultChannelId, setDefaultChannelId] = useState<string>('');
  const [contentPlanViewMode, setContentPlanViewMode] = useState<
    'grid' | 'table'
  >('grid');
  const [dateFormat, setDateFormat] = useState<'ISO' | 'US' | 'EU' | 'UK'>(
    'ISO'
  );
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('24h');
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch user preferences
  const {
    data: preferences,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = trpc.user.getPreferences.useQuery(undefined, {
    enabled: isOpen, // Only fetch when modal is open
  });

  // Fetch available channels
  const {
    data: channels,
    isLoading: channelsLoading,
    error: channelsError,
  } = trpc.user.getAvailableChannels.useQuery(undefined, {
    enabled: isOpen, // Only fetch when modal is open
  });

  // Update preferences mutation
  const updatePreferences = trpc.user.updatePreferences.useMutation({
    onSuccess: () => {
      setHasChanges(false);
    },
  });

  // Initialize form values from fetched preferences
  useEffect(() => {
    if (preferences) {
      setDefaultChannelId(preferences.defaultChannelId ?? '');
      setContentPlanViewMode(preferences.contentPlanViewMode);
      setDateFormat(preferences.dateFormat);
      setTimeFormat(preferences.timeFormat);
    }
  }, [preferences]);

  // Track if form has changes
  useEffect(() => {
    if (!preferences) return;

    const changed =
      defaultChannelId !== (preferences.defaultChannelId ?? '') ||
      contentPlanViewMode !== preferences.contentPlanViewMode ||
      dateFormat !== preferences.dateFormat ||
      timeFormat !== preferences.timeFormat;

    setHasChanges(changed);
  }, [
    defaultChannelId,
    contentPlanViewMode,
    dateFormat,
    timeFormat,
    preferences,
  ]);

  // Warn user about unsaved changes when navigating away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updatePreferences.mutateAsync({
      defaultChannelId: defaultChannelId || null,
      contentPlanViewMode,
      dateFormat,
      timeFormat,
    });
  };

  /**
   * Handle form reset
   */
  const handleReset = () => {
    if (preferences) {
      setDefaultChannelId(preferences.defaultChannelId ?? '');
      setContentPlanViewMode(preferences.contentPlanViewMode);
      setDateFormat(preferences.dateFormat);
      setTimeFormat(preferences.timeFormat);
      setHasChanges(false);
    }
  };

  /**
   * Handle modal close - prevent if there are unsaved changes
   */
  const handleClose = () => {
    if (hasChanges && !updatePreferences.isSuccess) {
      const confirmClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  // Transform channels to select options with a "None" option to clear selection
  const channelOptions = [
    { value: '', label: 'None (show dashboard on login)' },
    ...(channels?.map((channel) => ({
      value: channel.id,
      label: `${channel.name} (${channel.teamspaceName})`,
    })) ?? []),
  ];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content
          className={styles.content}
          aria-describedby="preferences-description"
          onPointerDownOutside={(e) => {
            if (updatePreferences.isPending) {
              e.preventDefault();
            }
          }}
        >
          <Dialog.Title className={styles.title}>Preferences</Dialog.Title>

          <Dialog.Description
            id="preferences-description"
            className={styles.description}
          >
            Customize your personal preferences for the application
          </Dialog.Description>

          {/* Loading state */}
          {(preferencesLoading || channelsLoading) && (
            <div className={styles.loading} role="status" aria-live="polite">
              <p>Loading preferences...</p>
            </div>
          )}

          {/* Error state */}
          {(preferencesError || channelsError) && (
            <div className={styles.error} role="alert">
              <p>Failed to load preferences. Please try refreshing.</p>
              {preferencesError && (
                <p className={styles.errorDetail}>{preferencesError.message}</p>
              )}
              {channelsError && (
                <p className={styles.errorDetail}>{channelsError.message}</p>
              )}
            </div>
          )}

          {/* Form */}
          {!preferencesLoading && !channelsLoading && preferences && (
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* Default Channel */}
              <div className={styles.section}>
                <h3 className={styles.sectionHeading}>Startup Behaviour</h3>

                <Select
                  label="Default Channel"
                  placeholder={
                    channelOptions.length > 1
                      ? 'Select a default channel'
                      : 'No channels available'
                  }
                  options={channelOptions}
                  value={defaultChannelId}
                  onChange={(e) => setDefaultChannelId(e.target.value)}
                  helperText="Go directly to this channel on login instead of the dashboard"
                  disabled={
                    channelOptions.length <= 1 || updatePreferences.isPending
                  }
                />
              </div>

              {/* View Preferences */}
              <div className={styles.section}>
                <h3 className={styles.sectionHeading}>View Preferences</h3>

                <RadioGroup
                  legend="Content Plan View Mode"
                  name="contentPlanViewMode"
                  options={viewModeOptions}
                  value={contentPlanViewMode}
                  onChange={(value) =>
                    setContentPlanViewMode(value as 'grid' | 'table')
                  }
                  orientation="horizontal"
                  helperText="Choose how to display your content plan"
                  disabled={updatePreferences.isPending}
                />
              </div>

              {/* Date & Time Preferences */}
              <div className={styles.section}>
                <h3 className={styles.sectionHeading}>
                  Date &amp; Time Format
                </h3>

                <div className={styles.formGroup}>
                  <Select
                    label="Date Format"
                    options={dateFormatOptions}
                    value={dateFormat}
                    onChange={(e) =>
                      setDateFormat(
                        e.target.value as 'ISO' | 'US' | 'EU' | 'UK'
                      )
                    }
                    helperText="Choose how dates are displayed"
                    disabled={updatePreferences.isPending}
                  />
                </div>

                <div className={styles.formGroup}>
                  <RadioGroup
                    legend="Time Format"
                    name="timeFormat"
                    options={timeFormatOptions}
                    value={timeFormat}
                    onChange={(value) => setTimeFormat(value as '12h' | '24h')}
                    orientation="horizontal"
                    helperText="Choose how times are displayed"
                    disabled={updatePreferences.isPending}
                  />
                </div>
              </div>

              {/* Success/Error Messages */}
              {updatePreferences.isSuccess && (
                <div className={styles.success} role="status">
                  Preferences saved successfully!
                </div>
              )}

              {updatePreferences.isError && (
                <div className={styles.error} role="alert">
                  Failed to save preferences: {updatePreferences.error.message}
                </div>
              )}

              {/* Form Actions */}
              <div className={styles.actions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={!hasChanges || updatePreferences.isPending}
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={updatePreferences.isPending}
                  disabled={!hasChanges || updatePreferences.isPending}
                >
                  {updatePreferences.isPending
                    ? 'Saving...'
                    : 'Save Preferences'}
                </Button>
              </div>
            </form>
          )}

          <Dialog.Close asChild>
            <button
              className={styles.closeButton}
              aria-label="Close"
              disabled={updatePreferences.isPending}
              type="button"
              onClick={handleClose}
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

PreferencesModal.displayName = 'PreferencesModal';
