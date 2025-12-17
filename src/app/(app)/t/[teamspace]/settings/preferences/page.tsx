'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { RadioGroup } from '@/components/ui/radio-group';
import type { RadioOption } from '@/components/ui/radio-group';
import styles from './preferences.module.scss';

/**
 * Preferences Settings Page
 *
 * Allows users to configure their personal preferences including:
 * - Default channel for new content
 * - Content plan view mode (grid/table)
 * - Date format preference
 * - Time format preference
 *
 * Uses tRPC for fetching and updating preferences.
 */

const viewModeOptions: RadioOption[] = [
  { value: 'grid', label: 'Grid View' },
  { value: 'table', label: 'Table View' },
];

const dateFormatOptions = [
  { value: 'ISO', label: 'ISO (YYYY-MM-DD)' },
  { value: 'US', label: 'US (MM/DD/YYYY)' },
  { value: 'EU', label: 'EU (DD/MM/YYYY)' },
  { value: 'UK', label: 'UK (DD-MMM-YYYY)' },
];

const timeFormatOptions: RadioOption[] = [
  { value: '12h', label: '12-hour (AM/PM)' },
  { value: '24h', label: '24-hour' },
];

export default function PreferencesPage() {
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
  } = trpc.user.getPreferences.useQuery();

  // Fetch available channels
  const {
    data: channels,
    isLoading: channelsLoading,
    error: channelsError,
  } = trpc.user.getAvailableChannels.useQuery();

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
        // Chrome requires returnValue to be set
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasChanges]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await updatePreferences.mutateAsync({
      defaultChannelId: defaultChannelId || null,
      contentPlanViewMode,
      dateFormat,
      timeFormat,
    });
  };

  const handleReset = () => {
    if (preferences) {
      setDefaultChannelId(preferences.defaultChannelId ?? '');
      setContentPlanViewMode(preferences.contentPlanViewMode);
      setDateFormat(preferences.dateFormat);
      setTimeFormat(preferences.timeFormat);
      setHasChanges(false);
    }
  };

  // Loading state
  if (preferencesLoading || channelsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Preferences</h1>
        </div>
        <div className={styles.loading} role="status" aria-live="polite">
          <p>Loading preferences...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (preferencesError || channelsError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.heading}>Preferences</h1>
        </div>
        <div className={styles.error} role="alert">
          <p>Failed to load preferences. Please try refreshing the page.</p>
          {preferencesError && (
            <p className={styles.errorDetail}>{preferencesError.message}</p>
          )}
          {channelsError && (
            <p className={styles.errorDetail}>{channelsError.message}</p>
          )}
        </div>
      </div>
    );
  }

  // Transform channels to select options
  const channelOptions =
    channels?.map((channel) => ({
      value: channel.id,
      label: `${channel.name} (${channel.teamspaceName})`,
    })) ?? [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.heading}>Preferences</h1>
        <p className={styles.description}>
          Customize your personal preferences for the application
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* Default Channel */}
        <div className={styles.section}>
          <h2 className={styles.sectionHeading}>Content Defaults</h2>

          <Select
            label="Default Channel"
            placeholder={
              channelOptions.length > 0
                ? 'Select a default channel'
                : 'No channels available'
            }
            options={channelOptions}
            value={defaultChannelId}
            onChange={(e) => setDefaultChannelId(e.target.value)}
            helperText="New content will be assigned to this channel by default"
            disabled={channelOptions.length === 0}
          />
        </div>

        {/* View Preferences */}
        <div className={styles.section}>
          <h2 className={styles.sectionHeading}>View Preferences</h2>

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
          />
        </div>

        {/* Date & Time Preferences */}
        <div className={styles.section}>
          <h2 className={styles.sectionHeading}>Date &amp; Time Format</h2>

          <div className={styles.formGroup}>
            <Select
              label="Date Format"
              options={dateFormatOptions}
              value={dateFormat}
              onChange={(e) =>
                setDateFormat(e.target.value as 'ISO' | 'US' | 'EU' | 'UK')
              }
              helperText="Choose how dates are displayed"
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
            variant="secondary"
            onClick={handleReset}
            disabled={!hasChanges || updatePreferences.isPending}
          >
            Reset
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!hasChanges || updatePreferences.isPending}
          >
            {updatePreferences.isPending ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </form>
    </div>
  );
}
